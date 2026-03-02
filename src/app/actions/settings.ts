'use server'

import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { uploadFileToAzure, deleteFileFromAzureByPath } from '@/lib/azure-storage'

// Não validamos o File no Zod string schema padrão, vamos tratar ele separadamente no código
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
  
  // Normalizamos os dados: se for null ou string vazia, convertemos para undefined
  const rawNome = formData.get('nome')?.toString()
  const rawCurrentPassword = formData.get('currentPassword')?.toString()
  const rawNewPassword = formData.get('newPassword')?.toString()

  const rawData = {
    nome: rawNome,
    currentPassword: rawCurrentPassword === '' ? undefined : rawCurrentPassword ?? undefined,
    newPassword: rawNewPassword === '' ? undefined : rawNewPassword ?? undefined,
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
  
  // Capturamos o arquivo de imagem do FormData
  const avatarFile = formData.get('avatar') as File | null;

  try {
    const user = await prisma.ycUsuarios.findUnique({
      where: { id: userId }
    })

    if (!user) return { success: false, message: 'Usuario nao encontrado.' }

    let passwordHash = user.passwordHash

    if (newPassword) {
      if (!currentPassword) {
        return { success: false, message: 'Para alterar a senha, informe a senha atual.' }
      }
      const isPasswordValid = await bcrypt.compare(currentPassword, passwordHash)
      if (!isPasswordValid) {
        return { success: false, message: 'A senha atual esta incorreta.' }
      }
      passwordHash = await bcrypt.hash(newPassword, 10)
    }

    let finalAvatarUrl = (user as typeof user & { avatarUrl?: string | null }).avatarUrl || null;

    if (avatarFile && avatarFile.size > 0) {
      try {
        // 1. Fazer o upload para o container PUBLICO
        const newUrl = await uploadFileToAzure(avatarFile, 'public-assets');
        
        // 2. Se o usuario ja tinha uma foto antes, deletamos a antiga do servidor
        if (finalAvatarUrl) {
          await deleteFileFromAzureByPath(finalAvatarUrl);
        }

        // 3. Atualizamos a variavel com a nova URL
        finalAvatarUrl = newUrl;
        
      } catch (uploadError) {
        console.error("Erro ao processar imagem no Azure:", uploadError);
        return { success: false, message: 'Erro ao processar o arquivo no servidor.' }
      }
    }

    await prisma.ycUsuarios.update({
      where: { id: userId },
      data: {
        nome,
        passwordHash,
        avatarUrl: finalAvatarUrl,
        sysUpdatedAt: new Date()
      }
    })

    revalidatePath('/app/me')
    revalidatePath('/admin/me')
    revalidatePath('/portal/me')
    
    return { success: true, message: 'Perfil atualizado com sucesso!' }
  } catch (error) {
    console.error(error)
    return { success: false, message: 'Erro interno ao atualizar perfil.' }
  }
}