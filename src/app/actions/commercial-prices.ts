'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
// 1. IMPORTAÇÃO DO MOTOR DE ACESSO
import { getUserAccessProfile } from "@/lib/access-control"

interface PriceItemInput {
  unidadeId: string
  valorMetroQuadrado: number
  fatorAndar: number
  fatorDiretoria: number
  fatorCorrecao: number 
}

interface FlowInput {
  tipo: string
  percentual: number | string
  qtdeParcelas: number | string
  periodicidade: number | string
  dataPrimeiroVencimento: string
}

// --- HELPERS ---
function parseDecimal(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0
  if (typeof value === "number") return value
  let v = value.toString().trim()
  if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(v)
  return isNaN(num) ? 0 : num
}

// --- SCHEMAS ---
const campaignSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  codigo: z.string().min(1, "Código (SKU) é obrigatório"),
  vigenciaInicial: z.string().refine(val => !isNaN(Date.parse(val)), "Data inválida"),
  vigenciaFinal: z.string().refine(val => !isNaN(Date.parse(val)), "Data inválida"),
  taxaJuros: z.coerce.number().min(0).default(0),
  percComissaoPadrao: z.coerce.number().min(0).default(0),
})

const priceItemSchema = z.object({
  unidadeId: z.string(),
  valorMetroQuadrado: z.coerce.number(),
  fatorAndar: z.coerce.number(),
  fatorDiretoria: z.coerce.number(),
  fatorCorrecao: z.coerce.number(), 
})

// --- ACTIONS ---

export async function getProjectsForTables() {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  // CHECAGEM DE PERMISSÃO E ESCOPO
  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('TABELAS_PRECO_VER')) return []

  try {
    const projects = await prisma.ycProjetos.findMany({
      where: { 
        sysTenantId: BigInt(tenantIdStr), 
        escopoId: { in: cracha.escoposPermitidos }, // Proteção de Escopo
        ycUnidades: { some: {} } 
      },
      include: {
        _count: { 
          select: { 
            ycTabelasPreco: true,
            ycBlocos: true,
            ycUnidades: true
          } 
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
      totalTabelas: p._count.ycTabelasPreco,
      totalBlocos: p._count.ycBlocos,
      totalUnidades: p._count.ycUnidades
    }))
  } catch {
    return []
  }
}

export async function getCampaigns(projetoId: string) {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('TABELAS_PRECO_VER')) return []

  try {
    const campaigns = await prisma.ycTabelasPreco.findMany({
      where: { 
        projetoId: BigInt(projetoId),
        sysTenantId: BigInt(tenantIdStr),
        escopoId: { in: cracha.escoposPermitidos } // Proteção de Escopo
      },
      orderBy: { sysCreatedAt: 'desc' }
    })
    return campaigns.map(c => ({
      id: c.id.toString(),
      codigo: c.codigo,
      nome: c.nome,
      vigenciaInicial: c.vigenciaInicial,
      vigenciaFinal: c.vigenciaFinal,
      taxaJuros: Number(c.taxaJuros),
      percComissaoPadrao: Number(c.percComissaoPadrao)
    }))
  } catch {
    return []
  }
}

// Helper para verificar colisão de datas (Agora blindado por Tenant)
async function checkDateOverlap(projetoId: string, tenantId: bigint, start: Date, end: Date, excludeTableId?: string) {
  const overlap = await prisma.ycTabelasPreco.findFirst({
    where: {
      projetoId: BigInt(projetoId),
      sysTenantId: tenantId,
      id: excludeTableId ? { not: BigInt(excludeTableId) } : undefined,
      OR: [
        { AND: [{ vigenciaInicial: { lte: start } }, { vigenciaFinal: { gte: start } }] },
        { AND: [{ vigenciaInicial: { lte: end } }, { vigenciaFinal: { gte: end } }] },
        { AND: [{ vigenciaInicial: { gte: start } }, { vigenciaFinal: { lte: end } }] }
      ]
    }
  })
  return overlap
}

