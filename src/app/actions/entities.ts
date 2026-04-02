'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
// 1. IMPORTAÇÃO DO MOTOR DE ACESSO
import { getUserAccessProfile } from "@/lib/access-control"

export type CreateEntityInput = {
    tipo: 'PF' | 'PJ'
    nome: string
    documento: string
    dataNascimento?: string
    rg?: string
    estadoCivil?: string
    regimeBens?: string
    nacionalidade?: string
    profissao?: string
    nomeFantasia?: string
    inscricaoEstadual?: string
    representanteLegal?: string
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
}

// ----------------------------------------------------------------------
// 1. LISTAGEM BLINDADA (Com Filtro Dinâmico de Tipo)
// ----------------------------------------------------------------------
export async function getEntitiesPaginated(search: string, page: number, limit: number = 10) {
    const session = await auth()
    if (!session?.user?.id) return { data: [], total: 0 }

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return { data: [], total: 0 }
    
    const tenantId = BigInt(tenantIdStr)
    const userId = BigInt(session.user.id)

    // CRACHÁ DO UTILIZADOR
    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha) return { data: [], total: 0 }

    // Descobre o que ele pode ver
    const canViewPF = cracha.permissoes.includes('PESSOAS_FISICAS_VER')
    const canViewPJ = cracha.permissoes.includes('PESSOAS_JURIDICAS_VER')

    // Se não pode ver nenhum dos dois, ejeta
    if (!canViewPF && !canViewPJ) return { data: [], total: 0 }

    const numericSearch = search.replace(/\D/g, '')

    const OR: Record<string, { contains: string }>[] = [
        { nome: { contains: search } } 
    ]
    if (numericSearch) {
        OR.push({ documento: { contains: numericSearch } })
    }

    // INJEÇÃO DA SEGURANÇA NA QUERY
    const whereClause = {
        sysTenantId: tenantId,
        escopoId: { in: cracha.escoposPermitidos }, // REGRA 1: Escopos
        ...(cracha.isInterno ? {} : { sysUserId: userId }), // REGRA 2: Autoria
        
        // REGRA 3: Filtra o Tipo de Entidade baseado nas permissões
        ...(canViewPF && canViewPJ ? {} : { tipo: canViewPF ? 'PF' : 'PJ' }),

        ...(search ? { OR } : {})
    }

    try {
        const [total, entities] = await Promise.all([
            prisma.ycEntidades.count({ where: whereClause }),
            prisma.ycEntidades.findMany({
                where: whereClause,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { nome: 'asc' },
                select: { id: true, nome: true, documento: true, tipo: true }
            })
        ])

        const formatDoc = (doc: string | null, tipo: string) => {
            if (!doc) return 'Não informado'
            const d = doc.replace(/\D/g, '')
            if (tipo === 'PF' && d.length === 11) {
                return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
            }
            if (tipo === 'PJ' && d.length === 14) {
                return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
            }
            return doc
        }

        return {
            data: entities.map(e => ({
                id: e.id.toString(),
                nome: e.nome,
                documento: formatDoc(e.documento, e.tipo),
                tipo: e.tipo
            })),
            total
        }
    } catch (error) {
        console.error("Erro ao buscar entidades:", error)
        return { data: [], total: 0 }
    }
}

