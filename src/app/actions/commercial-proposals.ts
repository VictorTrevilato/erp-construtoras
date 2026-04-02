'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { revalidatePath } from "next/cache"
import { getUploadSasUrl, deleteFileFromAzureByPath, getFileDownloadUrl, uploadBufferToAzure } from "@/lib/azure-storage"
import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import { buildContractDictionary } from "@/lib/doc-dictionary-proposals"
import { randomUUID } from "crypto"
// 1. IMPORTAÇÃO DO MOTOR DE ACESSO
import { getUserAccessProfile } from "@/lib/access-control"

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export type ProposalProjectSummary = {
  id: string
  nome: string
  cidade: string
  uf: string
  img?: string | null
  tipo: string           
  status: string         
  totalBlocos: number    
  totalUnidades: number  
  totalPropostas: number
}

export type ProposalListSummary = {
  id: string
  unidade: string
  bloco: string
  status: string
  compradorNome: string
  tabelaCodigo: string
  dataProposta: Date
  validade: Date
  valorProposta: number
}

export type ProposalFullDetail = {
  id: string
  status: string
  dataProposta: Date
  validade: Date
  valorTabelaOriginal: number
  valorProposta: number
  desconto: number
  percComissaoTotal: number
  valorComissaoTotal: number
  
  dataDecisao: Date | null
  usuarioDecisaoNome: string | null
  motivoRejeicao: string | null
  observacaoDecisao: string | null

  projeto: {
    nome: string
    logoUrl: string | null
  }

  tabela: {
    codigo: string
    nome: string
  }

  corretorNome: string
  lead: {
    nome: string
    email: string | null
    telefone: string | null
    origem: string | null
    origemDescricao: string | null
  }

  unidade: {
    id: string
    numero: string
    bloco: string
    andar: number
    areaPrivativaTotal: number | null
    areaUsoComum: number | null
    areaRealTotal: number | null
    fracaoIdeal: number | null
    qtdeVagas: number
    tipoVaga: string | null
    areaDeposito: number | null
    tipoDeposito: string | null
  }
}

export type ProposalConditionItem = {
    id: string
    tipo: string
    dataVencimento: Date
    valorParcela: number
    qtdeParcelas: number
    valorTotal: number
}

export type ProposalInstallmentItem = {
    id: string
    tipo: string 
    parcela: number
    vencimento: Date
    valor: number
}

export type ProposalPartyItem = {
    id: string
    entidadeId: string
    nome: string
    documento: string
    tipoEntidade: string 
    tipoParticipacao: string 
    percParticipacao: number
    isResponsavel: boolean
    numGrupo: number
}

export type ProposalCommissionItem = {
    id: string
    entidadeId: string
    nome: string
    documento: string
    tipoEntidade: string 
    percVGV: number
    percRateio: number
    valor: number
    isResponsavel: boolean
}

export type ProposalHistoryItem = {
    id: string
    statusAnterior: string | null
    statusNovo: string
    acao: string
    observacao: string | null
    data: Date
    usuarioNome: string
}

export type ProposalAttachmentItem = {
    id: string
    nomeArquivo: string
    classificacao: string
    descricao: string | null
    urlArquivo: string
    fileSize?: number 
}

// ==========================================
// 2. SERVER ACTIONS (HUBS E PROPOSTAS)
// ==========================================

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

// --- LISTAR PROJETOS (HUB 1) ---
export async function getProposalProjects(): Promise<ProposalProjectSummary[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('PROPOSTAS_VER')) return []

  await autoCancelExpiredProposals(tenantIdStr, session.user.id)

  try {
    const projects = await prisma.ycProjetos.findMany({
      where: {
        sysTenantId: tenantId,
        escopoId: { in: cracha.escoposPermitidos }, // BLINDAGEM 1
        ycUnidades: { some: {} } 
      },
      select: {
        id: true, nome: true, cidade: true, estado: true, logo: true, tipo: true, status: true, 
        _count: { select: { ycBlocos: true } },
        ycUnidades: {
          select: {
            id: true, 
            _count: {
              select: { 
                ycPropostas: {
                  where: { ...(cracha.isInterno ? {} : { sysUserId: userId }) } // BLINDAGEM 2
                } 
              }
            }
          }
        }
      },
      orderBy: { nome: 'asc' }
    })

    return projects.map(p => {
      const totalPropostas = p.ycUnidades.reduce((acc, u) => acc + u._count.ycPropostas, 0)
      
      return {
        id: p.id.toString(),
        nome: p.nome,
        cidade: p.cidade || '',
        uf: p.estado || '',
        img: p.logo,
        tipo: p.tipo,                   
        status: p.status,               
        totalBlocos: p._count.ycBlocos, 
        totalUnidades: p.ycUnidades.length, 
        totalPropostas
      }
    }).sort((a, b) => b.totalPropostas - a.totalPropostas) 

  } catch (error) {
    console.error("Erro ao buscar projetos para propostas:", error)
    return []
  }
}

// --- LISTAR PROPOSTAS DO PROJETO (HUB 2) ---
export async function getProposalsByProject(projetoId: string): Promise<ProposalListSummary[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('PROPOSTAS_VER')) return []

  await autoCancelExpiredProposals(tenantIdStr, session.user.id)

  try {
    const proposals = await prisma.ycPropostas.findMany({
      where: {
        sysTenantId: tenantId,
        escopoId: { in: cracha.escoposPermitidos }, // BLINDAGEM 1
        ycUnidades: { projetoId: BigInt(projetoId) },
        ...(cracha.isInterno ? {} : { sysUserId: userId }) // BLINDAGEM 2
      },
      include: {
        ycLeads: true,
        ycUnidades: { include: { ycBlocos: true } },
        ycTabelasPreco: true,
        ycPropostasPartes: {
            where: { isResponsavel: true, tipo: 'COMPRADOR' },
            include: { ycEntidades: true }
        }
      },
      orderBy: { dataProposta: 'desc' }
    })

    return proposals.map(p => ({
      id: p.id.toString(),
      unidade: p.ycUnidades.unidade,
      bloco: p.ycUnidades.ycBlocos.nome,
      status: p.status,
      compradorNome: p.ycPropostasPartes[0]?.ycEntidades?.nome || p.ycLeads.nome,
      tabelaCodigo: p.ycTabelasPreco?.codigo || 'N/A',
      dataProposta: p.dataProposta,
      validade: p.validade,
      valorProposta: Number(p.valorProposta)
    }))

  } catch (error) {
    console.error("Erro ao buscar propostas do projeto:", error)
    return []
  }
}

