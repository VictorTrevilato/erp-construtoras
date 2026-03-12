'use client'

import { NegotiationUnit } from "@/app/actions/commercial-negotiation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useState, useMemo } from "react"
import { ExportPdfButton } from "./export-pdf-button"

// Tipos auxiliares
type Flow = {
    tipo: string
    percentual: number
    qtdeParcelas: number
    periodicidade: number
    primeiroVencimento: Date | string
}

type PriceListViewProps = {
    units: NegotiationUnit[]
    flows: Flow[]
    projetoNome?: string
    tabelaCodigo?: string | null
    logoUrl?: string | null
}

type SortConfig = {
    key: keyof NegotiationUnit | ''
    direction: 'asc' | 'desc' | null
}

// Helpers
const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDecimal = (val: number, digits = 2) => val.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const fmtDate = (d: string | Date) => {
    if (!d) return '-'
    const date = new Date(d)
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
    return date.toLocaleDateString('pt-BR')
}

const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPONIVEL': return 'bg-success/20 text-success hover:bg-success/30 border-success/30'
      case 'VENDIDO': return 'bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30'
      case 'RESERVADO': return 'bg-warning/20 text-warning hover:bg-warning/30 border-warning/30'
      case 'EM_ANALISE': return 'bg-info/20 text-info hover:bg-info/30 border-info/30'
      default: return 'bg-muted text-muted-foreground border-border'
    }
}

const formatStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        'DISPONIVEL': 'DISPONÍVEL',
        'RESERVADO': 'RESERVADO',
        'VENDIDO': 'VENDIDO',
        'EM_ANALISE': 'EM ANÁLISE'
    }
    return map[status] || status
}

