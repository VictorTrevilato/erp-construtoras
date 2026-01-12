'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

// Schema de Validação
const tenantSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  corPrimaria: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Cor inválida (Use Hex, ex: #000000)").optional().or(z.literal("")),
  corSecundaria: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Cor inválida").optional().or(z.literal("")),
})

export type TenantFormState = {
  success?: boolean
  message?: string
  errors?: {
    nome?: string[]
    corPrimaria?: string[]
    corSecundaria?: string[]
  }
}

export async function updateTenant(prevState: TenantFormState, formData: FormData): Promise<TenantFormState> {
  const session = await auth()
  if (!session) return { success: false, message: "Não autorizado." }

  // 1. Identificar o Tenant Atual
  const cookieStore = await cookies()
  const tenantIdStr = cookieStore.get("tenant-id")?.value

  if (!tenantIdStr) return { success: false, message: "Nenhuma organização selecionada." }

  // 2. Validar Dados
  const validatedFields = tenantSchema.safeParse({
    nome: formData.get("nome"),
    corPrimaria: formData.get("corPrimaria"),
    corSecundaria: formData.get("corSecundaria"),
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Erro de validação.",
      errors: validatedFields.error.flatten().fieldErrors
    }
  }

  try {
    const tenantId = BigInt(tenantIdStr)

    // 3. Atualizar no Banco
    await prisma.ycEmpresas.update({
      where: { id: tenantId },
      data: {
        nome: validatedFields.data.nome,
        corPrimaria: validatedFields.data.corPrimaria || null,
        corSecundaria: validatedFields.data.corSecundaria || null,
        // Logo trataremos no futuro (Upload)
      }
    })

    revalidatePath("/app/configuracoes/empresa")
    return { success: true, message: "Dados da empresa atualizados com sucesso!" }

  } catch (error) {
    console.error("Erro ao atualizar empresa:", error)
    return { success: false, message: "Erro interno ao salvar dados." }
  }
}