"use client"

import { useState, useMemo, useTransition } from "react"
import { ProposalFullDetail, saveProposalInstallments, unlockProposalEdit, getProposalConditions, ProposalConditionItem } from "@/app/actions/commercial-proposals"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Save, Plus, NotebookPen, Trash2, Calculator, Lock, Unlock, AlertTriangle, Loader2, DollarSign, Target } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { CustomCondition } from "./proposal-conditions-tab" // <- ADD IMPORT DA ABA GÊMEA

// --- TIPOS ---
export type GridInstallment = {
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
                className={cn("h-8 bg-background border-input focus:border-primary focus:ring-1 text-right pl-8", className)}
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
  setProposal: React.Dispatch<React.SetStateAction<ProposalFullDetail>>
  installments: GridInstallment[]
  setInstallments: React.Dispatch<React.SetStateAction<GridInstallment[]>>
  setConditions: React.Dispatch<React.SetStateAction<CustomCondition[]>> // <- RECEBENDO O PODER DE ALTERAR A ABA 2
}

export function ProposalInstallmentsTab({ proposal, setProposal, installments, setInstallments, setConditions }: Props) {
    const router = useRouter()
    const [isPendingTrans, startTransition] = useTransition()
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    
    // --- CONTROLE DE TRAVA E ESTADOS ---
    const [isPending, setIsPending] = useState(false)
    const [isUnlocking, setIsUnlocking] = useState(false)

    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
    const isUnlocked = proposal.status !== 'APROVADO' && !isFormalizing

    // --- BULK UPDATE STATES ---
    const [bulkDate, setBulkDate] = useState<string>("")
    const [bulkValue, setBulkValue] = useState<number>(0)
    const [bulkType, setBulkType] = useState<string>("ALL")

    const handleUnlock = async () => {
        setIsUnlocking(true)
        const res = await unlockProposalEdit(proposal.id, "Edição de Parcelas")
        setIsUnlocking(false)

        if (res.success) {
            toast.success(res.message)
            setProposal(prev => ({ ...prev, status: 'EM_ANALISE' }))
            startTransition(() => {
                router.refresh()
            })
        } else {
            toast.error(res.message)
        }
    }

    // --- SELECAO EM MASSA ---
    const toggleSelectAll = () => {
        if (selectedIds.size === installments.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(installments.map(d => d.id)))
    }

    const toggleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    // --- ACOES DO GRID ---
    const updateRow = (id: string, field: keyof GridInstallment, value: string | number) => {
        if (!isUnlocked) return
        setInstallments(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row))
    }

    const applyBulk = () => {
        if (!isUnlocked) return
        if (selectedIds.size === 0) return toast.warning("Selecione ao menos uma parcela.")
        if (!bulkDate && bulkValue === 0 && bulkType === "ALL") return toast.warning("Preencha ao menos um campo para aplicar.")

        setInstallments(prev => prev.map(row => {
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
        setInstallments([...installments, {
            id: crypto.randomUUID(),
            tipo: 'O',
            vencimento: new Date().toISOString().split('T')[0],
            valor: 0
        }])
    }

    const removeSelectedRows = () => {
        if (!isUnlocked) return
        if (selectedIds.size === 0) return toast.warning("Selecione parcelas para excluir.")
        setInstallments(prev => prev.filter(row => !selectedIds.has(row.id)))
        setSelectedIds(new Set())
    }

    // --- CALCULOS TOTAIS E VALIDACAO ---
    const { totalInstallments, difference, isValid } = useMemo(() => {
        const total = installments.reduce((acc, curr) => acc + curr.valor, 0)
        const diff = proposal.valorProposta - total
        return {
            totalInstallments: total,
            difference: diff,
            isValid: isZero(diff)
        }
    }, [installments, proposal.valorProposta])

    // --- SALVAR NO BANCO ---
    const handleSave = async () => {
        if (!isUnlocked) return
        if (!isValid) return toast.error(`A soma das parcelas deve bater com o Valor da Proposta. Diferença: ${fmtCurrency(difference)}`)
        
        setIsPending(true)

        const payload = installments.map(d => ({
            tipo: d.tipo,
            vencimento: new Date(d.vencimento + "T12:00:00Z"),
            valor: d.valor,
            parcela: 0 
        }))

        const res = await saveProposalInstallments(proposal.id, payload, false)
        
        if (res.success) {
            toast.success(res.message)
            
            // --- Atualizamos a memória da Aba 2 instantaneamente ---
            const novasCondicoes = await getProposalConditions(proposal.id)
            setConditions(novasCondicoes.map((c: ProposalConditionItem) => ({
                id: c.id,
                tipo: c.tipo,
                periodicidade: "MENSAL",
                qtdeParcelas: c.qtdeParcelas,
                valorParcela: Number(c.valorParcela),
                vencimento: new Date(c.dataVencimento).toISOString().split('T')[0]
            })))

            startTransition(() => {
                router.refresh()
            })
        } else {
            toast.error(res.message)
        }
        setIsPending(false)
    }

    return (
        <div className="space-y-6">
            
            {/* ALERTAS DE BLOQUEIO */}
            {isFormalizing ? (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-3">
                        <div className="p-2 bg-destructive/20 rounded-full h-fit text-destructive">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-destructive text-sm">Edição Bloqueada</h4>
                            <p className="text-sm text-destructive/80 mt-0.5">
                                A proposta está em fase de formalização/assinatura. Nenhuma edição pode ser feita.
                            </p>
                        </div>
                    </div>
                </div>
            ) : proposal.status === 'APROVADO' && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-3">
                        <div className="p-2 bg-warning/20 rounded-full h-fit text-warning">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-warning text-sm">Proposta Aprovada</h4>
                            <p className="text-sm text-warning/80 mt-0.5">
                                Os dados estão bloqueados. Edições alterarão o status de volta para &quot;Em Análise&quot;.
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" className="bg-background border-warning/50 text-warning hover:bg-warning/20" onClick={handleUnlock} disabled={isUnlocking}>
                        {isUnlocking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />} 
                        {isUnlocking ? "Desbloqueando..." : "Habilitar Edição"}
                    </Button>
                </div>
            )}

            {isUnlocked && proposal.status === 'APROVADO' && (
                <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-sm text-info flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Atenção: Ao salvar, o status retornará para &quot;Em Análise&quot; e o agrupamento das Condições (Aba 2) será recriado.
                </div>
            )}

            {/* --- LAYOUT DIVIDIDO (GRID 8x4) --- */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* COLUNA ESQUERDA: TABELA (3/4 da tela) */}
                <div className={cn("xl:col-span-8 2xl:col-span-9 space-y-3", !isUnlocked && "opacity-80 grayscale-[0.2]")}>
                    
                    <div className="flex justify-between items-center bg-muted/30 p-3 px-4 rounded-t-lg border border-b-0 border-border">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary text-primary-foreground font-mono">{installments.length}</Badge>
                            <span className="text-sm font-bold text-foreground">Grade do Fluxo</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={addRow} disabled={!isUnlocked} className="h-8 border-primary/30 text-primary hover:bg-primary/10">
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar
                        </Button>
                    </div>

                    <div className="border rounded-b-md bg-background shadow-sm overflow-x-auto">
                        <Table className="whitespace-nowrap">
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-12 text-center">
                                        <Checkbox 
                                            checked={selectedIds.size === installments.length && installments.length > 0} 
                                            onCheckedChange={toggleSelectAll} 
                                            disabled={!isUnlocked}
                                        />
                                    </TableHead>
                                    <TableHead className="w-12 text-center text-xs font-bold text-muted-foreground uppercase">#</TableHead>
                                    <TableHead className="w-[160px] text-xs font-bold text-muted-foreground uppercase">Classificação</TableHead>
                                    <TableHead className="w-[150px] text-xs font-bold text-muted-foreground uppercase">Vencimento</TableHead>
                                    <TableHead className="text-right text-xs font-bold text-muted-foreground uppercase">Valor Nominal</TableHead>
                                    <TableHead className="w-24 text-right text-xs font-bold text-muted-foreground uppercase">% Ref.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {installments.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhuma parcela listada na grade.</TableCell></TableRow>
                                ) : (
                                    installments.map((row, index) => {
                                        const percentual = proposal.valorProposta > 0 ? (row.valor / proposal.valorProposta) * 100 : 0
                                        const isSelected = selectedIds.has(row.id)

                                        return (
                                            <TableRow key={row.id} className={isSelected ? "bg-primary/5" : ""}>
                                                <TableCell className="text-center">
                                                    <Checkbox 
                                                        checked={isSelected} 
                                                        onCheckedChange={() => toggleSelectOne(row.id)} 
                                                        disabled={!isUnlocked}
                                                    />
                                                </TableCell>
                                                
                                                <TableCell className="text-center font-bold text-muted-foreground">
                                                    {index + 1}
                                                </TableCell>

                                                <TableCell className="p-2">
                                                    <Select value={row.tipo} onValueChange={(v) => updateRow(row.id, 'tipo', v)} disabled={!isUnlocked}>
                                                        <SelectTrigger className={cn("h-8 border-transparent hover:border-input", isSelected ? "bg-background" : "bg-transparent")}>
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
                                                        className={cn("h-8 border-transparent hover:border-input", isSelected ? "bg-background" : "bg-transparent")}
                                                        disabled={!isUnlocked}
                                                    />
                                                </TableCell>

                                                <TableCell className="p-2">
                                                    <GridInput 
                                                        value={row.valor}
                                                        onChange={(v) => updateRow(row.id, 'valor', v)}
                                                        disabled={!isUnlocked}
                                                        className={cn("border-transparent hover:border-input focus:border-primary font-bold text-foreground", isSelected ? "bg-background" : "bg-transparent")}
                                                    />
                                                </TableCell>

                                                <TableCell className="text-right text-xs font-semibold text-muted-foreground bg-muted/30">
                                                    {percentual.toFixed(2)}%
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* COLUNA DIREITA: BARRA FLUTUANTE (1/4 da tela) */}
                <div className={cn("xl:col-span-4 2xl:col-span-3 space-y-4 sticky top-6 z-10", !isUnlocked && "opacity-60 pointer-events-none")}>
                    
                    {/* PAINEL 1: AÇÕES EM MASSA */}
                    <Card className="border-border shadow-sm">
                        <CardHeader className="py-2.5 px-4 border-b flex flex-row items-center justify-between bg-muted/30">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <NotebookPen className="w-4 h-4 text-primary" /> Edição em Massa
                            </CardTitle>
                            <Badge className="bg-primary text-primary-foreground">{selectedIds.size}</Badge>
                        </CardHeader>
                        <CardContent className="p-3 space-y-3">
                            <div className="space-y-2.5">
                                <div className="grid gap-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Alterar Tipo</label>
                                    <Select value={bulkType} onValueChange={setBulkType} disabled={!isUnlocked || selectedIds.size === 0}>
                                        <SelectTrigger className="h-8 bg-background"><SelectValue placeholder="Manter Atual" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Manter Atual</SelectItem>
                                            {TIPO_OPCOES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Alterar Data</label>
                                    <Input 
                                        type="date" 
                                        className="h-8 bg-background" 
                                        value={bulkDate} 
                                        onChange={e => setBulkDate(e.target.value)} 
                                        disabled={!isUnlocked || selectedIds.size === 0}
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Alterar Valor</label>
                                    <GridInput 
                                        value={bulkValue}
                                        onChange={setBulkValue}
                                        disabled={!isUnlocked || selectedIds.size === 0}
                                        className="h-8 bg-background"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 pt-1">
                                <Button size="sm" onClick={applyBulk} className="w-full h-8" disabled={!isUnlocked || selectedIds.size === 0}>
                                    <Calculator className="mr-2 h-3.5 w-3.5" /> Aplicar
                                </Button>
                                <Button size="sm" variant="outline" className="w-full h-8 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={removeSelectedRows} disabled={!isUnlocked || selectedIds.size === 0}>
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* PAINEL 2: RESUMO FINANCEIRO */}
                    <Card className="border-border shadow-md bg-gradient-to-b from-background to-muted/20">
                        <CardHeader className="py-2 px-3 border-b bg-muted/10">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-primary" /> Resumo do Contrato
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2">
                            
                            <div className="flex justify-between items-center bg-background border border-border/50 rounded-md px-2.5 py-1.5">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                    <Target className="w-3 h-3" /> Alvo
                                </span>
                                <span className="text-sm font-black text-foreground">{fmtCurrency(proposal.valorProposta)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center bg-background border border-border/50 rounded-md px-2.5 py-1.5">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                    <Calculator className="w-3 h-3" /> Soma
                                </span>
                                <span className={cn("text-sm font-black", isValid ? "text-success" : "text-destructive")}>
                                    {fmtCurrency(totalInstallments)}
                                </span>
                            </div>

                            <div className={cn("px-2.5 py-1.5 rounded-md border flex justify-between items-center transition-colors", 
                                isValid ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"
                            )}>
                                <span className={cn("text-[10px] font-bold uppercase", isValid ? "text-success" : "text-destructive")}>
                                    {isValid ? "Conta Fechada" : "Diferença"}
                                </span>
                                <span className={cn("text-sm font-black", isValid ? "text-success" : "text-destructive")}>
                                    {fmtCurrency(difference)}
                                </span>
                            </div>
                            
                        </CardContent>
                    </Card>

                    {/* BOTÃO PRINCIPAL DE SALVAR */}
                    <Button 
                        size="lg" 
                        className="w-full shadow-md h-12 text-sm font-bold" 
                        onClick={handleSave} 
                        disabled={isPending || !isValid || isPendingTrans || !isUnlocked}
                    >
                        {isPending || isPendingTrans ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                        {isPending || isPendingTrans ? "Salvando..." : "Salvar Fluxo Fino"}
                    </Button>
                </div>
            </div>
        </div>
    )
}