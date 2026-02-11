'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { redirect } from "next/navigation"
import { z } from "zod"

// Schema de Validação
const roleSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  descricao: z.string().optional(),
  permissions: z.array(z.string()),
})

export type RoleFormState = {
  success?: boolean
  message?: string
  errors?: {
    nome?: string[]
    descricao?: string[]
  }
}

// --- LISTAGEM ---
export async function getRoles() {
  const session = await auth()
  if (!session) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  try {
    const roles = await prisma.ycCargos.findMany({
      where: {
        sysTenantId: BigInt(tenantIdStr),
        ativo: true // Vamos listar apenas os ativos por enquanto
      },
      orderBy: { nome: 'asc' },
      // Trazemos a contagem de usuários vinculados para evitar excluir cargos em uso
      include: {
        _count: {
          select: { ycUsuariosEmpresas: true }
        }
      }
    })
    return roles
  } catch (error) {
    console.error("Erro ao buscar cargos:", error)
    return []
  }
}

// --- SALVAR (CRIAR ou EDITAR) ---
export async function saveRole(
  roleId: string | null,
  prevState: RoleFormState, 
  formData: FormData
): Promise<RoleFormState> {
  const session = await auth()
  // [CORREÇÃO] Garantir que temos o ID do usuário
  if (!session?.user?.id) return { success: false, message: "Não autorizado." }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Tenant não definido." }
  
  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id) // [NOVO] ID do usuário logado

  const rawPermissions = formData.getAll("permissions") as string[]

  const validatedFields = roleSchema.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
    permissions: rawPermissions,
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Erro de validação.",
      errors: validatedFields.error.flatten().fieldErrors
    }
  }

  const { nome, descricao, permissions } = validatedFields.data

  try {
    await prisma.$transaction(async (tx) => {
      let targetId: bigint

      if (roleId) {
        // --- EDIÇÃO ---
        targetId = BigInt(roleId)
        
        await tx.ycCargos.update({
          where: { id: targetId, sysTenantId: tenantId },
          data: { 
            nome, 
            descricao, 
            sysUpdatedAt: new Date() 
            // [NOTA] Não atualizamos sysUserId aqui, preservando o criador original
          }
        })

        await tx.ycCargosPermissoes.deleteMany({
          where: { cargoId: targetId }
        })

      } else {
        // --- CRIAÇÃO ---
        const newRole = await tx.ycCargos.create({
          data: {
            nome,
            descricao,
            sysTenantId: tenantId,
            sysUserId: userId, // [CORREÇÃO] Inserindo o autor do registro
            interno: true,
            ativo: true,
          }
        })
        targetId = newRole.id
      }

      if (permissions.length > 0) {
        const permissionInserts = permissions.map(permId => ({
          sysTenantId: tenantId,
          sysUserId: userId, // [OPCIONAL] Se quiser rastrear quem deu a permissão também
          cargoId: targetId,
          permissaoId: BigInt(permId)
        }))

        await tx.ycCargosPermissoes.createMany({
          data: permissionInserts
        })
      }
    })

  } catch (error) {
    console.error("Erro ao salvar cargo:", error)
    return { success: false, message: "Erro interno ao salvar." }
  }

  revalidatePath("/app/configuracoes/cargos")
  redirect("/app/configuracoes/cargos")
}

// --- EXCLUIR ---
export async function deleteRole(roleId: string) {
  const session = await auth()
  if (!session) return { success: false, message: "Não autorizado." }

  try {
    const id = BigInt(roleId)

    // Verifica se tem usuários vinculados
    const usage = await prisma.ycUsuariosEmpresas.count({
      where: { cargoId: id, ativo: true }
    })

    if (usage > 0) {
      return { success: false, message: "Não é possível excluir: Existem usuários com este cargo." }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Remove permissões vinculadas (Obrigatório pois onDelete: NoAction)
      await tx.ycCargosPermissoes.deleteMany({
        where: { cargoId: id }
      })

      // 2. Remove o cargo (Soft Delete ou Hard Delete? Vamos de Hard Delete por enquanto se não tiver uso)
      await tx.ycCargos.delete({
        where: { id: id }
      })
    })

    revalidatePath("/app/configuracoes/cargos")
    return { success: true, message: "Cargo excluído com sucesso." }

  } catch (error) {
    console.error("Erro ao excluir cargo:", error)
    return { success: false, message: "Erro ao excluir cargo." }
  }
}

// --- NOVO: BUSCAR POR ID ---
export async function getRoleById(roleId: string) {
  const session = await auth()
  if (!session) return null

  // Usando o helper centralizado
  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return null

  try {
    const role = await prisma.ycCargos.findUnique({
      where: { 
        id: BigInt(roleId),
        sysTenantId: BigInt(tenantIdStr) // Garante segurança multitenant
      },
      include: {
        ycCargosPermissoes: true
      }
    })

    if (!role) return null

    return {
      id: role.id.toString(),
      nome: role.nome,
      descricao: role.descricao,
      // Mapeia apenas os IDs das permissões para o formulário
      permissoesAtuais: role.ycCargosPermissoes.map(cp => cp.permissaoId.toString())
    }
  } catch (error) {
    console.error("Erro ao buscar cargo por ID:", error)
    return null
  }
}
