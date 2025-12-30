'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Função auxiliar para serializar BigInt
function serializeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (key, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value
  ))
}

export type ActionState = {
  success: boolean
  message?: string
  errors?: Record<string, string[]>
  data?: unknown
}

// ------------------------------------------------------------------
// 1. GESTÃO DE TENANTS (ycEmpresas)
// ------------------------------------------------------------------

const tenantSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  cnpj: z.string().min(14, 'CNPJ inválido.'),
  corPrimaria: z.string().optional().or(z.literal('')),
  corSecundaria: z.string().optional().or(z.literal('')),
  ativo: z.boolean().default(true),
})

// GET com Paginação, Busca e Ordenação
export async function getTenants(
  page: number = 1, 
  pageSize: number = 10, 
  search: string = '',
  sortBy: string = 'sysCreatedAt',
  sortDir: 'asc' | 'desc' = 'desc'
) {
  try {
    const skip = (page - 1) * pageSize
    const searchClean = search.replace(/\D/g, '')

    const whereCondition: Prisma.ycEmpresasWhereInput = search ? {
      OR: [
        { nome: { contains: search } },
        { cnpj: { contains: searchClean || search } } 
      ]
    } : {}

    const validSortFields = ['nome', 'cnpj', 'sysCreatedAt', 'ativo']
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'sysCreatedAt'
    
    const orderBy = {
      [orderByField]: sortDir
    }

    const [tenants, total] = await prisma.$transaction([
      prisma.ycEmpresas.findMany({
        where: whereCondition,
        orderBy: orderBy,
        take: pageSize,
        skip: skip,
      }),
      prisma.ycEmpresas.count({ where: whereCondition })
    ])

    const totalPages = Math.ceil(total / pageSize)

    return {
      success: true,
      data: serializeData(tenants),
      meta: { page, pageSize, total, totalPages }
    }
  } catch (error) {
    console.error('Erro ao buscar tenants:', error)
    return { success: false, data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }
  }
}

// CREATE
export async function createTenant(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth()
  const sysUserId = session?.user?.id ? BigInt(session.user.id) : null

  const rawAtivo = formData.get('ativo')
  const isAtivo = rawAtivo === 'on' 

  const validatedFields = tenantSchema.safeParse({
    nome: formData.get('nome'),
    cnpj: formData.get('cnpj')?.toString().replace(/\D/g, ''),
    corPrimaria: formData.get('corPrimaria'),
    corSecundaria: formData.get('corSecundaria'),
    ativo: isAtivo, 
  })

  if (!validatedFields.success) {
    return { success: false, message: 'Erro de validação.', errors: validatedFields.error.flatten().fieldErrors }
  }

  const { nome, cnpj, corPrimaria, corSecundaria, ativo } = validatedFields.data

  try {
    const newTenant = await prisma.$transaction(async (tx) => {
      const tenant = await tx.ycEmpresas.create({
        data: {
          nome,
          cnpj,
          corPrimaria: corPrimaria || null,
          corSecundaria: corSecundaria || null,
          ativo,
          sysUserId,
        },
      })

      const allPermissions = await tx.ycPermissoes.findMany({ select: { id: true } })

      await tx.ycCargos.create({
        data: {
          nome: 'Administrador',
          descricao: 'Acesso total ao sistema',
          interno: true,
          ativo: true,
          sysTenantId: tenant.id,
          sysUserId: sysUserId,
          ycCargosPermissoes: {
            create: allPermissions.map(p => ({
              permissaoId: p.id,
              sysTenantId: tenant.id,
              sysUserId: sysUserId
            }))
          }
        }
      })

      return tenant
    })
    
    revalidatePath('/admin/tenants')
    
    return { 
      success: true, 
      message: 'Empresa e Cargo Administrador criados!',
      data: serializeData(newTenant) 
    }

  } catch (error) {
    console.error(error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { success: false, message: 'Este CNPJ já está cadastrado.' }
    }
    return { success: false, message: 'Erro interno ao criar empresa.' }
  }
}