export function PriceListView({ units, flows, projetoNome, tabelaCodigo, logoUrl }: PriceListViewProps) {
    // Estados de Filtro
    const [filterText, setFilterText] = useState("")
    const [filterBlock, setFilterBlock] = useState("ALL")
    const [filterStatus, setFilterStatus] = useState("ALL")
    
    // Estado de Ordenação
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })

    // Extrair lista única de blocos do projeto para o select
    const uniqueBlocks = useMemo(() => {
        return Array.from(new Set(units.map(u => u.blocoNome))).sort()
    }, [units])

    // Lógica do Tri-state Sort
    const handleSort = (columnKey: keyof NegotiationUnit) => {
        if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
            setSortConfig({ key: columnKey, direction: 'desc' })
        } else if (sortConfig.key === columnKey && sortConfig.direction === 'desc') {
            setSortConfig({ key: '', direction: null }) // Limpa a ordenação
        } else {
            setSortConfig({ key: columnKey, direction: 'asc' })
        }
    }

    // Componente renderizador do ícone de ordenação
    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig.key !== columnKey || !sortConfig.direction) {
            return <ArrowUpDown className="ml-1 w-3 h-3 inline-block opacity-30 group-hover:opacity-100 transition-opacity" />
        }
        if (sortConfig.direction === 'asc') return <ArrowUp className="ml-1 w-3 h-3 inline-block text-primary" />
        return <ArrowDown className="ml-1 w-3 h-3 inline-block text-primary" />
    }

    // Pipeline de Filtragem e Ordenação
    const filteredAndSorted = useMemo(() => {
        const result = [...units].filter(u => {
            const matchesText = u.unidade.toLowerCase().includes(filterText.toLowerCase()) || u.blocoNome.toLowerCase().includes(filterText.toLowerCase())
            const matchesBlock = filterBlock === "ALL" || u.blocoNome === filterBlock
            const matchesStatus = filterStatus === "ALL" || u.statusComercial === filterStatus
            return matchesText && matchesBlock && matchesStatus
        })

        result.sort((a, b) => {
            // Se houver ordenação ativa pelo usuário
            if (sortConfig.direction && sortConfig.key) {
                const { key, direction } = sortConfig
                
                // Tratamento especial para ordenação por unidade (amarrada com o bloco)
                if (key === 'unidade') {
                    if (a.blocoNome !== b.blocoNome) {
                        return direction === 'asc' 
                            ? a.blocoNome.localeCompare(b.blocoNome, undefined, { numeric: true }) 
                            : b.blocoNome.localeCompare(a.blocoNome, undefined, { numeric: true })
                    }
                    return direction === 'asc'
                        ? a.unidade.localeCompare(b.unidade, undefined, { numeric: true })
                        : b.unidade.localeCompare(a.unidade, undefined, { numeric: true })
                }
                
                const valA = a[key]
                const valB = b[key]

                if (typeof valA === 'string' && typeof valB === 'string') {
                    return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
                }
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return direction === 'asc' ? valA - valB : valB - valA
                }
            }
            
            // ORDENAÇÃO PADRÃO (Se direction = null)
            const blockDiff = a.blocoNome.localeCompare(b.blocoNome, undefined, { numeric: true, sensitivity: 'base' })
            if (blockDiff !== 0) return blockDiff
            return a.unidade.localeCompare(b.unidade, undefined, { numeric: true, sensitivity: 'base' })
        })

        return result
    }, [units, filterText, filterBlock, filterStatus, sortConfig])

    return (
        <div className="space-y-4">
            
            {/* Barra de Busca e Filtros */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-[250px] shrink-0">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar unidade..." 
                            className="pl-8 bg-background"
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                        />
                    </div>
                    <Select value={filterBlock} onValueChange={setFilterBlock}>
                        <SelectTrigger className="w-full sm:w-[160px] bg-background">
                            <SelectValue placeholder="Bloco" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos os Blocos</SelectItem>
                            {uniqueBlocks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full sm:w-[160px] bg-background">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos Status</SelectItem>
                            <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                            <SelectItem value="RESERVADO">Reservado</SelectItem>
                            <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                            <SelectItem value="VENDIDO">Vendido</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="shrink-0 w-full sm:w-auto">
                    <ExportPdfButton 
                        units={filteredAndSorted} 
                        flows={flows} 
                        projetoNome={projetoNome}
                        tabelaCodigo={tabelaCodigo}
                        logoUrl={logoUrl}
                    />
                </div>
            </div>

            {/* Tabela Rica */}
            <div className="overflow-x-auto pb-4">
                <Table className="whitespace-nowrap border-separate border-spacing-0">
                    <TableHeader className="sticky top-0 z-20">
                        <TableRow className="hover:bg-transparent">
                            {/* === BLOCO 1: DADOS DO IMÓVEL === */}
                            <TableHead 
                                className="w-32 font-bold text-foreground sticky left-0 z-30 bg-background border-y border-l rounded-l-lg shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] h-12 text-xs uppercase pl-4 cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                                onClick={() => handleSort('unidade')}
                            >
                                <div className="flex items-center gap-1">
                                    UNIDADE <SortIcon columnKey="unidade" />
                                </div>
                            </TableHead>
                            
                            <TableHead 
                                className="w-28 text-center font-bold text-xs uppercase text-muted-foreground bg-background border-y h-12 cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                                onClick={() => handleSort('statusComercial')}
                            >
                                <div className="flex items-center justify-center gap-1">
                                    STATUS <SortIcon columnKey="statusComercial" />
                                </div>
                            </TableHead>

                            <TableHead 
                                className="w-24 text-right font-bold text-xs uppercase text-muted-foreground bg-background border-y h-12 cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                                onClick={() => handleSort('areaPrivativa')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    <SortIcon columnKey="areaPrivativa" /> ÁREA PRIV.
                                </div>
                            </TableHead>

                            <TableHead 
                                className="w-24 text-right font-bold text-xs uppercase text-muted-foreground bg-background border-y h-12 cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                                onClick={() => handleSort('areaUsoComum')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    <SortIcon columnKey="areaUsoComum" /> ÁREA COM.
                                </div>
                            </TableHead>
                            
                            <TableHead 
                                className="text-right font-bold text-xs uppercase w-36 text-foreground bg-background border-y border-r rounded-r-lg h-12 cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                                onClick={() => handleSort('valorTabela')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    <SortIcon columnKey="valorTabela" /> VALOR TABELA
                                </div>
                            </TableHead>
                            
                            {/* === DIVISÓRIA === */}
                            <TableHead className="w-4 min-w-[1rem] bg-transparent border-none"></TableHead>
                            
                            {/* === BLOCO 2: CONDIÇÕES === */}
                            {flows.map((flow, idx) => {
                                const isFirst = idx === 0
                                const isLast = idx === flows.length - 1
                                const roundedClass = isFirst ? "rounded-l-lg border-l" : isLast ? "rounded-r-lg border-r" : ""
                                
                                return (
                                    <TableHead 
                                        key={idx} 
                                        className={`text-right min-w-[100px] bg-background border-y border-r-0 last:border-r h-14 py-2 ${roundedClass}`}
                                    >
                                        <div className="flex flex-col items-end gap-0.5 px-2">
                                            <span className="font-bold text-xs text-foreground uppercase">{flow.tipo}</span>
                                            <span className="text-[10px] text-muted-foreground font-medium leading-none">
                                                {flow.qtdeParcelas}x de {Number(flow.percentual).toFixed(2)}%
                                            </span>
                                            <span className="text-[10px] text-primary/70 font-medium leading-none">
                                                em {fmtDate(flow.primeiroVencimento)}
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

                            // --- CÁLCULO DE CORREÇÃO ---
                            let sumReal = 0
                            const correctedFlows = flows.map(f => {
                                const totalCondicao = valFinal * (Number(f.percentual) / 100)
                                const valorParcela = Number((totalCondicao / f.qtdeParcelas).toFixed(2))
                                const valorTotalReal = valorParcela * f.qtdeParcelas
                                sumReal += valorTotalReal
                                return { ...f, valorParcela, valorTotalReal }
                            })

                            const diff = Number((valFinal - sumReal).toFixed(2))
                            if (Math.abs(diff) > 0 && correctedFlows.length > 0) {
                                let target = correctedFlows.find(f => f.tipo.toUpperCase() === 'ENTRADA' && f.qtdeParcelas === 1)
                                if (!target) target = correctedFlows.find(f => f.qtdeParcelas === 1)
                                if (!target) target = correctedFlows[0]

                                if (target.qtdeParcelas === 1) {
                                    target.valorParcela = Number((target.valorParcela + diff).toFixed(2))
                                    target.valorTotalReal = target.valorParcela
                                }
                            }

                            return (
                                <TableRow key={unit.id} className="group hover:bg-transparent">
                                    <TableCell className="border-y border-l sticky left-0 z-10 bg-background group-hover:bg-muted/50 py-2 rounded-l-md shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">{unit.blocoNome}</span>
                                            <span className="font-bold text-sm text-foreground">{unit.unidade}</span>
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell className="border-y bg-background group-hover:bg-muted/50 text-center">
                                        <Badge variant="outline" className={getStatusColor(unit.statusComercial)}>
                                            {formatStatusLabel(unit.statusComercial)}
                                        </Badge>
                                    </TableCell>
                                    
                                    <TableCell className="text-right text-sm text-muted-foreground border-y bg-background group-hover:bg-muted/50">
                                        {fmtDecimal(unit.areaPrivativa)}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground border-y bg-background group-hover:bg-muted/50">
                                        {fmtDecimal(unit.areaUsoComum)}
                                    </TableCell>
                                    
                                    <TableCell className="text-right text-sm text-foreground font-medium border-y border-r rounded-r-md bg-background group-hover:bg-muted/50">
                                        {valFinal > 0 ? fmtCurrency(valFinal) : <span className="text-muted-foreground text-xs">Sob Consulta</span>}
                                    </TableCell>

                                    <TableCell className="bg-transparent border-none"></TableCell>

                                    {correctedFlows.map((flow, idx) => {
                                        const isFirst = idx === 0
                                        const isLast = idx === correctedFlows.length - 1
                                        const roundedClass = isFirst ? "rounded-l-md border-l" : isLast ? "rounded-r-md border-r" : ""

                                        return (
                                            <TableCell 
                                                key={idx} 
                                                className={`text-right text-sm border-y border-r-0 last:border-r bg-background group-hover:bg-muted/50 px-4 ${roundedClass}`}
                                            >
                                                {valFinal > 0 ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-normal text-muted-foreground">
                                                            {fmtCurrency(flow.valorParcela)}
                                                        </span>
                                                        {flow.qtdeParcelas > 1 && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                Total: {fmtCurrency(flow.valorTotalReal)}
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
                * Valores simulados baseados na tabela vigente com ajuste automático de arredondamentos.
            </div>
        </div>
    )
}