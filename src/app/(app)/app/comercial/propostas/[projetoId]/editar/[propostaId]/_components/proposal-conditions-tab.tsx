"use client"

import { useState } from "react"
import { ProposalFullDetail, ProposalConditionItem, saveProposalConditions } from "@/app/actions/commercial-proposals"
import { StandardFlow } from "@/app/actions/commercial-negotiation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Save, Calculator, RotateCcw, Lock, Unlock, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

import { ProposalAnalysis } from "./proposal-analysis"

// --- TIPOS E CONSTANTES ---
type CustomCondition = {
    id: string
    tipo: string
    periodicidade: string
    qtdeParcelas: number
    valorParcela: number
    vencimento: string
}

const ALLOWED_TYPES = ["ENTRADA", "MENSAL", "INTERMEDIARIAS", "ANUAL", "CHAVES", "FINANCIAMENTO"]

// --- HELPERS ---
const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string | Date) => {
    if (!d) return "-"
    const isoString = typeof d === 'string' ? d : d.toISOString()
    const [year, month, day] = isoString.split('T')[0].split('-')
    return `${day}/${month}/${year}`
}
const isZero = (val: number) => Math.abs(val) < 0.01

// --- COMPONENTE INLINE: MONEY INPUT ---
interface MoneyInputProps {
    value: number
    onChange: (val: number) => void
    className?: string
    disabled?: boolean
}

function MoneyInput({ value, onChange, className, disabled }: MoneyInputProps) {
    const displayValue = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "")
        if (!rawValue) { onChange(0); return }
        const floatValue = parseInt(rawValue, 10) / 100
        onChange(floatValue)
    }

    return (
        <Input 
            className={cn("text-right font-medium bg-background", className)}
            value={displayValue}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
        />
    )
}

// --- COMPONENTE PRINCIPAL ---
interface Props {
  proposal: ProposalFullDetail
  initialConditions: ProposalConditionItem[]
  standardFlow: StandardFlow[]
}

