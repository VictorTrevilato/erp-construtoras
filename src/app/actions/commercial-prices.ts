'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

interface PriceItemInput {
  unidadeId: string
  valorMetroQuadrado: number
  fatorAndar: number
  fatorDiretoria: number
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
})

const priceItemSchema = z.object({
  unidadeId: z.string(),
  valorMetroQuadrado: z.coerce.number(),
  fatorAndar: z.coerce.number(),
  fatorDiretoria: z.coerce.number(),
})

// --- ACTIONS ---

// 1. Listar Projetos (Reutiliza a lógica de Unidades para manter consistência)
export async function getProjectsForTables() {
  const session = await auth()
  if (!session) return []
  const cookieStore = await cookies()
  const tenantIdStr = cookieStore.get("tenant-id")?.value
  if (!tenantIdStr) return []

  try {
    const projects = await prisma.ycProjetos.findMany({
      where: { sysTenantId: BigInt(tenantIdStr) },
      include: {
        _count: { 
          select: { 
            ycTabelasPreco: true,
            ycBlocos: true,   // [NOVO]
            ycUnidades: true  // [NOVO]
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
      totalBlocos: p._count.ycBlocos,      // [NOVO]
      totalUnidades: p._count.ycUnidades   // [NOVO]
    }))
  } catch {
    return []
  }
}

// 2. Listar Campanhas (Tabelas) de um Projeto
export async function getCampaigns(projetoId: string) {
  try {
    const campaigns = await prisma.ycTabelasPreco.findMany({
      where: { projetoId: BigInt(projetoId) },
      orderBy: { sysCreatedAt: 'desc' }
    })
    return campaigns.map(c => ({
      id: c.id.toString(),
      codigo: c.codigo,
      nome: c.nome,
      vigenciaInicial: c.vigenciaInicial,
      vigenciaFinal: c.vigenciaFinal,
      taxaJuros: Number(c.taxaJuros)
    }))
  } catch {
    return []
  }
}

// 3. Criar/Atualizar Cabeçalho da Campanha
export async function upsertCampaign(projetoId: string, tabelaId: string | null, formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, message: "Não autorizado" }
  const userId = BigInt(session.user.id)

  const raw = Object.fromEntries(formData.entries())
  const valid = campaignSchema.safeParse(raw)

  if (!valid.success) return { success: false, message: "Dados inválidos", errors: valid.error.flatten().fieldErrors }

  try {
    const project = await prisma.ycProjetos.findUnique({ where: { id: BigInt(projetoId) } })
    if (!project) return { success: false, message: "Projeto não encontrado" }

    if (tabelaId) {
      await prisma.ycTabelasPreco.update({
        where: { id: BigInt(tabelaId) },
        data: {
          nome: valid.data.nome,
          codigo: valid.data.codigo,
          vigenciaInicial: new Date(valid.data.vigenciaInicial),
          vigenciaFinal: new Date(valid.data.vigenciaFinal),
          taxaJuros: valid.data.taxaJuros,
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
          vigenciaInicial: new Date(valid.data.vigenciaInicial),
          vigenciaFinal: new Date(valid.data.vigenciaFinal),
          taxaJuros: valid.data.taxaJuros
          // [CORREÇÃO] Removidos campos que foram para a tabela de Itens
          // valorMetroQuadrado: 0, <-- REMOVER
          // fatorAndar: 0,         <-- REMOVER
          // fatorDiretoria: 0      <-- REMOVER
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

// 4. Buscar Dados para Grid de Preços (Unidades + Preços Existentes)
export async function getPriceTableData(tabelaId: string, projetoId: string) {
  try {
    // Busca todas as unidades do projeto
    const units = await prisma.ycUnidades.findMany({
      where: { projetoId: BigInt(projetoId) },
      include: { ycBlocos: { select: { nome: true } } },
      orderBy: [{ ycBlocos: { nome: 'asc' } }, { unidade: 'asc' }] // Ordenação simples aqui, natural no front
    })

    // Busca itens de preço já cadastrados nesta tabela
    const priceItems = await prisma.ycTabelasPrecoItens.findMany({
      where: { tabelaPrecoId: BigInt(tabelaId) }
    })

    // Faz o merge
    return units.map(u => {
      const price = priceItems.find(p => p.unidadeId === u.id)
      return {
        unidadeId: u.id.toString(),
        unidade: u.unidade,
        blocoNome: u.ycBlocos.nome,
        tipologia: u.tipo,
        areaPrivativa: Number(u.areaPrivativaPrincipal || 0) + Number(u.areaOutrasPrivativas || 0),
        // Dados editáveis (se não existir, inicia zerado)
        valorMetroQuadrado: price ? Number(price.valorMetroQuadrado) : 0,
        fatorAndar: price ? Number(price.fatorAndar) : 0,
        fatorDiretoria: price ? Number(price.fatorDiretoria) : 0,
      }
    })
  } catch {
    return []
  }
}

// 5. Salvar Lote de Preços (Batch Upsert)
export async function savePriceItemsBatch(tabelaId: string, items: PriceItemInput[]) {
  const session = await auth()
  if (!session) return { success: false, message: "Não autorizado" }
  const userId = BigInt(session.user.id)

  try {
    // Recupera dados do cabeçalho para obter IDs de sistema
    const header = await prisma.ycTabelasPreco.findUnique({ where: { id: BigInt(tabelaId) } })
    if (!header) return { success: false, message: "Tabela não encontrada" }

    // Valida itens
    const validItems = []
    for (const item of items) {
      const parsed = priceItemSchema.safeParse(item)
      if (parsed.success) validItems.push(parsed.data)
    }

    // Transação: Upsert um por um (Prisma não tem upsertMany nativo simples para SQL Server ainda)
    // Mas podemos fazer delete + createMany ou usar Promise.all com upsert.
    // Usaremos Promise.all com upsert para garantir integridade individual
    
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
            fatorDiretoria: item.fatorDiretoria
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

// 6. Gestão de Fluxos
export async function getFlows(tabelaId: string) {
  try {
    const flows = await prisma.ycFluxosPadrao.findMany({
      where: { tabelaPrecoId: BigInt(tabelaId) },
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
  if (!session) return { success: false, message: "Não autorizado" }
  const userId = BigInt(session.user.id)

  try {
    const header = await prisma.ycTabelasPreco.findUnique({ where: { id: BigInt(tabelaId) } })
    if (!header) return { success: false, message: "Tabela não encontrada" }

    // Estratégia: Limpar fluxos anteriores e recriar (Full Replacement)
    // Isso evita complexidade de diff no frontend
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

// 7. Excluir Campanha
export async function deleteCampaign(tabelaId: string) {
  const session = await auth()
  if (!session) return { success: false, message: "Não autorizado" }

  try {
    // Verifica dependências antes (ex: se tem propostas vinculadas)
    // Por enquanto, deletamos em cascata os itens e fluxos
    await prisma.$transaction(async (tx) => {
      await tx.ycTabelasPrecoItens.deleteMany({ where: { tabelaPrecoId: BigInt(tabelaId) } })
      await tx.ycFluxosPadrao.deleteMany({ where: { tabelaPrecoId: BigInt(tabelaId) } })
      await tx.ycTabelasPreco.delete({ where: { id: BigInt(tabelaId) } })
    })

    revalidatePath("/app/comercial/tabelas") // Revalida a lista
    return { success: true, message: "Tabela excluída com sucesso." }
  } catch (error) {
    console.error(error)
    return { success: false, message: "Erro ao excluir tabela. Verifique se existem propostas vinculadas." }
  }
}
