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

// Importação do componente de análise VPL (Copie o arquivo da Mesa para esta pasta)
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
    // Extrai exatamente o YYYY-MM-DD do banco sem sofrer conversão de fuso local
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
            className={cn("text-right font-medium", className)}
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

    // --- ESTADO INICIAL ---
    // Mapeia o que veio do banco para o formato do formulário
    const getMappedInitial = () => initialConditions.map(c => ({
        id: c.id,
        tipo: c.tipo,
        periodicidade: "MENSAL", // Fallback visual
        qtdeParcelas: c.qtdeParcelas,
        valorParcela: c.valorParcela,
        vencimento: new Date(c.dataVencimento).toISOString().split('T')[0]
    }))

    const [conditions, setConditions] = useState<CustomCondition[]>(getMappedInitial())
    const [targetPrice, setTargetPrice] = useState(proposal.valorProposta)
    
    // --- CONTROLE DE TRAVA ---
    // Trava de Segurança
    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
    // Se está formalizando, NUNCA destrava. Se está aprovado, destrava se o usuário clicar.
    const [isUnlocked, setIsUnlocked] = useState(proposal.status !== 'APROVADO' && !isFormalizing)
    const [isPending, setIsPending] = useState(false)

    // --- CÁLCULOS ---
    const totalDistributed = conditions.reduce((acc, curr) => acc + (curr.valorParcela * curr.qtdeParcelas), 0)
    const remaining = targetPrice - totalDistributed
    const isClosed = isZero(remaining)
    const isPositive = remaining > 0.01

    // --- AÇÕES DO FORMULÁRIO ---
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

    // --- BOTÕES DE RESET ---
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

    // --- SALVAR NO BANCO ---
    const handleSave = async () => {
        if (!isUnlocked) return
        if (!isClosed) return toast.error(`Os valores não batem. Diferença: ${fmtCurrency(remaining)}`)
        
        setIsPending(true)

        // Prepara payload mapeando de volta
        const payload = conditions.map(c => ({
            tipo: c.tipo,
            dataVencimento: new Date(c.vencimento + "T12:00:00Z"), // Força meio-dia para evitar fuso
            valorParcela: c.valorParcela,
            qtdeParcelas: c.qtdeParcelas,
            valorTotal: c.valorParcela * c.qtdeParcelas
        }))

        // O parâmetro `isUnlocked` avisa a Action que precisa voltar o status para EM_ANALISE
        const unlockTriggered = proposal.status === 'APROVADO' && isUnlocked

        const res = await saveProposalConditions(proposal.id, payload, targetPrice, unlockTriggered)
        
        if (res.success) {
            toast.success(res.message)
            router.refresh() // Recarrega os dados do servidor
        } else {
            toast.error(res.message)
        }
        setIsPending(false)
    }

    return (
        <div className="space-y-6">
            
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
                    Atenção: Ao salvar as alterações, o status retornará para &quot;Em Análise&quot; automaticamente.
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* --- COLUNA ESQUERDA: CONDIÇÃO PADRÃO --- */}
                <Card className="lg:col-span-4 bg-slate-50 border-slate-200 opacity-90">
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
                                    <div key={idx} className="bg-white p-3 rounded border text-sm shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-slate-700">{flow.tipo}</span>
                                            <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-xs">
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
                                    <span className="text-sm font-bold text-slate-600">TOTAL ORIGINAL</span>
                                    <span className="text-sm font-bold text-slate-900">{fmtCurrency(proposal.valorTabelaOriginal)}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* --- COLUNA DIREITA: PROPOSTA PERSONALIZADA --- */}
                <Card className={cn("lg:col-span-8 shadow-md transition-all duration-300", 
                    !isUnlocked ? "opacity-70 pointer-events-none grayscale-[0.2]" : "border-blue-200"
                )}>
                    <CardHeader className="bg-blue-50/50 pb-4 border-b border-blue-100">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <CardTitle className="text-blue-900 flex items-center gap-2 text-lg">
                                Condições da Proposta
                            </CardTitle>
                            
                            <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-lg border border-blue-200 shadow-sm">
                                <label className="text-xs font-bold uppercase text-blue-800">Valor Fechamento</label>
                                <div className="h-6 w-px bg-slate-200"></div>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-bold text-slate-500">R$</span>
                                    <MoneyInput 
                                        value={targetPrice} 
                                        onChange={setTargetPrice} 
                                        className="w-32 border-none shadow-none h-8 text-lg text-blue-700 focus-visible:ring-0 p-0"
                                        disabled={!isUnlocked}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-between items-center text-sm">
                            <div>
                                <span className="text-muted-foreground mr-2">Total Distribuído:</span>
                                <span className="font-bold text-slate-700">{fmtCurrency(totalDistributed)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn("text-xs font-bold uppercase px-2 py-1 rounded", 
                                    isClosed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                )}>
                                    {isClosed ? "OK" : isPositive ? "A COMPLETAR" : "EXCEDENTE"}
                                </span>
                                <span className={cn("font-bold text-lg", isClosed ? "text-emerald-600" : "text-red-600")}>
                                    {fmtCurrency(Math.abs(remaining))}
                                </span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 bg-slate-50/50">
                        {/* Grid de 3 Colunas (Buckets) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            {ALLOWED_TYPES.map((type) => {
                                const typeConditions = conditions.filter(c => c.tipo === type)
                                
                                return (
                                    <div key={type} className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                                            <span className="text-xs font-bold text-slate-500 uppercase">{type}</span>
                                            {isUnlocked && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addCondition(type)}>
                                                    <Plus className="w-3 h-3 text-blue-600" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            {typeConditions.map(cond => {
                                                const totalItem = cond.valorParcela * cond.qtdeParcelas
                                                const percentItem = targetPrice > 0 ? (totalItem / targetPrice) * 100 : 0
                                                
                                                return (
                                                    <div key={cond.id} className="bg-white border rounded-md p-2 shadow-sm relative group">
                                                        {isUnlocked && (
                                                            <button 
                                                                onClick={() => removeCondition(cond.id)}
                                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-600"
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
                                                                        className="h-7 text-xs px-1"
                                                                        value={cond.vencimento}
                                                                        onChange={e => updateCondition(cond.id, 'vencimento', e.target.value)}
                                                                        disabled={!isUnlocked}
                                                                    />
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Parcelas</label>
                                                                    <Input 
                                                                        type="number" 
                                                                        className="h-7 text-xs px-1 text-center"
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
                                                                <span className="font-bold text-blue-600">({percentItem.toFixed(1)}%)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            
                                            {typeConditions.length === 0 && (
                                                <div className="border-2 border-dashed border-slate-100 rounded-md p-4 text-center">
                                                    <span className="text-[10px] text-slate-300">Sem itens</span>
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
                        <div className="p-4 border-t bg-white flex flex-wrap justify-end gap-3">
                            <Button variant="outline" onClick={handleClear} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="mr-2 h-4 w-4" /> Limpar Tudo
                            </Button>
                            
                            <Button variant="outline" onClick={handleResetToStandard}>
                                <Calculator className="mr-2 h-4 w-4" /> Copiar Tabela
                            </Button>

                            <Button variant="outline" onClick={handleRestoreSaved}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Restaurar Salvo
                            </Button>

                            <Button className="bg-emerald-600 hover:bg-emerald-700 w-48" onClick={handleSave} disabled={isPending}>
                                <Save className="mr-2 h-4 w-4" /> {isPending ? "Salvando..." : "Salvar Condições"}
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}