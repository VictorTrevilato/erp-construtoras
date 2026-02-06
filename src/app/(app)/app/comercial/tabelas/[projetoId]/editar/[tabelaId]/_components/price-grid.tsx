"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { savePriceItemsBatch } from "@/app/actions/commercial-prices"
import { toast } from "sonner"
import { Loader2, Calculator } from "lucide-react"

// --- TIPOS ---
type PriceRow = {
    unidadeId: string
    unidade: string
    blocoNome: string
    tipologia: string
    areaPrivativa: number
    valorMetroQuadrado: number
    fatorAndar: number
    fatorDiretoria: number
    fatorCorrecao: number
}

// --- HELPERS DE FORMATAÇÃO ---
const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDecimal = (val: number, digits = 4) => val.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

// --- COMPONENTE DE INPUT FINANCEIRO ---
interface GridInputProps {
    value: number
    onChange: (val: number) => void
    decimals: 2 | 4 | 8
    prefix?: string
    placeholder?: string
    className?: string
}

function GridInput({ value, onChange, decimals, prefix, placeholder, className }: GridInputProps) {
    const displayValue = value.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "")
        if (!rawValue) {
            onChange(0)
            return
        }
        const floatValue = parseInt(rawValue, 10) / Math.pow(10, decimals)
        onChange(floatValue)
    }

    return (
        <div className="relative w-full">
            {prefix && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-medium z-10">
                    {prefix}
                </span>
            )}
            <Input 
                className={`h-9 bg-white border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-right shadow-sm ${prefix ? 'pl-8' : ''} ${className}`}
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder}
                onFocus={(e) => e.target.select()} 
            />
        </div>
    )
}

// --- COMPONENTE PRINCIPAL ---

