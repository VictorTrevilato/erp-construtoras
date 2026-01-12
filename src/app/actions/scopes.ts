'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

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

export async function getScopes() {
  const session = await auth()
  if (!session) return []

  const cookieStore = await cookies()
  const tenantIdStr = cookieStore.get("tenant-id")?.value
  if (!tenantIdStr) return []

  try {
    const scopes = await prisma.ycEscopos.findMany({
      where: {
        sysTenantId: BigInt(tenantIdStr),
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

export async function saveScope(
  scopeId: string | null, 
  prevState: ScopeFormState, 
  formData: FormData
): Promise<ScopeFormState> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado." }

  const cookieStore = await cookies()
  const tenantIdStr = cookieStore.get("tenant-id")?.value
  if (!tenantIdStr) return { success: false, message: "Tenant não definido." }
  
  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

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

      // [CORREÇÃO DO BUG] Se for "root", tratamos como null. Se for ID válido, convertemos.
      if (idPai && idPai !== "root") {
        newParentIdBigInt = BigInt(idPai)
        const parentScope = await tx.ycEscopos.findUnique({
          where: { id: newParentIdBigInt }
        })
        if (!parentScope) throw new Error("Novo escopo pai não encontrado.")
        newParentPath = parentScope.caminho
      }
      // Se for "root", newParentPath continua vazio "" e newParentIdBigInt continua null. Correto.

      // --- EDIÇÃO (Pode envolver MOVER) ---
      if (scopeId) {
        const targetId = BigInt(scopeId)
        
        const currentScope = await tx.ycEscopos.findUniqueOrThrow({
          where: { id: targetId }
        })

        const isMoving = currentScope.idPai !== newParentIdBigInt

        if (isMoving) {
          // [SEGURANÇA] Verificação de Ciclo
          // Só verificamos ciclo se tivermos um pai. Mover pra raiz nunca gera ciclo.
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

  } catch (error) { // <--- [CORREÇÃO] Removido ': any'
    console.error("Erro ao salvar escopo:", error)
    
    // Verificação segura do tipo de erro
    const msg = (error instanceof Error && error.message.includes("descendentes")) 
      ? error.message 
      : "Erro interno ao salvar."

    return { success: false, message: msg }
  }
}

export async function deleteScope(scopeId: string) {
    const session = await auth()
      if (!session) return { success: false, message: "Não autorizado." }
    
      try {
        const id = BigInt(scopeId)
    
        const childrenCount = await prisma.ycEscopos.count({
          where: { idPai: id, ativo: true }
        })
    
        if (childrenCount > 0) {
          return { success: false, message: "Não é possível excluir: Este escopo possui sub-escopos." }
        }
    
        await prisma.ycEscopos.delete({
          where: { id }
        })
    
        revalidatePath("/app/configuracoes/escopos")
        return { success: true, message: "Escopo excluído." }
    
      } catch { // <--- [CORREÇÃO] Removido '(error)' pois não era usado
        return { success: false, message: "Erro ao excluir." }
      }
}