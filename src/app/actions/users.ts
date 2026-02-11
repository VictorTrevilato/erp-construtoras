'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { z } from "zod"
import bcrypt from "bcryptjs"

// Schema Atualizado
const userSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  email: z.string().email("E-mail inválido."),
  // Senha
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  
  cargoId: z.string().min(1, "Selecione um cargo."),
  escopos: z.array(z.string()), 
  
  // Novas Permissões Granulares: Array de string JSON "{id: 1, action: 'ALLOW'}"
  // Vamos processar isso manualmente pois vem do form como strings
})
.refine((data) => {
  // Se password foi preenchido, confirmPassword deve ser igual
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
  if (!session) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  try {
    const users = await prisma.ycUsuariosEmpresas.findMany({
      where: {
        sysTenantId: BigInt(tenantIdStr),
        // Removido filtro 'ativo: true' para listar inativos também (se desejar)
        // ou mantemos apenas ativos. Vamos listar todos para gestão.
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
        // Incluir permissões para popular o form de edição
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
      ativo: u.ativo, // Novo campo
      escoposAtuais: u.ycUsuariosEmpresasEscopos.map(ue => ue.escopoId.toString()),
      // Mapeia permissões extras: { "ID_PERMISSAO": true/false }
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

  const rawEscopos = formData.getAll("escopos") as string[]
  
  // Captura permissões granulares do form
  const rawPermissions: { id: string, action: boolean }[] = []
  
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("perm_")) {
       const permId = key.replace("perm_", "")
       if (value === "ALLOW") rawPermissions.push({ id: permId, action: true })
       if (value === "DENY") rawPermissions.push({ id: permId, action: false })
       // Se for "INHERIT" (Padrão), ignoramos (não salvamos na tabela de exceção)
    }
  }
  
  // [CORREÇÃO] Tratamento de campos nulos para o Zod
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
    await prisma.$transaction(async (tx) => {
      let targetUsuarioEmpresaId: bigint

      let globalUser = await tx.ycUsuarios.findUnique({ where: { email } })

      if (usuarioEmpresaId) {
        // === EDIÇÃO ===
        targetUsuarioEmpresaId = BigInt(usuarioEmpresaId)
        
        const currentLink = await tx.ycUsuariosEmpresas.findUniqueOrThrow({
          where: { id: targetUsuarioEmpresaId }
        })

        // [CORREÇÃO] Tipagem explícita em vez de 'any'
        const updateData: { nome: string; sysUpdatedAt: Date; passwordHash?: string } = { 
            nome, 
            sysUpdatedAt: new Date() 
        }

        // Só atualiza senha se foi fornecida
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

      // --- PERMISSÕES GRANULARES (NOVO) ---
      // 1. Limpa permissões antigas
      await tx.ycUsuariosEmpresasPermissoes.deleteMany({
        where: { usuarioEmpresaId: targetUsuarioEmpresaId }
      })

      // 2. Insere as novas exceções
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

  } catch (error) { // [CORREÇÃO] Removido ': any'
    console.error("Erro ao salvar usuário:", error)
    
    // Verificação segura
    const msg = (error instanceof Error) ? error.message : "Erro interno ao salvar."
    return { success: false, message: msg }
  }

  revalidatePath("/app/configuracoes/usuarios")
  return { success: true, message: "Usuário salvo com sucesso!" }
}

// Remover Usuário (Mantido igual, apenas para garantir integridade do arquivo)
export async function removeUser(usuarioEmpresaId: string) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado." }

    try {
        const id = BigInt(usuarioEmpresaId)
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