// ----------------------------------------------------------------------
// 2. CRIAÇÃO RÁPIDA (Permissão Dinâmica e Escopo Seguro)
// ----------------------------------------------------------------------
export async function createSimpleEntity(data: CreateEntityInput) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return { success: false, message: "Tenant não encontrado." }
    
    const tenantId = BigInt(tenantIdStr)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha) return { success: false, message: "Perfil de acesso não encontrado." }

    // CHECAGEM DINÂMICA DE PERMISSÃO
    const requiredPermission = data.tipo === 'PF' ? 'PESSOAS_FISICAS_CRIAR' : 'PESSOAS_JURIDICAS_CRIAR'
    if (!cracha.permissoes.includes(requiredPermission)) {
        return { success: false, message: "Você não tem permissão para cadastrar este tipo de cliente." }
    }

    try {
        // ESCOPO SEGURO: Pega o primeiro escopo que o utilizador tem acesso
        if (cracha.escoposPermitidos.length === 0) {
            return { success: false, message: "Você não possui escopos vinculados para realizar cadastros." }
        }
        const escopoId = cracha.escoposPermitidos[0]

        const docExists = await prisma.ycEntidades.findFirst({
            where: { sysTenantId: tenantId, documento: data.documento }
        })

        if (docExists) {
            return { success: false, message: `Já existe um cadastro com o ${data.tipo === 'PF' ? 'CPF' : 'CNPJ'} informado.` }
        }

        let novaEntidade;

        await prisma.$transaction(async (tx) => {
            novaEntidade = await tx.ycEntidades.create({
                data: {
                    sysTenantId: tenantId,
                    sysUserId: userId,
                    escopoId: escopoId, // Usa o escopo seguro
                    tipo: data.tipo,
                    documento: data.documento,
                    nome: data.nome
                }
            })

            if (data.tipo === 'PF') {
                await tx.ycPessoasFisicas.create({
                    data: {
                        id: novaEntidade.id,
                        sysTenantId: tenantId,
                        sysUserId: userId,
                        escopoId: escopoId,
                        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento + "T12:00:00Z") : null,
                        rg: data.rg || null,
                        estadoCivil: data.estadoCivil || null,
                        regimeBens: data.regimeBens || null,
                        nacionalidade: data.nacionalidade || 'Brasileiro',
                        profissao: data.profissao || null,
                        telefone_1: data.telefone_1 || null,
                        telefone_2: data.telefone_2 || null,
                        email_1: data.email_1 || null,
                        email_2: data.email_2 || null,
                        cep: data.cep ? data.cep.replace(/\D/g, '') : null,
                        logradouro: data.logradouro || null,
                        numero: data.numero || null,
                        complemento: data.complemento || null,
                        bairro: data.bairro || null,
                        cidade: data.cidade || null,
                        uf: data.uf || null,
                        isCliente: true
                    }
                })
            } else {
                await tx.ycPessoasJuridicas.create({
                    data: {
                        id: novaEntidade.id,
                        sysTenantId: tenantId,
                        sysUserId: userId,
                        escopoId: escopoId,
                        nomeFantasia: data.nomeFantasia || null,
                        inscricaoEstadual: data.inscricaoEstadual || null,
                        representanteLegal: data.representanteLegal || null,
                        telefone_1: data.telefone_1 || null,
                        telefone_2: data.telefone_2 || null,
                        email_1: data.email_1 || null,
                        email_2: data.email_2 || null,
                        cep: data.cep ? data.cep.replace(/\D/g, '') : null,
                        logradouro: data.logradouro || null,
                        numero: data.numero || null,
                        complemento: data.complemento || null,
                        bairro: data.bairro || null,
                        cidade: data.cidade || null,
                        uf: data.uf || null,
                        isCliente: true
                    }
                })
            }
        })

        const formatDoc = (doc: string, tipo: string) => {
            const d = doc.replace(/\D/g, '')
            if (tipo === 'PF' && d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
            if (tipo === 'PJ' && d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
            return doc
        }

        return { 
            success: true, 
            message: "Cliente cadastrado com sucesso!",
            data: {
                id: novaEntidade!.id.toString(),
                nome: novaEntidade!.nome,
                documento: formatDoc(novaEntidade!.documento, novaEntidade!.tipo),
                tipo: novaEntidade!.tipo
            }
        }

    } catch (error) {
        console.error("Erro ao cadastrar entidade:", error)
        return { success: false, message: "Erro interno ao cadastrar o cliente." }
    }
}

// ----------------------------------------------------------------------
// 3. BUSCAR POR ID (Com Proteção)
// ----------------------------------------------------------------------
export async function getEntityById(id: string) {
    const session = await auth()
    if (!session?.user?.id) return null

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return null

    const tenantId = BigInt(tenantIdStr)
    const userId = BigInt(session.user.id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha) return null

    try {
        const ent = await prisma.ycEntidades.findFirst({
            where: { 
                id: BigInt(id),
                sysTenantId: tenantId,
                escopoId: { in: cracha.escoposPermitidos },
                ...(cracha.isInterno ? {} : { sysUserId: userId }) 
            }
        })
        if (!ent) return null

        let detalhes = {}
        if (ent.tipo === 'PF') {
            const pf = await prisma.ycPessoasFisicas.findUnique({ where: { id: ent.id } })
            if (pf) detalhes = pf
        } else {
            const pj = await prisma.ycPessoasJuridicas.findUnique({ where: { id: ent.id } })
            if (pj) detalhes = pj
        }

        const payload = { ...ent, ...detalhes }
        return JSON.parse(JSON.stringify(payload, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ))
    } catch (error) {
        console.error("Erro ao buscar entidade por ID:", error)
        return null
    }
}

