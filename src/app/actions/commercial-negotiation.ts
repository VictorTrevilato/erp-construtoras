'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { getFileDownloadUrl } from "@/lib/azure-storage"
// 1. IMPORTAÇÃO DO MOTOR DE ACESSO
import { getUserAccessProfile } from "@/lib/access-control"

// --- TYPES ---
export type NegotiationUnit = {
  id: string
  unidade: string
  andar: number | null
  blocoNome: string
  areaPrivativa: number
  areaUsoComum: number
  statusComercial: string
  statusInterno: string
  valorTabela: number
  tabelaId: string | null
}

export type StandardFlow = {
  tipo: string
  periodicidade: string
  qtdeParcelas: number
  valorParcela: number
  valorTotal: number
  percentual: number
  primeiroVencimento: Date
}

export type ProposalConditionInput = {
    tipo: string
    periodicidade: string
    qtdeParcelas: number | string
    valorParcela: number | string
    vencimento: string
}

export type ProposalPayload = {
    lead: { nome: string, email: string, telefone: string, origem: string, origemDescricao: string }
    unidadeId: string
    valorProposta: number
    condicoes: ProposalConditionInput[]
}

// --- FUNÇÃO INTERNA: GATILHO DE CANCELAMENTO AUTOMÁTICO ---
async function autoCancelExpiredProposals(tenantIdStr: string, userIdStr: string) {
    const now = new Date()
    const expired = await prisma.ycPropostas.findMany({
        where: {
            sysTenantId: BigInt(tenantIdStr),
            validade: { lt: now },
            status: { in: ['RASCUNHO', 'EM_ANALISE', 'REPROVADO'] }
        },
        select: { id: true, unidadeId: true, sysTenantId: true, escopoId: true, status: true }
    })

    if (expired.length === 0) return

    for (const prop of expired) {
        await prisma.$transaction([
            prisma.ycPropostas.update({
                where: { id: prop.id },
                data: { status: 'CANCELADO', sysUpdatedAt: new Date() }
            }),
            prisma.ycUnidades.update({
                where: { id: prop.unidadeId },
                data: { statusComercial: 'DISPONIVEL' }
            }),
            prisma.ycPropostasHistorico.create({
                data: {
                    sysTenantId: prop.sysTenantId,
                    sysUserId: BigInt(userIdStr),
                    escopoId: prop.escopoId,
                    propostaId: prop.id,
                    statusAnterior: prop.status,
                    statusNovo: 'CANCELADO',
                    acao: 'CANCELOU_VENCIDA',
                    observacao: 'Cancelamento automático: Validade da proposta expirou. Unidade liberada.'
                }
            })
        ])
    }
}

// --- 1. LISTAGEM DE PROJETOS (Mesa) ---
export async function getProjectsForNegotiation() {
  const session = await auth()
  if (!session?.user?.id) return []
  
  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('MESA_VER')) return []

  await autoCancelExpiredProposals(tenantIdStr, session.user.id)

  try {
    const projects = await prisma.ycProjetos.findMany({
      where: { 
        sysTenantId: tenantId,
        escopoId: { in: cracha.escoposPermitidos }, // BLINDAGEM: Apenas obras do seu escopo
        ycUnidades: { some: {} } 
      },
      include: {
        _count: { select: { ycUnidades: true, ycBlocos: true } },
        ycUnidades: {
          where: { statusComercial: 'DISPONIVEL' },
          select: { id: true }
        }
      },
      orderBy: { nome: 'asc' }
    })

    return projects.map(p => ({
      id: p.id.toString(),
      nome: p.nome,
      tipo: p.tipo,
      status: p.status,
      cidade: p.cidade || "",
      uf: p.estado || "",
      totalBlocos: p._count.ycBlocos,
      totalUnidades: p._count.ycUnidades,
      totalDisponiveis: p.ycUnidades.length
    }))
  } catch (error) {
    console.error("Erro ao buscar projetos para mesa:", error)
    return []
  }
}

