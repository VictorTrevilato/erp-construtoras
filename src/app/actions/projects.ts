'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { z } from "zod"
import { getUploadSasUrl, deleteFileFromAzureByPath, getFileDownloadUrl } from "@/lib/azure-storage"

// Schema de Validação
const projectSchema = z.object({
  escopoId: z.string().min(1, "O vínculo com um Escopo é obrigatório."),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres."),
  razaoSocial: z.string().optional(),
  tipo: z.string().min(1, "Selecione um tipo."),
  status: z.string().min(1, "Selecione um status."),
  descricao: z.string().optional(),
  
  // Endereço
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),

  // Legal e Comercial
  cnpj: z.string().optional(),
  dataPrevistaConclusao: z.string().optional(),
  registroIncorporacao: z.string().optional(),
  matricula: z.string().optional(),
  cartorioRegistro: z.string().optional(),
  areaTotal: z.string().optional(),
  percComissaoPadrao: z.string().optional(),
})

export type ProjectFormState = {
  success?: boolean
  message?: string
  errors?: Record<string, string[]>
  dataId?: string
  newLogoUrl?: string
}

export type ProjectAttachmentItem = {
    id: string
    nomeArquivo: string
    classificacao: string
    urlArquivo: string
    isPublico: boolean
}

// --- FUNÇÃO AUXILIAR: Parse de Decimal (BR ou US) ---
function parseDecimal(value: string | undefined): number | undefined {
  if (!value) return undefined
  let v = value.trim()
  if (v === "") return undefined
  if (v.includes(',')) {
    v = v.replace(/\./g, '').replace(',', '.')
  } 
  const num = parseFloat(v)
  return isNaN(num) ? undefined : num
}

// --- CONSULTAS ---
export async function getProjects() {  
  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  try {
    const projects = await prisma.ycProjetos.findMany({
      where: { sysTenantId: BigInt(tenantIdStr) },
      include: { ycEscopos: { select: { nome: true } } },
      orderBy: { nome: 'asc' }
    })

    return projects.map(p => ({
      id: p.id.toString(),
      nome: p.nome,
      razaoSocial: p.razaoSocial || "",
      logo: p.logo || null,
      tipo: p.tipo,
      status: p.status,
      descricao: p.descricao || "",
      escopoId: p.escopoId.toString(),
      escopoNome: p.ycEscopos.nome,
      cidade: p.cidade || "",
      estado: p.estado || "",
      logradouro: p.logradouro || "",
      numero: p.numero || "",
      bairro: p.bairro || "",
      cep: p.cep || "",
      complemento: p.complemento || "",
      cnpj: p.cnpj || "",
      dataPrevistaConclusao: p.dataPrevistaConclusao ? p.dataPrevistaConclusao.toISOString().split('T')[0] : "",
      matricula: p.matricula || "",
      registroIncorporacao: p.registroIncorporacao || "",
      cartorioRegistro: p.cartorioRegistro || "",
      areaTotal: p.areaTotal ? p.areaTotal.toString() : "",
      percComissaoPadrao: p.percComissaoPadrao ? p.percComissaoPadrao.toString() : ""
    }))
  } catch (error) {
    console.error("Erro ao buscar projetos:", error)
    return []
  }
}

export async function getProjectById(id: string) {
    const session = await auth()
    if (!session) return null
    try {
        const p = await prisma.ycProjetos.findUnique({
            where: { id: BigInt(id) }
        })
        if (!p) return null
        
        // Se a logo existir no banco, gera a URL de leitura do Azure
        let logoUrl = p.logo;
        if (p.logo && !p.logo.startsWith('http')) {
            logoUrl = await getFileDownloadUrl(p.logo, 'logo.png') || p.logo;
        }

        return {
            id: p.id.toString(),
            nome: p.nome,
            razaoSocial: p.razaoSocial || "",
            logo: logoUrl || "",
            tipo: p.tipo,
            status: p.status,
            descricao: p.descricao || "",
            escopoId: p.escopoId.toString(),
            cidade: p.cidade || "",
            estado: p.estado || "",
            logradouro: p.logradouro || "",
            numero: p.numero || "",
            bairro: p.bairro || "",
            cep: p.cep || "",
            complemento: p.complemento || "",
            cnpj: p.cnpj || "",
            dataPrevistaConclusao: p.dataPrevistaConclusao ? p.dataPrevistaConclusao.toISOString().split('T')[0] : "",
            matricula: p.matricula || "",
            registroIncorporacao: p.registroIncorporacao || "",
            cartorioRegistro: p.cartorioRegistro || "",
            areaTotal: p.areaTotal ? p.areaTotal.toString() : "",
            percComissaoPadrao: p.percComissaoPadrao ? p.percComissaoPadrao.toString() : "" 
        }
    } catch {
        return null
    }
}

