'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

// Schema de Validação
const projectSchema = z.object({
  escopoId: z.string().min(1, "O vínculo com um Escopo é obrigatório."),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres."),
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

  // Legal
  cnpj: z.string().optional(),
  registroIncorporacao: z.string().optional(),
  matricula: z.string().optional(),
  areaTotal: z.string().optional(),
})

export type ProjectFormState = {
  success?: boolean
  message?: string
  errors?: Record<string, string[]>
}

// --- FUNÇÃO AUXILIAR: Parse de Decimal (BR ou US) ---
function parseDecimal(value: string | undefined | null): number | null {
  if (!value) return null
  
  // Remove espaços extras
  let v = value.trim()
  if (v === "") return null

  // Lógica inteligente:
  // 1. Se tem vírgula, assumimos formato BR (ex: 5.000,00 ou 5000,00)
  // Removemos os pontos de milhar e trocamos a vírgula decimal por ponto.
  if (v.includes(',')) {
    v = v.replace(/\./g, '').replace(',', '.')
  } 
  // 2. Se NÃO tem vírgula, o parseFloat já entende (formato US ou inteiro simples)
  
  const num = parseFloat(v)
  return isNaN(num) ? null : num
}

// --- CONSULTAS ---

export async function getProjects() {
  const session = await auth()
  if (!session) return []
  const cookieStore = await cookies()
  const tenantIdStr = cookieStore.get("tenant-id")?.value
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
      matricula: p.matricula || "",
      registroIncorporacao: p.registroIncorporacao || "",
      areaTotal: p.areaTotal ? p.areaTotal.toString() : ""
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
        
        return {
            id: p.id.toString(),
            nome: p.nome,
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
            matricula: p.matricula || "",
            registroIncorporacao: p.registroIncorporacao || "",
            areaTotal: p.areaTotal ? p.areaTotal.toString() : ""
        }
    } catch {
        return null
    }
}

export async function getAvailableScopes() {
  const session = await auth()
  if (!session) return []
  const cookieStore = await cookies()
  const tenantIdStr = cookieStore.get("tenant-id")?.value
  if (!tenantIdStr) return []

  try {
    const scopes = await prisma.ycEscopos.findMany({
      where: { sysTenantId: BigInt(tenantIdStr), ativo: true },
      // Importante: Ordenar por caminho garante que Pais venham antes dos Filhos
      orderBy: { caminho: 'asc' },
      select: { 
        id: true, 
        nome: true, 
        tipo: true, 
        caminho: true // Precisamos do caminho para calcular o nível
      }
    })

    return scopes.map(s => {
      // Calcula o nível baseado na quantidade de barras no caminho
      const nivelCalculado = s.caminho.split('/').filter(Boolean).length

      return {
        id: s.id.toString(),
        nome: s.nome,
        tipo: s.tipo,
        nivel: nivelCalculado
      }
    })
  } catch {
    return []
  }
}

// --- PERSISTÊNCIA ---

export async function saveProject(
  projectId: string | null,
  prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado." }

  const cookieStore = await cookies()
  const tenantIdStr = cookieStore.get("tenant-id")?.value
  if (!tenantIdStr) return { success: false, message: "Tenant não definido." }
  
  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const validated = projectSchema.safeParse({
    escopoId: formData.get("escopoId"),
    nome: formData.get("nome"),
    tipo: formData.get("tipo"),
    status: formData.get("status"),
    descricao: formData.get("descricao"),
    cep: formData.get("cep"),
    logradouro: formData.get("logradouro"),
    numero: formData.get("numero"),
    complemento: formData.get("complemento"),
    bairro: formData.get("bairro"),
    cidade: formData.get("cidade"),
    estado: formData.get("estado"),
    cnpj: formData.get("cnpj"),
    registroIncorporacao: formData.get("registroIncorporacao"),
    matricula: formData.get("matricula"),
    areaTotal: formData.get("areaTotal"),
  })

  if (!validated.success) {
    return {
      success: false,
      message: "Erro de validação. Verifique os campos obrigatórios.",
      errors: validated.error.flatten().fieldErrors
    }
  }

  const data = validated.data
  
  // Usa a função auxiliar para corrigir o valor decimal
  const areaTotalDecimal = parseDecimal(data.areaTotal)

  try {
    if (projectId) {
      // UPDATE
      await prisma.ycProjetos.update({
        where: { id: BigInt(projectId) },
        data: {
          escopoId: BigInt(data.escopoId),
          nome: data.nome,
          tipo: data.tipo,
          status: data.status,
          descricao: data.descricao || null,
          cep: data.cep || null,
          logradouro: data.logradouro || null,
          numero: data.numero || null,
          complemento: data.complemento || null,
          bairro: data.bairro || null,
          cidade: data.cidade || null,
          estado: data.estado || null,
          cnpj: data.cnpj || null,
          registroIncorporacao: data.registroIncorporacao || null,
          matricula: data.matricula || null,
          areaTotal: areaTotalDecimal,
          sysUpdatedAt: new Date()
        }
      })
    } else {
      // CREATE
      await prisma.ycProjetos.create({
        data: {
          sysTenantId: tenantId,
          sysUserId: userId,
          escopoId: BigInt(data.escopoId),
          nome: data.nome,
          tipo: data.tipo,
          status: data.status,
          descricao: data.descricao || null,
          cep: data.cep || null,
          logradouro: data.logradouro || null,
          numero: data.numero || null,
          complemento: data.complemento || null,
          bairro: data.bairro || null,
          cidade: data.cidade || null,
          estado: data.estado || null,
          cnpj: data.cnpj || null,
          registroIncorporacao: data.registroIncorporacao || null,
          matricula: data.matricula || null,
          areaTotal: areaTotalDecimal,
        }
      })
    }
  } catch (error) {
    console.error("Erro ao salvar projeto:", error)
    return { success: false, message: "Erro interno ao salvar projeto." }
  }

  // Atualiza a cache na pasta correta de Engenharia
  revalidatePath("/app/engenharia/projetos")
  return { success: true, message: "Projeto salvo com sucesso!" }
}

export async function deleteProject(projectId: string) {
    try {
        await prisma.ycProjetos.delete({ where: { id: BigInt(projectId) } })
        
        // Atualiza a cache na pasta correta de Engenharia
        revalidatePath("/app/engenharia/projetos")
        return { success: true, message: "Projeto excluído." }
    } catch {
        return { success: false, message: "Erro ao excluir projeto." }
    }
}