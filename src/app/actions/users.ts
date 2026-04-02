'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { z } from "zod"
import bcrypt from "bcryptjs"
// 1. IMPORTAÇÃO DO MOTOR DE ACESSO
import { getUserAccessProfile } from "@/lib/access-control"

// Schema Atualizado
const userSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  email: z.string().email("E-mail inválido."),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  cargoId: z.string().min(1, "Selecione um cargo."),
  escopos: z.array(z.string()), 
})
.refine((data) => {
  if (data.password && data.password !== "") {
    return data.password === data.confirmPassword
  }
  return true
}, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"]
})

export type UserFormState = {
  success?: boolean
  message?: string
  errors?: {
    nome?: string[]
    email?: string[]
    password?: string[]
    confirmPassword?: string[]
    cargoId?: string[]
  }
}

// --- LISTAGEM ---
export async function getUsers() {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  // CHECAGEM DE PERMISSÃO
  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('USUARIOS_VER')) return []

  try {
    const users = await prisma.ycUsuariosEmpresas.findMany({
      where: {
        sysTenantId: tenantId,
      },
      include: {
        ycUsuarios: {
          select: { id: true, nome: true, email: true }
        },
        ycCargos: {
          select: { id: true, nome: true }
        },
        ycUsuariosEmpresasEscopos: {
            select: { escopoId: true }
        },
        ycUsuariosEmpresasPermissoes: {
            select: { permissaoId: true, permitido: true }
        }
      },
      orderBy: { ycUsuarios: { nome: 'asc' } }
    })

    return users.map(u => ({
      usuarioEmpresaId: u.id.toString(),
      usuarioGlobalId: u.usuarioId.toString(),
      nome: u.ycUsuarios.nome,
      email: u.ycUsuarios.email,
      cargoId: u.cargoId.toString(),
      cargoNome: u.ycCargos.nome,
      ativo: u.ativo, 
      escoposAtuais: u.ycUsuariosEmpresasEscopos.map(ue => ue.escopoId.toString()),
      permissoesExtras: u.ycUsuariosEmpresasPermissoes.reduce((acc, curr) => {
        acc[curr.permissaoId.toString()] = curr.permitido
        return acc
      }, {} as Record<string, boolean>)
    }))

  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return []
  }
}