export async function getAvailableScopes() {
  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  try {
    const scopes = await prisma.ycEscopos.findMany({
      where: { sysTenantId: BigInt(tenantIdStr), ativo: true },
      orderBy: { caminho: 'asc' },
      select: { 
        id: true, 
        nome: true, 
        tipo: true, 
        caminho: true
      }
    })

    return scopes.map(s => {
      const nivelCalculado = s.caminho.split('/').filter(Boolean).length
      return { id: s.id.toString(), nome: s.nome, tipo: s.tipo, nivel: nivelCalculado }
    })
  } catch {
    return []
  }
}

// --- PERSISTÊNCIA PROJETO ---
export async function saveProject(
  projectId: string | null,
  prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado." }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Tenant não definido. Faça login novamente." }
  
  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const validated = projectSchema.safeParse({
    escopoId: formData.get("escopoId")?.toString(),
    nome: formData.get("nome")?.toString(),
    razaoSocial: formData.get("razaoSocial")?.toString(),
    tipo: formData.get("tipo")?.toString(),
    status: formData.get("status")?.toString(),
    descricao: formData.get("descricao")?.toString(),
    cep: formData.get("cep")?.toString(),
    logradouro: formData.get("logradouro")?.toString(),
    numero: formData.get("numero")?.toString(),
    complemento: formData.get("complemento")?.toString(),
    bairro: formData.get("bairro")?.toString(),
    cidade: formData.get("cidade")?.toString(),
    estado: formData.get("estado")?.toString(),
    cnpj: formData.get("cnpj")?.toString(),
    dataPrevistaConclusao: formData.get("dataPrevistaConclusao")?.toString(),
    registroIncorporacao: formData.get("registroIncorporacao")?.toString(),
    matricula: formData.get("matricula")?.toString(),
    cartorioRegistro: formData.get("cartorioRegistro")?.toString(),
    areaTotal: formData.get("areaTotal")?.toString(),
    percComissaoPadrao: formData.get("percComissaoPadrao")?.toString(),
  })

  if (!validated.success) {
    return {
      success: false,
      message: "Erro de validação. Verifique os campos obrigatórios.",
      errors: validated.error.flatten().fieldErrors
    }
  }

  const data = validated.data
  const areaTotalDecimal = parseDecimal(data.areaTotal)
  const percComissaoDecimal = parseDecimal(data.percComissaoPadrao)
  
  // Tratamento da Data (adicionando hora para evitar fuso horário puxando 1 dia para trás)
  const dataPrevisao = data.dataPrevistaConclusao ? new Date(`${data.dataPrevistaConclusao}T12:00:00Z`) : undefined;

  try {
    let returnId = projectId;

    // 1. SALVA OU ATUALIZA O PROJETO (Ignorando a logo por enquanto)
    if (projectId) {
      await prisma.ycProjetos.update({
        where: { id: BigInt(projectId) },
        data: {
          escopoId: BigInt(data.escopoId),
          nome: data.nome,
          razaoSocial: data.razaoSocial || undefined,
          tipo: data.tipo,
          status: data.status,
          descricao: data.descricao || undefined,
          cep: data.cep || undefined,
          logradouro: data.logradouro || undefined,
          numero: data.numero || undefined,
          complemento: data.complemento || undefined,
          bairro: data.bairro || undefined,
          cidade: data.cidade || undefined,
          estado: data.estado || undefined,
          cnpj: data.cnpj || undefined,
          dataPrevistaConclusao: dataPrevisao,
          registroIncorporacao: data.registroIncorporacao || undefined,
          matricula: data.matricula || undefined,
          cartorioRegistro: data.cartorioRegistro || undefined,
          areaTotal: areaTotalDecimal,
          percComissaoPadrao: percComissaoDecimal,
          sysUpdatedAt: new Date()
        }
      })
    } else {
      const created = await prisma.ycProjetos.create({
        data: {
          sysTenantId: tenantId,
          sysUserId: userId,
          escopoId: BigInt(data.escopoId),
          nome: data.nome,
          razaoSocial: data.razaoSocial || undefined,
          tipo: data.tipo,
          status: data.status,
          descricao: data.descricao || undefined,
          cep: data.cep || undefined,
          logradouro: data.logradouro || undefined,
          numero: data.numero || undefined,
          complemento: data.complemento || undefined,
          bairro: data.bairro || undefined,
          cidade: data.cidade || undefined,
          estado: data.estado || undefined,
          cnpj: data.cnpj || undefined,
          dataPrevistaConclusao: dataPrevisao,
          registroIncorporacao: data.registroIncorporacao || undefined,
          matricula: data.matricula || undefined,
          cartorioRegistro: data.cartorioRegistro || undefined,
          areaTotal: areaTotalDecimal,
          percComissaoPadrao: percComissaoDecimal,
        }
      })
      returnId = created.id.toString()
    }

    // 2. UPLOAD E SUBSTITUIÇÃO DA LOGO
    const logoFile = formData.get("logo") as File | null;
    let newLogoUrlToReturn: string | undefined = undefined;
    
    // Se o usuário subiu um arquivo novo e já temos o ID do projeto
    if (logoFile && logoFile.size > 0 && returnId) {
        
        // A. Busca a logo atual no banco. Se existir, tenta apagar do Azure.
        if (projectId) {
            const currentProject = await prisma.ycProjetos.findUnique({
                where: { id: BigInt(projectId) },
                select: { logo: true }
            })
            if (currentProject?.logo) {
                try {
                    // Tenta apagar, mas se não achar o arquivo (ou tiver sido apagado manualmente), ignora o erro!
                    await deleteFileFromAzureByPath(currentProject.logo)
                } catch {
                    console.warn("Logo antiga não encontrada no Azure, ignorando exclusão.")
                }
            }
        }

        // B. Define a pasta com o padrão correto (agora com o ID do projeto garantido)
        const folderPath = `tenant-${tenantIdStr}/projeto-${returnId}`
        const ext = logoFile.name.split('.').pop() || 'png'
        const fileName = `logo-${Date.now()}.${ext}`
        
        const { uploadUrl, relativePath } = await getUploadSasUrl('private-docs', folderPath, fileName)
        
        const arrayBuffer = await logoFile.arrayBuffer()
        const res = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': logoFile.type },
            body: arrayBuffer
        })
        
        // C. Se o upload deu certo, atualiza o registro e gera a URL visual para devolver à tela
        if (res.ok) {
            await prisma.ycProjetos.update({
                where: { id: BigInt(returnId) },
                data: { logo: relativePath }
            })
            // Gera uma URL temporária do Azure para a tela mostrar instantaneamente
            newLogoUrlToReturn = await getFileDownloadUrl(relativePath, fileName) || undefined;
        } else {
            throw new Error("Falha na comunicação com o servidor de armazenamento.")
        }
    }

    revalidatePath("/app/engenharia/projetos")
    return { 
        success: true, 
        message: "Projeto salvo com sucesso!", 
        dataId: returnId ?? undefined,
        newLogoUrl: newLogoUrlToReturn // <--- Retorna a nova URL para a tela
    }
  } catch (error) {
    console.error("Erro ao salvar projeto:", error)
    return { success: false, message: "Erro interno ao salvar projeto." }
  }
}