// --- EXCLUIR PROPOSTA (APENAS RASCUNHO) ---
export async function deleteProposal(id: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado" }
    
    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

    const tenantId = BigInt(tenantIdStr)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EXCLUIR')) {
        return { success: false, message: "Você não tem permissão para excluir propostas." }
    }

    try {
        const pId = BigInt(id)

        // BLINDAGEM ANTES DA EXCLUSÃO
        const prop = await prisma.ycPropostas.findFirst({ 
            where: { 
                id: pId,
                sysTenantId: tenantId,
                escopoId: { in: cracha.escoposPermitidos },
                ...(cracha.isInterno ? {} : { sysUserId: userId })
            } 
        })
        if (!prop) return { success: false, message: "Proposta não encontrada ou acesso negado." }
        
        if (prop.status !== 'RASCUNHO') {
            return { success: false, message: "Apenas propostas em Rascunho podem ser excluídas." }
        }

        const anexos = await prisma.ycPropostasAnexos.findMany({ where: { propostaId: pId } })
        for (const anexo of anexos) {
            await deleteFileFromAzureByPath(anexo.urlArquivo)
        }

        await prisma.$transaction([
            prisma.ycPropostasHistorico.deleteMany({ where: { propostaId: pId } }),
            prisma.ycPropostasCondicoes.deleteMany({ where: { propostaId: pId } }),
            prisma.ycPropostasParcelas.deleteMany({ where: { propostaId: pId } }),
            prisma.ycPropostasPartes.deleteMany({ where: { propostaId: pId } }),
            prisma.ycPropostasComissoes.deleteMany({ where: { propostaId: pId } }),
            prisma.ycPropostasAnexos.deleteMany({ where: { propostaId: pId } }),
            prisma.ycPropostas.delete({ where: { id: pId } }),
            prisma.ycUnidades.update({
                where: { id: prop.unidadeId },
                data: { statusComercial: 'DISPONIVEL' }
            })
        ])

        revalidatePath('/app/comercial/propostas')
        return { success: true, message: "Proposta e arquivos excluídos com sucesso." }
    } catch(e) {
        console.error(e)
        return { success: false, message: "Erro ao excluir proposta." }
    }
}

// --- CANCELAR PROPOSTA MANUALMENTE ---
export async function cancelProposal(propostaId: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado" }
    
    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

    const tenantId = BigInt(tenantIdStr)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) {
        return { success: false, message: "Você não tem permissão para cancelar propostas." }
    }

    try {
        const pId = BigInt(propostaId)

        // BLINDAGEM ANTES DO CANCELAMENTO
        const prop = await prisma.ycPropostas.findFirst({ 
            where: { 
                id: pId,
                sysTenantId: tenantId,
                escopoId: { in: cracha.escoposPermitidos },
                ...(cracha.isInterno ? {} : { sysUserId: userId })
            } 
        })

        if (!prop) return { success: false, message: "Proposta não encontrada ou acesso negado." }
        
        if (!['RASCUNHO', 'EM_ANALISE', 'REPROVADO'].includes(prop.status)) {
            return { success: false, message: "Esta proposta não pode ser cancelada neste status." }
        }

        await prisma.$transaction([
            prisma.ycPropostas.update({
                where: { id: pId },
                data: { status: 'CANCELADO', sysUpdatedAt: new Date() }
            }),
            prisma.ycUnidades.update({
                where: { id: prop.unidadeId },
                data: { statusComercial: 'DISPONIVEL' }
            }),
            prisma.ycPropostasHistorico.create({
                data: {
                    sysTenantId: prop.sysTenantId,
                    sysUserId: userId,
                    escopoId: prop.escopoId,
                    propostaId: pId,
                    statusAnterior: prop.status,
                    statusNovo: 'CANCELADO',
                    acao: 'CANCELOU',
                    observacao: 'Proposta cancelada manualmente pelo usuário. Unidade liberada para venda.'
                }
            })
        ])

        revalidatePath('/app/comercial/propostas')
        return { success: true, message: "Proposta cancelada com sucesso. Unidade liberada!" }
    } catch(e) {
        console.error(e)
        return { success: false, message: "Erro ao cancelar proposta." }
    }
}

// ==========================================
// 3. SERVER ACTIONS (ABAS DA PROPOSTA)
// ==========================================

