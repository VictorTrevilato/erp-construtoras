'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

// --- HELPERS ---

function parseDecimal(value: FormDataEntryValue | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  
  // Se for File, ignora
  if (typeof value === "object" && "arrayBuffer" in value) return null

  if (typeof value === "number") return value
  
  let v = value.toString().trim()
  if (v.includes(',')) {
    v = v.replace(/\./g, '').replace(',', '.')
  } 
  
  const num = parseFloat(v)
  return isNaN(num) ? null : num
}

// --- SCHEMAS ---

const blockSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório (Ex: TR-A)"),
  nome: z.string().min(1, "Nome é obrigatório"),
})

const unitSchema = z.object({
  blocoId: z.string().min(1, "Selecione um bloco"),
  unidade: z.string().min(1, "Número da unidade obrigatório"),
  andar: z.coerce.number().int("Andar deve ser um número inteiro"),
  tipo: z.string().min(1, "Tipo obrigatório"),
  
  statusComercial: z.enum(['DISPONIVEL', 'RESERVADO', 'EM_ANALISE', 'VENDIDO']),
  statusInterno: z.string().min(1, "Status interno é obrigatório"),
  
  qtdeVagas: z.coerce.number().int().min(0),
  tipoVaga: z.enum(['FIXA', 'ROTATIVA', 'NENHUMA']).optional(),
  
  tipoDeposito: z.string().optional(),
  // Aceita string ou number para passar pelo parse depois
  areaDeposito: z.any().optional(),

  areaPrivativaPrincipal: z.any().optional(),
  areaOutrasPrivativas: z.any().optional(),
  areaPrivativaTotal: z.any().optional(),
  areaUsoComum: z.any().optional(),
  areaRealTotal: z.any().optional(),
  coeficienteProporcionalidade: z.any().optional(),
  fracaoIdealTerreno: z.any().optional(),
})

// --- ACTIONS: PROJETOS ---

export async function getCommercialProjects() {
  const session = await auth()
  if (!session) return []
  const cookieStore = await cookies()
  const tenantIdStr = cookieStore.get("tenant-id")?.value
  if (!tenantIdStr) return []

  try {
    const projects = await prisma.ycProjetos.findMany({
      where: { sysTenantId: BigInt(tenantIdStr) },
      include: {
        _count: { select: { ycBlocos: true, ycUnidades: true } },
        ycUnidades: { select: { qtdeVagas: true } }
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
      totalVagas: p.ycUnidades.reduce((acc: number, curr) => acc + (curr.qtdeVagas || 0), 0)
    }))
  } catch (error) { 
    console.error("Erro ao buscar projetos:", error)
    return []
  }
}

// --- ACTIONS: BLOCOS ---

export async function getBlocksByProject(projetoId: string) {
  try {
    const blocks = await prisma.ycBlocos.findMany({
      where: { projetoId: BigInt(projetoId) },
      orderBy: { nome: 'asc' }
    })
    return blocks.map(b => ({
      id: b.id.toString(),
      nome: b.nome,
      codigo: b.codigo
    }))
  } catch {
    return []
  }
}

export async function saveBlock(projetoId: string, blockId: string | null, formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, message: "Não autorizado" }

  const raw = Object.fromEntries(formData.entries())
  const valid = blockSchema.safeParse(raw)
  if (!valid.success) return { success: false, message: "Dados inválidos" }

  try {
    if (blockId) {
      await prisma.ycBlocos.update({
        where: { id: BigInt(blockId) },
        data: { codigo: valid.data.codigo, nome: valid.data.nome }
      })
    } else {
      const project = await prisma.ycProjetos.findUnique({ where: { id: BigInt(projetoId) } })
      if (!project) return { success: false, message: "Projeto não encontrado" }

      await prisma.ycBlocos.create({
        data: {
          sysTenantId: project.sysTenantId,
          sysUserId: BigInt(session.user.id),
          escopoId: project.escopoId,
          projetoId: BigInt(projetoId),
          codigo: valid.data.codigo,
          nome: valid.data.nome
        }
      })
    }
    revalidatePath(`/app/comercial/unidades/${projetoId}`)
    return { success: true, message: "Bloco salvo com sucesso!" }
  } catch {
    return { success: false, message: "Erro ao salvar bloco." }
  }
}

