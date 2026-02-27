'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentTenantId } from "@/lib/get-current-tenant"

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
    lead: { nome: string, email: string, telefone: string, origem: string }
    unidadeId: string
    valorProposta: number
    condicoes: ProposalConditionInput[]
}

// --- 1. LISTAGEM DE PROJETOS (Mesa) ---
export async function getProjectsForNegotiation() {
  const session = await auth()
  if (!session) return []
  
  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  try {
    const projects = await prisma.ycProjetos.findMany({
      where: { 
        sysTenantId: BigInt(tenantIdStr),
        ycUnidades: { some: {} } 
      },
      include: {
        _count: { 
          select: { 
            ycUnidades: true,
            ycBlocos: true 
          } 
        },
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

// --- 2. DADOS DO CABEÇALHO (TAG DA TABELA) ---
export async function getNegotiationHeader(projetoId: string) {
  try {
    const project = await prisma.ycProjetos.findUnique({
      where: { id: BigInt(projetoId) },
      select: {
        id: true,
        nome: true,
        cidade: true,
        estado: true
      }
    })

    if (!project) return null

    const now = new Date()
    
    const activeTable = await prisma.ycTabelasPreco.findFirst({
      where: { 
        projetoId: BigInt(projetoId),
        vigenciaInicial: { lte: now },
        vigenciaFinal: { gte: now }   
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
  try {
    const now = new Date()

    const units = await prisma.ycUnidades.findMany({
      where: { projetoId: BigInt(projetoId) },
      include: {
        ycBlocos: { select: { nome: true } },
        ycTabelasPrecoItens: {
          where: {
            ycTabelasPreco: {
                vigenciaInicial: { lte: now },
                vigenciaFinal: { gte: now }
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
    const now = new Date()
    
    const activeTable = await prisma.ycTabelasPreco.findFirst({
        where: { 
            projetoId: BigInt(projetoId),
            vigenciaInicial: { lte: now },
            vigenciaFinal: { gte: now }
        },
        orderBy: { sysCreatedAt: 'desc' },
        select: { id: true }
    })

    if (!activeTable) return []

    const flows = await prisma.ycFluxosPadrao.findMany({
        where: { tabelaPrecoId: activeTable.id },
        orderBy: { dataPrimeiroVencimento: 'asc' }
    })

    return flows.map(f => ({
        tipo: f.tipo,
        percentual: Number(f.percentual),
        qtdeParcelas: f.qtdeParcelas,
        periodicidade: f.periodicidade
    }))
}

// --- 5. CALCULAR FLUXO PADRÃO ---
export async function calculateStandardFlow(unidadeId: string, valorFechamento: number) {
  const now = new Date()

  const unit = await prisma.ycUnidades.findUnique({
    where: { id: BigInt(unidadeId) },
    include: { 
        ycTabelasPrecoItens: { 
            where: {
                ycTabelasPreco: {
                    vigenciaInicial: { lte: now },
                    vigenciaFinal: { gte: now }
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
    where: { tabelaPrecoId: tabelaId },
    orderBy: { dataPrimeiroVencimento: 'asc' }
  })

  let sumReal = 0

  // 1. Gera o fluxo calculando o valor de cada parcela com precisão de 2 casas (Moeda)
  const result = fluxosPadrao.map(f => {
    const totalCondicao = valorFechamento * (Number(f.percentual) / 100)
    // Arredonda a parcela para 2 casas, simulando o que o sistema financeiro faz
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

  // 2. OPÇÃO B: Absorvendo a divergência de centavos na Entrada
  const diff = Number((valorFechamento - sumReal).toFixed(2))

  if (Math.abs(diff) > 0 && result.length > 0) {
      // Procura a parcela de ENTRADA (desde que seja parcela única para não quebrar a divisão)
      let target = result.find(f => f.tipo === 'ENTRADA' && f.qtdeParcelas === 1)
      if (!target) target = result.find(f => f.qtdeParcelas === 1)
      if (!target) target = result[0]

      // Ajusta o centavo na parcela alvo
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
  if (!session) return { success: false, message: "Não autorizado" }

  const { lead, unidadeId, valorProposta, condicoes } = data
  const now = new Date()

  try {
    const contextUnit = await prisma.ycUnidades.findUnique({
        where: { id: BigInt(unidadeId) },
        include: {
            ycProjetos: true, // Necessário para herança da comissão
            ycTabelasPrecoItens: {
                where: {
                    ycTabelasPreco: {
                        vigenciaInicial: { lte: now },
                        vigenciaFinal: { gte: now }
                    }
                },
                include: {
                    ycTabelasPreco: true // Necessário para herança da comissão
                },
                take: 1
            }
        }
    })
    
    if (!contextUnit) return { success: false, message: "Unidade inválida" }

    const priceItem = contextUnit.ycTabelasPrecoItens[0]
    if (!priceItem) return { success: false, message: "Unidade sem tabela de preço vigente vinculada" }

    // Recalcula valor tabela original
    const base = Number(contextUnit.areaPrivativaTotal || contextUnit.areaPrivativaPrincipal || 0) * Number(priceItem.valorMetroQuadrado)
    const comFatorCorrecao = base * Number(priceItem.fatorCorrecao || 1)
    const comFatorAndar = comFatorCorrecao * Number(priceItem.fatorAndar || 1)
    const valorTabelaOriginal = comFatorAndar * Number(priceItem.fatorDiretoria || 1)

    // --- CÁLCULO DE COMISSÃO (Regra de Herança) ---
    // 1. Tabela de Preços > 2. Projeto > 3. Fallback (4%)
    const percTabela = priceItem.ycTabelasPreco.percComissaoPadrao
    const percProjeto = contextUnit.ycProjetos.percComissaoPadrao
    const percComissaoFinal = Number(percTabela ?? percProjeto ?? 4.0)
    const valorComissaoTotal = valorProposta * (percComissaoFinal / 100)

    const validade = new Date()
    validade.setDate(validade.getDate() + 7)

    const result = await prisma.$transaction(async (tx) => {
      // --- A. LEADS ---
      let leadId
      const existingLead = await tx.ycLeads.findFirst({
        where: {
          sysTenantId: contextUnit.sysTenantId,
          OR: [
            { email: lead.email },
            { telefone: lead.telefone }
          ]
        }
      })

      if (existingLead) {
        await tx.ycLeads.update({
          where: { id: existingLead.id },
          data: { 
              nome: lead.nome, 
              origem: lead.origem,
              sysUpdatedAt: new Date()
          }
        })
        leadId = existingLead.id
      } else {
        const newLead = await tx.ycLeads.create({
          data: {
            sysTenantId: contextUnit.sysTenantId,
            sysUserId: BigInt(session.user.id),
            escopoId: contextUnit.escopoId,
            projetoId: contextUnit.projetoId,
            nome: lead.nome,
            email: lead.email,
            telefone: lead.telefone,
            origem: lead.origem,
            status: "NOVO"
          }
        })
        leadId = newLead.id
      }

      // --- B. PROPOSTAS ---
      const newProposal = await tx.ycPropostas.create({
        data: {
          sysTenantId: contextUnit.sysTenantId,
          sysUserId: BigInt(session.user.id),
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
          status: "RASCUNHO" // <-- Nasce como Rascunho
        }
      })

      // --- C. CONDIÇÕES & PARCELAS ---
      if (condicoes && condicoes.length > 0) {
        
        type ParcelaTemp = {
            _indexCondicaoOrigem: number
            sysTenantId: bigint
            sysUserId: bigint
            escopoId: bigint
            propostaId: bigint
            tipo: string
            parcela: number
            vencimento: Date
            valor: number
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

        // 1. Expande o Fluxo Fino (Com um rastreador de qual condição gerou ela)
        condicoes.forEach((c, indexCondicao) => {
            const numMeses = periodMap[c.periodicidade?.toUpperCase()] || 1
            const baseDate = new Date(c.vencimento + "T12:00:00Z")
            const tipoParcela = mapTipo[c.tipo.toUpperCase()] || 'O'

            for (let i = 0; i < Number(c.qtdeParcelas); i++) {
                const venc = new Date(baseDate)
                venc.setMonth(venc.getMonth() + (i * numMeses))

                todasParcelasTemp.push({
                    _indexCondicaoOrigem: indexCondicao, // Rastreador temporário
                    sysTenantId: contextUnit.sysTenantId,
                    sysUserId: BigInt(session.user.id),
                    escopoId: contextUnit.escopoId,
                    propostaId: newProposal.id,
                    tipo: tipoParcela,
                    parcela: indexGeral++,
                    vencimento: venc,
                    valor: Number(c.valorParcela)
                })
            }
        })

        // 2. Verifica e Ajusta a Divergência de Centavos na Parcela de Entrada
        const somaParcelas = todasParcelasTemp.reduce((acc, p) => acc + p.valor, 0)
        const diff = valorProposta - somaParcelas

        if (Math.abs(diff) > 0.001 && todasParcelasTemp.length > 0) {
            // Acha a Entrada ('E'). Se não tiver (muito raro), pega a primeira parcela de todas.
            let targetIndex = todasParcelasTemp.findIndex(p => p.tipo === 'E')
            if (targetIndex === -1) targetIndex = 0

            // Se diff é positivo (faltou dinheiro), soma. Se for negativo (passou do valor), subtrai.
            todasParcelasTemp[targetIndex].valor = Number((todasParcelasTemp[targetIndex].valor + diff).toFixed(2))
        }

        // 3. Monta as Condições Corrigidas lendo das parcelas que já foram ajustadas
        const condicoesParaSalvar = condicoes.map((c, idx) => {
            const parcelasDestaCondicao = todasParcelasTemp.filter(p => p._indexCondicaoOrigem === idx)
            const valorTotalCorrigido = parcelasDestaCondicao.reduce((acc, p) => acc + p.valor, 0)
            const valorParcelaBase = parcelasDestaCondicao.length > 0 ? parcelasDestaCondicao[0].valor : Number(c.valorParcela)

            return {
                sysTenantId: contextUnit.sysTenantId,
                sysUserId: BigInt(session.user.id),
                escopoId: contextUnit.escopoId,
                propostaId: newProposal.id,
                tipo: c.tipo,
                dataVencimento: new Date(c.vencimento + "T12:00:00Z"), 
                valorParcela: valorParcelaBase, // Reflete a correção caso a entrada tenha mudado
                qtdeParcelas: Number(c.qtdeParcelas),
                valorTotal: Number(valorTotalCorrigido.toFixed(2)) // O Valor Total agora é matematicamente exato
            }
        })

        // 4. Limpa o rastreador e Ordena Cronologicamente
        const parcelasParaSalvar = todasParcelasTemp
            .map(p => ({
                sysTenantId: p.sysTenantId,
                sysUserId: p.sysUserId,
                escopoId: p.escopoId,
                propostaId: p.propostaId,
                tipo: p.tipo,
                parcela: p.parcela,
                vencimento: p.vencimento,
                valor: p.valor
            }))
            .sort((a, b) => {
                const dateA = new Date(a.vencimento).getTime()
                const dateB = new Date(b.vencimento).getTime()
                if (dateA !== dateB) return dateA - dateB
                // Desempate por Tipo (Ordem alfabética: A ganha de M)
                return a.tipo.localeCompare(b.tipo)
            })

        // Reconstrói a numeração após ordenar
        parcelasParaSalvar.forEach((p, idx) => { p.parcela = idx + 1 })

        // 5. Salva no banco de dados com amarração perfeita!
        await tx.ycPropostasCondicoes.createMany({ data: condicoesParaSalvar })
        await tx.ycPropostasParcelas.createMany({ data: parcelasParaSalvar })
      }

      // --- D. ATUALIZAR UNIDADE ---
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