// --- BUSCAR DETALHES COMPLETOS (ABA 1) ---
export async function getProposalDetails(propostaId: string): Promise<ProposalFullDetail | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return null

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('PROPOSTAS_VER')) return null

  try {
    let logoGarantida = null
    const empresa = await prisma.ycEmpresas.findUnique({
        where: { id: tenantId },
        select: { logoMini: true }
    })
    
    if (empresa?.logoMini) {
        logoGarantida = await getFileDownloadUrl(empresa.logoMini)
    }

    // BLINDAGEM DE LEITURA
    const prop = await prisma.ycPropostas.findFirst({
      where: { 
          id: BigInt(propostaId),
          sysTenantId: tenantId,
          escopoId: { in: cracha.escoposPermitidos },
          ...(cracha.isInterno ? {} : { sysUserId: userId })
      },
      include: {
        ycEmpresas: true,
        ycUnidades: {
          include: { 
              ycBlocos: true,
              ycProjetos: { include: { ycEmpresas: true } } 
          }
        },
        ycLeads: true,
        ycTabelasPreco: true,
        ycUsuarios: true, 
        usuarioDecisao: true 
      }
    })

    if (!prop) return null

    return {
      id: prop.id.toString(),
      status: prop.status,
      dataProposta: prop.dataProposta,
      validade: prop.validade,
      valorTabelaOriginal: Number(prop.valorTabelaOriginal),
      valorProposta: Number(prop.valorProposta),
      desconto: Number(prop.desconto),
      percComissaoTotal: Number(prop.percComissaoTotal || 0),
      valorComissaoTotal: Number(prop.valorComissaoTotal || 0),
      
      dataDecisao: prop.dataDecisao,
      usuarioDecisaoNome: prop.usuarioDecisao?.nome || null, 
      motivoRejeicao: prop.motivoRejeicao,
      observacaoDecisao: prop.observacaoDecisao,

      projeto: {
        nome: prop.ycUnidades.ycProjetos.nome,
        logoUrl: logoGarantida 
      },

      tabela: {
        codigo: prop.ycTabelasPreco?.codigo || "N/A",
        nome: prop.ycTabelasPreco?.nome || "Tabela não encontrada"
      },

      corretorNome: prop.ycUsuarios?.nome || "Não identificado",
      lead: {
        nome: prop.ycLeads.nome,
        email: prop.ycLeads.email,
        telefone: prop.ycLeads.telefone,
        origem: prop.ycLeads.origem,
        origemDescricao: prop.ycLeads.origemDescricao
      },

      unidade: {
        id: prop.ycUnidades.id.toString(),
        numero: prop.ycUnidades.unidade,
        bloco: prop.ycUnidades.ycBlocos.nome,
        andar: prop.ycUnidades.andar,
        areaPrivativaTotal: prop.ycUnidades.areaPrivativaTotal ? Number(prop.ycUnidades.areaPrivativaTotal) : null,
        areaUsoComum: prop.ycUnidades.areaUsoComum ? Number(prop.ycUnidades.areaUsoComum) : null,
        areaRealTotal: prop.ycUnidades.areaRealTotal ? Number(prop.ycUnidades.areaRealTotal) : null,
        fracaoIdeal: prop.ycUnidades.fracaoIdealTerreno ? Number(prop.ycUnidades.fracaoIdealTerreno) : null,
        qtdeVagas: prop.ycUnidades.qtdeVagas,
        tipoVaga: prop.ycUnidades.tipoVaga,
        areaDeposito: prop.ycUnidades.areaDeposito ? Number(prop.ycUnidades.areaDeposito) : null,
        tipoDeposito: prop.ycUnidades.tipoDeposito
      }
    }
  } catch (error) {
    console.error("Erro ao buscar detalhes da proposta:", error)
    return null
  }
}

// --- CHECAGEM AUXILIAR PARA ABAS INTERNAS ---
// Essa função é usada nas abas filhas para garantir que mesmo buscando direto as tabelas filhas, a proposta matriz seja verificada
async function checkProposalAccess(
    propostaId: bigint, 
    userId: bigint, 
    tenantId: bigint, 
    cracha: { escoposPermitidos: bigint[], isInterno: boolean }
) {
    const proposta = await prisma.ycPropostas.findFirst({
        where: {
            id: propostaId,
            sysTenantId: tenantId,
            escopoId: { in: cracha.escoposPermitidos },
            ...(cracha.isInterno ? {} : { sysUserId: userId })
        },
        select: { id: true, status: true, escopoId: true, unidadeId: true, sysTenantId: true }
    })
    return proposta
}

export async function getProposalConditions(propostaId: string): Promise<ProposalConditionItem[]> {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_VER')) return []

    const prop = await checkProposalAccess(BigInt(propostaId), userId, tenantId, cracha)
    if (!prop) return []

    try {
        const conds = await prisma.ycPropostasCondicoes.findMany({
            where: { propostaId: BigInt(propostaId) },
            orderBy: { dataVencimento: 'asc' }
        })

        return conds.map(c => ({
            id: c.id.toString(),
            tipo: c.tipo,
            dataVencimento: c.dataVencimento,
            valorParcela: Number(c.valorParcela),
            qtdeParcelas: c.qtdeParcelas,
            valorTotal: Number(c.valorTotal)
        }))
    } catch (error) {
        console.error("Erro ao buscar condições da proposta:", error)
        return []
    }
}

export async function saveProposalConditions(
    propostaId: string, 
    condicoes: Omit<ProposalConditionItem, 'id'>[], 
    novoValorTotal: number, 
    unlockStatus: boolean
) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const pId = BigInt(propostaId)
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) {
        return { success: false, message: "Você não tem permissão para editar propostas." }
    }

    const proposta = await checkProposalAccess(pId, userId, tenantId, cracha)
    if (!proposta) return { success: false, message: "Proposta não encontrada ou acesso negado." }

    try {
        if (proposta.status === 'APROVADO' && !unlockStatus) {
            return { success: false, message: "Proposta APROVADA. Desbloqueie para editar." }
        }

        const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposta.status)
        if (isFormalizing) {
            return { success: false, message: "Proposta em fase de contrato. Edição permanentemente bloqueada." }
        }

        const shouldResetToAnalysis = (proposta.status === 'APROVADO' && unlockStatus) || proposta.status === 'REPROVADO'
        const novoStatus = shouldResetToAnalysis ? 'EM_ANALISE' : proposta.status

        type ParcelaInsert = {
            sysTenantId: bigint, sysUserId: bigint, escopoId: bigint, propostaId: bigint, 
            tipo: string, parcela: number, vencimento: Date, valor: number
        }
        
        const parcelasParaInserir: ParcelaInsert[] = []
        
        for (const cond of condicoes) {
            let tipoLetra = 'O'
            if (cond.tipo === 'ENTRADA') tipoLetra = 'E'
            else if (cond.tipo === 'MENSAL') tipoLetra = 'M'
            else if (cond.tipo === 'INTERMEDIARIAS') tipoLetra = 'I'
            else if (cond.tipo === 'ANUAL') tipoLetra = 'A'
            else if (cond.tipo === 'CHAVES') tipoLetra = 'C'
            else if (cond.tipo === 'FINANCIAMENTO') tipoLetra = 'F'

            const dataBase = new Date(cond.dataVencimento)
            
            for (let i = 0; i < cond.qtdeParcelas; i++) {
                const vencimentoParcela = new Date(dataBase)
                if (cond.tipo === 'MENSAL') vencimentoParcela.setMonth(vencimentoParcela.getMonth() + i)
                else if (cond.tipo === 'INTERMEDIARIAS') vencimentoParcela.setMonth(vencimentoParcela.getMonth() + (i * 6))
                else if (cond.tipo === 'ANUAL') vencimentoParcela.setMonth(vencimentoParcela.getMonth() + (i * 12))
                
                parcelasParaInserir.push({
                    sysTenantId: tenantId,
                    sysUserId: userId,
                    escopoId: proposta.escopoId,
                    propostaId: pId,
                    tipo: tipoLetra,
                    parcela: i + 1,
                    vencimento: vencimentoParcela,
                    valor: cond.valorParcela
                })
            }
        }

        parcelasParaInserir.sort((a, b) => {
            const dateA = a.vencimento.getTime()
            const dateB = b.vencimento.getTime()
            if (dateA !== dateB) return dateA - dateB
            const typeWeight: Record<string, number> = { 'E': 1, 'M': 2, 'I': 3, 'A': 4, 'C': 5, 'F': 6, 'O': 7 }
            return (typeWeight[a.tipo] || 99) - (typeWeight[b.tipo] || 99)
        })

        parcelasParaInserir.forEach((p, idx) => { p.parcela = idx + 1 })

        await prisma.$transaction(async (tx) => {
            await tx.ycPropostas.update({
                where: { id: pId },
                data: { 
                    status: novoStatus, 
                    valorProposta: novoValorTotal,
                    ...(shouldResetToAnalysis ? {
                        dataDecisao: null, usuarioDecisaoId: null, motivoRejeicao: null, observacaoDecisao: null
                    } : {})
                }
            })

            await tx.ycPropostasParcelas.deleteMany({ where: { propostaId: pId } })
            await tx.ycPropostasCondicoes.deleteMany({ where: { propostaId: pId } })

            await tx.ycPropostasCondicoes.createMany({
                data: condicoes.map(c => ({
                    sysTenantId: tenantId,
                    sysUserId: userId,
                    escopoId: proposta.escopoId,
                    propostaId: pId,
                    tipo: c.tipo,
                    dataVencimento: c.dataVencimento,
                    valorParcela: c.valorParcela,
                    qtdeParcelas: c.qtdeParcelas,
                    valorTotal: c.valorTotal
                }))
            })

            await tx.ycPropostasParcelas.createMany({ data: parcelasParaInserir })

            if (shouldResetToAnalysis) {
                await tx.ycPropostasHistorico.create({
                    data: {
                        sysTenantId: tenantId,
                        sysUserId: userId,
                        escopoId: proposta.escopoId,
                        propostaId: pId,
                        statusAnterior: proposta.status, 
                        statusNovo: 'EM_ANALISE',
                        acao: 'REVISAO',
                        observacao: 'Edição financeira: Proposta retornou para análise'
                    }
                })
            }
        })

        return { success: true, message: "Condições atualizadas e parcelas geradas com sucesso!" }
    } catch (error) {
        console.error("Erro ao salvar condições:", error)
        return { success: false, message: "Erro interno ao salvar condições." }
    }
}