export async function deleteProject(projectId: string) {
    try {
        const pId = BigInt(projectId)

        const projeto = await prisma.ycProjetos.findUnique({
            where: { id: pId },
            include: { _count: { select: { ycUnidades: true } } }
        })

        if (!projeto) return { success: false, message: "Projeto não encontrado." }

        if (projeto._count.ycUnidades > 0) {
            return { 
                success: false, 
                message: `Não é possível excluir: Este projeto possui ${projeto._count.ycUnidades} unidade(s) vinculada(s).` 
            }
        }

        const anexos = await prisma.ycProjetosAnexos.findMany({
            where: { projetoId: pId }
        })

        for (const anexo of anexos) {
            if (anexo.urlArquivo) {
                await deleteFileFromAzureByPath(anexo.urlArquivo)
            }
        }
        
        // Exclui a logo do Azure se existir
        if (projeto.logo) {
             await deleteFileFromAzureByPath(projeto.logo)
        }

        await prisma.$transaction([
            prisma.ycProjetosAnexos.deleteMany({ where: { projetoId: pId } }),
            prisma.ycProjetos.delete({ where: { id: pId } })
        ])
        
        revalidatePath("/app/engenharia/projetos")
        return { success: true, message: "Projeto e anexos excluídos com sucesso." }
    } catch (error) {
        console.error("Erro ao excluir projeto:", error)
        return { success: false, message: "Erro ao excluir projeto. Verifique dependências." }
    }
}