export async function upsertCampaign(projetoId: string, tabelaId: string | null, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado" }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha) return { success: false, message: "Perfil de acesso não encontrado." }

  const requiredPermission = tabelaId ? 'TABELAS_PRECO_EDITAR' : 'TABELAS_PRECO_CRIAR'
  if (!cracha.permissoes.includes(requiredPermission)) {
    return { success: false, message: "Você não tem permissão para realizar esta operação." }
  }

  const raw = Object.fromEntries(formData.entries())
  const valid = campaignSchema.safeParse(raw)

  if (!valid.success) return { success: false, message: "Dados inválidos", errors: valid.error.flatten().fieldErrors }

  const start = new Date(valid.data.vigenciaInicial)
  const end = new Date(valid.data.vigenciaFinal)

  if (start > end) return { success: false, message: "A data final deve ser posterior à inicial." }

  try {
    const project = await prisma.ycProjetos.findFirst({ 
      where: { 
        id: BigInt(projetoId),
        sysTenantId: tenantId,
        escopoId: { in: cracha.escoposPermitidos }
      } 
    })
    
    if (!project) return { success: false, message: "Projeto não encontrado ou acesso negado." }

    const overlap = await checkDateOverlap(projetoId, tenantId, start, end, tabelaId || undefined)
    if (overlap) {
      return { 
        success: false, 
        message: `Conflito de datas! Já existe a tabela "${overlap.nome}" vigente neste período.` 
      }
    }

    if (tabelaId) {
      await prisma.ycTabelasPreco.update({
        where: { id: BigInt(tabelaId) },
        data: {
          nome: valid.data.nome,
          codigo: valid.data.codigo,
          vigenciaInicial: start,
          vigenciaFinal: end,
          taxaJuros: valid.data.taxaJuros,
          percComissaoPadrao: valid.data.percComissaoPadrao,
          sysUpdatedAt: new Date()
        }
      })
    } else {
      await prisma.ycTabelasPreco.create({
        data: {
          sysTenantId: project.sysTenantId,
          sysUserId: userId,
          escopoId: project.escopoId,
          projetoId: BigInt(projetoId),
          nome: valid.data.nome,
          codigo: valid.data.codigo,
          vigenciaInicial: start,
          vigenciaFinal: end,
          taxaJuros: valid.data.taxaJuros,
          percComissaoPadrao: valid.data.percComissaoPadrao
        }
      })
    }
    revalidatePath(`/app/comercial/tabelas/${projetoId}`)
    return { success: true, message: "Tabela salva com sucesso!" }
  } catch (error) {
    console.error(error)
    return { success: false, message: "Erro ao salvar tabela." }
  }
}

export async function duplicateCampaign(projetoId: string, sourceTabelaId: string, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado" }

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

    const tenantId = BigInt(tenantIdStr)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('TABELAS_PRECO_CRIAR')) {
        return { success: false, message: "Você não tem permissão para duplicar tabelas." }
    }

    const raw = Object.fromEntries(formData.entries())
    const valid = campaignSchema.safeParse(raw)

    if (!valid.success) return { success: false, message: "Dados inválidos para a cópia." }

    const start = new Date(valid.data.vigenciaInicial)
    const end = new Date(valid.data.vigenciaFinal)

    if (start > end) return { success: false, message: "A data final deve ser posterior à inicial." }

    try {
        const original = await prisma.ycTabelasPreco.findFirst({
            where: { 
                id: BigInt(sourceTabelaId),
                sysTenantId: tenantId,
                escopoId: { in: cracha.escoposPermitidos } 
            }
        })
        if (!original) return { success: false, message: "Tabela de origem não encontrada ou acesso negado." }

        const overlap = await checkDateOverlap(projetoId, tenantId, start, end)
        if (overlap) {
            return { 
                success: false, 
                message: `Conflito de datas! Já existe a tabela "${overlap.nome}" vigente neste período.` 
            }
        }

        await prisma.$transaction(async (tx) => {
            const newTable = await tx.ycTabelasPreco.create({
                data: {
                    sysTenantId: original.sysTenantId,
                    sysUserId: userId,
                    escopoId: original.escopoId,
                    projetoId: BigInt(projetoId),
                    nome: valid.data.nome,
                    codigo: valid.data.codigo,
                    vigenciaInicial: start,
                    vigenciaFinal: end,
                    taxaJuros: valid.data.taxaJuros,
                    percComissaoPadrao: valid.data.percComissaoPadrao
                }
            })

            const originalItems = await tx.ycTabelasPrecoItens.findMany({
                where: { tabelaPrecoId: original.id }
            })
            
            if (originalItems.length > 0) {
                await tx.ycTabelasPrecoItens.createMany({
                    data: originalItems.map(item => ({
                        sysTenantId: item.sysTenantId,
                        sysUserId: userId,
                        escopoId: item.escopoId,
                        tabelaPrecoId: newTable.id,
                        unidadeId: item.unidadeId,
                        valorMetroQuadrado: item.valorMetroQuadrado,
                        fatorAndar: item.fatorAndar,
                        fatorDiretoria: item.fatorDiretoria,
                        fatorCorrecao: item.fatorCorrecao
                    }))
                })
            }

            const originalFlows = await tx.ycFluxosPadrao.findMany({
                where: { tabelaPrecoId: original.id }
            })

            if (originalFlows.length > 0) {
                await tx.ycFluxosPadrao.createMany({
                    data: originalFlows.map(flow => ({
                        sysTenantId: flow.sysTenantId,
                        sysUserId: userId,
                        escopoId: flow.escopoId,
                        tabelaPrecoId: newTable.id,
                        tipo: flow.tipo,
                        percentual: flow.percentual,
                        qtdeParcelas: flow.qtdeParcelas,
                        periodicidade: flow.periodicidade,
                        dataPrimeiroVencimento: flow.dataPrimeiroVencimento
                    }))
                })
            }
        })

        revalidatePath(`/app/comercial/tabelas/${projetoId}`)
        return { success: true, message: "Tabela duplicada com sucesso! Ajuste os preços se necessário." }

    } catch (error) {
        console.error(error)
        return { success: false, message: "Erro ao duplicar tabela." }
    }
}