// --- 2. DADOS DO CABEÇALHO ---
export async function getNegotiationHeader(projetoId: string) {
  const session = await auth()
  if (!session?.user?.id) return null

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return null
  
  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('MESA_VER')) return null

  try {
    const project = await prisma.ycProjetos.findFirst({
      where: { 
          id: BigInt(projetoId),
          sysTenantId: tenantId,
          escopoId: { in: cracha.escoposPermitidos } // BLINDAGEM: Impede espiar obra alheia
      },
      select: { id: true, nome: true, cidade: true, estado: true }
    })

    if (!project) return null

    const today = new Date()
    const dataReferencia = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
    
    const activeTable = await prisma.ycTabelasPreco.findFirst({
      where: { 
        projetoId: BigInt(projetoId),
        sysTenantId: tenantId,
        vigenciaInicial: { lte: dataReferencia },
        vigenciaFinal: { gte: dataReferencia }   
      },
      orderBy: { sysCreatedAt: 'desc' }, 
      select: { codigo: true, id: true }
    })

    return {
      id: project.id.toString(),
      nome: project.nome,
      localizacao: `${project.cidade || ''} / ${project.estado || ''}`,
      tabelaCodigo: activeTable?.codigo || null
    }
  } catch {
    return null
  }
}

// --- 3. ESPELHO DE VENDAS (PREÇOS) ---
export async function getSalesMirrorData(projetoId: string) {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []
  
  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('MESA_VER')) return []

  await autoCancelExpiredProposals(tenantIdStr, session.user.id)

  try {
    const today = new Date()
    const dataReferencia = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))

    const units = await prisma.ycUnidades.findMany({
      where: { 
          projetoId: BigInt(projetoId),
          sysTenantId: tenantId,
          escopoId: { in: cracha.escoposPermitidos } // BLINDAGEM DO ESPELHO
      },
      include: {
        ycBlocos: { select: { nome: true } },
        ycTabelasPrecoItens: {
          where: {
            ycTabelasPreco: {
                vigenciaInicial: { lte: dataReferencia },
                vigenciaFinal: { gte: dataReferencia }
            }
          },
          include: { ycTabelasPreco: true },
          take: 1 
        }
      },
      orderBy: { andar: 'desc' }
    })

    return units.map(u => {
      const priceItem = u.ycTabelasPrecoItens[0]
      
      let valorFinal = 0
      if (priceItem) {
        const base = Number(u.areaPrivativaTotal || u.areaPrivativaPrincipal || 0) * Number(priceItem.valorMetroQuadrado)
        const comFatorCorrecao = base * Number(priceItem.fatorCorrecao || 1)
        const comFatorAndar = comFatorCorrecao * Number(priceItem.fatorAndar || 1)
        valorFinal = comFatorAndar * Number(priceItem.fatorDiretoria || 1)
      }

      return {
        id: u.id.toString(),
        unidade: u.unidade,
        andar: u.andar,
        blocoNome: u.ycBlocos.nome,
        areaPrivativa: Number(u.areaPrivativaTotal || 0),
        areaUsoComum: Number(u.areaUsoComum || 0),
        statusComercial: u.statusComercial,
        statusInterno: u.statusInterno,
        valorTabela: valorFinal,
        tabelaId: priceItem?.tabelaPrecoId.toString() || null
      } as NegotiationUnit
    })
  } catch (error) {
    console.error("Erro ao buscar espelho de vendas:", error)
    return []
  }
}

// --- 4. FLUXOS DA TABELA VIGENTE ---
export async function getProjectActiveFlows(projetoId: string) {
    const session = await auth()
    if (!session?.user?.id) return []

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return []
    
    const tenantId = BigInt(tenantIdStr)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('MESA_VER')) return []

    const today = new Date()
    const dataReferencia = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
    
    const activeTable = await prisma.ycTabelasPreco.findFirst({
        where: { 
            projetoId: BigInt(projetoId),
            sysTenantId: tenantId,
            escopoId: { in: cracha.escoposPermitidos },
            vigenciaInicial: { lte: dataReferencia },
            vigenciaFinal: { gte: dataReferencia }
        },
        orderBy: { sysCreatedAt: 'desc' },
        select: { id: true }
    })

    if (!activeTable) return []

    const flows = await prisma.ycFluxosPadrao.findMany({
        where: { tabelaPrecoId: activeTable.id, sysTenantId: tenantId },
        orderBy: { dataPrimeiroVencimento: 'asc' }
    })

    return flows.map(f => ({
        tipo: f.tipo,
        percentual: Number(f.percentual),
        qtdeParcelas: f.qtdeParcelas,
        primeiroVencimento: f.dataPrimeiroVencimento,
        periodicidade: f.periodicidade
    }))
}

