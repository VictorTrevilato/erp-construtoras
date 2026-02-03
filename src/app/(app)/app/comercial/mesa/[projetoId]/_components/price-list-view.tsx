'use client'

import { NegotiationUnit } from "@/app/actions/commercial-negotiation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useState } from "react"

// Tipos auxiliares
type Flow = {
    tipo: string
    percentual: number
    qtdeParcelas: number
    periodicidade: number
}

// Helpers
const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDecimal = (val: number, digits = 2) => val.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPONIVEL': return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200'
      case 'VENDIDO': return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200'
      case 'RESERVADO': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200'
      case 'BLOQUEADO': return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
}

export function PriceListView({ units, flows }: { units: NegotiationUnit[], flows: Flow[] }) {
    const [filter, setFilter] = useState("")

    // Filtra e Ordena (Bloco > Unidade)
    const filteredAndSorted = units
        .filter(u => u.unidade.toLowerCase().includes(filter.toLowerCase()) || u.blocoNome.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => {
            const blockDiff = a.blocoNome.localeCompare(b.blocoNome, undefined, { numeric: true, sensitivity: 'base' })
            if (blockDiff !== 0) return blockDiff
            return a.unidade.localeCompare(b.unidade, undefined, { numeric: true, sensitivity: 'base' })
        })

    return (
        <div className="space-y-4">
            {/* Barra de Busca */}
            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Filtrar por unidade ou bloco..." 
                    className="pl-8 bg-white"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
            </div>

            {/* Tabela Rica */}
            <div className="overflow-x-auto pb-4">
                <Table className="whitespace-nowrap border-separate border-spacing-0">
                    <TableHeader className="sticky top-0 z-20">
                        <TableRow className="hover:bg-transparent">
                            {/* === BLOCO 1: DADOS DO IMÓVEL === */}
                            
                            {/* Unidade & Bloco (Sticky Left) */}
                            <TableHead className="w-32 font-bold text-gray-900 sticky left-0 z-30 bg-white border-y border-l rounded-l-lg shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] h-12 text-sm pl-4">
                                Unidade
                            </TableHead>
                            
                            <TableHead className="w-28 text-center text-gray-700 bg-white border-y h-12">Status</TableHead>
                            <TableHead className="w-24 text-right text-sm text-gray-700 bg-white border-y h-12">Área Priv.</TableHead>
                            <TableHead className="w-24 text-right text-sm text-gray-700 bg-white border-y h-12">Área Com.</TableHead>
                            
                            {/* Valor Tabela (Destaque) */}
                            <TableHead className="text-right text-sm w-36 text-gray-900 font-semibold bg-white border-y border-r rounded-r-lg h-12">
                                Valor Tabela
                            </TableHead>
                            
                            {/* === DIVISÓRIA (RIO) === */}
                            <TableHead className="w-4 min-w-[1rem] bg-transparent border-none"></TableHead>
                            
                            {/* === BLOCO 2: CONDIÇÕES === */}
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
                        {filteredAndSorted.map((unit) => {
                            const valFinal = unit.valorTabela

                            return (
                                <TableRow key={unit.id} className="group hover:bg-transparent">
                                    {/* === BLOCO 1 === */}
                                    
                                    {/* Unidade & Bloco (Sticky) */}
                                    <TableCell className="border-y border-l sticky left-0 z-10 bg-white group-hover:bg-slate-50 py-2 rounded-l-md shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">{unit.blocoNome}</span>
                                            <span className="font-bold text-sm text-gray-900">{unit.unidade}</span>
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell className="border-y bg-white group-hover:bg-slate-50 text-center">
                                        <Badge variant="outline" className={getStatusColor(unit.status)}>
                                            {unit.status}
                                        </Badge>
                                    </TableCell>
                                    
                                    <TableCell className="text-right text-sm text-gray-600 border-y bg-white group-hover:bg-slate-50">
                                        {fmtDecimal(unit.areaPrivativa)}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-gray-600 border-y bg-white group-hover:bg-slate-50">
                                        {fmtDecimal(unit.areaUsoComum)}
                                    </TableCell>
                                    
                                    <TableCell className="text-right text-sm text-gray-900 font-medium border-y border-r rounded-r-md bg-white group-hover:bg-slate-50">
                                        {valFinal > 0 ? fmtCurrency(valFinal) : <span className="text-muted-foreground text-xs">Sob Consulta</span>}
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
                                                {valFinal > 0 ? (
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
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
            
            <div className="text-center text-xs text-muted-foreground pt-2">
                * Valores simulados baseados na tabela vigente.
            </div>
        </div>
    )
}