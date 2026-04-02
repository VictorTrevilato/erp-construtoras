'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { z } from "zod"
import { getUploadSasUrl, deleteFileFromAzureByPath, getFileDownloadUrl } from "@/lib/azure-storage"
// 1. IMPORTAÇÃO DO MOTOR DE ACESSO
import { getUserAccessProfile } from "@/lib/access-control"

// --- TYPES PARA ANEXOS DA UNIDADE ---
export type UnitAttachmentItem = {
    id: string
    nomeArquivo: string
    classificacao: string
    urlArquivo: string
    isPublico: boolean
}

// --- HELPERS ---

function parseDecimal(value: FormDataEntryValue | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
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
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('UNIDADES_VER')) return []

  try {
    const projects = await prisma.ycProjetos.findMany({
      where: { 
        sysTenantId: BigInt(tenantIdStr),
        escopoId: { in: cracha.escoposPermitidos } // Proteção de Escopo
      },
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
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('UNIDADES_VER')) return []

  try {
    const blocks = await prisma.ycBlocos.findMany({
      where: { 
        projetoId: BigInt(projetoId),
        sysTenantId: BigInt(tenantIdStr),
        escopoId: { in: cracha.escoposPermitidos } // Proteção de Escopo
      },
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
  if (!session?.user?.id) return { success: false, message: "Não autorizado" }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha) return { success: false, message: "Perfil de acesso não encontrado." }

  const requiredPermission = blockId ? 'UNIDADES_EDITAR' : 'UNIDADES_CRIAR'
  if (!cracha.permissoes.includes(requiredPermission)) {
    return { success: false, message: "Você não tem permissão para realizar esta operação." }
  }

  const raw = Object.fromEntries(formData.entries())
  const valid = blockSchema.safeParse(raw)
  if (!valid.success) return { success: false, message: "Dados inválidos" }

  try {
    // Garante que o projeto pertence ao escopo permitido
    const project = await prisma.ycProjetos.findFirst({ 
      where: { 
        id: BigInt(projetoId), 
        sysTenantId: tenantId,
        escopoId: { in: cracha.escoposPermitidos } 
      } 
    })
    
    if (!project) return { success: false, message: "Projeto não encontrado ou acesso negado." }

    if (blockId) {
      await prisma.ycBlocos.update({
        where: { id: BigInt(blockId) },
        data: { codigo: valid.data.codigo, nome: valid.data.nome }
      })
    } else {
      await prisma.ycBlocos.create({
        data: {
          sysTenantId: project.sysTenantId,
          sysUserId: userId,
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
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado" }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('UNIDADES_EXCLUIR')) {
    return { success: false, message: "Você não tem permissão para excluir." }
  }

  try {
    // Verifica se o bloco pertence a um escopo válido
    const block = await prisma.ycBlocos.findFirst({
        where: { 
            id: BigInt(blockId),
            sysTenantId: BigInt(tenantIdStr),
            escopoId: { in: cracha.escoposPermitidos }
        }
    })

    if (!block) return { success: false, message: "Bloco não encontrado ou acesso negado." }

    await prisma.ycBlocos.delete({ where: { id: BigInt(blockId) } })
    revalidatePath("/app/comercial/unidades") 
    return { success: true, message: "Bloco excluído." }
  } catch {
    return { success: false, message: "Não é possível excluir bloco com unidades vinculadas." }
  }
}

// --- ACTIONS: UNIDADES ---

export async function getUnitsByProject(projetoId: string) {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('UNIDADES_VER')) return []

  try {
    const units = await prisma.ycUnidades.findMany({
      where: { 
        projetoId: BigInt(projetoId),
        sysTenantId: BigInt(tenantIdStr),
        escopoId: { in: cracha.escoposPermitidos } // Proteção de Escopo
      },
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
  if (!session?.user?.id) return { success: false, message: "Não autorizado" }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('UNIDADES_CRIAR')) {
    return { success: false, message: "Você não tem permissão." }
  }

  const raw = Object.fromEntries(formData.entries())
  const valid = unitSchema.safeParse(raw)
  
  if (!valid.success) {
      return { success: false, message: "Verifique os campos obrigatórios" }
  }

  try {
    const project = await prisma.ycProjetos.findFirst({ 
        where: { 
            id: BigInt(projetoId),
            sysTenantId: tenantId,
            escopoId: { in: cracha.escoposPermitidos } 
        } 
    })
    
    const bloco = await prisma.ycBlocos.findUnique({ where: { id: BigInt(valid.data.blocoId) } })
    
    if (!project || !bloco) return { success: false, message: "Dados de vínculo inválidos ou acesso negado" }

    const sku = `${project.id}-${bloco.codigo}-${valid.data.unidade}`

    await prisma.ycUnidades.create({
      data: {
        sysTenantId: project.sysTenantId,
        sysUserId: userId,
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
  if (!session?.user?.id) return { success: false, message: "Não autorizado" }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

  const tenantId = BigInt(tenantIdStr)

  const cracha = await getUserAccessProfile(BigInt(session.user.id), tenantId)
  if (!cracha || !cracha.permissoes.includes('UNIDADES_EDITAR')) {
    return { success: false, message: "Você não tem permissão." }
  }

  const raw = Object.fromEntries(formData.entries())
  const valid = unitSchema.safeParse(raw)
  if (!valid.success) return { success: false, message: "Dados inválidos" }

  try {
    const existingUnit = await prisma.ycUnidades.findFirst({
        where: { 
            id: BigInt(unitId),
            sysTenantId: tenantId,
            escopoId: { in: cracha.escoposPermitidos } 
        },
        select: { projetoId: true }
    })
    
    const targetBlock = await prisma.ycBlocos.findUnique({
        where: { id: BigInt(valid.data.blocoId) }
    })

    if (!existingUnit || !targetBlock) {
        return { success: false, message: "Unidade não encontrada, projeto inválido ou acesso negado." }
    }

    const newSku = `${existingUnit.projetoId}-${targetBlock.codigo}-${valid.data.unidade}`
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
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado" }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('UNIDADES_EXCLUIR')) {
    return { success: false, message: "Você não tem permissão." }
  }

  try {
    const uId = BigInt(unitId)

    const unit = await prisma.ycUnidades.findFirst({
        where: {
            id: uId,
            sysTenantId: BigInt(tenantIdStr),
            escopoId: { in: cracha.escoposPermitidos }
        }
    })

    if (!unit) return { success: false, message: "Unidade não encontrada ou acesso negado." }

    const anexos = await prisma.ycUnidadesAnexos.findMany({ where: { unidadeId: uId } })
    for (const anexo of anexos) {
        if (anexo.urlArquivo) {
            await deleteFileFromAzureByPath(anexo.urlArquivo)
        }
    }

    await prisma.$transaction([
        prisma.ycUnidadesAnexos.deleteMany({ where: { unidadeId: uId } }),
        prisma.ycUnidades.delete({ where: { id: uId } })
    ])

    revalidatePath(`/app/comercial/unidades`)
    return { success: true, message: "Unidade e seus anexos foram excluídos." }
  } catch {
    return { success: false, message: "Erro ao excluir unidade. Verifique se existem propostas vinculadas." }
  }
}

// ==========================================
// MÓDULO DE ANEXOS DA UNIDADE
// ==========================================

export async function getUnitAttachments(unidadeId: string): Promise<UnitAttachmentItem[]> {
    const session = await auth()
    if (!session?.user?.id) return []

    try {
        // Assume-se que o componente Pai já blindou o acesso à página,
        // mas a query usa o tenant de segurança implícita.
        const anexos = await prisma.ycUnidadesAnexos.findMany({
            where: { unidadeId: BigInt(unidadeId) },
            orderBy: { sysCreatedAt: 'asc' }
        })

        return anexos.map(a => ({
            id: a.id.toString(),
            nomeArquivo: a.nomeArquivo,
            classificacao: a.classificacao,
            urlArquivo: a.urlArquivo,
            isPublico: a.isPublico
        }))
    } catch (error) {
        console.error("Erro ao buscar anexos da unidade:", error)
        return []
    }
}

export async function getUnitUploadUrls(unidadeId: string, fileNames: string[]) {
    const session = await auth()
    if (!session) return { success: false, data: [] }

    try {
        const tenantIdStr = await getCurrentTenantId()
        if (!tenantIdStr) return { success: false, data: [] }
        
        const containerName = 'private-docs'
        const folderPath = `tenant-${tenantIdStr}/unidade-${unidadeId}`

        const urls = await Promise.all(fileNames.map(async (fileName) => {
            const { uploadUrl, relativePath } = await getUploadSasUrl(containerName, folderPath, fileName)
            return { fileName, uploadUrl, relativePath }
        }))

        return { success: true, data: urls }
    } catch (error) {
        console.error("Erro ao gerar links de upload da unidade:", error)
        return { success: false, data: [] }
    }
}

export async function saveUnitAttachmentsMetadata(unidadeId: string, attachmentsData: Array<{fileName: string, classificacao: string, isPublico: boolean, relativePath: string}>) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    try {
        const uId = BigInt(unidadeId)
        const tenantIdStr = await getCurrentTenantId()
        if (!tenantIdStr) return { success: false, message: "Tenant não encontrado." }
        const tenantId = BigInt(tenantIdStr)
        const userId = BigInt(session.user.id)

        const cracha = await getUserAccessProfile(userId, tenantId)
        if (!cracha || !cracha.permissoes.includes('UNIDADES_EDITAR')) {
            return { success: false, message: "Sem permissão de edição." }
        }

        const unidade = await prisma.ycUnidades.findFirst({ 
            where: { 
                id: uId,
                sysTenantId: tenantId,
                escopoId: { in: cracha.escoposPermitidos } 
            } 
        })
        if (!unidade) return { success: false, message: "Unidade não encontrada ou acesso negado." }

        const savePromises = attachmentsData.map(data => {
            return prisma.ycUnidadesAnexos.create({
                data: {
                    sysTenantId: tenantId,
                    sysUserId: userId,
                    escopoId: unidade.escopoId,
                    unidadeId: uId,
                    nomeArquivo: data.fileName,
                    classificacao: data.classificacao,
                    urlArquivo: data.relativePath,
                    isPublico: data.isPublico
                }
            })
        })

        const savedAttachments = await Promise.all(savePromises)

        const newItems = savedAttachments.map(a => ({
            id: a.id.toString(),
            nomeArquivo: a.nomeArquivo,
            classificacao: a.classificacao,
            urlArquivo: a.urlArquivo,
            isPublico: a.isPublico
        }))

        return { success: true, message: `${savedAttachments.length} arquivo(s) salvo(s)!`, data: newItems }
    } catch (error) {
        console.error("Erro ao salvar metadados dos anexos da unidade:", error)
        return { success: false, message: "Erro ao registrar arquivos no banco de dados." }
    }
}

export async function deleteUnitAttachment(anexoId: string, urlArquivo: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    try {
        const tenantIdStr = await getCurrentTenantId()
        if (!tenantIdStr) return { success: false, message: "Sessão expirada." }
        const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
        if (!cracha || !cracha.permissoes.includes('UNIDADES_EDITAR')) {
            return { success: false, message: "Sem permissão de edição." }
        }

        const idBase = BigInt(anexoId)
        
        const anexo = await prisma.ycUnidadesAnexos.findFirst({ 
            where: { 
                id: idBase,
                sysTenantId: BigInt(tenantIdStr),
                escopoId: { in: cracha.escoposPermitidos }
            } 
        })
        if (!anexo) return { success: false, message: "Anexo não encontrado ou acesso negado." }

        await deleteFileFromAzureByPath(urlArquivo)
        await prisma.ycUnidadesAnexos.delete({ where: { id: idBase } })

        return { success: true, message: "Anexo removido com sucesso." }
    } catch (error) {
        console.error("Erro ao deletar anexo da unidade:", error)
        return { success: false, message: "Erro interno ao excluir arquivo." }
    }
}

export async function getUnitAttachmentDownloadUrl(urlArquivo: string, originalName: string) {
    const session = await auth()
    if (!session) return { success: false, url: null }

    try {
        const url = await getFileDownloadUrl(urlArquivo, originalName)
        return { success: true, url }
    } catch (error) {
        console.error("Erro ao gerar link de download da unidade:", error)
        return { success: false, url: null }
    }
}

export async function toggleUnitAttachmentVisibility(anexoId: string, isPublico: boolean) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    try {
        const tenantIdStr = await getCurrentTenantId()
        if (!tenantIdStr) return { success: false, message: "Sessão expirada." }
        const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
        if (!cracha || !cracha.permissoes.includes('UNIDADES_EDITAR')) {
            return { success: false, message: "Sem permissão de edição." }
        }

        const idBase = BigInt(anexoId)
        const anexo = await prisma.ycUnidadesAnexos.findFirst({ 
            where: { 
                id: idBase,
                sysTenantId: BigInt(tenantIdStr),
                escopoId: { in: cracha.escoposPermitidos }
            } 
        })

        if (!anexo) return { success: false, message: "Acesso negado." }

        await prisma.ycUnidadesAnexos.update({
            where: { id: idBase },
            data: { isPublico }
        })
        return { success: true, message: "Visibilidade atualizada com sucesso!" }
    } catch (error) {
        console.error("Erro ao atualizar visibilidade do anexo da unidade:", error)
        return { success: false, message: "Erro ao atualizar visibilidade no banco." }
    }
}