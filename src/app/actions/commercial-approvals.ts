'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { z } from "zod"

// --- TYPES ---

// [ATUALIZADO] Agora inclui dados estruturais do projeto
export type ApprovalProjectSummary = {
  id: string
  nome: string
  cidade: string
  uf: string
  img?: string | null
  
  // Novos campos para paridade com a Mesa
  tipo: string
  status: string
  totalBlocos: number
  totalUnidades: number
  
  // O nosso KPI principal
  totalPendentes: number
}

// Tipagem para o Detalhe (Mantida igual)
export type ApprovalDetail = {
  id: string
  projetoId: string
  status: string
  valorProposta: number
  valorTabelaOriginal: number
  desconto: number
  dataProposta: Date
  lead: {
    nome: string
    origem: string
    email: string | null
    telefone: string | null
  }
  unidade: {
    nome: string
    bloco: string
    area: number
  }
  corretor: {
    nome: string
    avatar?: string
  }
  condicoes: {
    id: string
    tipo: string
    periodicidade: string
    qtdeParcelas: number
    valorParcela: number
    vencimento: Date
  }[]
  fluxoTabela: {
    tipo: string
    periodicidade: number
    qtdeParcelas: number
    percentual: number
    primeiroVencimento: Date
  }[]
  historico: {
    data: Date
    acao: string
    statusNovo: string
    usuarioNome: string
    obs: string | null
  }[]
}

// --- 1. LISTAR PROJETOS COM PENDÊNCIAS (HUB) ---
export async function getApprovalProjects(): Promise<ApprovalProjectSummary[]> {
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
        
        // Contagens Estruturais
        _count: {
            select: { 
                ycUnidades: true,
                ycBlocos: true 
            }
        },

        // Busca profunda para contar pendências
        ycUnidades: {
          select: {
            ycPropostas: {
              where: { status: 'EM_ANALISE' },
              select: { id: true }
            }
          }
        }
      },
      orderBy: { nome: 'asc' }
    })

    // Processamento em memória
    return projects.map(p => {
      // Soma todas as propostas em análise de todas as unidades
      const pendingCount = p.ycUnidades.reduce((acc, u) => acc + u.ycPropostas.length, 0)
      
      return {
        id: p.id.toString(),
        nome: p.nome,
        cidade: p.cidade || '',
        uf: p.estado || '',
        img: p.logo,
        
        tipo: p.tipo,
        status: p.status,
        totalBlocos: p._count.ycBlocos,
        totalUnidades: p._count.ycUnidades,
        
        totalPendentes: pendingCount
      }
    })
    // Ordena: Quem tem pendência aparece primeiro. Critério de desempate: Nome.
    .sort((a, b) => {
        if (b.totalPendentes !== a.totalPendentes) {
            return b.totalPendentes - a.totalPendentes
        }
        return a.nome.localeCompare(b.nome)
    })

  } catch (error) {
    console.error("Erro ao buscar projetos para aprovação:", error)
    return []
  }
}

// --- 2. BUSCAR PROPOSTAS DO PROJETO (OUTLOOK) ---
// (MANTIDO IGUAL AO ANTERIOR, SEM ALTERAÇÕES NESSA PARTE)
export async function getProposals(projetoId: string): Promise<ApprovalDetail[]> {
  const session = await auth()
  if (!session) return []

  try {
    const proposals = await prisma.ycPropostas.findMany({
      where: {
        ycUnidades: { projetoId: BigInt(projetoId) },
        status: 'EM_ANALISE'
      },
      include: {
        ycLeads: true,
        ycUsuarios: true,
        ycUnidades: {
            include: { ycBlocos: true }
        },
        ycPropostasCondicoes: true,
        ycPropostasHistorico: {
            include: { ycUsuarios: true },
            orderBy: { sysCreatedAt: 'desc' }
        },
        ycTabelasPreco: {
            include: { ycFluxosPadrao: true }
        }
      },
      orderBy: { dataProposta: 'desc' }
    })

    return proposals.map(p => ({
      id: p.id.toString(),
      projetoId: projetoId,
      status: p.status,
      valorProposta: Number(p.valorProposta),
      valorTabelaOriginal: Number(p.valorTabelaOriginal),
      desconto: Number(p.desconto),
      dataProposta: p.dataProposta,
      lead: {
        nome: p.ycLeads.nome,
        origem: p.ycLeads.origem || 'Desconhecida',
        email: p.ycLeads.email,
        telefone: p.ycLeads.telefone
      },
      unidade: {
        nome: p.ycUnidades.unidade,
        bloco: p.ycUnidades.ycBlocos.nome,
        area: Number(p.ycUnidades.areaPrivativaTotal || p.ycUnidades.areaPrivativaPrincipal || 0)
      },
      corretor: {
        nome: p.ycUsuarios?.nome || 'Sistema'
      },
      condicoes: p.ycPropostasCondicoes.map(c => ({
        id: c.id.toString(),
        tipo: c.tipo,
        periodicidade: "MENSAL",
        qtdeParcelas: c.qtdeParcelas,
        valorParcela: Number(c.valorParcela),
        vencimento: c.dataVencimento
      })),
      fluxoTabela: p.ycTabelasPreco.ycFluxosPadrao.map(f => ({
        tipo: f.tipo,
        periodicidade: f.periodicidade,
        qtdeParcelas: f.qtdeParcelas,
        percentual: Number(f.percentual),
        primeiroVencimento: f.dataPrimeiroVencimento
      })),
      historico: p.ycPropostasHistorico.map(h => ({
        data: h.sysCreatedAt,
        acao: h.acao,
        statusNovo: h.statusNovo,
        usuarioNome: h.ycUsuarios?.nome || 'Sistema',
        obs: h.observacao
      }))
    }))

  } catch (error) {
    console.error("Erro ao buscar propostas:", error)
    return []
  }
}

