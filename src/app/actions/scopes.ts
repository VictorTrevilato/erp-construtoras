'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { z } from "zod"
// 1. IMPORTAÇÃO DO MOTOR DE ACESSO
import { getUserAccessProfile } from "@/lib/access-control"

const scopeSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  tipo: z.string().min(1, "O tipo é obrigatório."),
  idPai: z.string().optional(),
})

export type ScopeFormState = {
  success?: boolean
  message?: string
  errors?: {
    nome?: string[]
    tipo?: string[]
  }
}

// --- LISTAGEM ---
export async function getScopes() {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  // CHECAGEM DE PERMISSÃO
  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('ESCOPOS_VER')) return []

  try {
    const scopes = await prisma.ycEscopos.findMany({
      where: {
        sysTenantId: tenantId,
        ativo: true
      },
      orderBy: { caminho: 'asc' } 
    })
    
    return scopes.map(s => ({
      id: s.id.toString(),
      nome: s.nome,
      tipo: s.tipo,
      idPai: s.idPai?.toString() || null,
      caminho: s.caminho,
      nivel: s.caminho.split('/').filter(Boolean).length 
    }))
  } catch (error) {
    console.error("Erro ao buscar escopos:", error)
    return []
  }
}

// --- SALVAR (CRIAR ou EDITAR) ---
export async function saveScope(
  scopeId: string | null, 
  prevState: ScopeFormState, 
  formData: FormData
): Promise<ScopeFormState> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado." }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Tenant não definido." }
  
  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  // CHECAGEM DINÂMICA DE PERMISSÃO
  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha) return { success: false, message: "Perfil de acesso não encontrado." }

  const requiredPermission = scopeId ? 'ESCOPOS_EDITAR' : 'ESCOPOS_CRIAR'
  if (!cracha.permissoes.includes(requiredPermission)) {
    return { success: false, message: "Você não tem permissão para realizar esta operação." }
  }

  const validatedFields = scopeSchema.safeParse({
    nome: formData.get("nome"),
    tipo: formData.get("tipo"),
    idPai: formData.get("idPai") || undefined,
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Erro de validação.",
      errors: validatedFields.error.flatten().fieldErrors
    }
  }

  const { nome, tipo, idPai } = validatedFields.data

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Preparar dados do (possível) Novo Pai
      let newParentPath = ""
      let newParentIdBigInt: bigint | null = null

      if (idPai && idPai !== "root") {
        newParentIdBigInt = BigInt(idPai)
        // BLINDAGEM: Garante que o Pai pertence ao mesmo Tenant
        const parentScope = await tx.ycEscopos.findFirst({
          where: { id: newParentIdBigInt, sysTenantId: tenantId }
        })
        if (!parentScope) throw new Error("Novo escopo pai não encontrado ou acesso negado.")
        newParentPath = parentScope.caminho
      }

      // --- EDIÇÃO (Pode envolver MOVER) ---
      if (scopeId) {
        const targetId = BigInt(scopeId)
        
        // BLINDAGEM: Garante que o escopo alvo pertence ao mesmo Tenant
        const currentScope = await tx.ycEscopos.findFirst({
          where: { id: targetId, sysTenantId: tenantId }
        })

        if (!currentScope) throw new Error("Escopo alvo não encontrado ou acesso negado.")

        const isMoving = currentScope.idPai !== newParentIdBigInt

        if (isMoving) {
          // [SEGURANÇA] Verificação de Ciclo
          if (newParentPath && newParentPath.startsWith(currentScope.caminho)) {
            throw new Error("Não é possível mover um escopo para dentro de um de seus descendentes.")
          }

          const oldPathPrefix = currentScope.caminho
          const newPathPrefix = `${newParentPath}${targetId}/`

          // 1. Atualiza o próprio registro
          await tx.ycEscopos.update({
            where: { id: targetId },
            data: {
              nome,
              tipo,
              idPai: newParentIdBigInt,
              caminho: newPathPrefix,
              sysUpdatedAt: new Date()
            }
          })

          // 2. Atualiza TODOS os descendentes
          const descendants = await tx.ycEscopos.findMany({
            where: {
              sysTenantId: tenantId,
              caminho: { startsWith: oldPathPrefix }, 
              id: { not: targetId }
            }
          })

          for (const child of descendants) {
            const newChildPath = newPathPrefix + child.caminho.substring(oldPathPrefix.length)
            
            await tx.ycEscopos.update({
              where: { id: child.id },
              data: { caminho: newChildPath }
            })
          }

        } else {
          // Edição simples
          await tx.ycEscopos.update({
            where: { id: targetId },
            data: { nome, tipo, sysUpdatedAt: new Date() }
          })
        }

      } 
      // --- CRIAÇÃO ---
      else {
        const newScope = await tx.ycEscopos.create({
          data: {
            nome,
            tipo,
            idPai: newParentIdBigInt,
            sysTenantId: tenantId,
            sysUserId: userId,
            caminho: "TEMP",
            ativo: true
          }
        })

        const finalPath = `${newParentPath}${newScope.id}/`

        await tx.ycEscopos.update({
          where: { id: newScope.id },
          data: { caminho: finalPath }
        })
      }
    })

    revalidatePath("/app/configuracoes/escopos")
    return { success: true, message: "Escopo salvo com sucesso!" }

  } catch (error) { 
    console.error("Erro ao salvar escopo:", error)
    
    // Extrai as nossas exceções disparadas dentro do bloco
    const msg = (error instanceof Error && (error.message.includes("descendentes") || error.message.includes("não encontrado"))) 
      ? error.message 
      : "Erro interno ao salvar."

    return { success: false, message: msg }
  }
}

// --- EXCLUIR ---
export async function deleteScope(scopeId: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return { success: false, message: "Tenant não definido." }

    const tenantId = BigInt(tenantIdStr)
    const userId = BigInt(session.user.id)

    // CHECAGEM DE PERMISSÃO
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha || !cracha.permissoes.includes('ESCOPOS_EXCLUIR')) {
        return { success: false, message: "Você não tem permissão para excluir escopos." }
    }
  
    try {
      const id = BigInt(scopeId)

      // BLINDAGEM: Garante que o escopo alvo pertence ao mesmo Tenant antes de excluir
      const scopeExists = await prisma.ycEscopos.findFirst({
          where: { id, sysTenantId: tenantId }
      })
      if (!scopeExists) return { success: false, message: "Escopo não encontrado ou acesso negado." }
  
      const childrenCount = await prisma.ycEscopos.count({
        where: { idPai: id, sysTenantId: tenantId, ativo: true }
      })
  
      if (childrenCount > 0) {
        return { success: false, message: "Não é possível excluir: Este escopo possui sub-escopos." }
      }
  
      await prisma.ycEscopos.delete({
        where: { id }
      })
  
      revalidatePath("/app/configuracoes/escopos")
      return { success: true, message: "Escopo excluído." }
  
    } catch { 
      return { success: false, message: "Erro ao excluir. Verifique se o escopo possui dependências ativas." }
    }
}