// --- 5. CALCULAR FLUXO PADRÃO ---
export async function calculateStandardFlow(unidadeId: string, valorFechamento: number) {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []
  
  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('MESA_VER')) return []

  const today = new Date()
  const dataReferencia = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))

  // BLINDAGEM DA UNIDADE: Verifica Tenant e Escopo antes de calcular
  const unit = await prisma.ycUnidades.findFirst({
    where: { 
        id: BigInt(unidadeId),
        sysTenantId: tenantId,
        escopoId: { in: cracha.escoposPermitidos }
    },
    include: { 
        ycTabelasPrecoItens: { 
            where: {
                ycTabelasPreco: {
                    vigenciaInicial: { lte: dataReferencia },
                    vigenciaFinal: { gte: dataReferencia }
                }
            },
            select: { tabelaPrecoId: true },
            take: 1
        } 
    }
  })

  if (!unit || unit.ycTabelasPrecoItens.length === 0) return []

  const tabelaId = unit.ycTabelasPrecoItens[0].tabelaPrecoId

  const fluxosPadrao = await prisma.ycFluxosPadrao.findMany({
    where: { tabelaPrecoId: tabelaId, sysTenantId: tenantId },
    orderBy: { dataPrimeiroVencimento: 'asc' }
  })

  let sumReal = 0

  const result = fluxosPadrao.map(f => {
    const totalCondicao = valorFechamento * (Number(f.percentual) / 100)
    const valorParcela = Number((totalCondicao / f.qtdeParcelas).toFixed(2))
    const valorTotalReal = valorParcela * f.qtdeParcelas
    
    sumReal += valorTotalReal
    
    const periodMap: Record<number, string> = { 0: 'Única', 1: 'Mensal', 12: 'Anual' } 

    return {
      tipo: f.tipo,
      periodicidade: periodMap[f.periodicidade] || 'Outros',
      qtdeParcelas: f.qtdeParcelas,
      valorParcela: valorParcela,
      valorTotal: valorTotalReal,
      percentual: Number(f.percentual),
      primeiroVencimento: f.dataPrimeiroVencimento
    } as StandardFlow
  })

  const diff = Number((valorFechamento - sumReal).toFixed(2))

  if (Math.abs(diff) > 0 && result.length > 0) {
      let target = result.find(f => f.tipo === 'ENTRADA' && f.qtdeParcelas === 1)
      if (!target) target = result.find(f => f.qtdeParcelas === 1)
      if (!target) target = result[0]

      if (target.qtdeParcelas === 1) {
          target.valorParcela = Number((target.valorParcela + diff).toFixed(2))
          target.valorTotal = target.valorParcela
      }
  }

  return result
}