// --- 3. AÇÃO: APROVAR PROPOSTA ---
const approveSchema = z.object({
    id: z.string(),
    // [CORREÇÃO ITEM 3] Aceita string vazia, undefined ou null
    observacao: z.string().optional().or(z.literal(''))
})

export async function approveProposal(formData: FormData) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado" }

    const rawData = {
        id: formData.get("id"),
        observacao: formData.get("observacao")
    }

    const validated = approveSchema.safeParse(rawData)
    if (!validated.success) return { success: false, message: "Dados inválidos" }

    const { id, observacao } = validated.data
    const now = new Date()

    try {
        await prisma.$transaction(async (tx) => {
            const current = await tx.ycPropostas.findUniqueOrThrow({ 
                where: { id: BigInt(id) } 
            })

            // [CORREÇÃO ITEM 2] Limpar campos de rejeição anterior
            await tx.ycPropostas.update({
                where: { id: BigInt(id) },
                data: {
                    status: 'APROVADO',
                    dataDecisao: now,
                    usuarioDecisaoId: BigInt(session.user.id),
                    observacaoDecisao: observacao || null, // Salva a nova obs ou null
                    motivoRejeicao: null, // Limpa o motivo antigo
                    sysUpdatedAt: now
                }
            })

            await tx.ycPropostasHistorico.create({
                data: {
                    sysTenantId: current.sysTenantId,
                    sysUserId: BigInt(session.user.id),
                    escopoId: current.escopoId,
                    propostaId: BigInt(id),
                    statusAnterior: current.status,
                    statusNovo: 'APROVADO',
                    acao: 'APROVOU',
                    observacao: observacao || 'Aprovação realizada via Portal'
                }
            })
        })

        revalidatePath('/app/comercial/aprovacoes')
        return { success: true, message: "Proposta aprovada com sucesso!" }

    } catch (error) {
        console.error(error)
        return { success: false, message: "Erro ao aprovar proposta" }
    }
}

// --- 4. AÇÃO: REJEITAR PROPOSTA ---
const rejectSchema = z.object({
    id: z.string(),
    motivo: z.string(),
    observacao: z.string().optional()
})

export async function rejectProposal(formData: FormData) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado" }

    const rawData = {
        id: formData.get("id"),
        motivo: formData.get("motivo"),
        observacao: formData.get("observacao")
    }

    const validated = rejectSchema.safeParse(rawData)
    if (!validated.success) return { success: false, message: "Dados inválidos. Motivo é obrigatório." }

    const { id, motivo, observacao } = validated.data
    const now = new Date()

    try {
        await prisma.$transaction(async (tx) => {
            const current = await tx.ycPropostas.findUniqueOrThrow({ 
                where: { id: BigInt(id) } 
            })

            await tx.ycPropostas.update({
                where: { id: BigInt(id) },
                data: {
                    status: 'REPROVADO',
                    dataDecisao: now,
                    usuarioDecisaoId: BigInt(session.user.id),
                    motivoRejeicao: motivo,
                    observacaoDecisao: observacao,
                    sysUpdatedAt: now
                }
            })

            await tx.ycPropostasHistorico.create({
                data: {
                    sysTenantId: current.sysTenantId,
                    sysUserId: BigInt(session.user.id),
                    escopoId: current.escopoId,
                    propostaId: BigInt(id),
                    statusAnterior: current.status,
                    statusNovo: 'REPROVADO',
                    acao: 'REJEITOU',
                    observacao: `${motivo} - ${observacao || ''}`
                }
            })
            
            if (current.unidadeId) {
                 await tx.ycUnidades.update({
                    where: { id: current.unidadeId },
                    data: { statusComercial: 'DISPONIVEL' }
                 })
            }
        })

        revalidatePath('/app/comercial/aprovacoes')
        return { success: true, message: "Proposta reprovada e unidade liberada." }

    } catch (error) {
        console.error(error)
        return { success: false, message: "Erro ao reprovar proposta" }
    }
}