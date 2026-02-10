"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { StandardFlow } from "@/app/actions/commercial-negotiation"

type ProposalCondition = {
    tipo: string
    periodicidade: string
    qtdeParcelas: number
    valorParcela: number
    vencimento: string
}

interface Props {
    standardFlow: StandardFlow[]
    proposalConditions: ProposalCondition[]
    unitArea: number
}

// Taxa fixa (0.5% a.m.)
const MONTHLY_RATE = 0.005 

// --- HELPERS FINANCEIROS ---

const getPeriodMonths = (period: string | number): number => {
    if (typeof period === 'number') {
        if (period === 0) return 0
        if (period === 1) return 1
        if (period === 12) return 12
        return period 
    }
    const p = period.toUpperCase()
    if (p === "MENSAL") return 1
    if (p === "BIMESTRAL") return 2
    if (p === "TRIMESTRAL") return 3
    if (p === "SEMESTRAL" || p === "INTERMEDIARIAS") return 6
    if (p === "ANUAL") return 12
    return 0 
}

// [NOVO] Função Sanitizadora de Datas
// Converte qualquer input (Date, ISO string, YYYY-MM-DD) para um Objeto Date
// fixado ao MEIO-DIA (12:00) do dia correspondente.
// Isso elimina qualquer variação de Fuso Horário (UTC vs Local) ou Horas.
const getSafeDate = (input: Date | string): Date => {
    let dateStr = ""
    
    if (input instanceof Date) {
        // Pega YYYY-MM-DD do objeto Date original
        dateStr = input.toISOString().split('T')[0]
    } else if (typeof input === 'string') {
        // Se já for string, garante que pega só a parte da data
        dateStr = input.split('T')[0]
    }

    const [year, month, day] = dateStr.split('-').map(Number)
    
    // Cria data local ao meio-dia para evitar virada de dia por timezone
    return new Date(year, month - 1, day, 12, 0, 0)
}

const calculateFlowVPL = (
    items: { qtde: number, valor: number, inicio: Date | string, periodicidade: string | number }[]
) => {
    let totalNominal = 0
    let totalPresente = 0
    
    // Data Base = Hoje (Sanitizada ao Meio-Dia)
    const today = getSafeDate(new Date())

    items.forEach(item => {
        const periodMonths = getPeriodMonths(item.periodicidade)
        
        // Normalização Absoluta da Data de Início
        const startDate = getSafeDate(item.inicio)

        for (let i = 0; i < item.qtde; i++) {
            const valorNominal = Number(item.valor)
            totalNominal += valorNominal

            // Data de Vencimento desta parcela
            const dueDate = new Date(startDate)
            dueDate.setMonth(dueDate.getMonth() + (i * periodMonths))

            // Diferença em Milissegundos (Agora seguro pois ambos são 12:00:00)
            const diffTime = dueDate.getTime() - today.getTime()
            
            // Diferença em Dias Reais
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
            
            // Lógica Bancária (Dias / 30)
            const n = diffDays / 30 

            // Se n <= 0, é a vista/entrada. Se n > 0, desconta.
            // Usamos uma tolerância minúscula (0.001) para float errors
            const vp = n <= 0.001 ? valorNominal : valorNominal / Math.pow(1 + MONTHLY_RATE, n)
            
            totalPresente += vp
        }
    })

    return { totalNominal, totalPresente }
}

const fmtBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPercent = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'