// UPDATE
export async function updateTenant(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = formData.get('id') as string

  const rawAtivo = formData.get('ativo')
  const isAtivo = rawAtivo === 'on' 

  const validatedFields = tenantSchema.safeParse({
    nome: formData.get('nome'),
    cnpj: formData.get('cnpj')?.toString().replace(/\D/g, ''),
    corPrimaria: formData.get('corPrimaria'),
    corSecundaria: formData.get('corSecundaria'),
    ativo: isAtivo,
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Erro de validação.',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { nome, cnpj, corPrimaria, corSecundaria, ativo } = validatedFields.data

  try {
    await prisma.ycEmpresas.update({
      where: { id: BigInt(id) },
      data: {
        nome,
        cnpj,
        corPrimaria: corPrimaria || null,
        corSecundaria: corSecundaria || null,
        ativo,
        sysUpdatedAt: new Date()
      },
    })
    
    revalidatePath('/admin/tenants')
    return { success: true, message: 'Empresa atualizada com sucesso!' }
  } catch (error) {
    console.error(error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { success: false, message: 'Este CNPJ já pertence a outra empresa.' }
    }
    return { success: false, message: 'Erro ao atualizar empresa.' }
  }
}

// DELETE
export async function deleteTenant(id: string) {
  try {
    await prisma.ycEmpresas.delete({ where: { id: BigInt(id) } })
    revalidatePath('/admin/tenants')
    return { success: true, message: 'Empresa removida com sucesso.' }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return { 
        success: false, 
        message: 'Existem usuários, cargos ou obras vinculados a esta empresa.' 
      }
    }
    
    console.error('Erro ao deletar tenant:', error)
    return { success: false, message: 'Erro interno ao remover empresa.' }
  }
}

/* ===========================================================================
  2. GESTÃO DE PERMISSÕES (ycPermissoes)
  ===========================================================================
*/

const permissionSchema = z.object({
  codigo: z.string()
    .min(3, 'O código deve ser único e legível.')
    .transform(v => v.toUpperCase().replace(/\s+/g, '_')),
  descricao: z.string().min(5, 'Descrição muito curta.'),
  categoria: z.string().min(2, 'Informe a categoria (ex: Financeiro).'),
})

// GET Permissões
export async function getPermissions(
  page: number = 1, 
  pageSize: number = 10, 
  search: string = '',
  sortBy: string = 'categoria',
  sortDir: 'asc' | 'desc' = 'asc'
) {
  try {
    const skip = (page - 1) * pageSize
    
    const whereCondition: Prisma.ycPermissoesWhereInput = search ? {
      OR: [
        { codigo: { contains: search } },
        { descricao: { contains: search } },
        { categoria: { contains: search } }
      ]
    } : {}

    const validSortFields = ['codigo', 'descricao', 'categoria', 'sysCreatedAt']
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'categoria'
    
    const orderBy = { [orderByField]: sortDir }

    const [permissions, total] = await prisma.$transaction([
      prisma.ycPermissoes.findMany({
        where: whereCondition,
        orderBy: orderBy,
        take: pageSize,
        skip: skip,
      }),
      prisma.ycPermissoes.count({ where: whereCondition })
    ])

    const totalPages = Math.ceil(total / pageSize)

    return {
      success: true,
      data: serializeData(permissions),
      meta: { page, pageSize, total, totalPages }
    }
  } catch (error) {
    console.error('Erro buscar permissões:', error)
    return { success: false, data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }
  }
}

// CREATE Permissão
export async function createPermission(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validatedFields = permissionSchema.safeParse({
    codigo: formData.get('codigo'),
    descricao: formData.get('descricao'),
    categoria: formData.get('categoria'),
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Erro de validação.',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    await prisma.ycPermissoes.create({
      data: validatedFields.data
    })
    
    revalidatePath('/admin/permissions')
    return { success: true, message: 'Permissão criada com sucesso!' }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, message: 'Já existe uma permissão com este Código.' }
    }
    return { success: false, message: 'Erro ao criar permissão.' }
  }
}

// UPDATE Permissão
export async function updatePermission(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = formData.get('id') as string

  const validatedFields = permissionSchema.safeParse({
    codigo: formData.get('codigo'),
    descricao: formData.get('descricao'),
    categoria: formData.get('categoria'),
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Erro de validação.',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    await prisma.ycPermissoes.update({
      where: { id: BigInt(id) },
      data: {
        ...validatedFields.data,
        sysUpdatedAt: new Date()
      }
    })
    
    revalidatePath('/admin/permissions')
    return { success: true, message: 'Permissão atualizada com sucesso!' }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, message: 'Já existe uma permissão com este Código.' }
    }
    return { success: false, message: 'Erro ao atualizar permissão.' }
  }
}

