"use client"

import { useState, useMemo } from "react"
import { ProposalFullDetail, ProposalInstallmentItem, saveProposalInstallments } from "@/app/actions/commercial-proposals"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Plus, Trash2, Calculator, Lock, Unlock, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

// --- TIPOS ---
type GridInstallment = {
    id: string
    tipo: string
    vencimento: string
    valor: number
}

const TIPO_OPCOES = [
    { value: 'E', label: 'Entrada' },
    { value: 'M', label: 'Mensal' },
    { value: 'I', label: 'Intermediária' },
    { value: 'A', label: 'Anual' },
    { value: 'C', label: 'Chaves' },
    { value: 'F', label: 'Financiamento' },
    { value: 'O', label: 'Outros' }
]

// --- HELPERS ---
const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const isZero = (val: number) => Math.abs(val) < 0.01

// --- COMPONENTE INLINE: MONEY INPUT ---
interface GridInputProps {
    value: number
    onChange: (val: number) => void
    disabled?: boolean
    className?: string
}

function GridInput({ value, onChange, disabled, className }: GridInputProps) {
    const displayValue = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "")
        if (!rawValue) { onChange(0); return }
        const floatValue = parseInt(rawValue, 10) / 100
        onChange(floatValue)
    }

    return (
        <div className="relative w-full">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-medium z-10">R$</span>
            <Input 
                className={cn("h-8 bg-white border-slate-300 focus:border-blue-500 text-right pl-8", className)}
                value={displayValue}
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
                disabled={disabled}
            />
        </div>
    )
}

// --- COMPONENTE PRINCIPAL ---
interface Props {
  proposal: ProposalFullDetail
  initialInstallments: ProposalInstallmentItem[]
}