export function ProposalAnalysis({ standardFlow, proposalConditions, unitArea }: Props) {
    
    const analysis = useMemo(() => {
        // --- 1. TABELA PADRÃO ---
        const stdInput = standardFlow.map(f => ({
            qtde: f.qtdeParcelas,
            valor: f.valorParcela,
            inicio: f.primeiroVencimento, 
            periodicidade: f.periodicidade
        }))

        const stdStats = calculateFlowVPL(stdInput)

        // --- 2. PROPOSTA CLIENTE ---
        const propInput = proposalConditions.map(c => ({
            qtde: Number(c.qtdeParcelas),
            valor: Number(c.valorParcela),
            inicio: c.vencimento,
            periodicidade: c.periodicidade
        }))
        
        const propStats = calculateFlowVPL(propInput)

        // 3. Diferenciais
        const diffNominal = propStats.totalNominal - stdStats.totalNominal
        const diffPresente = propStats.totalPresente - stdStats.totalPresente
        
        // Tolerância para zero absoluto visual
        const safeDiffPresente = Math.abs(diffPresente) < 0.01 ? 0 : diffPresente
        
        const varNominal = stdStats.totalNominal > 0 ? (diffNominal / stdStats.totalNominal) * 100 : 0
        const varPresente = stdStats.totalPresente > 0 ? (safeDiffPresente / stdStats.totalPresente) * 100 : 0

        return {
            std: stdStats,
            prop: propStats,
            diff: { nominal: diffNominal, present: safeDiffPresente },
            var: { nominal: varNominal, present: varPresente }
        }
    }, [standardFlow, proposalConditions])

    const area = unitArea > 0 ? unitArea : 1 

    return (
        <Card className="border-slate-200 bg-slate-50/50 shadow-sm mt-6">
            <CardHeader className="pb-2 border-b border-slate-200 bg-white rounded-t-lg">
                <CardTitle className="text-sm font-bold uppercase text-slate-600 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600"/>
                    Análise de Viabilidade Financeira
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-500 font-semibold text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 text-left border-r w-32">Indicador</th>
                                <th className="px-4 py-3 text-right w-36">m² Nominal</th>
                                <th className="px-4 py-3 text-right w-36 bg-blue-50/30 text-blue-700">m² Presente</th>
                                <th className="px-4 py-3 text-right w-40">VGV Nominal</th>
                                <th className="px-4 py-3 text-right w-40 bg-blue-50/30 text-blue-700">VGV Presente</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {/* TABELA PADRÃO */}
                            <tr className="bg-white">
                                <td className="px-4 py-3 font-medium text-slate-700 border-r">Tabela Padrão</td>
                                <td className="px-4 py-3 text-right text-slate-600">
                                    {fmtBRL(analysis.std.totalNominal / area)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-slate-700 bg-blue-50/10">
                                    {fmtBRL(analysis.std.totalPresente / area)}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600">
                                    {fmtBRL(analysis.std.totalNominal)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-slate-700 bg-blue-50/10">
                                    {fmtBRL(analysis.std.totalPresente)}
                                </td>
                            </tr>

                            {/* PROPOSTA */}
                            <tr className="bg-white">
                                <td className="px-4 py-3 font-bold text-blue-900 border-r flex items-center gap-2">
                                    <DollarSign className="w-3 h-3"/> Proposta
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-slate-800">
                                    {fmtBRL(analysis.prop.totalNominal / area)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-blue-900 bg-blue-50/30">
                                    {fmtBRL(analysis.prop.totalPresente / area)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-slate-800">
                                    {fmtBRL(analysis.prop.totalNominal)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-blue-900 bg-blue-50/30">
                                    {fmtBRL(analysis.prop.totalPresente)}
                                </td>
                            </tr>

                            {/* DIFERENÇA */}
                            <tr className="bg-slate-50 font-medium text-xs">
                                <td className="px-4 py-2 text-slate-500 border-r">Diferença (R$)</td>
                                <td className={cn("px-4 py-2 text-right", analysis.diff.nominal < -0.01 ? "text-red-600" : "text-emerald-600")}>
                                    {fmtBRL(analysis.diff.nominal / area)}
                                </td>
                                <td className={cn("px-4 py-2 text-right bg-slate-100", analysis.diff.present < -0.01 ? "text-red-600" : "text-emerald-600")}>
                                    {fmtBRL(analysis.diff.present / area)}
                                </td>
                                <td className={cn("px-4 py-2 text-right", analysis.diff.nominal < -0.01 ? "text-red-600" : "text-emerald-600")}>
                                    {fmtBRL(analysis.diff.nominal)}
                                </td>
                                <td className={cn("px-4 py-2 text-right bg-slate-100", analysis.diff.present < -0.01 ? "text-red-600" : "text-emerald-600")}>
                                    {fmtBRL(analysis.diff.present)}
                                </td>
                            </tr>

                            {/* VARIAÇÃO */}
                            <tr className="bg-slate-50 font-bold text-xs">
                                <td className="px-4 py-2 text-slate-500 border-r">Variação (%)</td>
                                <td className={cn("px-4 py-2 text-right", analysis.var.nominal < -0.01 ? "text-red-600" : "text-emerald-600")}>
                                    {fmtPercent(analysis.var.nominal)}
                                </td>
                                <td className={cn("px-4 py-2 text-right bg-slate-100", analysis.var.present < -0.01 ? "text-red-600" : "text-emerald-600")}>
                                    {fmtPercent(analysis.var.present)}
                                </td>
                                <td className={cn("px-4 py-2 text-right", analysis.var.nominal < -0.01 ? "text-red-600" : "text-emerald-600")}>
                                    {fmtPercent(analysis.var.nominal)}
                                </td>
                                <td className={cn("px-4 py-2 text-right bg-slate-100", analysis.var.present < -0.01 ? "text-red-600" : "text-emerald-600")}>
                                    {fmtPercent(analysis.var.present)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}