// --- 6. SALVAR PROPOSTA ---
export async function saveProposal(data: ProposalPayload) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado" }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão Expirada." }
  
  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('MESA_OPERAR')) {
      return { success: false, message: "Você não tem permissão para realizar vendas." }
  }

  const { lead, unidadeId, valorProposta, condicoes } = data
  const today = new Date()
  const dataReferencia = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))

  try {
    // BLINDAGEM TOTAL NA GERAÇÃO DA PROPOSTA
    const contextUnit = await prisma.ycUnidades.findFirst({
        where: { 
            id: BigInt(unidadeId),
            sysTenantId: tenantId,
            escopoId: { in: cracha.escoposPermitidos }
        },
        include: {
            ycProjetos: true,
            ycTabelasPrecoItens: {
                where: {
                    ycTabelasPreco: {
                        vigenciaInicial: { lte: dataReferencia },
                        vigenciaFinal: { gte: dataReferencia }
                    }
                },
                include: { ycTabelasPreco: true },
                take: 1
            }
        }
    })
    
    if (!contextUnit) return { success: false, message: "Unidade inválida ou acesso negado." }

    const priceItem = contextUnit.ycTabelasPrecoItens[0]
    if (!priceItem) return { success: false, message: "Unidade sem tabela de preço vigente vinculada." }

    const base = Number(contextUnit.areaPrivativaTotal || contextUnit.areaPrivativaPrincipal || 0) * Number(priceItem.valorMetroQuadrado)
    const comFatorCorrecao = base * Number(priceItem.fatorCorrecao || 1)
    const comFatorAndar = comFatorCorrecao * Number(priceItem.fatorAndar || 1)
    const valorTabelaOriginal = comFatorAndar * Number(priceItem.fatorDiretoria || 1)

    const percTabela = priceItem.ycTabelasPreco.percComissaoPadrao
    const percProjeto = contextUnit.ycProjetos.percComissaoPadrao
    const percComissaoFinal = Number(percTabela ?? percProjeto ?? 4.0)
    const valorComissaoTotal = valorProposta * (percComissaoFinal / 100)

    const validade = new Date()
    validade.setDate(validade.getDate() + 7)

    const result = await prisma.$transaction(async (tx) => {
      // Cria o lead garantindo a autoria do corretor (sysUserId: userId)
      const newLead = await tx.ycLeads.create({
        data: {
          sysTenantId: contextUnit.sysTenantId,
          sysUserId: userId,
          escopoId: contextUnit.escopoId,
          projetoId: contextUnit.projetoId,
          nome: lead.nome.toUpperCase(),
          email: lead.email,
          telefone: lead.telefone,
          origem: lead.origem,
          origemDescricao: lead.origemDescricao,
          status: "NOVO"
        }
      })
      const leadId = newLead.id

      const newProposal = await tx.ycPropostas.create({
        data: {
          sysTenantId: contextUnit.sysTenantId,
          sysUserId: userId, // A proposta agora pertence ao corretor que a criou!
          escopoId: contextUnit.escopoId,
          
          unidadeId: BigInt(unidadeId),
          leadId: leadId,
          tabelaPrecoId: priceItem.tabelaPrecoId,
          
          valorTabelaOriginal: valorTabelaOriginal,
          valorProposta: valorProposta,             
          desconto: valorTabelaOriginal - valorProposta, 
          
          percComissaoTotal: percComissaoFinal,
          valorComissaoTotal: valorComissaoTotal,

          dataProposta: new Date(),
          validade: validade,
          status: "RASCUNHO" 
        }
      })

      if (condicoes && condicoes.length > 0) {
        type ParcelaTemp = {
            _indexCondicaoOrigem: number, sysTenantId: bigint, sysUserId: bigint, escopoId: bigint
            propostaId: bigint, tipo: string, parcela: number, vencimento: Date, valor: number
        }

        const todasParcelasTemp: ParcelaTemp[] = []
        let indexGeral = 1

        const periodMap: Record<string, number> = {
            'MENSAL': 1, 'BIMESTRAL': 2, 'TRIMESTRAL': 3,
            'SEMESTRAL': 6, 'INTERMEDIARIAS': 6, 'ANUAL': 12
        }

        const mapTipo: Record<string, string> = {
            'ENTRADA': 'E', 'MENSAL': 'M', 'INTERMEDIARIAS': 'I',
            'ANUAL': 'A', 'CHAVES': 'C', 'FINANCIAMENTO': 'F'
        }

        condicoes.forEach((c, indexCondicao) => {
            const numMeses = periodMap[c.periodicidade?.toUpperCase()] || 1
            const baseDate = new Date(c.vencimento + "T12:00:00Z")
            const tipoParcela = mapTipo[c.tipo.toUpperCase()] || 'O'

            for (let i = 0; i < Number(c.qtdeParcelas); i++) {
                const venc = new Date(baseDate)
                venc.setMonth(venc.getMonth() + (i * numMeses))

                todasParcelasTemp.push({
                    _indexCondicaoOrigem: indexCondicao,
                    sysTenantId: contextUnit.sysTenantId,
                    sysUserId: userId,
                    escopoId: contextUnit.escopoId,
                    propostaId: newProposal.id,
                    tipo: tipoParcela,
                    parcela: indexGeral++,
                    vencimento: venc,
                    valor: Number(c.valorParcela)
                })
            }
        })

        const somaParcelas = todasParcelasTemp.reduce((acc, p) => acc + p.valor, 0)
        const diff = valorProposta - somaParcelas

        if (Math.abs(diff) > 0.001 && todasParcelasTemp.length > 0) {
            let targetIndex = todasParcelasTemp.findIndex(p => p.tipo === 'E')
            if (targetIndex === -1) targetIndex = 0
            todasParcelasTemp[targetIndex].valor = Number((todasParcelasTemp[targetIndex].valor + diff).toFixed(2))
        }

        const condicoesParaSalvar = condicoes.map((c, idx) => {
            const parcelasDestaCondicao = todasParcelasTemp.filter(p => p._indexCondicaoOrigem === idx)
            const valorTotalCorrigido = parcelasDestaCondicao.reduce((acc, p) => acc + p.valor, 0)
            const valorParcelaBase = parcelasDestaCondicao.length > 0 ? parcelasDestaCondicao[0].valor : Number(c.valorParcela)

            return {
                sysTenantId: contextUnit.sysTenantId,
                sysUserId: userId,
                escopoId: contextUnit.escopoId,
                propostaId: newProposal.id,
                tipo: c.tipo,
                dataVencimento: new Date(c.vencimento + "T12:00:00Z"), 
                valorParcela: valorParcelaBase, 
                qtdeParcelas: Number(c.qtdeParcelas),
                valorTotal: Number(valorTotalCorrigido.toFixed(2)) 
            }
        })

        const parcelasParaSalvar = todasParcelasTemp
            .map(p => ({
                sysTenantId: p.sysTenantId, sysUserId: p.sysUserId, escopoId: p.escopoId,
                propostaId: p.propostaId, tipo: p.tipo, parcela: p.parcela, vencimento: p.vencimento, valor: p.valor
            }))
            .sort((a, b) => {
                const dateA = new Date(a.vencimento).getTime()
                const dateB = new Date(b.vencimento).getTime()
                if (dateA !== dateB) return dateA - dateB
                return a.tipo.localeCompare(b.tipo)
            })

        parcelasParaSalvar.forEach((p, idx) => { p.parcela = idx + 1 })

        await tx.ycPropostasCondicoes.createMany({ data: condicoesParaSalvar })
        await tx.ycPropostasParcelas.createMany({ data: parcelasParaSalvar })
      }

      await tx.ycUnidades.update({
        where: { id: BigInt(unidadeId) },
        data: { statusComercial: "RESERVADO" }
      })

      return newProposal
    })

    revalidatePath('/app/comercial/mesa')
    return { success: true, message: "Proposta salva com sucesso!", proposalId: result.id.toString() }

  } catch (error) {
    console.error(error)
    return { success: false, message: "Erro ao salvar proposta." }
  }
}

