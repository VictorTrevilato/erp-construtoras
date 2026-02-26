'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentTenantId } from "@/lib/get-current-tenant"

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

export async function getEntitiesPaginated(search: string, page: number, limit: number = 10) {
    const session = await auth()
    if (!session) return { data: [], total: 0 }

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return { data: [], total: 0 }
    const tenantId = BigInt(tenantIdStr)

    const numericSearch = search.replace(/\D/g, '')

    const OR: Record<string, { contains: string }>[] = [
        { nome: { contains: search } } 
    ]
    if (numericSearch) {
        OR.push({ documento: { contains: numericSearch } })
    }

    const whereClause = {
        sysTenantId: tenantId,
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

export async function createSimpleEntity(data: CreateEntityInput) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado." }

    const tenantIdStr = await getCurrentTenantId()
    if (!tenantIdStr) return { success: false, message: "Tenant não encontrado." }
    
    const tenantId = BigInt(tenantIdStr)
    const userId = BigInt(session.user.id)

    try {
        const escopo = await prisma.ycEscopos.findFirst({ where: { sysTenantId: tenantId } })
        const escopoId = escopo ? escopo.id : BigInt(1)

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
                    escopoId: escopoId,
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

// --- NOVAS FUNÇÕES: BUSCAR E EDITAR ENTIDADE EXISTENTE ---

export async function getEntityById(id: string) {
    const session = await auth()
    if (!session) return null

    try {
        const ent = await prisma.ycEntidades.findUnique({
            where: { id: BigInt(id) }
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

        // Converte BigInts e Datas para string para trafegar no Client Component
        const payload = { ...ent, ...detalhes }
        return JSON.parse(JSON.stringify(payload, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ))
    } catch (error) {
        console.error("Erro ao buscar entidade por ID:", error)
        return null
    }
}

export async function updateSimpleEntity(id: string, data: Partial<CreateEntityInput>) {
    const session = await auth()
    if (!session) return { success: false, message: "Não autorizado." }

    try {
        const entId = BigInt(id)
        
        await prisma.$transaction(async (tx) => {
            // Atualiza Tabela Pai (apenas nome muda)
            await tx.ycEntidades.update({
                where: { id: entId },
                data: { 
                    nome: data.nome,
                    sysUpdatedAt: new Date()
                }
            })

            // Atualiza Filha
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