export function PriceGrid({ tabelaId, initialData }: { tabelaId: string, initialData: PriceRow[] }) {
    const [data, setData] = useState<PriceRow[]>(initialData.map(d => ({
        ...d,
        fatorAndar: d.fatorAndar === 0 ? 1 : d.fatorAndar,
        fatorDiretoria: d.fatorDiretoria === 0 ? 1 : d.fatorDiretoria,
        fatorCorrecao: d.fatorCorrecao === 0 ? 1 : d.fatorCorrecao
    })))
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isSaving, setIsSaving] = useState(false)

    // Inputs de Bulk Update
    const [bulkM2, setBulkM2] = useState<number>(0)
    const [bulkCorrecao, setBulkCorrecao] = useState<number>(0)
    const [bulkAndar, setBulkAndar] = useState<number>(0)
    const [bulkDiretoria, setBulkDiretoria] = useState<number>(0)

    // 1. Seleção
    const toggleSelectAll = () => {
        if (selectedIds.size === data.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(data.map(d => d.unidadeId)))
    }

    const toggleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    // 2. Aplicação em Massa
    const applyBulk = () => {
        if (selectedIds.size === 0) {
            toast.warning("Selecione ao menos uma unidade para aplicar.")
            return
        }

        if (bulkM2 === 0 && bulkAndar === 0 && bulkDiretoria === 0 && bulkCorrecao === 0) {
            toast.warning("Preencha ao menos um campo com valor maior que zero para aplicar.")
            return
        }

        setData(prev => prev.map(row => {
            if (!selectedIds.has(row.unidadeId)) return row
            
            return {
                ...row,
                valorMetroQuadrado: bulkM2 > 0 ? bulkM2 : row.valorMetroQuadrado,
                fatorAndar: bulkAndar > 0 ? bulkAndar : row.fatorAndar,
                fatorDiretoria: bulkDiretoria > 0 ? bulkDiretoria : row.fatorDiretoria,
                fatorCorrecao: bulkCorrecao > 0 ? bulkCorrecao : row.fatorCorrecao
            }
        }))
        toast.success(`Valores aplicados a ${selectedIds.size} unidades.`)
    }

    // 3. Edição Individual
    const updateRowValue = (id: string, field: keyof PriceRow, value: number) => {
        setData(prev => prev.map(row => 
            row.unidadeId === id ? { ...row, [field]: value } : row
        ))
    }

    // 4. Salvar
    const handleSave = async () => {
        setIsSaving(true)
        const payload = data.map(d => ({
            unidadeId: d.unidadeId,
            valorMetroQuadrado: d.valorMetroQuadrado,
            fatorAndar: d.fatorAndar,
            fatorDiretoria: d.fatorDiretoria,
            fatorCorrecao: d.fatorCorrecao
        }))

        const res = await savePriceItemsBatch(tabelaId, payload)
        if (res.success) toast.success(res.message)
        else toast.error(res.message)
        setIsSaving(false)
    }

    // 5. Cálculos de Totais
    const totals = useMemo(() => {
        const total = {
            count: data.length,
            area: 0,
            vlrM2: 0,
            fatCorrecao: 0,
            fatAndar: 0,
            fatDir: 0,
            base: 0,
            final: 0
        }
        
        data.forEach(d => {
            const base = d.areaPrivativa * d.valorMetroQuadrado
            const final = base * d.fatorCorrecao * d.fatorAndar * d.fatorDiretoria

            total.area += d.areaPrivativa
            total.vlrM2 += d.valorMetroQuadrado
            total.fatCorrecao += d.fatorCorrecao
            total.fatAndar += d.fatorAndar
            total.fatDir += d.fatorDiretoria
            total.base += base
            total.final += final
        })

        return total
    }, [data])

    return (
        <div className="space-y-4">
            {/* Barra de Ações (Sticky Top) */}
            <div className="sticky top-4 z-20">
                <Card className="bg-slate-50 border-slate-200 shadow-md">
                    <CardContent className="p-4 flex items-end gap-4">
                        <div className="grid gap-1.5 w-36">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Valor m² Base</label>
                            <GridInput 
                                value={bulkM2}
                                onChange={setBulkM2}
                                decimals={2}
                                prefix="R$"
                            />
                        </div>
                        <div className="grid gap-1.5 w-28">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Fator Correção</label>
                            <GridInput 
                                value={bulkCorrecao}
                                onChange={setBulkCorrecao}
                                decimals={8}
                            />
                        </div>
                        <div className="grid gap-1.5 w-28">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Fator Andar</label>
                            <GridInput 
                                value={bulkAndar}
                                onChange={setBulkAndar}
                                decimals={4}
                            />
                        </div>
                        <div className="grid gap-1.5 w-28">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Fator Diretoria</label>
                            <GridInput 
                                value={bulkDiretoria}
                                onChange={setBulkDiretoria}
                                decimals={4}
                            />
                        </div>
                        <Button onClick={applyBulk} variant="secondary" className="mb-0.5 border bg-white hover:bg-slate-100 min-w-[140px]">
                            <Calculator className="mr-2 h-4 w-4" /> Aplicar aos {selectedIds.size} selecionados
                        </Button>
                        <div className="flex-1 text-right">
                             <Button onClick={handleSave} disabled={isSaving} className="w-40 bg-green-600 hover:bg-green-700">
                                 {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar Tabela"}
                             </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela Full */}
            <div className="border rounded-md bg-white shadow-sm overflow-x-auto">
                <Table className="whitespace-nowrap">
                    <TableHeader className="bg-slate-100">
                        <TableRow>
                            <TableHead className="w-10 text-center">
                                <Checkbox 
                                    checked={selectedIds.size === data.length && data.length > 0} 
                                    onCheckedChange={toggleSelectAll} 
                                />
                            </TableHead>
                            {/* [CORREÇÃO] Largura reduzida e título simplificado */}
                            <TableHead className="w-20 font-bold text-gray-900 text-sm">Unidade</TableHead>
                            
                            <TableHead className="w-24 text-sm">Área Priv.</TableHead>
                            <TableHead className="w-32 text-right text-sm">Valor m²</TableHead>
                            
                            {/* [CORREÇÃO] Títulos completos e largura padronizada */}
                            <TableHead className="w-32 text-right text-sm">Fator Correção</TableHead>
                            <TableHead className="w-32 text-right text-sm">Fator Andar</TableHead>
                            <TableHead className="w-32 text-right text-sm">Fator Diretoria</TableHead>
                            
                            <TableHead className="w-36 text-right text-sm text-muted-foreground">Valor Base</TableHead>
                            
                            <TableHead className="text-right font-bold text-green-700 bg-green-50/30 text-sm w-36">Valor Final</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row) => {
                            const valBase = row.areaPrivativa * row.valorMetroQuadrado
                            const valFinal = valBase * row.fatorCorrecao * row.fatorAndar * row.fatorDiretoria
                            
                            return (
                                <TableRow key={row.unidadeId} className={selectedIds.has(row.unidadeId) ? "bg-blue-50/50" : ""}>
                                    <TableCell className="text-center">
                                        <Checkbox 
                                            checked={selectedIds.has(row.unidadeId)} 
                                            onCheckedChange={() => toggleSelectOne(row.unidadeId)} 
                                        />
                                    </TableCell>
                                    
                                    {/* [CORREÇÃO] Inversão de Bloco/Unidade para padrão visual */}
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">{row.blocoNome}</span>
                                            <span className="font-bold text-sm text-gray-900">{row.unidade}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-sm">{fmtDecimal(row.areaPrivativa)}</TableCell>
                                    
                                    <TableCell className="p-2">
                                        <GridInput 
                                            value={row.valorMetroQuadrado}
                                            onChange={(v) => updateRowValue(row.unidadeId, 'valorMetroQuadrado', v)}
                                            decimals={2}
                                            prefix="R$"
                                        />
                                    </TableCell>
                                    
                                    <TableCell className="p-2">
                                        <GridInput 
                                            value={row.fatorCorrecao}
                                            onChange={(v) => updateRowValue(row.unidadeId, 'fatorCorrecao', v)}
                                            decimals={8}
                                        />
                                    </TableCell>

                                    <TableCell className="p-2">
                                        <GridInput 
                                            value={row.fatorAndar}
                                            onChange={(v) => updateRowValue(row.unidadeId, 'fatorAndar', v)}
                                            decimals={4}
                                        />
                                    </TableCell>

                                    <TableCell className="p-2">
                                        <GridInput 
                                            value={row.fatorDiretoria}
                                            onChange={(v) => updateRowValue(row.unidadeId, 'fatorDiretoria', v)}
                                            decimals={4}
                                        />
                                    </TableCell>

                                    {/* Valor Base */}
                                    <TableCell className="text-right text-sm text-muted-foreground bg-gray-50/30">
                                        {fmtCurrency(valBase)}
                                    </TableCell>

                                    {/* Final */}
                                    <TableCell className="text-right font-bold text-green-700 bg-green-50/30 text-sm">
                                        {fmtCurrency(valFinal)}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                    <TableFooter className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <TableRow>
                            <TableCell colSpan={2} className="text-sm">TOT. / MÉD.</TableCell>
                            <TableCell className="text-sm">{fmtDecimal(totals.area)}</TableCell>
                            <TableCell className="text-center text-sm">{fmtCurrency(totals.vlrM2 / totals.count)}</TableCell>
                            <TableCell className="text-center text-sm">{fmtDecimal(totals.fatCorrecao / totals.count)}</TableCell>
                            <TableCell className="text-center text-sm">{fmtDecimal(totals.fatAndar / totals.count)}</TableCell>
                            <TableCell className="text-center text-sm">{fmtDecimal(totals.fatDir / totals.count)}</TableCell>
                            <TableCell className="text-right text-sm">{fmtCurrency(totals.base)}</TableCell>
                            <TableCell className="text-right text-green-800 text-sm">{fmtCurrency(totals.final)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            
            <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Total de unidades: {data.length}</span>
                <span>Selecionadas: {selectedIds.size}</span>
            </div>
        </div>
    )
}