export function ProposalConditionsTab({ proposal, initialConditions, standardFlow }: Props) {
    const router = useRouter()

    const getMappedInitial = () => initialConditions.map(c => ({
        id: c.id,
        tipo: c.tipo,
        periodicidade: "MENSAL",
        qtdeParcelas: c.qtdeParcelas,
        valorParcela: c.valorParcela,
        vencimento: new Date(c.dataVencimento).toISOString().split('T')[0]
    }))

    const [conditions, setConditions] = useState<CustomCondition[]>(getMappedInitial())
    const [targetPrice, setTargetPrice] = useState(proposal.valorProposta)
    
    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
    const [isUnlocked, setIsUnlocked] = useState(proposal.status !== 'APROVADO' && !isFormalizing)
    const [isPending, setIsPending] = useState(false)

    const totalDistributed = conditions.reduce((acc, curr) => acc + (curr.valorParcela * curr.qtdeParcelas), 0)
    const remaining = targetPrice - totalDistributed
    const isClosed = isZero(remaining)
    const isPositive = remaining > 0.01

    const addCondition = (type: string) => {
        if (!isUnlocked) return
        setConditions([...conditions, {
            id: crypto.randomUUID(),
            tipo: type,
            periodicidade: "MENSAL",
            qtdeParcelas: 1,
            valorParcela: 0,
            vencimento: new Date().toISOString().split('T')[0]
        }])
    }

    const removeCondition = (id: string) => {
        if (!isUnlocked) return
        setConditions(conditions.filter(c => c.id !== id))
    }

    const updateCondition = (id: string, field: keyof CustomCondition, value: string | number) => {
        if (!isUnlocked) return
        setConditions(conditions.map(c => c.id === id ? { ...c, [field]: value } : c))
    }

    const handleClear = () => {
        if (!isUnlocked) return
        setConditions([])
    }

    const handleRestoreSaved = () => {
        if (!isUnlocked) return
        setConditions(getMappedInitial())
        setTargetPrice(proposal.valorProposta)
        toast.info("Condições restauradas para o último salvamento.")
    }

    const handleResetToStandard = () => {
        if (!isUnlocked) return
        setTargetPrice(proposal.valorTabelaOriginal)
        const initialStd = standardFlow.map(flow => ({
            id: crypto.randomUUID(),
            tipo: flow.tipo === 'SEMESTRAL' ? 'INTERMEDIARIAS' : flow.tipo, 
            periodicidade: flow.periodicidade,
            qtdeParcelas: flow.qtdeParcelas,
            valorParcela: flow.valorParcela,
            vencimento: new Date(flow.primeiroVencimento).toISOString().split('T')[0]
        }))
        setConditions(initialStd)
        toast.success("Condições copiadas da tabela padrão.")
    }

    const handleSave = async () => {
        if (!isUnlocked) return
        if (!isClosed) return toast.error(`Os valores não batem. Diferença: ${fmtCurrency(remaining)}`)
        
        setIsPending(true)

        const payload = conditions.map(c => ({
            tipo: c.tipo,
            dataVencimento: new Date(c.vencimento + "T12:00:00Z"),
            valorParcela: c.valorParcela,
            qtdeParcelas: c.qtdeParcelas,
            valorTotal: c.valorParcela * c.qtdeParcelas
        }))

        const unlockTriggered = proposal.status === 'APROVADO' && isUnlocked

        const res = await saveProposalConditions(proposal.id, payload, targetPrice, unlockTriggered)
        
        if (res.success) {
            toast.success(res.message)
            router.refresh() 
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
            ) : proposal.status === 'APROVADO' && !isUnlocked && (
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
                    <Button variant="outline" className="bg-background border-warning/50 text-warning hover:bg-warning/20" onClick={() => setIsUnlocked(true)}>
                        <Unlock className="w-4 h-4 mr-2" /> Habilitar Edição
                    </Button>
                </div>
            )}

            {isUnlocked && proposal.status === 'APROVADO' && (
                <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-sm text-info flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Atenção: Ao salvar as alterações, o status retornará para &quot;Em Análise&quot; automaticamente.
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* --- COLUNA ESQUERDA: CONDIÇÃO PADRÃO --- */}
                <Card className="lg:col-span-4 bg-muted/30 border-border opacity-90">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base text-muted-foreground flex items-center gap-2">
                            <Calculator className="w-4 h-4"/>
                            Tabela Original
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {standardFlow.length === 0 ? (
                            <div className="text-center py-8 text-sm text-muted-foreground">Tabela não encontrada.</div>
                        ) : (
                            <>
                                {standardFlow.map((flow, idx) => (
                                    <div key={idx} className="bg-background p-3 rounded border text-sm shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-foreground">{flow.tipo}</span>
                                            <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">
                                                {Number(flow.percentual).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {flow.qtdeParcelas}x {fmtCurrency(flow.valorParcela)}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            1º Venc: {fmtDate(flow.primeiroVencimento)}
                                        </div>
                                    </div>
                                ))}
                                <Separator />
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm font-bold text-muted-foreground">TOTAL ORIGINAL</span>
                                    <span className="text-sm font-bold text-foreground">{fmtCurrency(proposal.valorTabelaOriginal)}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* --- COLUNA DIREITA: PROPOSTA PERSONALIZADA --- */}
                <Card className={cn("lg:col-span-8 shadow-md transition-all duration-300", 
                    !isUnlocked ? "opacity-70 pointer-events-none grayscale-[0.2]" : "border-primary/30"
                )}>
                    <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <CardTitle className="text-primary flex items-center gap-2 text-lg">
                                Condições da Proposta
                            </CardTitle>
                            
                            <div className="flex items-center gap-3 bg-background p-2 px-4 rounded-lg border border-primary/20 shadow-sm">
                                <label className="text-xs font-bold uppercase text-primary">Valor Fechamento</label>
                                <div className="h-6 w-px bg-border"></div>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-bold text-muted-foreground">R$</span>
                                    <MoneyInput 
                                        value={targetPrice} 
                                        onChange={setTargetPrice} 
                                        className="w-32 border-none shadow-none h-8 text-lg text-primary focus-visible:ring-0 p-0"
                                        disabled={!isUnlocked}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-between items-center text-sm">
                            <div>
                                <span className="text-muted-foreground mr-2">Total Distribuído:</span>
                                <span className="font-bold text-foreground">{fmtCurrency(totalDistributed)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn("text-xs font-bold uppercase px-2 py-1 rounded", 
                                    isClosed ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                                )}>
                                    {isClosed ? "OK" : isPositive ? "A COMPLETAR" : "EXCEDENTE"}
                                </span>
                                <span className={cn("font-bold text-lg", isClosed ? "text-success" : "text-destructive")}>
                                    {fmtCurrency(Math.abs(remaining))}
                                </span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 bg-muted/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            {ALLOWED_TYPES.map((type) => {
                                const typeConditions = conditions.filter(c => c.tipo === type)
                                
                                return (
                                    <div key={type} className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center pb-1 border-b">
                                            <span className="text-xs font-bold text-muted-foreground uppercase">{type}</span>
                                            {isUnlocked && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addCondition(type)}>
                                                    <Plus className="w-3 h-3 text-primary" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            {typeConditions.map(cond => {
                                                const totalItem = cond.valorParcela * cond.qtdeParcelas
                                                const percentItem = targetPrice > 0 ? (totalItem / targetPrice) * 100 : 0
                                                
                                                return (
                                                    <div key={cond.id} className="bg-background border rounded-md p-2 shadow-sm relative group">
                                                        {isUnlocked && (
                                                            <button 
                                                                onClick={() => removeCondition(cond.id)}
                                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-destructive/70 hover:text-destructive"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}

                                                        <div className="grid gap-2">
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div className="col-span-2">
                                                                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Vencimento</label>
                                                                    <Input 
                                                                        type="date" 
                                                                        className="h-7 text-xs px-1 bg-background"
                                                                        value={cond.vencimento}
                                                                        onChange={e => updateCondition(cond.id, 'vencimento', e.target.value)}
                                                                        disabled={!isUnlocked}
                                                                    />
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Parcelas</label>
                                                                    <Input 
                                                                        type="number" 
                                                                        className="h-7 text-xs px-1 text-center bg-background"
                                                                        value={cond.qtdeParcelas}
                                                                        onChange={e => updateCondition(cond.id, 'qtdeParcelas', Number(e.target.value))}
                                                                        disabled={!isUnlocked}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-muted-foreground uppercase font-bold">Valor Parcela</label>
                                                                <MoneyInput 
                                                                    value={cond.valorParcela}
                                                                    onChange={v => updateCondition(cond.id, 'valorParcela', v)}
                                                                    className="h-7 text-xs font-bold"
                                                                    disabled={!isUnlocked}
                                                                />
                                                            </div>
                                                            <div className="text-[10px] text-right text-muted-foreground border-t pt-1 mt-1 flex justify-between">
                                                                <span>Total: {fmtCurrency(totalItem)}</span>
                                                                <span className="font-bold text-primary">({percentItem.toFixed(1)}%)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            
                                            {typeConditions.length === 0 && (
                                                <div className="border-2 border-dashed border-border rounded-md p-4 text-center">
                                                    <span className="text-[10px] text-muted-foreground/50">Sem itens</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* COMPONENTE DE ANÁLISE VPL (Herdado da Mesa) */}
                        <ProposalAnalysis 
                            standardFlow={standardFlow} 
                            proposalConditions={conditions} 
                            unitArea={proposal.unidade.areaPrivativaTotal || 1}
                        />

                    </CardContent>
                    
                    {/* BARRA DE AÇÕES (Só exibe se estiver destravado) */}
                    {isUnlocked && (
                        <div className="p-4 border-t bg-background flex flex-wrap justify-end gap-3">
                            <Button variant="outline" onClick={handleClear} className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Limpar Tudo
                            </Button>
                            
                            <Button variant="outline" onClick={handleResetToStandard}>
                                <Calculator className="mr-2 h-4 w-4" /> Copiar Tabela
                            </Button>

                            <Button variant="outline" onClick={handleRestoreSaved}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Restaurar Salvo
                            </Button>

                            <Button className="w-48" onClick={handleSave} disabled={isPending}>
                                <Save className="mr-2 h-4 w-4" /> {isPending ? "Salvando..." : "Salvar Condições"}
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}