// ==========================================
// MÓDULO DE ANEXOS DO PROJETO
// ==========================================
export async function getProjectAttachments(projetoId: string): Promise<ProjectAttachmentItem[]> {
    const session = await auth()
    if (!session) return []

    try {
        const anexos = await prisma.ycProjetosAnexos.findMany({
            where: { projetoId: BigInt(projetoId) },
            orderBy: { sysCreatedAt: 'asc' }
        })

        return anexos.map(a => ({
            id: a.id.toString(),
            nomeArquivo: a.nomeArquivo,
            classificacao: a.classificacao,
            urlArquivo: a.urlArquivo,
            isPublico: a.isPublico
        }))
    } catch (error) {
        console.error("Erro ao buscar anexos do projeto:", error)
        return []
    }
}

export async function getProjectUploadUrls(projetoId: string, fileNames: string[]) {
    const session = await auth()
    if (!session) return { success: false, data: [] }

    try {
        const tenantIdStr = await getCurrentTenantId()
        if (!tenantIdStr) return { success: false, data: [] }
        
        const containerName = 'private-docs'
        const folderPath = `tenant-${tenantIdStr}/projeto-${projetoId}`

        const urls = await Promise.all(fileNames.map(async (fileName) => {
            const { uploadUrl, relativePath } = await getUploadSasUrl(containerName, folderPath, fileName)
            return { fileName, uploadUrl, relativePath }
        }))

        return { success: true, data: urls }
    } catch (error) {
        console.error("Erro ao gerar links de upload do projeto:", error)
        return { success: false, data: [] }
    }
}

export async function saveProjectAttachmentsMetadata(projetoId: string, attachmentsData: Array<{fileName: string, classificacao: string, isPublico: boolean, relativePath: string}>) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado." }

    try {
        const pId = BigInt(projetoId)
        const tenantId = BigInt(await getCurrentTenantId() || 0)
        const userId = BigInt(session.user.id)

        const projeto = await prisma.ycProjetos.findUnique({ where: { id: pId } })
        if (!projeto) return { success: false, message: "Projeto não encontrado." }

        const savePromises = attachmentsData.map(data => {
            return prisma.ycProjetosAnexos.create({
                data: {
                    sysTenantId: tenantId,
                    sysUserId: userId,
                    escopoId: projeto.escopoId,
                    projetoId: pId,
                    nomeArquivo: data.fileName,
                    classificacao: data.classificacao,
                    urlArquivo: data.relativePath,
                    isPublico: data.isPublico
                }
            })
        })

        const savedAttachments = await Promise.all(savePromises)

        const newItems = savedAttachments.map(a => ({
            id: a.id.toString(),
            nomeArquivo: a.nomeArquivo,
            classificacao: a.classificacao,
            urlArquivo: a.urlArquivo,
            isPublico: a.isPublico
        }))

        return { success: true, message: `${savedAttachments.length} arquivo(s) salvo(s)!`, data: newItems }
    } catch (error) {
        console.error("Erro ao salvar metadados dos anexos:", error)
        return { success: false, message: "Erro ao registrar arquivos no banco de dados." }
    }
}

export async function deleteProjectAttachment(anexoId: string, urlArquivo: string) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado." }

    try {
        const idBase = BigInt(anexoId)
        
        const anexo = await prisma.ycProjetosAnexos.findUnique({ where: { id: idBase } })
        if (!anexo) return { success: false, message: "Anexo não encontrado no banco." }

        await deleteFileFromAzureByPath(urlArquivo)
        await prisma.ycProjetosAnexos.delete({ where: { id: idBase } })

        return { success: true, message: "Anexo removido com sucesso." }
    } catch (error) {
        console.error("Erro ao deletar anexo:", error)
        return { success: false, message: "Erro interno ao excluir arquivo." }
    }
}

export async function getProjectAttachmentDownloadUrl(urlArquivo: string, originalName: string) {
    const session = await auth()
    if (!session) return { success: false, url: null }

    try {
        const url = await getFileDownloadUrl(urlArquivo, originalName)
        return { success: true, url }
    } catch (error) {
        console.error("Erro ao gerar link de download:", error)
        return { success: false, url: null }
    }
}

export async function toggleProjectAttachmentVisibility(anexoId: string, isPublico: boolean) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado." }

    try {
        await prisma.ycProjetosAnexos.update({
            where: { id: BigInt(anexoId) },
            data: { isPublico }
        })
        return { success: true, message: "Visibilidade atualizada com sucesso!" }
    } catch (error) {
        console.error("Erro ao atualizar visibilidade:", error)
        return { success: false, message: "Erro ao atualizar visibilidade no banco." }
    }
}