export async function deleteBlock(blockId: string) {
  try {
    await prisma.ycBlocos.delete({ where: { id: BigInt(blockId) } })
    revalidatePath("/app/comercial/unidades") 
    return { success: true, message: "Bloco excluído." }
  } catch {
    return { success: false, message: "Não é possível excluir bloco com unidades vinculadas." }
  }
}

// --- ACTIONS: UNIDADES ---

export async function getUnitsByProject(projetoId: string) {
  try {
    const units = await prisma.ycUnidades.findMany({
      where: { projetoId: BigInt(projetoId) },
      include: { ycBlocos: { select: { nome: true } } },
      orderBy: [{ ycBlocos: { nome: 'asc' } }] 
    })

    const mappedUnits = units.map(u => {
      const fmt = (val: string | number | null | undefined | object, decimals: number) => {
         if (val === null || val === undefined) return ""
         return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      }

      return {
        id: u.id.toString(),
        unidade: u.unidade,
        andar: u.andar,
        blocoId: u.blocoId.toString(),
        blocoNome: u.ycBlocos.nome,
        tipo: u.tipo,
        
        statusComercial: u.statusComercial, 
        statusInterno: u.statusInterno,
        qtdeVagas: u.qtdeVagas,
        tipoVaga: u.tipoVaga,
        tipoDeposito: u.tipoDeposito,
        // [ATUALIZAÇÃO] Formatando para 4 casas decimais conforme solicitado
        areaDeposito: fmt(u.areaDeposito, 4),
        
        areaPrivativaPrincipal: fmt(u.areaPrivativaPrincipal, 4),
        areaOutrasPrivativas: fmt(u.areaOutrasPrivativas, 4),
        areaPrivativaTotal: fmt(u.areaPrivativaTotal, 4),
        areaUsoComum: fmt(u.areaUsoComum, 4),
        areaRealTotal: fmt(u.areaRealTotal, 4),
        coeficienteProporcionalidade: fmt(u.coeficienteProporcionalidade, 9),
        fracaoIdealTerreno: fmt(u.fracaoIdealTerreno, 9),
      }
    })

    return mappedUnits.sort((a, b) => {
      const blockDiff = a.blocoNome.localeCompare(b.blocoNome, undefined, { numeric: true, sensitivity: 'base' })
      if (blockDiff !== 0) return blockDiff
      return a.unidade.localeCompare(b.unidade, undefined, { numeric: true, sensitivity: 'base' })
    })

  } catch { 
    return []
  }
}

export async function createUnit(projetoId: string, formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, message: "Não autorizado" }

  const raw = Object.fromEntries(formData.entries())
  const valid = unitSchema.safeParse(raw)
  
  if (!valid.success) {
      console.error(valid.error.flatten())
      return { success: false, message: "Verifique os campos obrigatórios" }
  }

  try {
    const project = await prisma.ycProjetos.findUnique({ where: { id: BigInt(projetoId) } })
    const bloco = await prisma.ycBlocos.findUnique({ where: { id: BigInt(valid.data.blocoId) } })
    
    if (!project || !bloco) return { success: false, message: "Dados de vínculo inválidos" }

    const sku = `${project.id}-${bloco.codigo}-${valid.data.unidade}`

    await prisma.ycUnidades.create({
      data: {
        sysTenantId: project.sysTenantId,
        sysUserId: BigInt(session.user.id),
        escopoId: project.escopoId,
        projetoId: BigInt(projetoId),
        blocoId: BigInt(valid.data.blocoId),
        
        unidade: valid.data.unidade,
        andar: valid.data.andar,
        codigo: sku,
        tipo: valid.data.tipo,

        statusComercial: valid.data.statusComercial,
        statusInterno: valid.data.statusInterno,
        qtdeVagas: valid.data.qtdeVagas,
        tipoVaga: valid.data.tipoVaga || 'NENHUMA',
        tipoDeposito: valid.data.tipoDeposito || 'NENHUM',
        areaDeposito: parseDecimal(raw.areaDeposito) || 0,

        areaPrivativaPrincipal: parseDecimal(raw.areaPrivativaPrincipal),
        areaOutrasPrivativas: parseDecimal(raw.areaOutrasPrivativas),
        areaPrivativaTotal: parseDecimal(raw.areaPrivativaTotal),
        areaUsoComum: parseDecimal(raw.areaUsoComum),
        areaRealTotal: parseDecimal(raw.areaRealTotal),
        coeficienteProporcionalidade: parseDecimal(raw.coeficienteProporcionalidade),
        fracaoIdealTerreno: parseDecimal(raw.fracaoIdealTerreno),
      }
    })

    revalidatePath(`/app/comercial/unidades/${projetoId}`)
    return { success: true, message: "Unidade criada com sucesso!" }
  } catch (error) {
    console.error(error)
    return { success: false, message: "Erro ao criar unidade (Verifique duplicidade)." }
  }
}

