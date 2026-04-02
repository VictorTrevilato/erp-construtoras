'use server'

import { prisma } from "@/lib/prisma"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
// 1. IMPORTAÇÃO DO MOTOR DE ACESSO
import { getUserAccessProfile } from "@/lib/access-control" 

// ----------------------------------------------------------------------
// TIPAGENS
// ----------------------------------------------------------------------
export interface GetPersonsParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortDir?: "asc" | "desc"
  isCliente?: boolean | string
  isCorretor?: boolean | string
  isFuncionario?: boolean | string
}

export interface SavePersonPayload {
  id?: string
  escopoId: string
  nome: string
  documento: string
  dataNascimento?: string | null
  rg?: string
  estadoCivil?: string
  regimeBens?: string
  nacionalidade?: string
  profissao?: string
  telefone_1?: string
  telefone_2?: string
  email_1?: string
  email_2?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  isCliente: boolean
  isCorretor: boolean
  isFuncionario: boolean
  creci?: string
}

// ----------------------------------------------------------------------
// BUSCA ESCOPOS PARA O DROPDOWN
// ----------------------------------------------------------------------
export async function getAvailableScopes() {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  // FILTRO: Puxa o crachá para exibir apenas escopos permitidos
  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha) return []

  try {
    const scopes = await prisma.ycEscopos.findMany({
      where: { 
        sysTenantId: BigInt(tenantIdStr), 
        ativo: true,
        id: { in: cracha.escoposPermitidos } // Trava de escopo na UI
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
// 1. LISTAGEM COM SEGURANÇA E REGRA DE CORRETOR EXTERNO
// ----------------------------------------------------------------------
export async function getPersonsPhysical(params: GetPersonsParams) {
  const session = await auth()
  if (!session?.user?.id) return { data: [], total: 0 }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { data: [], total: 0 }

  // VERIFICAÇÃO DE PERMISSÃO E CRACHÁ
  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('PESSOAS_FISICAS_VER')) return { data: [], total: 0 }

  const { 
    page = 1, 
    pageSize = 10, 
    search = "", 
    sortBy = "id", 
    sortDir = "desc" 
  } = params;

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

  // INJEÇÃO DA SEGURANÇA NA QUERY DO BANCO
  const where: Prisma.ycPessoasFisicasWhereInput = {
    sysTenantId: tenantId,
    escopoId: { in: cracha.escoposPermitidos }, // REGRA 1: Apenas Escopos do Usuário
    ...(cracha.isInterno ? {} : { sysUserId: BigInt(session.user.id) }), // REGRA 2: Se Externo, apenas os dele

    ...(params.isCliente === true || params.isCliente === 'true' ? { isCliente: true } : {}),
    ...(params.isCorretor === true || params.isCorretor === 'true' ? { isCorretor: true } : {}),
    ...(params.isFuncionario === true || params.isFuncionario === 'true' ? { isFuncionario: true } : {}),
    
    ...(isIdSearch && searchNumber ? {
      id: BigInt(searchNumber) 
    } : (cleanSearch ? {
      OR: [
        { ycEntidades: { is: { nome: { contains: cleanSearch } } } },
        { email_1: { contains: cleanSearch } },
        { cidade: { contains: cleanSearch } },
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

  const orderBy: Prisma.ycPessoasFisicasOrderByWithRelationInput[] = []

  if (sortBy === "nome") {
    orderBy.push({ ycEntidades: { nome: sortDir } })
    orderBy.push({ id: "desc" })
  } else {
    orderBy.push({ [sortBy]: sortDir } as Prisma.ycPessoasFisicasOrderByWithRelationInput)
    if (sortBy !== "id") orderBy.push({ id: "desc" })
  }

  try {
    const [total, items] = await prisma.$transaction([
      prisma.ycPessoasFisicas.count({ where }), 
      prisma.ycPessoasFisicas.findMany({
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
        documento: item.ycEntidades.documento,
        email: item.email_1,
        telefone: item.telefone_1,
        cidade: item.cidade,
        uf: item.uf,
        isCliente: item.isCliente,
        isCorretor: item.isCorretor,
        isFuncionario: item.isFuncionario,
        sysCreatedAt: item.sysCreatedAt.toISOString()
      }))
    }
  } catch (error) {
    console.error("Erro ao buscar Pessoas Físicas:", error)
    return { data: [], total: 0 }
  }
}

// ----------------------------------------------------------------------
// 2. LEITURA POR ID
// ----------------------------------------------------------------------
export async function getPersonPhysicalById(id: string) {
  const session = await auth()
  if (!session?.user?.id) return null

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return null

  const cracha = await getUserAccessProfile(BigInt(session.user.id), BigInt(tenantIdStr))
  if (!cracha || !cracha.permissoes.includes('PESSOAS_FISICAS_VER')) return null

  try {
    const person = await prisma.ycPessoasFisicas.findFirst({
      where: { 
        id: BigInt(id), 
        sysTenantId: BigInt(tenantIdStr),
        escopoId: { in: cracha.escoposPermitidos }, // Proteção de Escopo
        ...(cracha.isInterno ? {} : { sysUserId: BigInt(session.user.id) }) // Proteção de Autoria
      },
      include: { ycEntidades: true }
    })

    if (!person) return null

    let dNasc = ""
    if (person.dataNascimento) {
      dNasc = person.dataNascimento.toISOString().split('T')[0]
    }

    return {
      id: person.id.toString(),
      escopoId: person.escopoId.toString(),
      nome: person.ycEntidades.nome,
      documento: person.ycEntidades.documento,
      dataNascimento: dNasc,
      rg: person.rg || "",
      estadoCivil: person.estadoCivil || "",
      regimeBens: person.regimeBens || "",
      nacionalidade: person.nacionalidade || "Brasileiro",
      profissao: person.profissao || "",
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
      isCorretor: person.isCorretor,
      isFuncionario: person.isFuncionario,
      creci: (person as unknown as { creci?: string | null }).creci || ""
    }
  } catch (error) {
    console.error("Erro ao buscar pessoa:", error)
    return null
  }
}

// ----------------------------------------------------------------------
// 3. SALVAR (Criar ou Atualizar)
// ----------------------------------------------------------------------
export async function savePersonPhysical(data: SavePersonPayload) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Usuário não autenticado." }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Sessão expirada ou Tenant não encontrado." }

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)
  
  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha) return { success: false, message: "Perfil de acesso não encontrado." }

  // CHECAGEM DE PERMISSÃO
  const requiredPermission = data.id ? 'PESSOAS_FISICAS_EDITAR' : 'PESSOAS_FISICAS_CRIAR'
  if (!cracha.permissoes.includes(requiredPermission)) {
    return { success: false, message: "Você não tem permissão para realizar esta operação." }
  }

  // Impede forçar criação/edição em um escopo proibido
  if (!cracha.escoposPermitidos.includes(BigInt(data.escopoId))) {
    return { success: false, message: "Você não tem permissão para usar este escopo." }
  }

  const { id, nome, documento, dataNascimento, escopoId, ...pfData } = data;

  const dataToSave = Object.fromEntries(
    Object.entries(pfData).map(([key, value]) => [key, value === "" ? null : value])
  );

  let parsedDate = null
  if (dataNascimento) parsedDate = new Date(`${dataNascimento}T12:00:00Z`)

  try {
    if (id) {
      // ANTES DE EDITAR: Verifica se ele tem direito sobre este registro
      const checkExists = await prisma.ycPessoasFisicas.findFirst({
        where: {
          id: BigInt(id),
          sysTenantId: tenantId,
          escopoId: { in: cracha.escoposPermitidos },
          ...(cracha.isInterno ? {} : { sysUserId: userId }) 
        }
      })

      if (!checkExists) {
        return { success: false, message: "Cadastro não encontrado ou você não tem permissão de edição sobre ele." }
      }

      await prisma.$transaction([
        prisma.ycEntidades.update({
          where: { id: BigInt(id) },
          data: { nome, documento } 
        }),
        prisma.ycPessoasFisicas.update({
          where: { id: BigInt(id) },
          data: { ...dataToSave, dataNascimento: parsedDate } 
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
            tipo: 'PF', 
            nome,
            documento
          }
        });

        await tx.ycPessoasFisicas.create({
          data: {
            id: novaEntidade.id,
            sysTenantId: tenantId,
            sysUserId: userId,
            escopoId: BigInt(escopoId),
            ...dataToSave,
            dataNascimento: parsedDate
          }
        });
      });
      return { success: true, message: "Pessoa Física cadastrada com sucesso!" }
    }
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return { success: false, message: "Já existe um cadastro com este CPF." }
    }
    return { success: false, message: "Ocorreu um erro interno ao salvar o registro." }
  }
}

// ----------------------------------------------------------------------
// 4. EXCLUIR
// ----------------------------------------------------------------------
export async function deletePersonPhysical(id: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: "Não autorizado." }

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return { success: false, message: "Acesso negado." }

  const tenantId = BigInt(tenantIdStr)
  const userId = BigInt(session.user.id)

  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha || !cracha.permissoes.includes('PESSOAS_FISICAS_EXCLUIR')) {
    return { success: false, message: "Você não tem permissão para excluir registros." }
  }

  try {
    // ANTES DE EXCLUIR: Verifica propriedade/escopo
    const checkExists = await prisma.ycPessoasFisicas.findFirst({
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
      prisma.ycPessoasFisicas.delete({
        where: { id: BigInt(id) }
      }),
      prisma.ycEntidades.delete({
        where: { id: BigInt(id) }
      })
    ])

    return { success: true, message: "Registro excluído permanentemente." }
  } catch (error: unknown) {
    console.error("Erro ao excluir Pessoa Física:", error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return { success: false, message: "Não é possível excluir. Este cadastro possui vínculos em outras áreas do sistema." }
      }
    }
    
    return { success: false, message: "Erro ao excluir o registro." }
  }
}