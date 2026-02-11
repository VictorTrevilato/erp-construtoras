'use server'

import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

const profileSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.').optional(),
})

export type SettingsState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function updateProfile(prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { success: false, message: 'Não autenticado.' }
  }

  const userId = BigInt(session.user.id)
  
  const rawData = {
    nome: formData.get('nome'),
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  }

  const validated = profileSchema.safeParse(rawData)

  if (!validated.success) {
    return {
      success: false,
      message: 'Erro de validação.',
      errors: validated.error.flatten().fieldErrors
    }
  }

  const { nome, currentPassword, newPassword } = validated.data

  try {
    // 1. Buscar usuário atual para verificar senha
    const user = await prisma.ycUsuarios.findUnique({
      where: { id: userId }
    })

    if (!user) return { success: false, message: 'Usuário não encontrado.' }

    let passwordHash = user.passwordHash

    // 2. Se tentou trocar a senha
    if (newPassword) {
      if (!currentPassword) {
        return { success: false, message: 'Para alterar a senha, informe a senha atual.' }
      }

      // Verificar senha atual
      const isPasswordValid = await bcrypt.compare(currentPassword, passwordHash)
      if (!isPasswordValid) {
        return { success: false, message: 'A senha atual está incorreta.' }
      }

      // Hash da nova senha
      passwordHash = await bcrypt.hash(newPassword, 10)
    }

    // 3. Atualizar no Banco
    await prisma.ycUsuarios.update({
      where: { id: userId },
      data: {
        nome,
        passwordHash,
        sysUpdatedAt: new Date()
      }
    })

    revalidatePath('/app/me')
    revalidatePath('/admin/me')
    
    return { success: true, message: 'Perfil atualizado com sucesso!' }
  } catch (error) {
    console.error(error)
    return { success: false, message: 'Erro interno ao atualizar perfil.' }
  }
}