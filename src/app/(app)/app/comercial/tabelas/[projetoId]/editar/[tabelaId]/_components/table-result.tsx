"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

// Tipos vindos das Server Actions
type PriceRow = {
    unidadeId: string
    unidade: string
    blocoNome: string
    areaPrivativa: number
    valorMetroQuadrado: number
    fatorAndar: number
    fatorDiretoria: number
    fatorCorrecao: number
}

type Flow = {
    tipo: string
    percentual: number
    qtdeParcelas: number
    periodicidade: number
}

// Helpers de formatação
const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDecimal = (val: number, digits = 2) => val.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export function TableResult({ priceData, flows }: { priceData: PriceRow[], flows: Flow[] }) {
    
    if (!flows || flows.length === 0) {
        return (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Falta Configuração</AlertTitle>
                <AlertDescription>
                    Cadastre as condições de pagamento na aba &quot;Fluxos de Pagamento&quot; para visualizar o espelho de vendas.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-2">
            <div className="overflow-x-auto pb-4">
                <Table className="whitespace-nowrap border-separate border-spacing-0">
                    <TableHeader className="sticky top-0 z-20">
                        <TableRow className="hover:bg-transparent">
                            {/* === BLOCO 1: PRODUTO & PREÇO === */}
                            
                            {/* Unidade + Bloco Unificado (Sticky Left) */}
                            <TableHead className="w-24 font-bold text-gray-900 sticky left-0 z-30 bg-white border-y border-l rounded-l-lg shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] h-12 text-sm">
                                Unidade
                            </TableHead>
                            
                            <TableHead className="w-24 text-right text-sm text-gray-700 bg-white border-y h-12">Área</TableHead>
                            <TableHead className="text-right text-sm w-28 text-gray-700 bg-white border-y h-12">Valor m²</TableHead>
                            
                            {/* Colunas de Fatores */}
                            <TableHead className="text-right text-sm w-24 text-gray-700 bg-white border-y h-12">% Corr.</TableHead>
                            <TableHead className="text-right text-sm w-24 text-gray-700 bg-white border-y h-12">% Andar</TableHead>
                            <TableHead className="text-right text-sm w-24 text-gray-700 bg-white border-y h-12">% Dir</TableHead>
                            
                            {/* Valor Final */}
                            <TableHead className="text-right text-sm w-32 text-gray-900 font-semibold bg-white border-y border-r rounded-r-lg h-12">
                                Valor Final
                            </TableHead>
                            
                            {/* === DIVISÓRIA (RIO) === */}
                            <TableHead className="w-4 min-w-[1rem] bg-transparent border-none"></TableHead>
                            
                            {/* === BLOCO 2: CONDIÇÕES DE PAGAMENTO === */}
                            
                            {flows.map((flow, idx) => {
                                const isFirst = idx === 0
                                const isLast = idx === flows.length - 1
                                const roundedClass = isFirst ? "rounded-l-lg border-l" : isLast ? "rounded-r-lg border-r" : ""
                                
                                return (
                                    <TableHead 
                                        key={idx} 
                                        className={`text-right min-w-[100px] bg-white border-y border-r-0 last:border-r h-12 ${roundedClass}`}
                                    >
                                        <div className="flex flex-col items-end py-1 px-2">
                                            <span className="font-semibold text-xs text-gray-900 uppercase">{flow.tipo}</span>
                                            <span className="text-[10px] text-muted-foreground font-normal">
                                                {flow.qtdeParcelas}x de {Number(flow.percentual).toFixed(2)}%
                                            </span>
                                        </div>
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {priceData.map((row) => {
                            // Cálculos Matemáticos
                            const valBase = row.areaPrivativa * (row.valorMetroQuadrado || 0)
                            const valFinal = valBase * (row.fatorCorrecao === 0 ? 1 : row.fatorCorrecao) * (row.fatorAndar === 0 ? 1 : row.fatorAndar) * (row.fatorDiretoria === 0 ? 1 : row.fatorDiretoria)

                            return (
                                <TableRow key={row.unidadeId} className="group hover:bg-transparent">
                                    {/* === BLOCO 1 === */}
                                    
                                    {/* Célula Unificada Sticky (Bloco em cima, Unidade em baixo) */}
                                    <TableCell className="border-y border-l sticky left-0 z-10 bg-white group-hover:bg-slate-50 py-3 rounded-l-md shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">{row.blocoNome}</span>
                                            <span className="font-bold text-sm text-gray-900">{row.unidade}</span>
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell className="text-right text-sm text-gray-600 border-y bg-white group-hover:bg-slate-50">
                                        {fmtDecimal(row.areaPrivativa)}
                                    </TableCell>
                                    
                                    {/* Dados de Cálculo */}
                                    <TableCell className="text-right text-sm text-gray-600 border-y bg-white group-hover:bg-slate-50">
                                        {fmtDecimal(row.valorMetroQuadrado)}
                                    </TableCell>
                                    
                                    {/* Correção (8 casas) */}
                                    <TableCell className="text-right text-sm text-gray-600 border-y bg-white group-hover:bg-slate-50">
                                        {fmtDecimal(row.fatorCorrecao, 8)}
                                    </TableCell>

                                    <TableCell className="text-right text-sm text-gray-600 border-y bg-white group-hover:bg-slate-50">
                                        {fmtDecimal(row.fatorAndar, 4)}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-gray-600 border-y bg-white group-hover:bg-slate-50">
                                        {fmtDecimal(row.fatorDiretoria, 4)}
                                    </TableCell>
                                    
                                    <TableCell className="text-right text-sm text-gray-900 font-medium border-y border-r rounded-r-md bg-white group-hover:bg-slate-50">
                                        {fmtCurrency(valFinal)}
                                    </TableCell>

                                    {/* === DIVISÓRIA (RIO) === */}
                                    <TableCell className="bg-transparent border-none"></TableCell>

                                    {/* === BLOCO 2 === */}
                                    {flows.map((flow, idx) => {
                                        const valorTotalCondicao = valFinal * (Number(flow.percentual) / 100)
                                        const valorParcela = valorTotalCondicao / flow.qtdeParcelas
                                        
                                        const isFirst = idx === 0
                                        const isLast = idx === flows.length - 1
                                        const roundedClass = isFirst ? "rounded-l-md border-l" : isLast ? "rounded-r-md border-r" : ""

                                        return (
                                            <TableCell 
                                                key={idx} 
                                                className={`text-right text-sm border-y border-r-0 last:border-r bg-white group-hover:bg-slate-50 px-4 ${roundedClass}`}
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-normal text-gray-700">
                                                        {fmtCurrency(valorParcela)}
                                                    </span>
                                                    {flow.qtdeParcelas > 1 && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Total: {fmtCurrency(valorTotalCondicao)}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}