// --- SALVAR ---
export async function saveUser(
  usuarioEmpresaId: string | null, 
  prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado." }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Tenant não definido." }

  const tenantId = BigInt(tenantIdStr)
  const adminId = BigInt(session.user.id)

  // CHECAGEM DINÂMICA DE PERMISSÃO
  const cracha = await getUserAccessProfile(adminId, tenantId)
  if (!cracha) return { success: false, message: "Perfil de acesso não encontrado." }

  const requiredPermission = usuarioEmpresaId ? 'USUARIOS_EDITAR' : 'USUARIOS_CRIAR'
  if (!cracha.permissoes.includes(requiredPermission)) {
    return { success: false, message: "Você não tem permissão para realizar esta operação." }
  }

  const rawEscopos = formData.getAll("escopos") as string[]
  const rawPermissions: { id: string, action: boolean }[] = []
  
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("perm_")) {
       const permId = key.replace("perm_", "")
       if (value === "ALLOW") rawPermissions.push({ id: permId, action: true })
       if (value === "DENY") rawPermissions.push({ id: permId, action: false })
    }
  }
  
  const passwordRaw = formData.get("password")
  const confirmPasswordRaw = formData.get("confirmPassword")

  const validatedFields = userSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    password: passwordRaw || undefined,
    confirmPassword: confirmPasswordRaw || undefined,
    cargoId: formData.get("cargoId"),
    escopos: rawEscopos
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Erro de validação.",
      errors: validatedFields.error.flatten().fieldErrors
    }
  }

  const { nome, email, password, cargoId, escopos } = validatedFields.data

  try {
    // BLINDAGEM: Verifica se o usuário a editar pertence ao tenant atual
    if (usuarioEmpresaId) {
      const checkExists = await prisma.ycUsuariosEmpresas.findFirst({
        where: { id: BigInt(usuarioEmpresaId), sysTenantId: tenantId }
      })
      if (!checkExists) throw new Error("Usuário não encontrado ou acesso negado.")
    }

    await prisma.$transaction(async (tx) => {
      let targetUsuarioEmpresaId: bigint

      let globalUser = await tx.ycUsuarios.findUnique({ where: { email } })

      if (usuarioEmpresaId) {
        // === EDIÇÃO ===
        targetUsuarioEmpresaId = BigInt(usuarioEmpresaId)
        
        const currentLink = await tx.ycUsuariosEmpresas.findUniqueOrThrow({
          where: { id: targetUsuarioEmpresaId }
        })

        const updateData: { nome: string; sysUpdatedAt: Date; passwordHash?: string } = { 
            nome, 
            sysUpdatedAt: new Date() 
        }

        if (password && password.length >= 6) {
            updateData.passwordHash = await bcrypt.hash(password, 10)
        }

        await tx.ycUsuarios.update({
          where: { id: currentLink.usuarioId },
          data: updateData
        })

        await tx.ycUsuariosEmpresas.update({
          where: { id: targetUsuarioEmpresaId },
          data: { 
            cargoId: BigInt(cargoId),
            sysUpdatedAt: new Date()
          }
        })

      } else {
        // === CRIAÇÃO ===
        if (!password || password.length < 6) {
            throw new Error("A senha é obrigatória para novos usuários.")
        }

        if (!globalUser) {
          const hash = await bcrypt.hash(password, 10)
          globalUser = await tx.ycUsuarios.create({
            data: {
              nome,
              email,
              passwordHash: hash,
              ativo: true,
              isSuperAdmin: false
            }
          })
        }

        const existingLink = await tx.ycUsuariosEmpresas.findFirst({
            where: { usuarioId: globalUser.id, sysTenantId: tenantId }
        })

        if (existingLink) throw new Error("Este usuário já faz parte desta empresa.")

        const newLink = await tx.ycUsuariosEmpresas.create({
          data: {
            sysTenantId: tenantId,
            sysUserId: adminId,
            usuarioId: globalUser.id,
            cargoId: BigInt(cargoId),
            ativo: true
          }
        })
        targetUsuarioEmpresaId = newLink.id
      }

      // --- ESCOPOS ---
      await tx.ycUsuariosEmpresasEscopos.deleteMany({
        where: { usuarioEmpresaId: targetUsuarioEmpresaId }
      })

      if (escopos.length > 0) {
        await tx.ycUsuariosEmpresasEscopos.createMany({
            data: escopos.map(scopeId => ({
                sysTenantId: tenantId,
                sysUserId: adminId,
                usuarioEmpresaId: targetUsuarioEmpresaId,
                escopoId: BigInt(scopeId)
            }))
        })
      }

      // --- PERMISSÕES GRANULARES ---
      await tx.ycUsuariosEmpresasPermissoes.deleteMany({
        where: { usuarioEmpresaId: targetUsuarioEmpresaId }
      })

      if (rawPermissions.length > 0) {
        await tx.ycUsuariosEmpresasPermissoes.createMany({
            data: rawPermissions.map(p => ({
                sysTenantId: tenantId,
                sysUserId: adminId,
                usuarioEmpresaId: targetUsuarioEmpresaId,
                permissaoId: BigInt(p.id),
                permitido: p.action
            }))
        })
      }
    })

  } catch (error) { 
    console.error("Erro ao salvar usuário:", error)
    const msg = (error instanceof Error) ? error.message : "Erro interno ao salvar."
    return { success: false, message: msg }
  }

  revalidatePath("/app/configuracoes/usuarios")
  return { success: true, message: "Usuário salvo com sucesso!" }
}

// --- EXCLUIR ---
export async function removeUser(usuarioEmpresaId: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return { success: false, message: "Tenant não definido." }

    const tenantId = BigInt(tenantIdStr)
    const adminId = BigInt(session.user.id)

    // CHECAGEM DE PERMISSÃO
    const cracha = await getUserAccessProfile(adminId, tenantId)
    if (!cracha || !cracha.permissoes.includes('USUARIOS_EXCLUIR')) {
        return { success: false, message: "Você não tem permissão para excluir usuários." }
    }

    try {
        const id = BigInt(usuarioEmpresaId)

        // BLINDAGEM: Garante que o vínculo apagado pertence a esta empresa
        const userExists = await prisma.ycUsuariosEmpresas.findFirst({
            where: { id, sysTenantId: tenantId }
        })
        if (!userExists) return { success: false, message: "Usuário não encontrado ou acesso negado." }

        await prisma.$transaction(async (tx) => {
            await tx.ycUsuariosEmpresasEscopos.deleteMany({ where: { usuarioEmpresaId: id } })
            await tx.ycUsuariosEmpresasPermissoes.deleteMany({ where: { usuarioEmpresaId: id } })
            await tx.ycUsuariosEmpresas.delete({ where: { id } })
        })
        revalidatePath("/app/configuracoes/usuarios")
        return { success: true, message: "Acesso revogado com sucesso." }
    } catch {
        return { success: false, message: "Erro ao remover usuário." }
    }
}