export async function getProposalInstallments(propostaId: string): Promise<ProposalInstallmentItem[]> {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_VER')) return []

    const prop = await checkProposalAccess(BigInt(propostaId), userId, tenantId, cracha)
    if (!prop) return []

    try {
        const parcelas = await prisma.ycPropostasParcelas.findMany({
            where: { propostaId: BigInt(propostaId) },
            orderBy: { parcela: 'asc' }
        })

        return parcelas.map(p => ({
            id: p.id.toString(),
            tipo: p.tipo,
            parcela: p.parcela,
            vencimento: p.vencimento,
            valor: Number(p.valor)
        }))
    } catch (error) {
        console.error("Erro ao buscar parcelas:", error)
        return []
    }
}

export async function saveProposalInstallments(
    propostaId: string,
    parcelas: Omit<ProposalInstallmentItem, 'id'>[],
    unlockStatus: boolean
) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const pId = BigInt(propostaId)
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) {
        return { success: false, message: "Você não tem permissão para editar." }
    }

    const proposta = await checkProposalAccess(pId, userId, tenantId, cracha)
    if (!proposta) return { success: false, message: "Proposta não encontrada ou acesso negado." }

    try {
        if (proposta.status === 'APROVADO' && !unlockStatus) return { success: false, message: "Proposta APROVADA. Desbloqueie para editar." }

        const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposta.status)
        if (isFormalizing) return { success: false, message: "Proposta em fase de contrato. Edição permanentemente bloqueada." }

        const shouldResetToAnalysis = (proposta.status === 'APROVADO' && unlockStatus) || proposta.status === 'REPROVADO'
        const novoStatus = shouldResetToAnalysis ? 'EM_ANALISE' : proposta.status

        const agrupamento: Record<string, {
            tipoCompleto: string, dataVencimento: Date, valorParcela: number, qtdeParcelas: number, valorTotal: number
        }> = {}

        const mapTipo: Record<string, string> = {
            'E': 'ENTRADA', 'M': 'MENSAL', 'I': 'INTERMEDIARIAS',
            'A': 'ANUAL', 'C': 'CHAVES', 'F': 'FINANCIAMENTO', 'O': 'OUTROS'
        }

        parcelas.forEach(p => {
            const key = `${p.tipo}_${p.valor.toFixed(2)}`
            if (!agrupamento[key]) {
                agrupamento[key] = {
                    tipoCompleto: mapTipo[p.tipo] || 'OUTROS',
                    dataVencimento: p.vencimento,
                    valorParcela: p.valor,
                    qtdeParcelas: 0,
                    valorTotal: 0
                }
            } else {
                if (p.vencimento < agrupamento[key].dataVencimento) agrupamento[key].dataVencimento = p.vencimento
            }
            agrupamento[key].qtdeParcelas += 1
            agrupamento[key].valorTotal += p.valor
        })

        const condicoesParaInserir = Object.values(agrupamento)
        
        await prisma.$transaction(async (tx) => {
            if (shouldResetToAnalysis) {
                await tx.ycPropostas.update({
                    where: { id: pId },
                    data: { status: novoStatus, dataDecisao: null, usuarioDecisaoId: null, motivoRejeicao: null, observacaoDecisao: null }
                })
            }

            await tx.ycPropostasParcelas.deleteMany({ where: { propostaId: pId } })
            await tx.ycPropostasCondicoes.deleteMany({ where: { propostaId: pId } })

            const parcelasOrdenadas = [...parcelas].sort((a, b) => {
                const dateA = new Date(a.vencimento).getTime()
                const dateB = new Date(b.vencimento).getTime()
                if (dateA !== dateB) return dateA - dateB
                const typeWeight: Record<string, number> = { 'E': 1, 'M': 2, 'I': 3, 'A': 4, 'C': 5, 'F': 6, 'O': 7 }
                return (typeWeight[a.tipo] || 99) - (typeWeight[b.tipo] || 99)
            })

            await tx.ycPropostasParcelas.createMany({
                data: parcelasOrdenadas.map((p, index) => ({
                    sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                    propostaId: pId, tipo: p.tipo, parcela: index + 1, 
                    vencimento: new Date(p.vencimento), valor: p.valor
                }))
            })

            await tx.ycPropostasCondicoes.createMany({
                data: condicoesParaInserir.map(c => ({
                    sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                    propostaId: pId, tipo: c.tipoCompleto, dataVencimento: new Date(c.dataVencimento),
                    valorParcela: c.valorParcela, qtdeParcelas: c.qtdeParcelas, valorTotal: c.valorTotal
                }))
            })

            if (shouldResetToAnalysis) {
                await tx.ycPropostasHistorico.create({
                    data: {
                        sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                        propostaId: pId, statusAnterior: proposta.status, statusNovo: 'EM_ANALISE',
                        acao: 'REVISAO', observacao: 'Edição de parcelas: Proposta retornou para análise'
                    }
                })
            }
        })

        return { success: true, message: "Fluxo fino salvo e resumo regerado!" }
    } catch (error) {
        console.error("Erro ao salvar fluxo fino:", error)
        return { success: false, message: "Erro interno ao salvar parcelas." }
    }
}

