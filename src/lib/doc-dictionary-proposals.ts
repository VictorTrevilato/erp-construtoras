import { prisma } from "@/lib/prisma"
// @ts-expect-error - A biblioteca numero-por-extenso não possui pacote oficial de tipagem no TypeScript
import { porExtenso } from "numero-por-extenso"

// =========================================================
// HELPERS DE FORMATAÇÃO E MÁSCARAS
// =========================================================

// Tipo seguro para substituir o "any", englobando os valores numéricos do Prisma (Decimal.js)
type SafeValue = string | number | boolean | null | undefined | { toString: () => string };

const safeParseNumber = (val: SafeValue) => Number(val?.toString() || 0)

const fmtCurrency = (val: SafeValue) => safeParseNumber(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtDecimal = (val: SafeValue, digits = 2) => safeParseNumber(val).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const fmtDate = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    const date = new Date(d)
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
    return date.toLocaleDateString('pt-BR')
}

// Máscaras
const maskCpfCnpj = (val: string | null | undefined) => {
    if (!val) return "-"
    const s = val.replace(/\D/g, '')
    if (s.length === 11) return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    if (s.length === 14) return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    return val
}

const maskCep = (val: string | null | undefined) => {
    if (!val) return "-"
    const s = val.replace(/\D/g, '')
    if (s.length === 8) return s.replace(/(\d{5})(\d{3})/, '$1-$2')
    return val
}

// Capitalização (Text Casing)
const toUpper = (val: string | null | undefined) => val ? val.toUpperCase() : "-"
const toLower = (val: string | null | undefined) => val ? val.toLowerCase() : "-"
const toTitleCase = (str: string | null | undefined) => {
    if (!str) return "-"
    const lowers = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos']
    return str.toLowerCase().split(' ').map((word, index) => {
        if (index > 0 && lowers.includes(word)) return word
        return word.charAt(0).toUpperCase() + word.slice(1)
    }).join(' ')
}

const buildAddress = (logradouro?: string | null, numero?: string | null, compl?: string | null, bairro?: string | null) => {
    const parts = [logradouro, numero, compl, bairro].filter(Boolean)
    return parts.length > 0 ? parts.join(", ") : "-"
}

// =========================================================
// EXTENSO SEGURO (Com Correção de Bug Flutuante e 9 Decimais)
// =========================================================

const safeExtenso = (val: SafeValue, format: 'monetario' | 'porcentagem' | 'inteiro' | 'decimal_area' | 'decimal_9' = 'inteiro') => {
    let num = safeParseNumber(val)
    if (num === 0) {
        if (format === 'monetario') return "zero reais"
        if (format === 'porcentagem') return "zero por cento"
        return "zero"
    }

    try {
        if (format === 'monetario') {
            num = Math.round(num * 100) / 100 // Arredonda para matar o bug do JS
            return porExtenso(num, 'monetario')
        }
        
        if (format === 'porcentagem') {
            num = Math.round(num * 100) / 100
            return `${porExtenso(num)} por cento`
        }
        
        if (format === 'inteiro') return porExtenso(Math.floor(num))
        
        if (format === 'decimal_area') {
            num = Math.round(num * 100) / 100
            const [intPart, decPart] = num.toFixed(2).split('.')
            let res = porExtenso(Number(intPart))
            if (Number(decPart) > 0) res += ` vírgula ${porExtenso(Number(decPart))}`
            return res
        }

        if (format === 'decimal_9') {
            const fixedStr = num.toFixed(9).replace(/0+$/, '') // Tira zeros sobrando à direita
            const parts = fixedStr.split('.')
            let res = porExtenso(Number(parts[0]))
            if (parts[1] && Number(parts[1]) > 0) {
                res += ` vírgula ${porExtenso(Number(parts[1]))}`
            }
            return res
        }
        
        return porExtenso(num)
    } catch {
        return "-"
    }
}

// =========================================================
// MOTOR PRINCIPAL DO DICIONÁRIO
// =========================================================

