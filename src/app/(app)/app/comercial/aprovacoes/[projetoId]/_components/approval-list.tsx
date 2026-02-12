"use client"

import { useApproval } from "./approval-context"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp, TrendingDown, Building2, User } from "lucide-react"

// --- HELPERS FINANCEIROS ---
const MONTHLY_RATE = 0.005 

const getSafeDate = (input: Date | string): Date => {
    let dateStr = ""
    if (input instanceof Date) dateStr = input.toISOString().split('T')[0]
    else if (typeof input === 'string') dateStr = input.split('T')[0]
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day, 12, 0, 0)
}

const getPeriodMonths = (period: string | number): number => {
    if (typeof period === 'number') {
        if (period === 0) return 0; if (period === 1) return 1; if (period === 12) return 12; return period 
    }
    const p = period.toUpperCase()
    if (p === "MENSAL") return 1
    if (p === "BIMESTRAL") return 2
    if (p === "TRIMESTRAL") return 3
    if (p === "SEMESTRAL" || p === "INTERMEDIARIAS") return 6
    if (p === "ANUAL") return 12
    return 0 
}

const calculateQuickVPL = (
    items: { qtde: number, valor: number, inicio: Date | string, periodicidade: string | number }[]
) => {
    let totalNominal = 0
    let totalPresente = 0
    const today = getSafeDate(new Date())

    items.forEach(item => {
        const periodMonths = getPeriodMonths(item.periodicidade)
        const startDate = getSafeDate(item.inicio)

        for (let i = 0; i < item.qtde; i++) {
            const valorNominal = Number(item.valor)
            totalNominal += valorNominal
            
            const dueDate = new Date(startDate)
            dueDate.setMonth(dueDate.getMonth() + (i * periodMonths))
            
            const diffTime = dueDate.getTime() - today.getTime()
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
            const n = diffDays / 30 
            
            const vp = n <= 0.001 ? valorNominal : valorNominal / Math.pow(1 + MONTHLY_RATE, n)
            totalPresente += vp
        }
    })
    return { totalNominal, totalPresente }
}

const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPercent = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'

// --- COMPONENTE LISTA ---
export function ApprovalList() {
  const { proposals, selectedId, setSelectedId } = useApproval()

  if (proposals.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-white rounded-lg border border-dashed">
        Nenhuma proposta pendente para este projeto.
      </div>
    )
  }

  return (
    // [CORREÇÃO SCROLL] 
    // - flex-1: Ocupa o espaço restante dentro do pai (que tem overflow-hidden)
    // - overflow-y-auto: Gera o scroll aqui dentro, não na página
    // - Removido h-[calc] fixo
    <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 pb-4">
      {proposals.map((prop) => {
        const isSelected = selectedId === prop.id
        
        // 1. VPL Proposta
        const propInput = prop.condicoes.map(c => ({
            qtde: c.qtdeParcelas,
            valor: c.valorParcela,
            inicio: c.vencimento,
            periodicidade: c.periodicidade
        }))
        const propStats = calculateQuickVPL(propInput)

        // 2. VPL Tabela Original
        const stdInput = prop.fluxoTabela.map(f => {
             const valorTotal = prop.valorTabelaOriginal * (f.percentual / 100)
             const valorParcela = valorTotal / f.qtdeParcelas
             return {
                qtde: f.qtdeParcelas,
                valor: valorParcela,
                inicio: f.primeiroVencimento,
                periodicidade: f.periodicidade
             }
        })
        const stdStats = calculateQuickVPL(stdInput)

        // 3. Variações
        const diffNominal = propStats.totalNominal - stdStats.totalNominal
        const diffPresente = propStats.totalPresente - stdStats.totalPresente
        
        const varNominal = stdStats.totalNominal > 0 
            ? (diffNominal / stdStats.totalNominal) * 100 
            : 0
            
        const varPresente = stdStats.totalPresente > 0 
            ? (diffPresente / stdStats.totalPresente) * 100
            : 0

        // Helpers de Estilo
        const getBadgeStyle = (val: number, outline: boolean) => {
            const isPos = val >= -0.001 
            const baseClass = "min-w-[85px] justify-between h-6 px-2 text-[11px] font-bold transition-none"
            
            if (outline) {
                const colorClass = isPos ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"
                return cn(baseClass, "border", colorClass)
            } else {
                const colorClass = isPos 
                    ? "bg-emerald-600 text-white border-transparent hover:bg-emerald-600" 
                    : "bg-red-600 text-white border-transparent hover:bg-red-600"
                return cn(baseClass, colorClass)
            }
        }

        return (
            <button
                key={prop.id}
                onClick={() => setSelectedId(prop.id)}
                className={cn(
                    "flex flex-col gap-2 p-3 rounded-xl border text-left transition-all relative overflow-hidden shrink-0 group",
                    isSelected 
                    ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-300 shadow-sm" 
                    : "bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm"
                )}
            >
                <div className={cn("absolute left-0 top-0 bottom-0 w-1 transition-colors", isSelected ? "bg-blue-600" : "bg-transparent")} />

                <div className="w-full flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("font-bold border-slate-300 text-slate-700 px-2 py-0.5 rounded bg-white", isSelected && "border-blue-200")}>
                            {prop.unidade.nome}
                        </Badge>
                        <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {prop.unidade.bloco}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-slate-100/80 px-2 py-0.5 rounded-full">
                        <Calendar className="w-3 h-3" />
                        {new Date(prop.dataProposta).toLocaleString('pt-BR', { 
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                        })}
                    </div>
                </div>

                <div className="w-full flex items-center gap-2 px-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 truncate max-w-[240px]">
                        {prop.lead.nome}
                    </span>
                </div>

                <div className="h-px w-full bg-slate-100 my-0.5" />

                <div className="w-full flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Tabela</span>
                        <span className="text-xs text-slate-500 font-medium line-through decoration-slate-300">
                            {fmtCurrency(prop.valorTabelaOriginal)}
                        </span>
                    </div>
                    <Badge variant="outline" className={getBadgeStyle(varNominal, true)}>
                        <span className="opacity-70 mr-1 text-[9px] uppercase tracking-wide">NOM</span>
                        <span className="flex items-center">
                            {varNominal > 0 ? "+" : ""}{fmtPercent(varNominal)}
                        </span>
                    </Badge>
                </div>

                <div className="w-full flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-blue-600 uppercase font-bold">Proposta</span>
                        <span className="text-sm text-blue-700 font-bold">
                            {fmtCurrency(prop.valorProposta)}
                        </span>
                    </div>
                    <Badge className={getBadgeStyle(varPresente, false)}>
                        <div className="flex items-center opacity-90 mr-1 text-[9px] uppercase tracking-wide gap-0.5">
                            <span>VPL</span>
                            {varPresente >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        </div>
                        <span>
                            {varPresente > 0 ? "+" : ""}{fmtPercent(varPresente)}
                        </span>
                    </Badge>
                </div>
            </button>
        )
      })}
    </div>
  )
}