'use server'

import { prisma } from "@/lib/prisma"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
// 1. IMPORTAÇÃO DO MOTOR DE ACESSO
import { getUserAccessProfile } from "@/lib/access-control" 

export interface GetLegalPersonsParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortDir?: "asc" | "desc"
  isCliente?: boolean | string
  isImobiliaria?: boolean | string
  isFornecedor?: boolean | string
}

export interface SaveLegalPersonPayload {
  id?: string
  escopoId: string
  nome: string // Razão Social salva na Entidade Pai
  documento: string // CNPJ salvo na Entidade Pai
  nomeFantasia?: string | null
  inscricaoEstadual?: string | null
  representanteLegal?: string | null
  telefone_1?: string | null
  telefone_2?: string | null
  email_1?: string | null
  email_2?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  isCliente: boolean
  isImobiliaria: boolean
  isFornecedor: boolean
  creci?: string | null
}

// ----------------------------------------------------------------------
// BUSCA ESCOPOS PARA O DROPDOWN
// ----------------------------------------------------------------------
export async function getAvailableScopes() {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha) return []

  try {
    const scopes = await prisma.ycEscopos.findMany({
      where: { 
        sysTenantId: BigInt(tenantIdStr), 
        ativo: true,
        id: { in: cracha.escoposPermitidos } // Proteção de Escopo na UI
      },
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
  } catch (error) {
    console.error("Erro ao buscar escopos:", error)
    return []
  }
}

// ----------------------------------------------------------------------
// 1. LISTAGEM BLINDADA
// ----------------------------------------------------------------------
export async function getPersonsLegal(params: GetLegalPersonsParams) {
  const session = await auth()
  if (!session?.user?.id) return { data: [], total: 0 }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { data: [], total: 0 }

  // CHECAGEM DE PERMISSÃO
  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('PESSOAS_JURIDICAS_VER')) return { data: [], total: 0 }

  const { page = 1, pageSize = 10, search = "", sortBy = "id", sortDir = "desc" } = params
  const skip = (page - 1) * pageSize
  const tenantId = BigInt(tenantIdStr)
  
  const cleanSearch = String(search).trim()
  const searchNumber = cleanSearch.replace(/\D/g, "")
  const isIdSearch = cleanSearch.startsWith('#')

  let phoneWithDDD = ""
  if (searchNumber.length >= 3) {
    if (searchNumber.length >= 8) {
       phoneWithDDD = `(${searchNumber.slice(0, 2)}) ${searchNumber.slice(2, 7)}-${searchNumber.slice(7)}`
    } else {
       phoneWithDDD = `(${searchNumber.slice(0, 2)}) ${searchNumber.slice(2)}`
    }
  }

  // INJEÇÃO DA SEGURANÇA NA QUERY
  const where: Prisma.ycPessoasJuridicasWhereInput = {
    sysTenantId: tenantId,
    escopoId: { in: cracha.escoposPermitidos }, // REGRA 1: Escopos
    ...(cracha.isInterno ? {} : { sysUserId: BigInt(session.user.id) }), // REGRA 2: Autoria

    ...(params.isCliente === true || params.isCliente === 'true' ? { isCliente: true } : {}),
    ...(params.isImobiliaria === true || params.isImobiliaria === 'true' ? { isImobiliaria: true } : {}),
    ...(params.isFornecedor === true || params.isFornecedor === 'true' ? { isFornecedor: true } : {}),
    
    ...(isIdSearch && searchNumber ? {
      id: BigInt(searchNumber) 
    } : (cleanSearch ? {
      OR: [
        { ycEntidades: { is: { nome: { contains: cleanSearch } } } },
        { nomeFantasia: { contains: cleanSearch } },
        { email_1: { contains: cleanSearch } },
        { telefone_1: { contains: cleanSearch } }, 
        { telefone_2: { contains: cleanSearch } }, 
        ...(searchNumber ? [
          { ycEntidades: { is: { documento: { contains: searchNumber } } } },
          { telefone_1: { contains: searchNumber } }, 
          { telefone_2: { contains: searchNumber } } 
        ] : []),
        ...(phoneWithDDD ? [
          { telefone_1: { contains: phoneWithDDD } },
          { telefone_2: { contains: phoneWithDDD } }
        ] : [])
      ],
    } : {})),
  }

  const orderBy: Prisma.ycPessoasJuridicasOrderByWithRelationInput[] = []

  if (sortBy === "nome") {
    orderBy.push({ ycEntidades: { nome: sortDir } })
    orderBy.push({ id: "desc" })
  } else {
    orderBy.push({ [sortBy]: sortDir } as Prisma.ycPessoasJuridicasOrderByWithRelationInput)
    if (sortBy !== "id") orderBy.push({ id: "desc" })
  }

  try {
    const [total, items] = await prisma.$transaction([
      prisma.ycPessoasJuridicas.count({ where }), 
      prisma.ycPessoasJuridicas.findMany({
        where,
        include: { ycEntidades: true },
        orderBy,
        skip,
        take: pageSize,
      })
    ])

    return {
      total,
      data: items.map(item => ({
        id: item.id.toString(),
        nome: item.ycEntidades.nome,
        nomeFantasia: item.nomeFantasia,
        documento: item.ycEntidades.documento,
        email: item.email_1,
        telefone: item.telefone_1,
        cidade: item.cidade,
        uf: item.uf,
        isCliente: item.isCliente,
        isImobiliaria: item.isImobiliaria,
        isFornecedor: item.isFornecedor,
        sysCreatedAt: item.sysCreatedAt.toISOString()
      }))
    }
  } catch (error) {
    console.error("Erro ao buscar Pessoas Jurídicas:", error)
    return { data: [], total: 0 }
  }
}