export async function buildContractDictionary(propostaId: string) {
    const proposta = await prisma.ycPropostas.findUnique({
        where: { id: BigInt(propostaId) },
        include: {
            ycEmpresas: true, 
            ycUnidades: { include: { ycProjetos: true, ycBlocos: true } },
            ycPropostasPartes: {
                include: { ycEntidades: { include: { ycPessoasFisicas: true, ycPessoasJuridicas: true } } },
                orderBy: [{ numGrupo: 'asc' }, { isResponsavel: 'desc' }]
            },
            ycPropostasCondicoes: true, 
            ycPropostasComissoes: {
                include: { ycEntidades: { include: { ycPessoasJuridicas: true } } }
            }
        }
    })

    if (!proposta) throw new Error("Proposta não encontrada")

    const unidade = proposta.ycUnidades
    const projeto = unidade.ycProjetos
    const bloco = unidade.ycBlocos
    const empresa = proposta.ycEmpresas
    const hoje = new Date()

    // --- 1. LÓGICA DE PARTES SEGREGADAS (CARDINALIDADE 1-N) ---
    const buildPartyList = (tipoFiltro: string) => {
        const filtrados = proposta.ycPropostasPartes.filter(p => p.tipo === tipoFiltro)
        return filtrados.map((p, index) => {
            const ent = p.ycEntidades
            const pf = ent.ycPessoasFisicas
            const pj = ent.ycPessoasJuridicas
            const percent = safeParseNumber(p.percParticipacao)

            // Busca o cônjuge atrelado a este MESMO GRUPO
            const conjugeDoGrupo = proposta.ycPropostasPartes.find(
                c => c.tipo === 'CONJUGE' && c.numGrupo === p.numGrupo
            )
            const cEnt = conjugeDoGrupo?.ycEntidades
            const cPf = cEnt?.ycPessoasFisicas
            const percentConjuge = safeParseNumber(conjugeDoGrupo?.percParticipacao)

            return {
                // --- DADOS DA PARTE PRINCIPAL ---
                INDEX: index + 1,
                NUMERO_GRUPO: p.numGrupo,
                RESPONSAVEL: p.isResponsavel,
                IS_PF: ent.tipo === 'PF',
                IS_PJ: ent.tipo === 'PJ',
                NOME_PARTE: toUpper(ent.nome),
                CPF_CNPJ_PARTE: maskCpfCnpj(ent.documento),
                RG_PARTE: pf?.rg || "-",
                NACIONALIDADE_PARTE: toLower(pf?.nacionalidade || "brasileiro(a)"),
                PROFISSAO_PARTE: toLower(pf?.profissao),
                ESTADO_CIVIL_PARTE: toLower(pf?.estadoCivil),
                REGIME_BENS_PARTE: toLower(pf?.regimeBens),
                DATA_NASCIMENTO_PARTE: fmtDate(pf?.dataNascimento),
                ENDERECO_COMPLETO_PARTE: toTitleCase(buildAddress(pf?.logradouro || pj?.logradouro, pf?.numero || pj?.numero, pf?.complemento || pj?.complemento, pf?.bairro || pj?.bairro)),
                CIDADE_PARTE: toTitleCase(pf?.cidade || pj?.cidade),
                UF_PARTE: toUpper(pf?.uf || pj?.uf),
                CEP_PARTE: maskCep(pf?.cep || pj?.cep),
                TELEFONE_PARTE: pf?.telefone_1 || pj?.telefone_1 || "-",
                EMAIL_PARTE: toLower(pf?.email_1 || pj?.email_1),
                TEM_PERCENTUAL_PARTICIPACAO: percent > 0,
                PERCENTUAL_PARTICIPACAO: fmtDecimal(percent),
                PERCENTUAL_PARTICIPACAO_EXTENSO: safeExtenso(percent, 'porcentagem'),
                REPRESENTANTE_LEGAL_PARTE: toUpper(pj?.representanteLegal),

                // --- DADOS DO CÔNJUGE VINCULADO (Nesting / Aninhamento) ---
                TEM_CONJUGE_VINCULADO: !!conjugeDoGrupo,
                CONJUGE_NOME: toUpper(cEnt?.nome),
                CONJUGE_CPF_CNPJ: maskCpfCnpj(cEnt?.documento),
                CONJUGE_RG: cPf?.rg || "-",
                CONJUGE_NACIONALIDADE: toLower(cPf?.nacionalidade || "brasileiro(a)"),
                CONJUGE_PROFISSAO: toLower(cPf?.profissao),
                CONJUGE_DATA_NASCIMENTO: fmtDate(cPf?.dataNascimento),
                TEM_CONJUGE_PERCENTUAL_PARTICIPACAO: percentConjuge > 0,
                CONJUGE_PERCENTUAL_PARTICIPACAO: fmtDecimal(percentConjuge),
                CONJUGE_PERCENTUAL_PARTICIPACAO_EXTENSO: safeExtenso(percentConjuge, 'porcentagem')
            }
        })
    }

    const COMPRADORES = buildPartyList('COMPRADOR')
    const CO_COMPRADORES = buildPartyList('CO_COMPRADOR')
    const CONJUGES = buildPartyList('CONJUGE')
    const AVALISTAS = buildPartyList('AVALISTA')
    const PROCURADORES = buildPartyList('PROCURADOR')
    const TESTEMUNHAS = buildPartyList('TESTEMUNHA')

    // Pega o Comprador Responsável para o Fallback Genérico
    const compradorBase = proposta.ycPropostasPartes.find(p => p.tipo === 'COMPRADOR' && p.isResponsavel)?.ycEntidades || proposta.ycPropostasPartes.find(p => p.tipo === 'COMPRADOR')?.ycEntidades
    const pfBase = compradorBase?.ycPessoasFisicas
    const pjBase = compradorBase?.ycPessoasJuridicas

    // --- 2. LÓGICA DE COMISSÕES ---
    const comissaoList = proposta.ycPropostasComissoes
    const comissaoBase = comissaoList.find(c => c.isResponsavel) || comissaoList[0]

    const COMISSOES = comissaoList.map((c, index) => {
        const percent = safeParseNumber(c.percRateio)
        const val = safeParseNumber(c.valor)
        return {
            INDEX: index + 1,
            RESPONSAVEL: c.isResponsavel,
            NOME_COMISSIONADO: toUpper(c.ycEntidades?.nome),
            CNPJ_CPF_COMISSIONADO: maskCpfCnpj(c.ycEntidades?.documento),
            VALOR_RATEIO: fmtCurrency(val),
            VALOR_RATEIO_EXTENSO: safeExtenso(val, 'monetario'),
            PERCENTUAL_RATEIO: fmtDecimal(percent),
            PERCENTUAL_RATEIO_EXTENSO: safeExtenso(percent, 'porcentagem')
        }
    })

    // --- 3. LÓGICA FINANCEIRA (BUILDER DE CONDIÇÕES) ---
    const condicoes = proposta.ycPropostasCondicoes
    const valTotalProp = safeParseNumber(proposta.valorProposta)

    const buildPaymentBlock = (typeTarget: string, prefixText: string) => {
        const items = condicoes.filter(c => c.tipo.toUpperCase() === typeTarget)
        const hasItem = items.length > 0
        const totalVal = items.reduce((acc, c) => acc + safeParseNumber(c.valorTotal), 0)
        const totalQtd = items.reduce((acc, c) => acc + c.qtdeParcelas, 0)
        const firstDate = hasItem ? items[0].dataVencimento : null
        const unitVal = hasItem ? safeParseNumber(items[0].valorParcela) : 0
        const percent = valTotalProp > 0 ? (totalVal / valTotalProp) * 100 : 0

        return {
            [`TEM_${prefixText}`]: hasItem,
            [`VALOR_${prefixText}`]: fmtCurrency(totalVal),
            [`VALOR_${prefixText}_EXTENSO`]: safeExtenso(totalVal, 'monetario'),
            [`PERCENTUAL_${prefixText}`]: fmtDecimal(percent),
            [`PERCENTUAL_${prefixText}_EXTENSO`]: safeExtenso(percent, 'porcentagem'),
            [`QTDE_${prefixText}`]: totalQtd.toString(),
            [`QTDE_${prefixText}_EXTENSO`]: safeExtenso(totalQtd, 'inteiro'),
            [`DATA_VENCIMENTO_${prefixText}`]: fmtDate(firstDate),
            [`VALOR_PARCELA_${prefixText}`]: fmtCurrency(unitVal),
            [`VALOR_PARCELA_${prefixText}_EXTENSO`]: safeExtenso(unitVal, 'monetario'),
        }
    }

    const blockEntrada = buildPaymentBlock('ENTRADA', 'ENTRADA')
    const blockMensal = buildPaymentBlock('MENSAL', 'MENSAL')
    const blockIntermediaria = buildPaymentBlock('INTERMEDIARIAS', 'INTERMEDIARIA')
    const blockAnual = buildPaymentBlock('ANUAL', 'ANUAL')
    const blockChaves = buildPaymentBlock('CHAVES', 'CHAVES')
    const blockFinanc = buildPaymentBlock('FINANCIAMENTO', 'FINANCIAMENTO')

    // Frações do Preço
    const percSolo = safeParseNumber(unidade.fracaoIdealTerreno)
    const percObra = percSolo > 0 ? 100 - percSolo : 100

    // =================================================================
    // MONTAGEM FINAL DO DICIONÁRIO 
    // =================================================================
    const dictionary = {
        // --- EMPREENDIMENTO ---
        NOME_EMPREENDIMENTO: toUpper(projeto.nome),
        ENDERECO_EMPREENDIMENTO: toTitleCase(buildAddress(projeto.logradouro, projeto.numero, projeto.complemento, projeto.bairro)),
        CEP_EMPREENDIMENTO: maskCep(projeto.cep),
        CIDADE_EMPREENDIMENTO: toTitleCase(projeto.cidade),
        UF_EMPREENDIMENTO: toUpper(projeto.estado),
        NUMERO_REGISTRO_INCORPORACAO: projeto.registroIncorporacao || "-",
        MATRICULA_IMOVEL: projeto.matricula || "-",
        CARTORIO_REGISTRO: toTitleCase((projeto as { cartorioRegistro?: string | null }).cartorioRegistro),

        // --- UNIDADE E FLAGS DE CONTEÚDO ---
        DESCRICAO_UNIDADE: `${toUpper(bloco.nome)} - Unidade ${toUpper(unidade.unidade)}`,
        NUMERO_UNIDADE: toUpper(unidade.unidade),
        TORRE_UNIDADE: toUpper(bloco.nome),
        TIPO_UNIDADE: toUpper(unidade.tipo) || "UNIDADE AUTÔNOMA",
        ANDAR: unidade.andar?.toString() || "-",
        ANDAR_EXTENSO: safeExtenso(unidade.andar, 'inteiro'),
        
        TEM_AREA_PRIVATIVA_PRINCIPAL: safeParseNumber(unidade.areaPrivativaPrincipal) > 0,
        AREA_PRIVATIVA_PRINCIPAL: fmtDecimal(unidade.areaPrivativaPrincipal),
        AREA_PRIVATIVA_PRINCIPAL_EXTENSO: safeExtenso(unidade.areaPrivativaPrincipal, 'decimal_area'),
        
        TEM_AREA_OUTRAS_PRIVATIVAS: safeParseNumber(unidade.areaOutrasPrivativas) > 0,
        AREA_OUTRAS_PRIVATIVAS: fmtDecimal(unidade.areaOutrasPrivativas),
        AREA_OUTRAS_PRIVATIVAS_EXTENSO: safeExtenso(unidade.areaOutrasPrivativas, 'decimal_area'),
        
        TEM_AREA_PRIVATIVA_TOTAL: safeParseNumber(unidade.areaPrivativaTotal) > 0,
        AREA_PRIVATIVA_TOTAL: fmtDecimal(unidade.areaPrivativaTotal),
        AREA_PRIVATIVA_TOTAL_EXTENSO: safeExtenso(unidade.areaPrivativaTotal, 'decimal_area'),
        
        TEM_AREA_USO_COMUM: safeParseNumber(unidade.areaUsoComum) > 0,
        AREA_USO_COMUM: fmtDecimal(unidade.areaUsoComum),
        AREA_USO_COMUM_EXTENSO: safeExtenso(unidade.areaUsoComum, 'decimal_area'),
        
        TEM_COEFICIENTE_PROPORCIONALIDADE: safeParseNumber(unidade.coeficienteProporcionalidade) > 0,
        COEFICIENTE_PROPORCIONALIDADE: fmtDecimal(unidade.coeficienteProporcionalidade, 9),
        COEFICIENTE_PROPORCIONALIDADE_EXTENSO: safeExtenso(unidade.coeficienteProporcionalidade, 'decimal_9'),
        
        TEM_FRACAO_IDEAL: safeParseNumber(unidade.fracaoIdealTerreno) > 0,
        FRACAO_IDEAL: fmtDecimal(unidade.fracaoIdealTerreno, 9),
        FRACAO_IDEAL_EXTENSO: safeExtenso(unidade.fracaoIdealTerreno, 'decimal_9'),
        
        TEM_VAGAS: safeParseNumber(unidade.qtdeVagas) > 0,
        QTDE_VAGAS: unidade.qtdeVagas?.toString() || "0",
        QTDE_VAGAS_EXTENSO: safeExtenso(unidade.qtdeVagas, 'inteiro'),
        TIPO_VAGAS: toUpper(unidade.tipoVaga),
        
        TEM_DEPOSITO: safeParseNumber(unidade.areaDeposito) > 0,
        AREA_DEPOSITO: fmtDecimal(unidade.areaDeposito),
        AREA_DEPOSITO_EXTENSO: safeExtenso(unidade.areaDeposito, 'decimal_area'),
        TIPO_DEPOSITO: toUpper(unidade.tipoDeposito),

        // --- VENDEDORA (SPE/PROJETO + ENDERECO MATRIZ) ---
        RAZAO_SOCIAL_VENDEDORA: toUpper((projeto as { razaoSocial?: string | null }).razaoSocial || empresa.nome),
        ENDERECO_VENDEDORA: toTitleCase(buildAddress(empresa.logradouro, empresa.numero, empresa.complemento, empresa.bairro)),
        CEP_VENDEDORA: maskCep(empresa.cep),
        CIDADE_VENDEDORA: toTitleCase(empresa.cidade),
        UF_VENDEDORA: toUpper(empresa.estado),
        CNPJ_VENDEDORA: maskCpfCnpj(projeto.cnpj || empresa.cnpj),

        // --- ARRAYS DE PARTES ENVOLVIDAS (Opção Híbrida Super Poderosa) ---
        COMPRADORES: COMPRADORES,
        CO_COMPRADORES: CO_COMPRADORES,
        CONJUGES: CONJUGES,
        AVALISTAS: AVALISTAS,
        PROCURADORES: PROCURADORES,
        TESTEMUNHAS: TESTEMUNHAS,

        // --- COMPRADOR PRINCIPAL (Variáveis Globais para Fallback Rápido) ---
        IS_PF: compradorBase?.tipo === 'PF',
        IS_PJ: compradorBase?.tipo === 'PJ',
        NOME_COMPRADOR: toUpper(compradorBase?.nome),
        CPF_CNPJ_COMPRADOR: maskCpfCnpj(compradorBase?.documento),
        RG_COMPRADOR: pfBase?.rg || "-",
        INSCRICAO_ESTADUAL: pjBase?.inscricaoEstadual || "-",
        NACIONALIDADE_COMPRADOR: toLower(pfBase?.nacionalidade || "brasileiro(a)"),
        PROFISSAO_COMPRADOR: toLower(pfBase?.profissao),
        DATA_NASCIMENTO_COMPRADOR: fmtDate(pfBase?.dataNascimento),
        ESTADO_CIVIL_COMPRADOR: toLower(pfBase?.estadoCivil),
        REGIME_BENS_COMPRADOR: toLower(pfBase?.regimeBens),
        ENDERECO_COMPRADOR: toTitleCase(buildAddress(pfBase?.logradouro || pjBase?.logradouro, pfBase?.numero || pjBase?.numero, pfBase?.complemento || pjBase?.complemento, pfBase?.bairro || pjBase?.bairro)),
        CIDADE_COMPRADOR: toTitleCase(pfBase?.cidade || pjBase?.cidade),
        UF_COMPRADOR: toUpper(pfBase?.uf || pjBase?.uf),
        CEP_COMPRADOR: maskCep(pfBase?.cep || pjBase?.cep),
        TELEFONE_COMPRADOR: pfBase?.telefone_1 || pjBase?.telefone_1 || "-",
        EMAIL_COMPRADOR: toLower(pfBase?.email_1 || pjBase?.email_1),
        REPRESENTANTE_LEGAL: toUpper(pjBase?.representanteLegal),

        // --- VALORES GERAIS ---
        VALOR_TOTAL: fmtCurrency(valTotalProp),
        VALOR_TOTAL_EXTENSO: safeExtenso(valTotalProp, 'monetario'),
        PERCENTUAL_SOLO: fmtDecimal(percSolo, 9),
        PERCENTUAL_SOLO_EXTENSO: safeExtenso(percSolo, 'decimal_9'),
        PERCENTUAL_OBRA: fmtDecimal(percObra, 9),
        PERCENTUAL_OBRA_EXTENSO: safeExtenso(percObra, 'decimal_9'),

        // --- BLOCOS DE PAGAMENTO (Gerados Dinamicamente) ---
        ...blockEntrada,
        ...blockMensal,
        ...blockIntermediaria,
        ...blockAnual,
        ...blockChaves,
        ...blockFinanc,

        // --- INTERMEDIACAO (Principal + Lista) ---
        TEM_COMISSAO: comissaoList.length > 0,
        NOME_IMOBILIARIA: toUpper(comissaoBase?.ycEntidades?.nome || "VENDA DIRETA"),
        CNPJ_IMOBILIARIA: maskCpfCnpj(comissaoBase?.ycEntidades?.documento),
        VALOR_COMISSAO: fmtCurrency(proposta.valorComissaoTotal),
        VALOR_COMISSAO_EXTENSO: safeExtenso(proposta.valorComissaoTotal, 'monetario'),
        PERCENTUAL_COMISSAO: fmtDecimal(proposta.percComissaoTotal),
        PERCENTUAL_COMISSAO_EXTENSO: safeExtenso(proposta.percComissaoTotal, 'porcentagem'),
        COMISSOES: COMISSOES,

        // --- ATENDIMENTO (EMPRESA) ---
        TELEFONE_SAC: (empresa as { telefoneSac?: string | null }).telefoneSac || "-",
        SITE_CLIENTE: toLower((empresa as { siteCliente?: string | null }).siteCliente),
        SITE_VENDEDORA: toLower((empresa as { siteVendedora?: string | null }).siteVendedora),
        NOME_APP: toUpper((empresa as { nomeApp?: string | null }).nomeApp),

        // --- ASSINATURA ---
        CIDADE_ASSINATURA: toTitleCase(projeto.cidade || empresa.cidade),
        DATA_ASSINATURA: `${hoje.getDate()} de ${toTitleCase(hoje.toLocaleString('pt-BR', { month: 'long' }))} de ${hoje.getFullYear()}`
    }

    return dictionary
}