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
    
    // [CORREÇÃO] Busca ESTRITA: Deve ter começado antes de agora E terminar depois de agora
    const activeTable = await prisma.ycTabelasPreco.findFirst({
      where: { 
        projetoId: BigInt(projetoId),
        vigenciaInicial: { lte: now }, // Começou no passado ou hoje
        vigenciaFinal: { gte: now }    // Termina no futuro ou hoje
      },
      orderBy: { sysCreatedAt: 'desc' }, // Desempate: Se houver 2 vigentes (erro de cadastro), pega a mais recente
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
        // [CORREÇÃO] Filtrar o item de preço da tabela VIGENTE
        ycTabelasPrecoItens: {
          where: {
            ycTabelasPreco: {
                vigenciaInicial: { lte: now },
                vigenciaFinal: { gte: now }
            }
          },
          include: { ycTabelasPreco: true },
          take: 1 // Garante que pega apenas 1 se houver duplicidade por erro
        }
      },
      orderBy: { andar: 'desc' }
    })

    return units.map(u => {
      // Como filtramos no include, o array deve ter 0 ou 1 item correto
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
    
    // [CORREÇÃO] Mesma lógica estrita do Header
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

  // Busca a unidade e tenta achar a tabela vigente vinculada a ela
  const unit = await prisma.ycUnidades.findUnique({
    where: { id: BigInt(unidadeId) },
    include: { 
        // [CORREÇÃO] Filtro temporal para garantir que usamos a tabela certa
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

  return fluxosPadrao.map(f => {
    const totalCondicao = valorFechamento * (Number(f.percentual) / 100)
    const valorParcela = totalCondicao / f.qtdeParcelas
    
    const periodMap: Record<number, string> = { 0: 'Única', 1: 'Mensal', 12: 'Anual' } 

    return {
      tipo: f.tipo,
      periodicidade: periodMap[f.periodicidade] || 'Outros',
      qtdeParcelas: f.qtdeParcelas,
      valorParcela: valorParcela,
      valorTotal: totalCondicao,
      percentual: Number(f.percentual),
      primeiroVencimento: f.dataPrimeiroVencimento
    } as StandardFlow
  })
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
            // [CORREÇÃO] Busca tabela vigente para snapshop
            ycTabelasPrecoItens: {
                where: {
                    ycTabelasPreco: {
                        vigenciaInicial: { lte: now },
                        vigenciaFinal: { gte: now }
                    }
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

    const validade = new Date()
    validade.setDate(validade.getDate() + 2) 

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
          
          dataProposta: new Date(),
          validade: validade,
          status: "EM_ANALISE"
        }
      })

      // --- C. CONDIÇÕES ---
      if (condicoes && condicoes.length > 0) {
        await tx.ycPropostasCondicoes.createMany({
          data: condicoes.map((c) => ({
            sysTenantId: contextUnit.sysTenantId,
            sysUserId: BigInt(session.user.id),
            escopoId: contextUnit.escopoId,
            propostaId: newProposal.id,
            
            tipo: c.tipo,
            dataVencimento: new Date(c.vencimento), 
            valorParcela: Number(c.valorParcela),
            qtdeParcelas: Number(c.qtdeParcelas),
            valorTotal: Number(c.valorParcela) * Number(c.qtdeParcelas)
          }))
        })
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