export async function updateUnit(unitId: string, formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, message: "Não autorizado" }

  const raw = Object.fromEntries(formData.entries())
  const valid = unitSchema.safeParse(raw)
  if (!valid.success) return { success: false, message: "Dados inválidos" }

  try {
    const existingUnit = await prisma.ycUnidades.findUnique({
        where: { id: BigInt(unitId) },
        select: { projetoId: true }
    })
    
    const targetBlock = await prisma.ycBlocos.findUnique({
        where: { id: BigInt(valid.data.blocoId) }
    })

    if (!existingUnit || !targetBlock) {
        return { success: false, message: "Erro ao recalcular SKU (Bloco ou Projeto inválido)." }
    }

    const newSku = `${existingUnit.projetoId}-${targetBlock.codigo}-${valid.data.unidade}`

    // [DEBUG] Garantir que o valor está sendo parseado
    const areaDepositoDecimal = parseDecimal(raw.areaDeposito)

    await prisma.ycUnidades.update({
      where: { id: BigInt(unitId) },
      data: {
        blocoId: BigInt(valid.data.blocoId),
        unidade: valid.data.unidade,
        andar: valid.data.andar,
        codigo: newSku,
        tipo: valid.data.tipo,
        
        statusComercial: valid.data.statusComercial,
        statusInterno: valid.data.statusInterno,
        qtdeVagas: valid.data.qtdeVagas,
        tipoVaga: valid.data.tipoVaga,
        
        // [CORREÇÃO] Atualizando Depósito
        tipoDeposito: valid.data.tipoDeposito,
        areaDeposito: areaDepositoDecimal,
        
        areaPrivativaPrincipal: parseDecimal(raw.areaPrivativaPrincipal),
        areaOutrasPrivativas: parseDecimal(raw.areaOutrasPrivativas),
        areaPrivativaTotal: parseDecimal(raw.areaPrivativaTotal),
        areaUsoComum: parseDecimal(raw.areaUsoComum),
        areaRealTotal: parseDecimal(raw.areaRealTotal),
        coeficienteProporcionalidade: parseDecimal(raw.coeficienteProporcionalidade),
        fracaoIdealTerreno: parseDecimal(raw.fracaoIdealTerreno),
        
        sysUpdatedAt: new Date()
      }
    })

    revalidatePath(`/app/comercial/unidades`)
    return { success: true, message: "Unidade atualizada!" }
  } catch (err) {
    console.error("Erro no updateUnit:", err)
    return { success: false, message: "Erro ao atualizar unidade." }
  }
}

export async function deleteUnit(unitId: string) {
  try {
    await prisma.ycUnidades.delete({ where: { id: BigInt(unitId) } })
    revalidatePath(`/app/comercial/unidades`)
    return { success: true, message: "Unidade excluída." }
  } catch {
    return { success: false, message: "Erro ao excluir unidade." }
  }
}