export async function getPriceTableData(tabelaId: string, projetoId: string) {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('TABELAS_PRECO_VER')) return []

  try {
    const units = await prisma.ycUnidades.findMany({
      where: { 
        projetoId: BigInt(projetoId),
        sysTenantId: BigInt(tenantIdStr),
        escopoId: { in: cracha.escoposPermitidos }
      },
      include: { ycBlocos: { select: { nome: true } } },
      orderBy: [{ ycBlocos: { nome: 'asc' } }, { unidade: 'asc' }]
    })

    const priceItems = await prisma.ycTabelasPrecoItens.findMany({
      where: { 
        tabelaPrecoId: BigInt(tabelaId),
        sysTenantId: BigInt(tenantIdStr)
      }
    })

    return units.map(u => {
      const price = priceItems.find(p => p.unidadeId === u.id)
      return {
        unidadeId: u.id.toString(),
        unidade: u.unidade,
        blocoNome: u.ycBlocos.nome,
        tipologia: u.tipo,
        areaPrivativa: Number(u.areaPrivativaPrincipal || 0) + Number(u.areaOutrasPrivativas || 0),
        areaUsoComum: Number(u.areaUsoComum || 0),
        valorMetroQuadrado: price ? Number(price.valorMetroQuadrado) : 0,
        fatorAndar: price ? Number(price.fatorAndar) : 0,
        fatorDiretoria: price ? Number(price.fatorDiretoria) : 0,
        fatorCorrecao: price ? Number(price.fatorCorrecao) : 1,
      }
    })
  } catch {
    return []
  }
}

export async function savePriceItemsBatch(tabelaId: string, items: PriceItemInput[]) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado" }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('TABELAS_PRECO_EDITAR')) {
    return { success: false, message: "Você não tem permissão para editar preços." }
  }

  try {
    const header = await prisma.ycTabelasPreco.findFirst({ 
        where: { 
            id: BigInt(tabelaId),
            sysTenantId: tenantId,
            escopoId: { in: cracha.escoposPermitidos }
        } 
    })

    if (!header) return { success: false, message: "Tabela não encontrada ou acesso negado." }

    const validItems = []
    for (const item of items) {
      const parsed = priceItemSchema.safeParse(item)
      if (parsed.success) validItems.push(parsed.data)
    }

    await prisma.$transaction(
      validItems.map(item => 
        prisma.ycTabelasPrecoItens.upsert({
          where: {
            tabelaPrecoId_unidadeId: {
              tabelaPrecoId: BigInt(tabelaId),
              unidadeId: BigInt(item.unidadeId)
            }
          },
          update: {
            valorMetroQuadrado: item.valorMetroQuadrado,
            fatorAndar: item.fatorAndar,
            fatorDiretoria: item.fatorDiretoria,
            fatorCorrecao: item.fatorCorrecao,
            sysUpdatedAt: new Date()
          },
          create: {
            sysTenantId: header.sysTenantId,
            sysUserId: userId,
            escopoId: header.escopoId,
            tabelaPrecoId: BigInt(tabelaId),
            unidadeId: BigInt(item.unidadeId),
            valorMetroQuadrado: item.valorMetroQuadrado,
            fatorAndar: item.fatorAndar,
            fatorDiretoria: item.fatorDiretoria,
            fatorCorrecao: item.fatorCorrecao
          }
        })
      )
    )

    revalidatePath(`/app/comercial/tabelas/${header.projetoId}/editar/${tabelaId}`)
    return { success: true, message: `${validItems.length} preços atualizados com sucesso!` }
  } catch (error) {
    console.error(error)
    return { success: false, message: "Erro ao salvar preços." }
  }
}