export async function getProposalParties(propostaId: string): Promise<ProposalPartyItem[]> {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_VER')) return []

    const prop = await checkProposalAccess(BigInt(propostaId), userId, tenantId, cracha)
    if (!prop) return []

    try {
        const partes = await prisma.ycPropostasPartes.findMany({
            where: { propostaId: BigInt(propostaId) },
            include: {
                ycEntidades: {
                    select: { nome: true, documento: true, tipo: true }
                }
            },
            orderBy: [ { numGrupo: 'asc' }, { isResponsavel: 'desc' } ]
        })

        return partes.map(p => ({
            id: p.id.toString(),
            entidadeId: p.entidadeId.toString(),
            nome: p.ycEntidades.nome,
            documento: p.ycEntidades.documento || 'N/A',
            tipoEntidade: p.ycEntidades.tipo,
            tipoParticipacao: p.tipo,
            percParticipacao: Number(p.percParticipacao),
            isResponsavel: p.isResponsavel,
            numGrupo: p.numGrupo
        }))
    } catch (error) {
        console.error("Erro ao buscar partes da proposta:", error)
        return []
    }
}

export async function saveProposalParties(
    propostaId: string,
    partes: Omit<ProposalPartyItem, 'id' | 'nome' | 'documento' | 'tipoEntidade'>[],
    unlockStatus: boolean
) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const pId = BigInt(propostaId)
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) {
        return { success: false, message: "Sem permissão." }
    }

    const proposta = await checkProposalAccess(pId, userId, tenantId, cracha)
    if (!proposta) return { success: false, message: "Acesso negado." }

    try {
        if (proposta.status === 'APROVADO' && !unlockStatus) return { success: false, message: "Proposta APROVADA. Desbloqueie para editar." }

        const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposta.status)
        if (isFormalizing) return { success: false, message: "Proposta em fase de contrato. Edição permanentemente bloqueada." }

        const shouldResetToAnalysis = (proposta.status === 'APROVADO' && unlockStatus) || proposta.status === 'REPROVADO'
        const novoStatus = shouldResetToAnalysis ? 'EM_ANALISE' : proposta.status

        await prisma.$transaction(async (tx) => {
            if (shouldResetToAnalysis) {
                await tx.ycPropostas.update({
                    where: { id: pId },
                    data: { status: novoStatus, dataDecisao: null, usuarioDecisaoId: null, motivoRejeicao: null, observacaoDecisao: null }
                })
            }

            await tx.ycPropostasPartes.deleteMany({ where: { propostaId: pId } })

            if (partes.length > 0) {
                await tx.ycPropostasPartes.createMany({
                    data: partes.map(p => ({
                        sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                        propostaId: pId, entidadeId: BigInt(p.entidadeId), tipo: p.tipoParticipacao,
                        percParticipacao: p.percParticipacao, isResponsavel: p.isResponsavel, numGrupo: p.numGrupo
                    }))
                })
            }

            if (shouldResetToAnalysis) {
                await tx.ycPropostasHistorico.create({
                    data: {
                        sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                        propostaId: pId, statusAnterior: proposta.status, statusNovo: 'EM_ANALISE',
                        acao: 'REVISAO', observacao: 'Edição de compradores: Proposta retornou para análise'
                    }
                })
            }
        })

        return { success: true, message: "Compradores atualizados com sucesso!" }
    } catch (error) {
        console.error("Erro ao salvar partes da proposta:", error)
        return { success: false, message: "Erro interno ao salvar compradores." }
    }
}

export async function getProposalCommissions(propostaId: string): Promise<ProposalCommissionItem[]> {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_VER')) return []

    const prop = await checkProposalAccess(BigInt(propostaId), userId, tenantId, cracha)
    if (!prop) return []

    try {
        const comissoes = await prisma.ycPropostasComissoes.findMany({
            where: { propostaId: BigInt(propostaId) },
            include: {
                ycEntidades: { select: { nome: true, documento: true, tipo: true } }
            },
            orderBy: [ { isResponsavel: 'desc' }, { percRateio: 'desc' } ]
        })

        return comissoes.map(c => ({
            id: c.id.toString(),
            entidadeId: c.entidadeId.toString(),
            nome: c.ycEntidades.nome,
            documento: c.ycEntidades.documento || 'N/A',
            tipoEntidade: c.ycEntidades.tipo,
            percVGV: Number(c.percVGV),
            percRateio: Number(c.percRateio),
            valor: Number(c.valor),
            isResponsavel: c.isResponsavel
        }))
    } catch (error) {
        console.error("Erro ao buscar comissões da proposta:", error)
        return []
    }
}

