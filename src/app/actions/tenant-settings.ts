'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { z } from "zod"
import { uploadFileToAzure, deleteFileFromAzureByPath } from "@/lib/azure-storage"
// 1. IMPORTAÇÃO DO MOTOR DE ACESSO
import { getUserAccessProfile } from "@/lib/access-control"

const tenantSchema = z.object({
  // Dados Principais
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  razaoSocial: z.string().optional(),
  emailResponsavel: z.string().email("E-mail inválido").optional().or(z.literal("")),
  
  // Cores Base
  corPrimaria: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Cor inválida").optional().or(z.literal("")),
  corSecundaria: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Cor inválida").optional().or(z.literal("")),
  
  // Campos de personalizacao visual
  sidebarTheme: z.string().optional(),
  sidebarNavTheme: z.string().optional(),
  topbarTheme: z.string().optional(),
  buttonsTheme: z.string().optional(),
  subButtonsTheme: z.string().optional(),
  tooltipsTheme: z.string().optional(),
  accentTheme: z.string().optional(),

  // Endereço
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),

  // Informações Adicionais
  telefoneSac: z.string().optional(),
  siteCliente: z.string().optional(),
  siteVendedora: z.string().optional(),
  nomeApp: z.string().optional(),
})

export type TenantFormState = {
  success?: boolean
  message?: string
  errors?: Record<string, string[]>
}

// --- ATUALIZAR DADOS DA EMPRESA ---
export async function updateTenant(prevState: TenantFormState, formData: FormData): Promise<TenantFormState> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado." }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Nenhuma organização selecionada." }

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  // CHECAGEM DE PERMISSÃO
  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('EMPRESA_EDITAR')) {
    return { success: false, message: "Você não tem permissão para editar as configurações da empresa." }
  }

  const validatedFields = tenantSchema.safeParse({
    nome: formData.get("nome"),
    razaoSocial: formData.get("razaoSocial")?.toString(),
    emailResponsavel: formData.get("emailResponsavel")?.toString(),
    corPrimaria: formData.get("corPrimaria"),
    corSecundaria: formData.get("corSecundaria"),
    sidebarTheme: formData.get("sidebarTheme"),
    sidebarNavTheme: formData.get("sidebarNavTheme"),
    topbarTheme: formData.get("topbarTheme"),
    buttonsTheme: formData.get("buttonsTheme"),
    subButtonsTheme: formData.get("subButtonsTheme"),
    tooltipsTheme: formData.get("tooltipsTheme"),
    accentTheme: formData.get("accentTheme"),
    cep: formData.get("cep")?.toString(),
    logradouro: formData.get("logradouro")?.toString(),
    numero: formData.get("numero")?.toString(),
    complemento: formData.get("complemento")?.toString(),
    bairro: formData.get("bairro")?.toString(),
    cidade: formData.get("cidade")?.toString(),
    estado: formData.get("estado")?.toString(),
    telefoneSac: formData.get("telefoneSac")?.toString(),
    siteCliente: formData.get("siteCliente")?.toString(),
    siteVendedora: formData.get("siteVendedora")?.toString(),
    nomeApp: formData.get("nomeApp")?.toString(),
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Erro de validação.",
      errors: validatedFields.error.flatten().fieldErrors
    }
  }

  const logoFile = formData.get("logo") as File | null;
  const logoMiniFile = formData.get("logoMini") as File | null;
  const faviconFile = formData.get("favicon") as File | null;

  try {
    const currentTenant = await prisma.ycEmpresas.findUnique({
      where: { id: tenantId },
      select: { logo: true, logoMini: true, favicon: true }
    });

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

    const dataToUpdate: Record<string, string | null | undefined> = {
      ...validatedFields.data,
      corPrimaria: validatedFields.data.corPrimaria || null,
      corSecundaria: validatedFields.data.corSecundaria || null,
    }

    if (finalLogoUrl !== undefined) dataToUpdate.logo = finalLogoUrl;
    if (finalLogoMiniUrl !== undefined) dataToUpdate.logoMini = finalLogoMiniUrl;
    if (finalFaviconUrl !== undefined) dataToUpdate.favicon = finalFaviconUrl;

    await prisma.ycEmpresas.update({
      where: { id: tenantId },
      data: dataToUpdate
    })

    revalidatePath("/app/configuracoes/empresa")
    revalidatePath("/app/dashboard") 
    
    return { success: true, message: "Configurações atualizadas com sucesso!" }

  } catch (error) {
    console.error("Erro ao atualizar empresa:", error)
    return { success: false, message: "Erro interno ao salvar dados." }
  }
}

// --- LER DADOS DA EMPRESA ---
export async function getTenantSettings() {
  const session = await auth()
  if (!session?.user?.id) return null

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return null

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  // CHECAGEM DE PERMISSÃO DE LEITURA
  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('EMPRESA_VER')) return null

  try {
    const company = await prisma.ycEmpresas.findUnique({
      where: { id: tenantId }
    })
    
    return company
  } catch (error) {
    console.error("Erro ao buscar configurações da empresa:", error)
    return null
  }
}