// DELETE Permissão
export async function deletePermission(id: string) {
  try {
    await prisma.ycPermissoes.delete({ where: { id: BigInt(id) } })
    revalidatePath('/admin/permissions')
    return { success: true, message: 'Permissão removida.' }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
       return { success: false, message: 'Esta permissão está sendo usada por um ou mais Cargos e não pode ser excluída.' }
    }
    return { success: false, message: 'Erro ao remover permissão.' }
  }
}

/* ===========================================================================
  3. GESTÃO DE USUÁRIOS (ycUsuarios)
  ===========================================================================
*/

const userSchema = z.object({
  nome: z.string().min(3, 'Nome muito curto.'),
  email: z.string().email('E-mail inválido.'),
  isSuperAdmin: z.boolean().default(false),
  ativo: z.boolean().default(true),
})

const createUserSchema = userSchema.extend({
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.')
})

const passwordSchema = z.object({
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.')
})

// GET Usuários
export async function getUsers(
  page: number = 1, 
  pageSize: number = 10, 
  search: string = '',
  sortBy: string = 'sysCreatedAt',
  sortDir: 'asc' | 'desc' = 'desc'
) {
  try {
    const skip = (page - 1) * pageSize
    
    const whereCondition: Prisma.ycUsuariosWhereInput = search ? {
      OR: [
        { nome: { contains: search } },
        { email: { contains: search } }
      ]
    } : {}

    const validSortFields = ['nome', 'email', 'sysCreatedAt', 'ultimoLogin']
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'sysCreatedAt'
    
    const [users, total] = await prisma.$transaction([
      prisma.ycUsuarios.findMany({
        where: whereCondition,
        orderBy: { [orderByField]: sortDir },
        take: pageSize,
        skip: skip,
        select: {
          id: true,
          nome: true,
          email: true,
          ativo: true,
          isSuperAdmin: true,
          ultimoLogin: true,
          sysCreatedAt: true
        }
      }),
      prisma.ycUsuarios.count({ where: whereCondition })
    ])

    const totalPages = Math.ceil(total / pageSize)

    return {
      success: true,
      data: serializeData(users),
      meta: { page, pageSize, total, totalPages }
    }
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return { success: false, data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }
  }
}

// CREATE Usuário
export async function createUser(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const rawData = {
    nome: formData.get('nome'),
    email: formData.get('email'),
    password: formData.get('password'),
    isSuperAdmin: formData.get('isSuperAdmin') === 'on',
    ativo: formData.get('ativo') === 'on',
  }

  const validatedFields = createUserSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return { success: false, message: 'Erro de validação.', errors: validatedFields.error.flatten().fieldErrors }
  }

  const { nome, email, password, isSuperAdmin, ativo } = validatedFields.data

  try {
    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.ycUsuarios.create({
      data: {
        nome,
        email,
        passwordHash,
        isSuperAdmin,
        ativo,
        sysCreatedAt: new Date()
      }
    })
    
    revalidatePath('/admin/users')
    return { success: true, message: 'Usuário criado com sucesso!' }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, message: 'Este e-mail já está em uso.' }
    }
    return { success: false, message: 'Erro ao criar usuário.' }
  }
}

// UPDATE Usuário
export async function updateUser(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = formData.get('id') as string
  
  const validatedFields = userSchema.safeParse({
    nome: formData.get('nome'),
    email: formData.get('email'),
    isSuperAdmin: formData.get('isSuperAdmin') === 'on',
    ativo: formData.get('ativo') === 'on',
  })

  if (!validatedFields.success) {
    return { success: false, message: 'Erro validação.', errors: validatedFields.error.flatten().fieldErrors }
  }

  try {
    await prisma.ycUsuarios.update({
      where: { id: BigInt(id) },
      data: {
        ...validatedFields.data,
        sysUpdatedAt: new Date()
      }
    })
    
    revalidatePath('/admin/users')
    return { success: true, message: 'Dados do usuário atualizados.' }
  } catch { // [CORREÇÃO FINAL] Removida variável do catch
    return { success: false, message: 'Erro ao atualizar usuário.' }
  }
}

// DELETE Usuário
export async function deleteUser(id: string) {
  try {
    await prisma.ycUsuarios.delete({ where: { id: BigInt(id) } })
    revalidatePath('/admin/users')
    return { success: true, message: 'Usuário removido.' }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
       return { success: false, message: 'Este usuário possui vínculos e não pode ser excluído. Tente desativá-lo.' }
    }
    return { success: false, message: 'Erro ao remover usuário.' }
  }
}