export async function saveProposalCommissions(
    propostaId: string,
    comissoes: Omit<ProposalCommissionItem, 'id' | 'nome' | 'documento' | 'tipoEntidade'>[],
    unlockStatus: boolean
) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const pId = BigInt(propostaId)
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) {
        return { success: false, message: "Sem permissão." }
    }

    const proposta = await checkProposalAccess(pId, userId, tenantId, cracha)
    if (!proposta) return { success: false, message: "Acesso negado." }

    try {
        if (proposta.status === 'APROVADO' && !unlockStatus) return { success: false, message: "Proposta APROVADA. Desbloqueie para editar." }

        const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposta.status)
        if (isFormalizing) return { success: false, message: "Proposta em fase de contrato. Edição permanentemente bloqueada." }

        const shouldResetToAnalysis = (proposta.status === 'APROVADO' && unlockStatus) || proposta.status === 'REPROVADO'
        const novoStatus = shouldResetToAnalysis ? 'EM_ANALISE' : proposta.status

        await prisma.$transaction(async (tx) => {
            if (shouldResetToAnalysis) {
                await tx.ycPropostas.update({
                    where: { id: pId },
                    data: { status: novoStatus, dataDecisao: null, usuarioDecisaoId: null, motivoRejeicao: null, observacaoDecisao: null }
                })
            }

            await tx.ycPropostasComissoes.deleteMany({ where: { propostaId: pId } })

            if (comissoes.length > 0) {
                await tx.ycPropostasComissoes.createMany({
                    data: comissoes.map(c => ({
                        sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                        propostaId: pId, entidadeId: BigInt(c.entidadeId), percVGV: c.percVGV,
                        percRateio: c.percRateio, valor: c.valor, isResponsavel: c.isResponsavel
                    }))
                })
            }

            if (shouldResetToAnalysis) {
                await tx.ycPropostasHistorico.create({
                    data: {
                        sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                        propostaId: pId, statusAnterior: proposta.status, statusNovo: 'EM_ANALISE',
                        acao: 'REVISAO', observacao: 'Edição de intermediação: Proposta retornou para análise'
                    }
                })
            }
        })

        return { success: true, message: "Comissões atualizadas com sucesso!" }
    } catch (error) {
        console.error("Erro ao salvar comissões da proposta:", error)
        return { success: false, message: "Erro interno ao salvar comissões." }
    }
}

export async function getProposalHistory(propostaId: string): Promise<ProposalHistoryItem[]> {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_VER')) return []

    const prop = await checkProposalAccess(BigInt(propostaId), userId, tenantId, cracha)
    if (!prop) return []

    try {
        const historico = await prisma.ycPropostasHistorico.findMany({
            where: { propostaId: BigInt(propostaId) },
            include: { ycUsuarios: true },
            orderBy: { sysCreatedAt: 'desc' }
        })

        return historico.map(h => ({
            id: h.id.toString(), statusAnterior: h.statusAnterior, statusNovo: h.statusNovo,
            acao: h.acao, observacao: h.observacao, data: h.sysCreatedAt, usuarioNome: h.ycUsuarios?.nome || 'Sistema'
        }))
    } catch (error) {
        console.error("Erro ao buscar histórico:", error)
        return []
    }
}

// --- 14. GERAR DOCUMENTO E TRAVAR PROPOSTA (HARD LOCK) ---
export async function lockProposalForSignature(propostaId: string, tipoDoc: string, novoStatus: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const pId = BigInt(propostaId)
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) {
        return { success: false, message: "Sem permissão." }
    }

    const proposta = await checkProposalAccess(pId, userId, tenantId, cracha)
    if (!proposta) return { success: false, message: "Acesso negado." }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.ycPropostas.update({
                where: { id: pId },
                data: { status: novoStatus } 
            })

            await tx.ycPropostasHistorico.create({
                data: {
                    sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                    propostaId: pId, statusAnterior: proposta.status, statusNovo: novoStatus, 
                    acao: 'REVISAO', observacao: `Documento emitido (${tipoDoc}). Proposta avançou para ${novoStatus}.`
                }
            })
        })

        return { success: true, message: "Documento emitido com sucesso!" }
    } catch (error) {
        console.error("Erro ao travar proposta:", error)
        return { success: false, message: "Erro interno ao emitir documento." }
    }
}

// --- 15. SUBMETER PROPOSTA PARA ANÁLISE ---
export async function submitProposalForAnalysis(propostaId: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const pId = BigInt(propostaId)
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) {
        return { success: false, message: "Sem permissão." }
    }

    const proposta = await checkProposalAccess(pId, userId, tenantId, cracha)
    if (!proposta) return { success: false, message: "Acesso negado." }

    try {
        if (proposta.status !== 'RASCUNHO' && proposta.status !== 'REPROVADO') {
            return { success: false, message: "Apenas propostas em rascunho ou reprovadas podem ser submetidas." }
        }

        const propostaConcorrente = await prisma.ycPropostas.findFirst({
            where: {
                sysTenantId: tenantId,
                unidadeId: proposta.unidadeId,
                id: { not: pId }, 
                status: { in: ['EM_ANALISE', 'APROVADO', 'FORMALIZADA', 'EM_ASSINATURA', 'ASSINADO'] }
            }
        })

        if (propostaConcorrente) {
            return { success: false, message: `Operação bloqueada! Já existe outra proposta em andamento para esta mesma unidade.` }
        }
        
        await prisma.$transaction(async (tx) => {
            await tx.ycPropostas.update({
                where: { id: pId },
                data: { status: 'EM_ANALISE' }
            })

            await tx.ycPropostasHistorico.create({
                data: {
                    sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                    propostaId: pId, statusAnterior: proposta.status, statusNovo: 'EM_ANALISE',
                    acao: 'SUBMETEU', observacao: proposta.status === 'REPROVADO' 
                        ? 'Proposta revisada e reenviada para análise da diretoria.' 
                        : 'Proposta submetida para análise da diretoria.'
                }
            })
        })

        return { success: true, message: "Proposta enviada para análise!" }
    } catch (error) {
        console.error("Erro ao submeter proposta:", error)
        return { success: false, message: "Erro interno ao submeter proposta." }
    }
}

// --- 16. BUSCAR ANEXOS DA PROPOSTA (ABA 6) ---
export async function getProposalAttachments(propostaId: string): Promise<ProposalAttachmentItem[]> {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_VER')) return []

    const prop = await checkProposalAccess(BigInt(propostaId), userId, tenantId, cracha)
    if (!prop) return []

    try {
        const anexos = await prisma.ycPropostasAnexos.findMany({
            where: { propostaId: BigInt(propostaId) },
            orderBy: { sysCreatedAt: 'asc' }
        })

        return anexos.map(a => ({
            id: a.id.toString(), nomeArquivo: a.nomeArquivo, classificacao: a.classificacao,
            descricao: a.descricao, urlArquivo: a.urlArquivo, fileSize: 0
        }))
    } catch (error) {
        console.error("Erro ao buscar anexos da proposta:", error)
        return []
    }
}