export function ProposalInstallmentsTab({ proposal, initialInstallments }: Props) {
    const router = useRouter()

    // --- ESTADO INICIAL ---
    const getMappedInitial = (): GridInstallment[] => initialInstallments.map(i => ({
        id: i.id,
        tipo: i.tipo,
        vencimento: new Date(i.vencimento).toISOString().split('T')[0],
        valor: i.valor
    }))

    const [data, setData] = useState<GridInstallment[]>(getMappedInitial())
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    
    // --- CONTROLE DE TRAVA ---
    // Trava de Segurança
    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
    // Se está formalizando, NUNCA destrava. Se está aprovado, destrava se o usuário clicar.
    const [isUnlocked, setIsUnlocked] = useState(proposal.status !== 'APROVADO' && !isFormalizing)
    const [isPending, setIsPending] = useState(false)

    // --- BULK UPDATE STATES ---
    const [bulkDate, setBulkDate] = useState<string>("")
    const [bulkValue, setBulkValue] = useState<number>(0)
    const [bulkType, setBulkType] = useState<string>("ALL")

    // --- SELEÇÃO EM MASSA ---
    const toggleSelectAll = () => {
        if (selectedIds.size === data.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(data.map(d => d.id)))
    }

    const toggleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    // --- AÇÕES DO GRID ---
    const updateRow = (id: string, field: keyof GridInstallment, value: string | number) => {
        if (!isUnlocked) return
        setData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row))
    }

    const applyBulk = () => {
        if (!isUnlocked) return
        if (selectedIds.size === 0) return toast.warning("Selecione ao menos uma parcela.")
        if (!bulkDate && bulkValue === 0 && bulkType === "ALL") return toast.warning("Preencha ao menos um campo do topo para aplicar.")

        setData(prev => prev.map(row => {
            if (!selectedIds.has(row.id)) return row
            return {
                ...row,
                vencimento: bulkDate || row.vencimento,
                valor: bulkValue > 0 ? bulkValue : row.valor,
                tipo: bulkType !== "ALL" ? bulkType : row.tipo
            }
        }))
        toast.success(`Valores aplicados a ${selectedIds.size} parcelas.`)
    }

    const addRow = () => {
        if (!isUnlocked) return
        setData([...data, {
            id: crypto.randomUUID(),
            tipo: 'O',
            vencimento: new Date().toISOString().split('T')[0],
            valor: 0
        }])
    }

    const removeSelectedRows = () => {
        if (!isUnlocked) return
        if (selectedIds.size === 0) return toast.warning("Selecione parcelas para excluir.")
        setData(prev => prev.filter(row => !selectedIds.has(row.id)))
        setSelectedIds(new Set())
    }

    // --- CÁLCULOS TOTAIS E VALIDAÇÃO ---
    const { totalInstallments, difference, isValid } = useMemo(() => {
        const total = data.reduce((acc, curr) => acc + curr.valor, 0)
        const diff = proposal.valorProposta - total
        return {
            totalInstallments: total,
            difference: diff,
            isValid: isZero(diff)
        }
    }, [data, proposal.valorProposta])

    // --- SALVAR NO BANCO ---
    const handleSave = async () => {
        if (!isUnlocked) return
        if (!isValid) return toast.error(`A soma das parcelas deve bater com o Valor da Proposta. Diferença: ${fmtCurrency(difference)}`)
        
        setIsPending(true)

        // Limpa e formata os dados para a Action
        const payload = data.map(d => ({
            tipo: d.tipo,
            vencimento: new Date(d.vencimento + "T12:00:00Z"), // Força meio-dia para evitar bug de fuso
            valor: d.valor,
            parcela: 0 // A Action recalcula a numeração exata
        }))

        const unlockTriggered = proposal.status === 'APROVADO' && isUnlocked

        const res = await saveProposalInstallments(proposal.id, payload, unlockTriggered)
        
        if (res.success) {
            toast.success(res.message)
            router.refresh()
        } else {
            toast.error(res.message)
        }
        setIsPending(false)
    }

    return (
        <div className="space-y-4">
            
            {/* ALERTAS DE BLOQUEIO */}
            {isFormalizing ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-3">
                        <div className="p-2 bg-red-100 rounded-full h-fit text-red-600">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-red-800 text-sm">Edição Bloqueada</h4>
                            <p className="text-sm text-red-700 mt-0.5">
                                A proposta está em fase de formalização/assinatura. Nenhuma edição pode ser feita.
                            </p>
                        </div>
                    </div>
                </div>
            ) : proposal.status === 'APROVADO' && !isUnlocked && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-3">
                        <div className="p-2 bg-amber-100 rounded-full h-fit text-amber-600">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-amber-800 text-sm">Proposta Aprovada</h4>
                            <p className="text-sm text-amber-700 mt-0.5">
                                Os dados estão bloqueados. Edições alterarão o status de volta para &quot;Em Análise&quot;.
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => setIsUnlocked(true)}>
                        <Unlock className="w-4 h-4 mr-2" /> Habilitar Edição
                    </Button>
                </div>
            )}

            {isUnlocked && proposal.status === 'APROVADO' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Atenção: Ao salvar, o status retornará para &quot;Em Análise&quot; e o agrupamento das Condições (Aba 2) será recriado.
                </div>
            )}

            {/* BARRA DE AÇÕES (Sticky Top estilo Excel) */}
            <div className={cn("sticky top-4 z-20 transition-all", !isUnlocked && "opacity-60 pointer-events-none")}>
                <Card className="bg-slate-50 border-slate-200 shadow-md">
                    <CardContent className="p-4 flex flex-wrap items-end gap-4">
                        <div className="grid gap-1.5 w-32">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Tipo</label>
                            <Select value={bulkType} onValueChange={setBulkType} disabled={!isUnlocked}>
                                <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Tipo" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Manter Atual</SelectItem>
                                    {TIPO_OPCOES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5 w-40">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Data Exata</label>
                            <Input 
                                type="date" 
                                className="h-9 bg-white" 
                                value={bulkDate} 
                                onChange={e => setBulkDate(e.target.value)} 
                                disabled={!isUnlocked}
                            />
                        </div>
                        <div className="grid gap-1.5 w-40">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Novo Valor</label>
                            <GridInput 
                                value={bulkValue}
                                onChange={setBulkValue}
                                disabled={!isUnlocked}
                            />
                        </div>
                        <Button onClick={applyBulk} variant="secondary" className="mb-[1px] border bg-white hover:bg-slate-100" disabled={!isUnlocked}>
                            <Calculator className="mr-2 h-4 w-4" /> Aplicar aos {selectedIds.size} marcados
                        </Button>

                        <div className="flex-1 flex justify-end gap-2">
                            <Button variant="outline" className="mb-[1px] bg-white text-red-600 hover:text-red-700 hover:bg-red-50" onClick={removeSelectedRows} disabled={!isUnlocked || selectedIds.size === 0}>
                                <Trash2 className="h-4 w-4" /> Excluir
                            </Button>
                            <Button variant="outline" className="mb-[1px] bg-white border-blue-200 text-blue-700 hover:bg-blue-50" onClick={addRow} disabled={!isUnlocked}>
                                <Plus className="mr-2 h-4 w-4" /> Adicionar Parcela
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* TABELA FLUXO FINO */}
            <div className={cn("border rounded-md bg-white shadow-sm overflow-x-auto transition-all", !isUnlocked && "opacity-80 grayscale-[0.2]")}>
                <Table className="whitespace-nowrap">
                    <TableHeader className="bg-slate-100">
                        <TableRow>
                            <TableHead className="w-10 text-center">
                                <Checkbox 
                                    checked={selectedIds.size === data.length && data.length > 0} 
                                    onCheckedChange={toggleSelectAll} 
                                    disabled={!isUnlocked}
                                />
                            </TableHead>
                            <TableHead className="w-16 text-center text-xs font-bold text-slate-500 uppercase">#</TableHead>
                            <TableHead className="w-48 text-xs font-bold text-slate-500 uppercase">Tipo / Classificação</TableHead>
                            <TableHead className="w-48 text-xs font-bold text-slate-500 uppercase">Data de Vencimento</TableHead>
                            <TableHead className="w-56 text-right text-xs font-bold text-slate-500 uppercase">Valor Nominal</TableHead>
                            <TableHead className="text-right text-xs font-bold text-slate-500 uppercase">% Ref.</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma parcela. Adicione ou gere a partir da Aba 2.</TableCell></TableRow>
                        ) : (
                            data.map((row, index) => {
                                const percentual = proposal.valorProposta > 0 ? (row.valor / proposal.valorProposta) * 100 : 0

                                return (
                                    <TableRow key={row.id} className={selectedIds.has(row.id) ? "bg-blue-50/50" : ""}>
                                        <TableCell className="text-center">
                                            <Checkbox 
                                                checked={selectedIds.has(row.id)} 
                                                onCheckedChange={() => toggleSelectOne(row.id)} 
                                                disabled={!isUnlocked}
                                            />
                                        </TableCell>
                                        
                                        <TableCell className="text-center font-bold text-slate-400">
                                            {index + 1}
                                        </TableCell>

                                        <TableCell className="p-2">
                                            <Select value={row.tipo} onValueChange={(v) => updateRow(row.id, 'tipo', v)} disabled={!isUnlocked}>
                                                <SelectTrigger className="h-8 bg-white border-transparent hover:border-slate-300">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TIPO_OPCOES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        
                                        <TableCell className="p-2">
                                            <Input 
                                                type="date" 
                                                value={row.vencimento}
                                                onChange={(e) => updateRow(row.id, 'vencimento', e.target.value)}
                                                className="h-8 bg-white border-transparent hover:border-slate-300"
                                                disabled={!isUnlocked}
                                            />
                                        </TableCell>

                                        <TableCell className="p-2">
                                            <GridInput 
                                                value={row.valor}
                                                onChange={(v) => updateRow(row.id, 'valor', v)}
                                                disabled={!isUnlocked}
                                                className="border-transparent hover:border-slate-300 focus:border-blue-500 font-bold text-slate-700"
                                            />
                                        </TableCell>

                                        <TableCell className="text-right text-xs font-semibold text-slate-400 bg-slate-50/50">
                                            {percentual.toFixed(2)}%
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                    <TableFooter className="border-t-2 border-slate-300">
                        <TableRow className="bg-slate-50">
                            <TableCell colSpan={4} className="text-right text-sm font-bold text-slate-600 uppercase tracking-tight pr-4">
                                Soma das Parcelas
                            </TableCell>
                            <TableCell className={cn("text-right text-base font-black", isValid ? "text-emerald-600" : "text-red-600")}>
                                {fmtCurrency(totalInstallments)}
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        <TableRow className="bg-white">
                            <TableCell colSpan={4} className="text-right text-sm font-bold text-slate-600 uppercase tracking-tight pr-4">
                                Valor da Proposta
                            </TableCell>
                            <TableCell className="text-right text-base font-black text-blue-800">
                                {fmtCurrency(proposal.valorProposta)}
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        <TableRow className={isValid ? "bg-emerald-50" : "bg-red-50"}>
                            <TableCell colSpan={4} className="text-right text-xs font-bold uppercase tracking-tight pr-4">
                                <span className={isValid ? "text-emerald-700" : "text-red-600"}>Diferença Restante</span>
                            </TableCell>
                            <TableCell className={cn("text-right text-sm font-black", isValid ? "text-emerald-600" : "text-red-600")}>
                                {fmtCurrency(difference)}
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            
            {/* RODAPÉ DE AÇÃO */}
            {isUnlocked && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                        <span className="font-bold">{data.length}</span> parcelas listadas.
                    </div>
                    
                    <Button 
                        size="lg" 
                        className="bg-emerald-600 hover:bg-emerald-700 min-w-[200px]" 
                        onClick={handleSave} 
                        disabled={isPending || !isValid}
                    >
                        {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                        {isPending ? "Salvando..." : "Salvar Fluxo Fino"}
                    </Button>
                </div>
            )}
        </div>
    )
}