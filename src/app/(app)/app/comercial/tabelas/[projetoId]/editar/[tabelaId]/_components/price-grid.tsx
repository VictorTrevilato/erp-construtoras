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
}

// --- HELPERS DE FORMATAÇÃO (VISUALIZAÇÃO APENAS) ---
const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDecimal = (val: number, digits = 4) => val.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

// --- COMPONENTE DE INPUT FINANCEIRO (ATM STYLE) ---
// Transforma digitação "12345" em 123,45 (se decimals=2) ou 1,2345 (se decimals=4)
interface GridInputProps {
    value: number
    onChange: (val: number) => void
    decimals: 2 | 4
    prefix?: string
    placeholder?: string
    className?: string
}

function GridInput({ value, onChange, decimals, prefix, placeholder, className }: GridInputProps) {
    
    // Formata o valor numérico atual para o padrão PT-BR com separadores de milhar
    const displayValue = value.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 1. Remove tudo que não for dígito (0-9)
        const rawValue = e.target.value.replace(/\D/g, "")

        // 2. Se estiver vazio, assume 0
        if (!rawValue) {
            onChange(0)
            return
        }

        // 3. Converte para número inteiro e divide pela potência decimal
        // Ex: "12345" (digits) / 100 (decimals=2) = 123.45
        // Ex: "12345" (digits) / 10000 (decimals=4) = 1.2345
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
                onFocus={(e) => e.target.select()} // Seleciona tudo ao clicar para facilitar edição
            />
        </div>
    )
}

// --- COMPONENTE PRINCIPAL ---