// --- 17.A. PEDIR LINKS DE UPLOAD DIRETO PRO AZURE ---
export async function getDirectUploadUrls(propostaId: string, fileNames: string[]) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, data: [] }
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) return { success: false, data: [] }

    const prop = await checkProposalAccess(BigInt(propostaId), userId, tenantId, cracha)
    if (!prop) return { success: false, data: [] }

    try {
        const containerName = 'private-docs'
        const folderPath = `tenant-${tenantId}/proposta-${propostaId}`

        const urls = await Promise.all(fileNames.map(async (fileName) => {
            const { uploadUrl, relativePath } = await getUploadSasUrl(containerName, folderPath, fileName)
            return { fileName, uploadUrl, relativePath }
        }))

        return { success: true, data: urls }
    } catch (error) {
        console.error("Erro ao gerar links de upload:", error)
        return { success: false, data: [] }
    }
}

// --- 17.B. SALVAR METADADOS NO BANCO APÓS O UPLOAD ---
export async function saveAttachmentsMetadata(propostaId: string, attachmentsData: Array<{fileName: string, classificacao: string, observacao: string, relativePath: string}>) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const pId = BigInt(propostaId)
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) return { success: false, message: "Sem permissão." }

    const proposta = await checkProposalAccess(pId, userId, tenantId, cracha)
    if (!proposta) return { success: false, message: "Acesso negado." }

    try {
        const savePromises = attachmentsData.map(data => {
            return prisma.ycPropostasAnexos.create({
                data: {
                    sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                    propostaId: pId, nomeArquivo: data.fileName, classificacao: data.classificacao,
                    descricao: data.observacao, urlArquivo: data.relativePath
                }
            })
        })

        const savedAttachments = await Promise.all(savePromises)

        const hasContratoAssinado = attachmentsData.some(a => a.classificacao === 'Contrato Assinado')
        
        if (hasContratoAssinado && proposta.unidadeId) {
            await prisma.$transaction([
                prisma.ycPropostas.update({
                    where: { id: pId }, data: { status: 'ASSINADO', sysUpdatedAt: new Date() }
                }),
                prisma.ycUnidades.update({
                    where: { id: proposta.unidadeId }, data: { statusComercial: 'VENDIDO' }
                }),
                prisma.ycPropostasHistorico.create({
                    data: {
                        sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                        propostaId: pId, statusAnterior: proposta.status, statusNovo: 'ASSINADO',
                        acao: 'ASSINOU', observacao: 'Contrato assinado anexado. Unidade vendida.'
                    }
                })
            ])
        }

        const newItems = savedAttachments.map(a => ({
            id: a.id.toString(), nomeArquivo: a.nomeArquivo, classificacao: a.classificacao,
            descricao: a.descricao, urlArquivo: a.urlArquivo, fileSize: 0
        }))

        return { success: true, message: `${savedAttachments.length} arquivo(s) salvo(s)!`, data: newItems }
    } catch (error) {
        console.error("Erro ao salvar metadados dos anexos:", error)
        return { success: false, message: "Erro ao registrar arquivos no banco de dados." }
    }
}

// --- 18. EXCLUIR UM ANEXO ESPECÍFICO ---
export async function deleteProposalAttachment(anexoId: string, urlArquivo: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) return { success: false, message: "Sem permissão." }

    try {
        const idBase = BigInt(anexoId)
        const anexo = await prisma.ycPropostasAnexos.findUnique({ where: { id: idBase } })
        if (!anexo) return { success: false, message: "Anexo não encontrado no banco." }

        const proposta = await checkProposalAccess(anexo.propostaId, userId, tenantId, cracha)
        if (!proposta) return { success: false, message: "Acesso negado à proposta deste anexo." }

        await deleteFileFromAzureByPath(urlArquivo)

        await prisma.$transaction(async (tx) => {
            await tx.ycPropostasAnexos.delete({ where: { id: idBase } })

            if ((anexo.classificacao === 'Contrato Assinado' || anexo.classificacao === 'CONTRATO_ASSINADO') && proposta) {
                await tx.ycPropostas.update({
                    where: { id: proposta.id }, data: { status: 'EM_ASSINATURA', sysUpdatedAt: new Date() }
                })
                if (proposta.unidadeId) {
                    await tx.ycUnidades.update({
                        where: { id: proposta.unidadeId }, data: { statusComercial: 'EM_ANALISE' }
                    })
                }
                await tx.ycPropostasHistorico.create({
                    data: {
                        sysTenantId: tenantId, sysUserId: userId, escopoId: anexo.escopoId,
                        propostaId: proposta.id, statusAnterior: proposta.status, statusNovo: 'EM_ASSINATURA',
                        acao: 'EXCLUIU_ANEXO', observacao: 'Via assinada do contrato removida. Unidade e proposta retornaram para assinatura.'
                    }
                })
            }
        })

        return { success: true, message: "Anexo removido com sucesso." }
    } catch (error) {
        console.error("Erro ao deletar anexo:", error)
        return { success: false, message: "Erro interno ao excluir arquivo." }
    }
}

// --- 19. GERAR LINK DE DOWNLOAD SEGURO ---
export async function getAttachmentDownloadUrl(urlArquivo: string, originalName: string) {
    const session = await auth()
    // Apenas requer estar logado (Permissão de ver os arquivos já foi validada na aba 6)
    if (!session) return { success: false, url: null }

    try {
        const url = await getFileDownloadUrl(urlArquivo, originalName)
        return { success: true, url }
    } catch (error) {
        console.error("Erro ao gerar link de download:", error)
        return { success: false, url: null }
    }
}

