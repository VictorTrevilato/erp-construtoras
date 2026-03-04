'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { z } from "zod"
import { uploadFileToAzure, deleteFileFromAzureByPath } from "@/lib/azure-storage"

const tenantSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  corPrimaria: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Cor inválida").optional().or(z.literal("")),
  corSecundaria: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Cor inválida").optional().or(z.literal("")),
  
  // Novos campos de personalizacao visual
  sidebarTheme: z.string().optional(),
  sidebarNavTheme: z.string().optional(),
  topbarTheme: z.string().optional(),
  buttonsTheme: z.string().optional(),
  subButtonsTheme: z.string().optional(),
  tooltipsTheme: z.string().optional(),
  accentTheme: z.string().optional(),
})

export type TenantFormState = {
  success?: boolean
  message?: string
  errors?: Record<string, string[]>
}

export async function updateTenant(prevState: TenantFormState, formData: FormData): Promise<TenantFormState> {
  const session = await auth()
  if (!session) return { success: false, message: "Não autorizado." }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Nenhuma organização selecionada." }

  const validatedFields = tenantSchema.safeParse({
    nome: formData.get("nome"),
    corPrimaria: formData.get("corPrimaria"),
    corSecundaria: formData.get("corSecundaria"),
    sidebarTheme: formData.get("sidebarTheme"),
    sidebarNavTheme: formData.get("sidebarNavTheme"),
    topbarTheme: formData.get("topbarTheme"),
    buttonsTheme: formData.get("buttonsTheme"),
    subButtonsTheme: formData.get("subButtonsTheme"),
    tooltipsTheme: formData.get("tooltipsTheme"),
    accentTheme: formData.get("accentTheme"),
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Erro de validação.",
      errors: validatedFields.error.flatten().fieldErrors
    }
  }

  // Capturando os 3 possiveis arquivos de imagem
  const logoFile = formData.get("logo") as File | null;
  const logoMiniFile = formData.get("logoMini") as File | null;
  const faviconFile = formData.get("favicon") as File | null;

  try {
    const tenantId = BigInt(tenantIdStr)
    
    // Busca a empresa atual para podermos deletar as imagens antigas do Azure
    const currentTenant = await prisma.ycEmpresas.findUnique({
      where: { id: tenantId },
      select: { logo: true, logoMini: true, favicon: true }
    });

    // Funcao auxiliar para processar upload e delecao de forma limpa
    async function processImageUpload(file: File | null, oldPath: string | null | undefined) {
      if (file && file.size > 0) {
        const newUrl = await uploadFileToAzure(file, 'public-assets');
        if (oldPath) await deleteFileFromAzureByPath(oldPath);
        return newUrl;
      }
      return undefined;
    }

    let finalLogoUrl, finalLogoMiniUrl, finalFaviconUrl;

    try {
      finalLogoUrl = await processImageUpload(logoFile, currentTenant?.logo);
      finalLogoMiniUrl = await processImageUpload(logoMiniFile, currentTenant?.logoMini);
      finalFaviconUrl = await processImageUpload(faviconFile, currentTenant?.favicon);
    } catch (uploadError) {
      console.error("Erro ao processar imagens no Azure:", uploadError);
      return { success: false, message: "Erro ao processar os arquivos no servidor." }
    }

    // Prepara o objeto principal com os textos
    const dataToUpdate: Record<string, string | null | undefined> = {
      ...validatedFields.data,
      corPrimaria: validatedFields.data.corPrimaria || null,
      corSecundaria: validatedFields.data.corSecundaria || null,
    }

    // Adiciona as URLs das imagens apenas se novos arquivos foram processados
    if (finalLogoUrl !== undefined) dataToUpdate.logo = finalLogoUrl;
    if (finalLogoMiniUrl !== undefined) dataToUpdate.logoMini = finalLogoMiniUrl;
    if (finalFaviconUrl !== undefined) dataToUpdate.favicon = finalFaviconUrl;

    await prisma.ycEmpresas.update({
      where: { id: tenantId },
      data: dataToUpdate
    })

    revalidatePath("/app/configuracoes/empresa")
    revalidatePath("/app/dashboard") // Atualiza as cores globais
    
    return { success: true, message: "Configurações da empresa atualizadas com sucesso!" }

  } catch (error) {
    console.error("Erro ao atualizar empresa:", error)
    return { success: false, message: "Erro interno ao salvar dados." }
  }
}

export async function getTenantSettings() {
  const session = await auth()
  if (!session) return null

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return null

  try {
    const company = await prisma.ycEmpresas.findUnique({
      where: { id: BigInt(tenantIdStr) }
      // Agora retornamos todos os campos (removi o select para facilitar a manutencao)
    })
    
    return company
  } catch (error) {
    console.error("Erro ao buscar configurações da empresa:", error)
    return null
  }
}