// ----------------------------------------------------------------------
// 2. LEITURA POR ID
// ----------------------------------------------------------------------
export async function getPersonLegalById(id: string) {
  const session = await auth()
  if (!session?.user?.id) return null

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return null

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('PESSOAS_JURIDICAS_VER')) return null

  try {
    const person = await prisma.ycPessoasJuridicas.findFirst({
      where: { 
        id: BigInt(id), 
        sysTenantId: BigInt(tenantIdStr),
        escopoId: { in: cracha.escoposPermitidos }, // Proteção de Escopo
        ...(cracha.isInterno ? {} : { sysUserId: BigInt(session.user.id) }) // Proteção de Autoria
      },
      include: { ycEntidades: true }
    })

    if (!person) return null

    return {
      id: person.id.toString(),
      escopoId: person.escopoId.toString(),
      nome: person.ycEntidades.nome,
      documento: person.ycEntidades.documento,
      nomeFantasia: person.nomeFantasia || "",
      inscricaoEstadual: person.inscricaoEstadual || "",
      representanteLegal: person.representanteLegal || "",
      telefone_1: person.telefone_1 || "",
      telefone_2: person.telefone_2 || "",
      email_1: person.email_1 || "",
      email_2: person.email_2 || "",
      cep: person.cep || "",
      logradouro: person.logradouro || "",
      numero: person.numero || "",
      complemento: person.complemento || "",
      bairro: person.bairro || "",
      cidade: person.cidade || "",
      uf: person.uf || "",
      isCliente: person.isCliente,
      isImobiliaria: person.isImobiliaria,
      isFornecedor: person.isFornecedor,
      creci: (person as unknown as { creci?: string | null }).creci || ""
    }
  } catch (error) {
    console.error("Erro ao buscar pessoa jurídica:", error)
    return null
  }
}

// ----------------------------------------------------------------------
// 3. SALVAR (Criar ou Atualizar)
// ----------------------------------------------------------------------
export async function savePersonLegal(data: SaveLegalPersonPayload) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Usuário não autenticado." }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão expirada." }

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)
  
  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha) return { success: false, message: "Perfil de acesso não encontrado." }

  // CHECAGEM DE PERMISSÃO
  const requiredPermission = data.id ? 'PESSOAS_JURIDICAS_EDITAR' : 'PESSOAS_JURIDICAS_CRIAR'
  if (!cracha.permissoes.includes(requiredPermission)) {
    return { success: false, message: "Você não tem permissão para realizar esta operação." }
  }

  // Impede uso de escopo proibido
  if (!cracha.escoposPermitidos.includes(BigInt(data.escopoId))) {
    return { success: false, message: "Você não tem permissão para usar este escopo." }
  }

  const { id, nome, documento, escopoId, ...pjData } = data;

  const dataToSave = Object.fromEntries(
    Object.entries(pjData).map(([key, value]) => [key, value === "" ? null : value])
  );

  try {
    if (id) {
      // ANTES DE EDITAR: Verifica propriedade
      const checkExists = await prisma.ycPessoasJuridicas.findFirst({
        where: {
          id: BigInt(id),
          sysTenantId: tenantId,
          escopoId: { in: cracha.escoposPermitidos },
          ...(cracha.isInterno ? {} : { sysUserId: userId }) 
        }
      })

      if (!checkExists) {
        return { success: false, message: "Cadastro não encontrado ou acesso negado." }
      }

      await prisma.$transaction([
        prisma.ycEntidades.update({
          where: { id: BigInt(id) },
          data: { nome, documento } 
        }),
        prisma.ycPessoasJuridicas.update({
          where: { id: BigInt(id) },
          data: { ...dataToSave } 
        })
      ]);
      return { success: true, message: "Cadastro atualizado com sucesso!" }
    } else {
      await prisma.$transaction(async (tx) => {
        const novaEntidade = await tx.ycEntidades.create({
          data: {
            sysTenantId: tenantId,
            sysUserId: userId,
            escopoId: BigInt(escopoId),
            tipo: 'PJ',
            nome,
            documento
          }
        });

        await tx.ycPessoasJuridicas.create({
          data: {
            id: novaEntidade.id,
            sysTenantId: tenantId,
            sysUserId: userId,
            escopoId: BigInt(escopoId),
            ...dataToSave,
          }
        });
      });
      return { success: true, message: "Pessoa Jurídica cadastrada com sucesso!" }
    }
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, message: "Já existe um cadastro com este CNPJ." }
    }
    return { success: false, message: "Ocorreu um erro interno ao salvar o registro." }
  }
}

// ----------------------------------------------------------------------
// 4. EXCLUIR
// ----------------------------------------------------------------------
export async function deletePersonLegal(id: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado." }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Acesso negado." }

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('PESSOAS_JURIDICAS_EXCLUIR')) {
    return { success: false, message: "Você não tem permissão para excluir registros." }
  }

  try {
    // ANTES DE EXCLUIR: Verifica propriedade/escopo
    const checkExists = await prisma.ycPessoasJuridicas.findFirst({
        where: {
          id: BigInt(id),
          sysTenantId: tenantId,
          escopoId: { in: cracha.escoposPermitidos },
          ...(cracha.isInterno ? {} : { sysUserId: userId }) 
        }
    })

    if (!checkExists) {
      return { success: false, message: "Cadastro não encontrado ou acesso negado." }
    }

    await prisma.$transaction([
      prisma.ycPessoasJuridicas.delete({ where: { id: BigInt(id) } }),
      prisma.ycEntidades.delete({ where: { id: BigInt(id) } })
    ])
    return { success: true, message: "Registro excluído permanentemente." }
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return { success: false, message: "Não é possível excluir. Este cadastro possui vínculos no sistema." }
    }
    return { success: false, message: "Erro ao excluir o registro." }
  }
}