// ALTERAR SENHA
export async function changeUserPassword(id: string, newPassword: string): Promise<ActionState> {
  const validated = passwordSchema.safeParse({ password: newPassword })
  
  if (!validated.success) {
    return { success: false, message: 'Senha inválida (mínimo 6 caracteres).' }
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10)
    
    await prisma.ycUsuarios.update({
      where: { id: BigInt(id) },
      data: { 
        passwordHash,
        sysUpdatedAt: new Date()
      }
    })
    
    revalidatePath('/admin/users')
    return { success: true, message: 'Senha alterada com sucesso.' }
  } catch { // [CORREÇÃO FINAL] Removida variável do catch
    return { success: false, message: 'Erro ao alterar senha.' }
  }
}

// ENVIAR EMAIL RESET
export async function sendUserResetEmail(id: string): Promise<ActionState> {
  try {
    const user = await prisma.ycUsuarios.findUnique({ where: { id: BigInt(id) } })
    if (!user) return { success: false, message: 'Usuário não encontrado.' }

    console.log(`[SIMULAÇÃO] Enviando e-mail de recuperação para: ${user.email}`)

    return { success: true, message: `E-mail de recuperação enviado para ${user.email}` }
  } catch { // [CORREÇÃO FINAL] Removida variável do catch
    return { success: false, message: 'Erro ao enviar e-mail.' }
  }
}

/* ===========================================================================
   NOVO: WIZARD DE USUÁRIO MASTER
   ===========================================================================
*/

const masterAccessSchema = z.object({
  tenantId: z.string(),
  nome: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6)
})

export async function createTenantMasterAccess(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth()
  const sysUserId = session?.user?.id ? BigInt(session.user.id) : null

  const validated = masterAccessSchema.safeParse({
    tenantId: formData.get('tenantId'),
    nome: formData.get('nome'),
    email: formData.get('email'),
    password: formData.get('password')
  })

  if (!validated.success) {
    return { success: false, message: 'Dados inválidos.', errors: validated.error.flatten().fieldErrors }
  }

  const { tenantId, nome, email, password } = validated.data

  try {
    await prisma.$transaction(async (tx) => {
      const passwordHash = await bcrypt.hash(password, 10)
      
      const user = await tx.ycUsuarios.upsert({
        where: { email },
        update: {},
        create: {
          nome,
          email,
          passwordHash,
          ativo: true,
          isSuperAdmin: false,
          sysCreatedAt: new Date()
        }
      })

      const adminRole = await tx.ycCargos.findFirst({
        where: { 
          sysTenantId: BigInt(tenantId),
          nome: 'Administrador'
        }
      })

      if (!adminRole) throw new Error('Cargo Administrador não encontrado para este Tenant.')

      const existingLink = await tx.ycUsuariosEmpresas.findUnique({
        where: {
          usuarioId_sysTenantId_cargoId: {
            usuarioId: user.id,
            sysTenantId: BigInt(tenantId),
            cargoId: adminRole.id
          }
        }
      })

      if (!existingLink) {
        await tx.ycUsuariosEmpresas.create({
          data: {
            sysTenantId: BigInt(tenantId),
            usuarioId: user.id,
            cargoId: adminRole.id,
            sysUserId: sysUserId,
            ativo: true
          }
        })
      }
    })

    return { success: true, message: 'Acesso Master configurado com sucesso!' }
  } catch (error) {
    console.error(error)
    return { success: false, message: 'Erro ao configurar acesso master.' }
  }
}

// CONSULTA
export async function getTenantMaster(tenantId: string) {
  try {
    const masterLink = await prisma.ycUsuariosEmpresas.findFirst({
      where: {
        sysTenantId: BigInt(tenantId),
        ycCargos: {
          nome: 'Administrador'
        },
        ativo: true
      },
      orderBy: { sysCreatedAt: 'asc' },
      include: {
        ycUsuarios_ycUsuariosEmpresas_usuarioIdToycUsuarios: true
      }
    })

    if (!masterLink || !masterLink.ycUsuarios_ycUsuariosEmpresas_usuarioIdToycUsuarios) {
      return { success: true, data: null }
    }

    const user = masterLink.ycUsuarios_ycUsuariosEmpresas_usuarioIdToycUsuarios

    return {
      success: true,
      data: {
        nome: user.nome,
        email: user.email
      }
    }
  } catch (error) {
    console.error('Erro ao buscar master:', error)
    return { success: false, message: 'Erro ao verificar admin existente.' }
  }
}