export function PriceGrid({ tabelaId, initialData }: { tabelaId: string, initialData: PriceRow[] }) {
    // Inicializa dados
    const [data, setData] = useState<PriceRow[]>(initialData.map(d => ({
        ...d,
        fatorAndar: d.fatorAndar === 0 ? 1 : d.fatorAndar,
        fatorDiretoria: d.fatorDiretoria === 0 ? 1 : d.fatorDiretoria
    })))
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isSaving, setIsSaving] = useState(false)

    // Inputs de Bulk Update (Agora numéricos para compatibilidade com GridInput)
    // Iniciamos com 0 para o input entender, mas na lógica de apply ignoramos se for 0 absoluto se quisermos (opcional)
    const [bulkM2, setBulkM2] = useState<number>(0)
    const [bulkAndar, setBulkAndar] = useState<number>(0) // 0 visualmente, mas conceitualmente seria neutro se vazio
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

        // Verifica se tem algo preenchido (maior que 0)
        // Nota: Se você quiser permitir aplicar "0", remova essa verificação.
        // Mas geralmente em massa o usuário quer aplicar valores positivos.
        if (bulkM2 === 0 && bulkAndar === 0 && bulkDiretoria === 0) {
            toast.warning("Preencha ao menos um campo com valor maior que zero para aplicar.")
            return
        }

        setData(prev => prev.map(row => {
            if (!selectedIds.has(row.unidadeId)) return row
            
            // Só aplica se o valor do bulk for > 0. 
            // Se o usuário deixou 0,00 mantemos o valor original da linha.
            return {
                ...row,
                valorMetroQuadrado: bulkM2 > 0 ? bulkM2 : row.valorMetroQuadrado,
                fatorAndar: bulkAndar > 0 ? bulkAndar : row.fatorAndar,
                fatorDiretoria: bulkDiretoria > 0 ? bulkDiretoria : row.fatorDiretoria
            }
        }))
        toast.success(`Valores aplicados a ${selectedIds.size} unidades.`)
    }

    // 3. Edição Individual (Atualiza o state principal)
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
            fatorDiretoria: d.fatorDiretoria
        }))

        const res = await savePriceItemsBatch(tabelaId, payload)
        if (res.success) toast.success(res.message)
        else toast.error(res.message)
        setIsSaving(false)
    }

    // 5. Cálculos de Totais (Memoized)
    const totals = useMemo(() => {
        const total = {
            count: data.length,
            area: 0,
            vlrM2: 0,
            base: 0,
            fatAndar: 0,
            real: 0,
            fatDir: 0,
            final: 0
        }
        
        data.forEach(d => {
            const base = d.areaPrivativa * d.valorMetroQuadrado
            const real = base * d.fatorAndar
            const final = real * d.fatorDiretoria

            total.area += d.areaPrivativa
            total.vlrM2 += d.valorMetroQuadrado
            total.base += base
            total.fatAndar += d.fatorAndar
            total.real += real
            total.fatDir += d.fatorDiretoria
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
                        <div className="grid gap-1.5 w-40">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Valor m² Base</label>
                            <GridInput 
                                value={bulkM2}
                                onChange={setBulkM2}
                                decimals={2}
                                prefix="R$"
                            />
                        </div>
                        <div className="grid gap-1.5 w-32">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Fator Andar</label>
                            <GridInput 
                                value={bulkAndar}
                                onChange={setBulkAndar}
                                decimals={4}
                            />
                        </div>
                        <div className="grid gap-1.5 w-32">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Fator Diretoria</label>
                            <GridInput 
                                value={bulkDiretoria}
                                onChange={setBulkDiretoria}
                                decimals={4}
                            />
                        </div>
                        <Button onClick={applyBulk} variant="secondary" className="mb-0.5 border bg-white hover:bg-slate-100">
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
            <div className="border rounded-md bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-100">
                        <TableRow>
                            <TableHead className="w-10 text-center">
                                <Checkbox 
                                    checked={selectedIds.size === data.length && data.length > 0} 
                                    onCheckedChange={toggleSelectAll} 
                                />
                            </TableHead>
                            <TableHead className="w-16 font-bold text-gray-900 text-sm">Unidade</TableHead>
                            <TableHead className="w-24 text-sm">Bloco</TableHead>
                            <TableHead className="w-24 text-right text-sm">Área (m²)</TableHead>
                            <TableHead className="w-40 text-right text-sm">Valor m²</TableHead>
                            <TableHead className="w-36 text-right text-sm text-muted-foreground">Valor Base</TableHead>
                            <TableHead className="w-32 text-right text-sm">Fator Andar</TableHead>
                            <TableHead className="w-36 text-right text-sm text-muted-foreground">Valor Real</TableHead>
                            <TableHead className="w-32 text-right text-sm">Fator Dir.</TableHead>
                            <TableHead className="text-right font-bold text-green-700 bg-green-50/30 text-sm">Valor Final</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row) => {
                            const valBase = row.areaPrivativa * row.valorMetroQuadrado
                            const valReal = valBase * row.fatorAndar
                            const valFinal = valReal * row.fatorDiretoria
                            
                            return (
                                <TableRow key={row.unidadeId} className={selectedIds.has(row.unidadeId) ? "bg-blue-50/50" : ""}>
                                    <TableCell className="text-center">
                                        <Checkbox 
                                            checked={selectedIds.has(row.unidadeId)} 
                                            onCheckedChange={() => toggleSelectOne(row.unidadeId)} 
                                        />
                                    </TableCell>
                                    <TableCell className="font-bold text-sm">{row.unidade}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{row.blocoNome}</TableCell>
                                    <TableCell className="text-right text-sm">{fmtDecimal(row.areaPrivativa)}</TableCell>
                                    
                                    {/* Inputs Controlados com Máscara Financeira */}
                                    <TableCell className="p-2">
                                        <GridInput 
                                            value={row.valorMetroQuadrado}
                                            onChange={(v) => updateRowValue(row.unidadeId, 'valorMetroQuadrado', v)}
                                            decimals={2}
                                            prefix="R$"
                                        />
                                    </TableCell>
                                    
                                    {/* Base (Calc) */}
                                    <TableCell className="text-right text-sm text-muted-foreground bg-gray-50/30">
                                        {fmtCurrency(valBase)}
                                    </TableCell>

                                    <TableCell className="p-2">
                                        <GridInput 
                                            value={row.fatorAndar}
                                            onChange={(v) => updateRowValue(row.unidadeId, 'fatorAndar', v)}
                                            decimals={4}
                                        />
                                    </TableCell>

                                    {/* Real (Calc) */}
                                    <TableCell className="text-right text-sm text-muted-foreground bg-gray-50/30">
                                        {fmtCurrency(valReal)}
                                    </TableCell>

                                    <TableCell className="p-2">
                                        <GridInput 
                                            value={row.fatorDiretoria}
                                            onChange={(v) => updateRowValue(row.unidadeId, 'fatorDiretoria', v)}
                                            decimals={4}
                                        />
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
                            <TableCell colSpan={2} className="text-sm">TOTAIS / MÉDIAS</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right text-sm">{fmtDecimal(totals.area)}</TableCell>
                            <TableCell className="text-right text-sm">{fmtCurrency(totals.vlrM2 / totals.count)}</TableCell>
                            <TableCell className="text-right text-sm">{fmtCurrency(totals.base)}</TableCell>
                            <TableCell className="text-right text-sm">{fmtDecimal(totals.fatAndar / totals.count)}</TableCell>
                            <TableCell className="text-right text-sm">{fmtCurrency(totals.real)}</TableCell>
                            <TableCell className="text-right text-sm">{fmtDecimal(totals.fatDir / totals.count)}</TableCell>
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