// ----------------------------------------------------------------------
// 4. ATUALIZAÇÃO RÁPIDA (Permissão Dinâmica)
// ----------------------------------------------------------------------
export async function updateSimpleEntity(id: string, data: Partial<CreateEntityInput>) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Não autorizado." }

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return { success: false, message: "Tenant não encontrado." }

    const tenantId = BigInt(tenantIdStr)
    const userId = BigInt(session.user.id)
    const entId = BigInt(id)

    const cracha = await getUserAccessProfile(userId, tenantId)
    if (!cracha) return { success: false, message: "Perfil de acesso não encontrado." }

    // CHECAGEM DINÂMICA DE PERMISSÃO
    const requiredPermission = data.tipo === 'PF' ? 'PESSOAS_FISICAS_EDITAR' : 'PESSOAS_JURIDICAS_EDITAR'
    if (!cracha.permissoes.includes(requiredPermission)) {
        return { success: false, message: "Você não tem permissão para editar este tipo de cliente." }
    }

    try {
        // ANTES DE EDITAR: Verifica propriedade e escopo
        const checkExists = await prisma.ycEntidades.findFirst({
            where: {
                id: entId,
                sysTenantId: tenantId,
                escopoId: { in: cracha.escoposPermitidos },
                ...(cracha.isInterno ? {} : { sysUserId: userId }) 
            }
        })

        if (!checkExists) {
            return { success: false, message: "Cadastro não encontrado ou acesso negado." }
        }

        await prisma.$transaction(async (tx) => {
            await tx.ycEntidades.update({
                where: { id: entId },
                data: { 
                    nome: data.nome,
                    sysUpdatedAt: new Date()
                }
            })

            if (data.tipo === 'PF') {
                await tx.ycPessoasFisicas.update({
                    where: { id: entId },
                    data: {
                        sysUpdatedAt: new Date(),
                        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento + "T12:00:00Z") : null,
                        rg: data.rg || null,
                        estadoCivil: data.estadoCivil || null,
                        regimeBens: data.regimeBens || null,
                        nacionalidade: data.nacionalidade || 'Brasileiro',
                        profissao: data.profissao || null,
                        telefone_1: data.telefone_1 || null,
                        telefone_2: data.telefone_2 || null,
                        email_1: data.email_1 || null,
                        email_2: data.email_2 || null,
                        cep: data.cep ? data.cep.replace(/\D/g, '') : null,
                        logradouro: data.logradouro || null,
                        numero: data.numero || null,
                        complemento: data.complemento || null,
                        bairro: data.bairro || null,
                        cidade: data.cidade || null,
                        uf: data.uf || null
                    }
                })
            } else {
                await tx.ycPessoasJuridicas.update({
                    where: { id: entId },
                    data: {
                        sysUpdatedAt: new Date(),
                        nomeFantasia: data.nomeFantasia || null,
                        inscricaoEstadual: data.inscricaoEstadual || null,
                        representanteLegal: data.representanteLegal || null,
                        telefone_1: data.telefone_1 || null,
                        telefone_2: data.telefone_2 || null,
                        email_1: data.email_1 || null,
                        email_2: data.email_2 || null,
                        cep: data.cep ? data.cep.replace(/\D/g, '') : null,
                        logradouro: data.logradouro || null,
                        numero: data.numero || null,
                        complemento: data.complemento || null,
                        bairro: data.bairro || null,
                        cidade: data.cidade || null,
                        uf: data.uf || null
                    }
                })
            }
        })

        const formatDoc = (doc: string, tipo: string) => {
            const d = doc.replace(/\D/g, '')
            if (tipo === 'PF' && d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
            if (tipo === 'PJ' && d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
            return doc
        }

        return { 
            success: true, 
            message: "Cliente atualizado com sucesso!",
            data: {
                id: id,
                nome: data.nome!,
                documento: formatDoc(data.documento!, data.tipo!),
                tipo: data.tipo!
            }
        }

    } catch (error) {
        console.error("Erro ao atualizar entidade:", error)
        return { success: false, message: "Erro interno ao atualizar o cliente." }
    }
}