// --- 20. DESBLOQUEAR PROPOSTA PARA EDIÇÃO ---
export async function unlockProposalEdit(propostaId: string, origemEdicao: string = "Edição de Dados") {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const pId = BigInt(propostaId)
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) return { success: false, message: "Sem permissão." }

    const proposta = await checkProposalAccess(pId, userId, tenantId, cracha)
    if (!proposta) return { success: false, message: "Acesso negado." }

    try {
        if (proposta.status !== 'APROVADO' && proposta.status !== 'REPROVADO') {
            return { success: false, message: "A proposta não está em um status que permite desbloqueio." }
        }

        await prisma.$transaction(async (tx) => {
            await tx.ycPropostas.update({
                where: { id: pId },
                data: { status: 'EM_ANALISE', dataDecisao: null, usuarioDecisaoId: null, motivoRejeicao: null, observacaoDecisao: null }
            })
            await tx.ycPropostasHistorico.create({
                data: {
                    sysTenantId: tenantId, sysUserId: userId, escopoId: proposta.escopoId,
                    propostaId: pId, statusAnterior: proposta.status, statusNovo: 'EM_ANALISE',
                    acao: 'REVISAO', observacao: `${origemEdicao}: Proposta desbloqueada e retornou para análise`
                }
            })
        })

        revalidatePath('/app/comercial/propostas') 
        return { success: true, message: "Proposta desbloqueada para edição!" }
    } catch (error) {
        console.error("Erro ao desbloquear proposta:", error)
        return { success: false, message: "Erro interno ao desbloquear proposta." }
    }
}

// --- 21. BUSCAR TEMPLATES DO PROJETO ---
export async function getProjectTemplates(projetoId: string, classificacao: string) {
    const session = await auth()
    if (!session?.user?.id) return []
    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_VER')) return []

    try {
        const templates = await prisma.ycProjetosAnexos.findMany({
            where: { projetoId: BigInt(projetoId), classificacao: classificacao, sysTenantId: tenantId },
            orderBy: { sysCreatedAt: 'desc' }
        })

        return templates.map(t => ({
            id: t.id.toString(), nomeArquivo: t.nomeArquivo, urlArquivo: t.urlArquivo
        }))
    } catch (error) {
        console.error("Erro ao buscar templates:", error)
        return []
    }
}

// --- 22. GERADOR DE CONTRATO/TERMO (DOCX TEMPLATER) ---
export async function generateDocumentFromTemplate(propostaId: string, urlArquivoAzure: string, tipoDocumento: 'termo' | 'contrato') {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado" }

    const tenantId = BigInt(await getCurrentTenantId() || 0)
    const userId = BigInt(session.user.id)
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('PROPOSTAS_EDITAR')) return { success: false, message: "Sem permissão." }

    const propostaAtual = await checkProposalAccess(BigInt(propostaId), userId, tenantId, cracha)
    if (!propostaAtual) return { success: false, message: "Acesso negado." }

    try {
        const dictionary = await buildContractDictionary(propostaId)

        const sasUrl = await getFileDownloadUrl(urlArquivoAzure)
        if (!sasUrl) return { success: false, message: "Erro ao acessar o template na nuvem." }

        const fileResponse = await fetch(sasUrl)
        if (!fileResponse.ok) return { success: false, message: "Erro ao baixar o template original." }
        
        const arrayBuffer = await fileResponse.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const zip = new PizZip(buffer)
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true, linebreaks: true, delimiters: { start: '{{', end: '}}' } 
        })

        doc.render(dictionary)

        const generatedBuffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" })

        const prefix = tipoDocumento === 'termo' ? 'TERMO' : 'CCV'
        
        const safeEmpreendimento = dictionary.NOME_EMPREENDIMENTO
            .replace(/\s*-\s*/g, '_').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase()

        const safeName = dictionary.NOME_COMPRADOR
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s]/g, '')
            .trim().replace(/\s+/g, '_').toUpperCase()

        const fileName = `${prefix}_${safeEmpreendimento}_UN${dictionary.NUMERO_UNIDADE}_${safeName}.docx`

        const containerName = 'private-docs'
        const folderPath = `tenant-${tenantId}/proposta-${propostaId}`
        const blobName = `${randomUUID()}.docx`
        const relativePath = `${folderPath}/${blobName}`

        const fileUrl = await uploadBufferToAzure(
            generatedBuffer, containerName, relativePath, 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
        if (!fileUrl) return { success: false, message: "Erro ao salvar o documento na nuvem." }

        const classificacao = tipoDocumento === 'termo' ? 'Termo Gerado' : 'Contrato Gerado'
        const novoStatus = tipoDocumento === 'termo' ? 'FORMALIZADA' : 'EM_ASSINATURA'
        const acaoHist = tipoDocumento === 'termo' ? 'GEROU_TERMO' : 'GEROU_CONTRATO'
        const labelPrefix = tipoDocumento === 'termo' ? 'Termo' : 'Contrato'
        const descricaoAmigavel = `Via do ${labelPrefix} gerada.`

        await prisma.$transaction(async (tx) => {
            await tx.ycPropostasAnexos.create({
                data: {
                    sysTenantId: tenantId, sysUserId: userId, escopoId: propostaAtual.escopoId,
                    propostaId: BigInt(propostaId), nomeArquivo: fileName, descricao: descricaoAmigavel, 
                    classificacao: classificacao, urlArquivo: fileUrl 
                }
            })

            await tx.ycPropostas.update({
                where: { id: BigInt(propostaId) },
                data: { status: novoStatus, sysUpdatedAt: new Date() }
            })

            if (propostaAtual.unidadeId) {
                await tx.ycUnidades.update({
                    where: { id: propostaAtual.unidadeId },
                    data: { statusComercial: 'EM_ANALISE' }
                })
            }

            await tx.ycPropostasHistorico.create({
                data: {
                    sysTenantId: tenantId, sysUserId: userId, escopoId: propostaAtual.escopoId,
                    propostaId: BigInt(propostaId), statusAnterior: propostaAtual.status, statusNovo: novoStatus,
                    acao: acaoHist, observacao: `Documento (${fileName}) gerado e salvo nos anexos.`
                }
            })
        })

        // Busca rapidamente o ID do projeto para poder atualizar a rota (revalidatePath)
        const pInfo = await prisma.ycPropostas.findUnique({
            where: { id: BigInt(propostaId) },
            select: { ycUnidades: { select: { projetoId: true } } }
        })

        if (pInfo?.ycUnidades?.projetoId) {
            revalidatePath(`/app/comercial/propostas/${pInfo.ycUnidades.projetoId}/editar/${propostaId}`)
        }

        return { success: true, base64: generatedBuffer.toString('base64'), fileName }

    } catch (error) {
        console.error("Erro na geração do documento:", error)
        return { success: false, message: "Falha ao processar o documento. Verifique as variáveis do Template." }
    }
}