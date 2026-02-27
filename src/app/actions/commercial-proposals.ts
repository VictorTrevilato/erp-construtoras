'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { revalidatePath } from "next/cache"

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
    tipo: string // 'E', 'M', 'I', 'A', 'C', 'F', 'O'
    parcela: number
    vencimento: Date
    valor: number
}

export type ProposalPartyItem = {
    id: string
    entidadeId: string
    nome: string
    documento: string
    tipoEntidade: string // 'PF' ou 'PJ'
    tipoParticipacao: string // 'COMPRADOR', 'CONJUGE', 'AVALISTA', etc.
    percParticipacao: number
    isResponsavel: boolean
    numGrupo: number
}

export type ProposalCommissionItem = {
    id: string
    entidadeId: string
    nome: string
    documento: string
    tipoEntidade: string // 'PF' ou 'PJ'
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

// ==========================================
// 2. SERVER ACTIONS (HUBS E PROPOSTAS)
// ==========================================

// --- LISTAR PROJETOS (HUB 1) ---
export async function getProposalProjects(): Promise<ProposalProjectSummary[]> {
  const session = await auth()
  if (!session) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []
  const tenantId = BigInt(tenantIdStr)

  try {
    const projects = await prisma.ycProjetos.findMany({
      where: {
        sysTenantId: tenantId,
        ycUnidades: { some: {} } 
      },
      select: {
        id: true,
        nome: true,
        cidade: true,
        estado: true,
        logo: true,
        tipo: true,   
        status: true, 
        _count: {     
          select: { ycBlocos: true }
        },
        ycUnidades: {
          select: {
            id: true, 
            _count: {
              select: { ycPropostas: true }
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
  if (!session) return []

  try {
    const proposals = await prisma.ycPropostas.findMany({
      where: {
        ycUnidades: { projetoId: BigInt(projetoId) }
      },
      include: {
        ycLeads: true,
        ycUnidades: {
            include: { ycBlocos: true }
        },
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
    if (!session) return { success: false, message: "Não autorizado" }
    
    try {
        const prop = await prisma.ycPropostas.findUnique({ where: { id: BigInt(id) } })
        if (!prop) return { success: false, message: "Proposta não encontrada" }
        
        if (prop.status !== 'RASCUNHO') {
            return { success: false, message: "Apenas propostas em Rascunho podem ser excluídas." }
        }

        await prisma.$transaction([
            prisma.ycPropostasHistorico.deleteMany({ where: { propostaId: BigInt(id) } }),
            prisma.ycPropostasCondicoes.deleteMany({ where: { propostaId: BigInt(id) } }),
            prisma.ycPropostasParcelas.deleteMany({ where: { propostaId: BigInt(id) } }),
            prisma.ycPropostasPartes.deleteMany({ where: { propostaId: BigInt(id) } }),
            prisma.ycPropostasComissoes.deleteMany({ where: { propostaId: BigInt(id) } }),
            prisma.ycPropostas.delete({ where: { id: BigInt(id) } })
        ])

        revalidatePath('/app/comercial/propostas')
        return { success: true, message: "Proposta excluída com sucesso." }
    } catch(e) {
        console.error(e)
        return { success: false, message: "Erro ao excluir proposta." }
    }
}

// ==========================================
// 3. SERVER ACTIONS (ABAS DA PROPOSTA)
// ==========================================

// --- BUSCAR DETALHES COMPLETOS (ABA 1) ---
export async function getProposalDetails(propostaId: string): Promise<ProposalFullDetail | null> {
  const session = await auth()
  if (!session) return null

  try {
    const prop = await prisma.ycPropostas.findUnique({
      where: { id: BigInt(propostaId) },
      include: {
        ycUnidades: {
          include: { ycBlocos: true }
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

      tabela: {
        codigo: prop.ycTabelasPreco?.codigo || "N/A",
        nome: prop.ycTabelasPreco?.nome || "Tabela não encontrada"
      },

      corretorNome: prop.ycUsuarios?.nome || "Não identificado",
      lead: {
        nome: prop.ycLeads.nome,
        email: prop.ycLeads.email,
        telefone: prop.ycLeads.telefone,
        origem: prop.ycLeads.origem
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

// --- BUSCAR CONDIÇÕES DA PROPOSTA (ABA 2) ---
export async function getProposalConditions(propostaId: string): Promise<ProposalConditionItem[]> {
    const session = await auth()
    if (!session) return []

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

// --- SALVAR CONDIÇÕES E REGERAR PARCELAS (ABA 2 -> ABA 3) ---
export async function saveProposalConditions(
    propostaId: string, 
    condicoes: Omit<ProposalConditionItem, 'id'>[], 
    novoValorTotal: number, 
    unlockStatus: boolean
) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado." }

    try {
        const pId = BigInt(propostaId)
        const tenantId = BigInt(await getCurrentTenantId() || 0)
        const userId = BigInt(session.user.id)

        const proposta = await prisma.ycPropostas.findUnique({ where: { id: pId } })
        if (!proposta) return { success: false, message: "Proposta não encontrada." }

        // Trava de Segurança
        if (proposta.status === 'APROVADO' && !unlockStatus) {
            return { success: false, message: "Proposta APROVADA. Desbloqueie para editar." }
        }

        // Hard Lock de Efetivação
        const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposta.status)
        if (isFormalizing) {
            return { success: false, message: "Proposta em fase de contrato. Edição permanentemente bloqueada." }
        }

        // Volta para análise se foi Desbloqueada (Aprovada) OU se estava Reprovada
        const shouldResetToAnalysis = (proposta.status === 'APROVADO' && unlockStatus) || proposta.status === 'REPROVADO'
        const novoStatus = shouldResetToAnalysis ? 'EM_ANALISE' : proposta.status

        // CORREÇÃO AQUI: Criamos um Type rápido para o array de inserção para o TS não chorar
        type ParcelaInsert = {
            sysTenantId: bigint
            sysUserId: bigint
            escopoId: bigint
            propostaId: bigint
            tipo: string
            parcela: number
            vencimento: Date
            valor: number
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

        // --- ORDENAÇÃO CRONOLÓGICA DAS PARCELAS ---
        parcelasParaInserir.sort((a, b) => {
            const dateA = a.vencimento.getTime()
            const dateB = b.vencimento.getTime()
            if (dateA !== dateB) return dateA - dateB
            // Desempate por Tipo (Entrada ganha de Mensal, etc)
            const typeWeight: Record<string, number> = { 'E': 1, 'M': 2, 'I': 3, 'A': 4, 'C': 5, 'F': 6, 'O': 7 }
            return (typeWeight[a.tipo] || 99) - (typeWeight[b.tipo] || 99)
        })

        // Reconstrói a numeração sequencial após ordenar
        parcelasParaInserir.forEach((p, idx) => {
            p.parcela = idx + 1
        })

        await prisma.$transaction(async (tx) => {
            await tx.ycPropostas.update({
                where: { id: pId },
                data: { 
                    status: novoStatus, 
                    valorProposta: novoValorTotal,
                    // Se destravou, limpa os campos de decisão
                    ...(shouldResetToAnalysis ? {
                        dataDecisao: null,
                        usuarioDecisaoId: null,
                        motivoRejeicao: null,
                        observacaoDecisao: null
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

            await tx.ycPropostasParcelas.createMany({
                data: parcelasParaInserir
            })

            if (shouldResetToAnalysis) {
                await tx.ycPropostasHistorico.create({
                    data: {
                        sysTenantId: tenantId,
                        sysUserId: userId,
                        escopoId: proposta.escopoId,
                        propostaId: pId,
                        statusAnterior: proposta.status, // Dinâmico (pode ser APROVADO ou REPROVADO)
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

// --- 7. BUSCAR PARCELAS DA PROPOSTA (ABA 3) ---
export async function getProposalInstallments(propostaId: string): Promise<ProposalInstallmentItem[]> {
    const session = await auth()
    if (!session) return []

    try {
        const parcelas = await prisma.ycPropostasParcelas.findMany({
            where: { propostaId: BigInt(propostaId) },
            // Agora sim a tabela vai respeitar o número da parcela gerado pelo sistema!
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

// --- 8. SALVAR PARCELAS E REGERAR CONDIÇÕES (ABA 3 -> ABA 2) ---
export async function saveProposalInstallments(
    propostaId: string,
    parcelas: Omit<ProposalInstallmentItem, 'id'>[],
    unlockStatus: boolean
) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado." }

    try {
        const pId = BigInt(propostaId)
        const tenantId = BigInt(await getCurrentTenantId() || 0)
        const userId = BigInt(session.user.id)

        const proposta = await prisma.ycPropostas.findUnique({ where: { id: pId } })
        if (!proposta) return { success: false, message: "Proposta não encontrada." }

        // Trava de Segurança
        if (proposta.status === 'APROVADO' && !unlockStatus) {
            return { success: false, message: "Proposta APROVADA. Desbloqueie para editar." }
        }

        // Hard Lock de Efetivação
        const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposta.status)
        if (isFormalizing) {
            return { success: false, message: "Proposta em fase de contrato. Edição permanentemente bloqueada." }
        }

        // Volta para análise se foi Desbloqueada (Aprovada) OU se estava Reprovada
        const shouldResetToAnalysis = (proposta.status === 'APROVADO' && unlockStatus) || proposta.status === 'REPROVADO'
        const novoStatus = shouldResetToAnalysis ? 'EM_ANALISE' : proposta.status

        // --- REGROUPING ENGINE: Converte as parcelas de volta para Condições Resumidas ---
        const agrupamento: Record<string, {
            tipoCompleto: string,
            dataVencimento: Date,
            valorParcela: number,
            qtdeParcelas: number,
            valorTotal: number
        }> = {}

        const mapTipo: Record<string, string> = {
            'E': 'ENTRADA', 'M': 'MENSAL', 'I': 'INTERMEDIARIAS',
            'A': 'ANUAL', 'C': 'CHAVES', 'F': 'FINANCIAMENTO', 'O': 'OUTROS'
        }

        parcelas.forEach(p => {
            // Chave do grupo: Letra + Valor (Ex: M_1500.00). Agrupa parcelas idênticas.
            const key = `${p.tipo}_${p.valor.toFixed(2)}`
            
            if (!agrupamento[key]) {
                agrupamento[key] = {
                    tipoCompleto: mapTipo[p.tipo] || 'OUTROS',
                    dataVencimento: p.vencimento, // Pega a primeira data
                    valorParcela: p.valor,
                    qtdeParcelas: 0,
                    valorTotal: 0
                }
            } else {
                // Mantém sempre a data do primeiro vencimento do grupo
                if (p.vencimento < agrupamento[key].dataVencimento) {
                    agrupamento[key].dataVencimento = p.vencimento
                }
            }
            agrupamento[key].qtdeParcelas += 1
            agrupamento[key].valorTotal += p.valor
        })

        const condicoesParaInserir = Object.values(agrupamento)
        

        // --- TRANSAÇÃO ATÔMICA ---
        await prisma.$transaction(async (tx) => {
            // 1. Atualiza Status e limpa decisão se precisar voltar para análise
            if (shouldResetToAnalysis) {
                await tx.ycPropostas.update({
                    where: { id: pId },
                    data: { 
                        status: novoStatus,
                        dataDecisao: null,
                        usuarioDecisaoId: null,
                        motivoRejeicao: null,
                        observacaoDecisao: null
                    }
                })
            }

            // 2. Limpa as tabelas filhas antigas
            await tx.ycPropostasParcelas.deleteMany({ where: { propostaId: pId } })
            await tx.ycPropostasCondicoes.deleteMany({ where: { propostaId: pId } })

            // 3. Insere a nova grade de Parcelas (Ordenada)
            const parcelasOrdenadas = [...parcelas].sort((a, b) => {
                const dateA = new Date(a.vencimento).getTime()
                const dateB = new Date(b.vencimento).getTime()
                if (dateA !== dateB) return dateA - dateB
                const typeWeight: Record<string, number> = { 'E': 1, 'M': 2, 'I': 3, 'A': 4, 'C': 5, 'F': 6, 'O': 7 }
                return (typeWeight[a.tipo] || 99) - (typeWeight[b.tipo] || 99)
            })

            await tx.ycPropostasParcelas.createMany({
                data: parcelasOrdenadas.map((p, index) => ({
                    sysTenantId: tenantId,
                    sysUserId: userId,
                    escopoId: proposta.escopoId,
                    propostaId: pId,
                    tipo: p.tipo,
                    parcela: index + 1, // Sequência lógica reconstruída perfeitamente
                    vencimento: new Date(p.vencimento),
                    valor: p.valor
                }))
            })

            // 4. Insere as novas Condições baseadas no Regrouping Engine
            await tx.ycPropostasCondicoes.createMany({
                data: condicoesParaInserir.map(c => ({
                    sysTenantId: tenantId,
                    sysUserId: userId,
                    escopoId: proposta.escopoId,
                    propostaId: pId,
                    tipo: c.tipoCompleto,
                    dataVencimento: new Date(c.dataVencimento),
                    valorParcela: c.valorParcela,
                    qtdeParcelas: c.qtdeParcelas,
                    valorTotal: c.valorTotal
                }))
            })

            // 5. Histórico (se ocorreu unlock)
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
                        observacao: 'Edição de parcelas: Proposta retornou para análise'
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

// --- 9. BUSCAR PARTES DA PROPOSTA (ABA 4) ---
export async function getProposalParties(propostaId: string): Promise<ProposalPartyItem[]> {
    const session = await auth()
    if (!session) return []

    try {
        const partes = await prisma.ycPropostasPartes.findMany({
            where: { propostaId: BigInt(propostaId) },
            include: {
                ycEntidades: {
                    select: { nome: true, documento: true, tipo: true }
                }
            },
            orderBy: [
                { numGrupo: 'asc' },
                { isResponsavel: 'desc' }
            ]
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

// --- 10. SALVAR PARTES DA PROPOSTA (ABA 4) ---
export async function saveProposalParties(
    propostaId: string,
    partes: Omit<ProposalPartyItem, 'id' | 'nome' | 'documento' | 'tipoEntidade'>[],
    unlockStatus: boolean
) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado." }

    try {
        const pId = BigInt(propostaId)
        const tenantId = BigInt(await getCurrentTenantId() || 0)
        const userId = BigInt(session.user.id)

        const proposta = await prisma.ycPropostas.findUnique({ where: { id: pId } })
        if (!proposta) return { success: false, message: "Proposta não encontrada." }

        // Trava de Segurança
        if (proposta.status === 'APROVADO' && !unlockStatus) {
            return { success: false, message: "Proposta APROVADA. Desbloqueie para editar." }
        }

        // Hard Lock de Efetivação
        const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposta.status)
        if (isFormalizing) {
            return { success: false, message: "Proposta em fase de contrato. Edição permanentemente bloqueada." }
        }

        // Volta para análise se foi Desbloqueada (Aprovada) OU se estava Reprovada
        const shouldResetToAnalysis = (proposta.status === 'APROVADO' && unlockStatus) || proposta.status === 'REPROVADO'
        const novoStatus = shouldResetToAnalysis ? 'EM_ANALISE' : proposta.status

        // --- TRANSAÇÃO ATÔMICA ---
        await prisma.$transaction(async (tx) => {
            // 1. Atualiza Status e limpa decisão se precisar voltar para análise
            if (shouldResetToAnalysis) {
                await tx.ycPropostas.update({
                    where: { id: pId },
                    data: { 
                        status: novoStatus,
                        dataDecisao: null,
                        usuarioDecisaoId: null,
                        motivoRejeicao: null,
                        observacaoDecisao: null
                    }
                })
            }

            // 2. Remove as partes antigas
            await tx.ycPropostasPartes.deleteMany({ where: { propostaId: pId } })

            // 3. Insere a nova configuração de partes
            if (partes.length > 0) {
                await tx.ycPropostasPartes.createMany({
                    data: partes.map(p => ({
                        sysTenantId: tenantId,
                        sysUserId: userId,
                        escopoId: proposta.escopoId,
                        propostaId: pId,
                        entidadeId: BigInt(p.entidadeId),
                        tipo: p.tipoParticipacao,
                        percParticipacao: p.percParticipacao,
                        isResponsavel: p.isResponsavel,
                        numGrupo: p.numGrupo
                    }))
                })
            }

            // 4. Histórico
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
                        observacao: 'Edição de compradores: Proposta retornou para análise'
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

// --- 11. BUSCAR COMISSÕES DA PROPOSTA (ABA 5) ---
export async function getProposalCommissions(propostaId: string): Promise<ProposalCommissionItem[]> {
    const session = await auth()
    if (!session) return []

    try {
        const comissoes = await prisma.ycPropostasComissoes.findMany({
            where: { propostaId: BigInt(propostaId) },
            include: {
                ycEntidades: {
                    select: { nome: true, documento: true, tipo: true }
                }
            },
            // Ordena deixando o Responsável no topo e depois por maior rateio
            orderBy: [
                { isResponsavel: 'desc' },
                { percRateio: 'desc' }
            ]
        })

        return comissoes.map(c => ({
            id: c.id.toString(),
            entidadeId: c.entidadeId.toString(),
            nome: c.ycEntidades.nome,
            documento: c.ycEntidades.documento || 'N/A',
            tipoEntidade: c.ycEntidades.tipo,
            percRateio: Number(c.percRateio),
            valor: Number(c.valor),
            isResponsavel: c.isResponsavel
        }))
    } catch (error) {
        console.error("Erro ao buscar comissões da proposta:", error)
        return []
    }
}

// --- 12. SALVAR COMISSÕES DA PROPOSTA (ABA 5) ---
export async function saveProposalCommissions(
    propostaId: string,
    comissoes: Omit<ProposalCommissionItem, 'id' | 'nome' | 'documento' | 'tipoEntidade'>[],
    unlockStatus: boolean
) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado." }

    try {
        const pId = BigInt(propostaId)
        const tenantIdStr = await getCurrentTenantId()
        if (!tenantIdStr) return { success: false, message: "Tenant não encontrado." }
        const tenantId = BigInt(tenantIdStr)
        const userId = BigInt(session.user.id)

        const proposta = await prisma.ycPropostas.findUnique({ where: { id: pId } })
        if (!proposta) return { success: false, message: "Proposta não encontrada." }

        // Trava de Segurança
        if (proposta.status === 'APROVADO' && !unlockStatus) {
            return { success: false, message: "Proposta APROVADA. Desbloqueie para editar." }
        }

        // Hard Lock de Efetivação
        const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposta.status)
        if (isFormalizing) {
            return { success: false, message: "Proposta em fase de contrato. Edição permanentemente bloqueada." }
        }

        // Volta para análise se foi Desbloqueada (Aprovada) OU se estava Reprovada
        const shouldResetToAnalysis = (proposta.status === 'APROVADO' && unlockStatus) || proposta.status === 'REPROVADO'
        const novoStatus = shouldResetToAnalysis ? 'EM_ANALISE' : proposta.status

        // --- TRANSAÇÃO ATÔMICA ---
        await prisma.$transaction(async (tx) => {
            // 1. Atualiza Status e limpa decisão se precisar voltar para análise
            if (shouldResetToAnalysis) {
                await tx.ycPropostas.update({
                    where: { id: pId },
                    data: { 
                        status: novoStatus,
                        dataDecisao: null,
                        usuarioDecisaoId: null,
                        motivoRejeicao: null,
                        observacaoDecisao: null
                    }
                })
            }

            // 2. Remove as comissões antigas
            await tx.ycPropostasComissoes.deleteMany({ where: { propostaId: pId } })

            // 3. Insere a nova configuração
            if (comissoes.length > 0) {
                await tx.ycPropostasComissoes.createMany({
                    data: comissoes.map(c => ({
                        sysTenantId: tenantId,
                        sysUserId: userId,
                        escopoId: proposta.escopoId,
                        propostaId: pId,
                        entidadeId: BigInt(c.entidadeId),
                        percRateio: c.percRateio,
                        valor: c.valor,
                        isResponsavel: c.isResponsavel
                    }))
                })
            }

            // 4. Histórico
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
                        observacao: 'Edição de intermediação: Proposta retornou para análise'
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

// --- 13. BUSCAR HISTÓRICO DA PROPOSTA (ABA 8) ---
export async function getProposalHistory(propostaId: string): Promise<ProposalHistoryItem[]> {
    const session = await auth()
    if (!session) return []

    try {
        const historico = await prisma.ycPropostasHistorico.findMany({
            where: { propostaId: BigInt(propostaId) },
            include: { ycUsuarios: true },
            orderBy: { sysCreatedAt: 'desc' } // Traz do mais recente para o mais antigo
        })

        return historico.map(h => ({
            id: h.id.toString(),
            statusAnterior: h.statusAnterior,
            statusNovo: h.statusNovo,
            acao: h.acao,
            observacao: h.observacao,
            data: h.sysCreatedAt,
            usuarioNome: h.ycUsuarios?.nome || 'Sistema'
        }))
    } catch (error) {
        console.error("Erro ao buscar histórico:", error)
        return []
    }
}

// --- 14. GERAR DOCUMENTO E TRAVAR PROPOSTA (HARD LOCK) ---
export async function lockProposalForSignature(propostaId: string, tipoDoc: string, novoStatus: string) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado." }

    try {
        const pId = BigInt(propostaId)
        const tenantIdStr = await getCurrentTenantId()
        if (!tenantIdStr) return { success: false, message: "Tenant não encontrado." }
        const tenantId = BigInt(tenantIdStr)
        const userId = BigInt(session.user.id)

        const proposta = await prisma.ycPropostas.findUnique({ where: { id: pId } })
        if (!proposta) return { success: false, message: "Proposta não encontrada." }

        await prisma.$transaction(async (tx) => {
            await tx.ycPropostas.update({
                where: { id: pId },
                data: { status: novoStatus } // <--- Agora usa o status dinâmico
            })

            await tx.ycPropostasHistorico.create({
                data: {
                    sysTenantId: tenantId,
                    sysUserId: userId,
                    escopoId: proposta.escopoId,
                    propostaId: pId,
                    statusAnterior: proposta.status,
                    statusNovo: novoStatus, // <--- Agora usa o status dinâmico
                    acao: 'REVISAO',
                    observacao: `Documento emitido (${tipoDoc}). Proposta avançou para ${novoStatus}.`
                }
            })
        })

        return { success: true, message: "Documento emitido com sucesso!" }
    } catch (error) {
        console.error("Erro ao travar proposta:", error)
        return { success: false, message: "Erro interno ao emitir documento." }
    }
}