export async function getFlows(tabelaId: string) {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('TABELAS_PRECO_VER')) return []

  try {
    const flows = await prisma.ycFluxosPadrao.findMany({
      where: { 
        tabelaPrecoId: BigInt(tabelaId),
        sysTenantId: BigInt(tenantIdStr),
        escopoId: { in: cracha.escoposPermitidos }
      },
      orderBy: { dataPrimeiroVencimento: 'asc' }
    })
    return flows.map(f => ({
      id: f.id.toString(),
      tipo: f.tipo,
      percentual: Number(f.percentual),
      qtdeParcelas: f.qtdeParcelas,
      periodicidade: f.periodicidade,
      dataPrimeiroVencimento: f.dataPrimeiroVencimento
    }))
  } catch {
    return []
  }
}

export async function saveFlows(tabelaId: string, flows: FlowInput[]) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado" }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('TABELAS_PRECO_EDITAR')) {
    return { success: false, message: "Sem permissão de edição." }
  }

  try {
    const header = await prisma.ycTabelasPreco.findFirst({ 
        where: { 
            id: BigInt(tabelaId),
            sysTenantId: tenantId,
            escopoId: { in: cracha.escoposPermitidos }
        } 
    })

    if (!header) return { success: false, message: "Tabela não encontrada ou acesso negado." }

    await prisma.$transaction([
      prisma.ycFluxosPadrao.deleteMany({ where: { tabelaPrecoId: BigInt(tabelaId) } }),
      prisma.ycFluxosPadrao.createMany({
        data: flows.map(f => ({
          sysTenantId: header.sysTenantId,
          sysUserId: userId,
          escopoId: header.escopoId,
          tabelaPrecoId: BigInt(tabelaId),
          tipo: f.tipo,
          percentual: parseDecimal(f.percentual),
          qtdeParcelas: Number(f.qtdeParcelas),
          periodicidade: Number(f.periodicidade),
          dataPrimeiroVencimento: new Date(f.dataPrimeiroVencimento)
        }))
      })
    ])

    revalidatePath(`/app/comercial/tabelas/${header.projetoId}/editar/${tabelaId}`)
    return { success: true, message: "Fluxo de pagamento salvo!" }
  } catch (error) {
    console.error(error)
    return { success: false, message: "Erro ao salvar fluxos." }
  }
}

export async function deleteCampaign(tabelaId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado" }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('TABELAS_PRECO_EXCLUIR')) {
    return { success: false, message: "Sem permissão para exclusão." }
  }

  try {
    const tableExists = await prisma.ycTabelasPreco.findFirst({
        where: {
            id: BigInt(tabelaId),
            sysTenantId: BigInt(tenantIdStr),
            escopoId: { in: cracha.escoposPermitidos }
        }
    })

    if (!tableExists) return { success: false, message: "Tabela não encontrada ou acesso negado." }

    await prisma.$transaction(async (tx) => {
      await tx.ycTabelasPrecoItens.deleteMany({ where: { tabelaPrecoId: BigInt(tabelaId) } })
      await tx.ycFluxosPadrao.deleteMany({ where: { tabelaPrecoId: BigInt(tabelaId) } })
      await tx.ycTabelasPreco.delete({ where: { id: BigInt(tabelaId) } })
    })

    revalidatePath("/app/comercial/tabelas")
    return { success: true, message: "Tabela excluída com sucesso." }
  } catch (error) {
    console.error(error)
    return { success: false, message: "Erro ao excluir tabela. Verifique se existem propostas vinculadas." }
  }
}