// ==========================================
// MÓDULO DE DOCUMENTOS PÚBLICOS
// ==========================================

export async function getPublicProjectDocuments(projetoId: string) {
    const session = await auth()
    if (!session?.user?.id) return []

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return []

    try {
        const anexos = await prisma.ycProjetosAnexos.findMany({
            where: { 
                projetoId: BigInt(projetoId), 
                sysTenantId: BigInt(tenantIdStr),
                isPublico: true 
            },
            orderBy: { sysCreatedAt: 'asc' }
        })
        return anexos.map(a => ({
            id: a.id.toString(),
            nomeArquivo: a.nomeArquivo,
            classificacao: a.classificacao,
            urlArquivo: a.urlArquivo
        }))
    } catch (error) {
        console.error("Erro ao buscar documentos do projeto:", error)
        return []
    }
}

export async function getPublicUnitDocuments(unidadeId: string) {
    const session = await auth()
    if (!session?.user?.id) return []

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return []

    try {
        const anexos = await prisma.ycUnidadesAnexos.findMany({
            where: { 
                unidadeId: BigInt(unidadeId), 
                sysTenantId: BigInt(tenantIdStr),
                isPublico: true 
            },
            orderBy: { sysCreatedAt: 'asc' }
        })
        return anexos.map(a => ({
            id: a.id.toString(),
            nomeArquivo: a.nomeArquivo,
            classificacao: a.classificacao,
            urlArquivo: a.urlArquivo
        }))
    } catch (error) {
        console.error("Erro ao buscar documentos da unidade:", error)
        return []
    }
}

export async function getDocumentViewUrl(urlArquivo: string, originalName: string) {
    const session = await auth()
    if (!session) return { success: false, url: null }

    try {
        const url = await getFileDownloadUrl(urlArquivo, originalName, true)
        return { success: true, url }
    } catch (error) {
        console.error("Erro ao gerar link de visualização:", error)
        return { success: false, url: null }
    }
}