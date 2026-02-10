'use client'

import { useEffect, useMemo } from "react"
import { NegotiationUnit, calculateStandardFlow, saveProposal } from "@/app/actions/commercial-negotiation"
import { useNegotiation } from "./negotiation-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Save, RefreshCw, Calculator, Wallet, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// --- TIPOS ---
type CustomCondition = {
    id: string
    tipo: string
    periodicidade: string
    qtdeParcelas: number
    valorParcela: number
    vencimento: string
}

const ALLOWED_TYPES = ["ENTRADA", "MENSAL", "INTERMEDIARIAS", "ANUAL", "CHAVES", "FINANCIAMENTO"]
const ORIGIN_OPTIONS = ["Gestão", "Imobiliária", "Indicação", "Lead", "WhatsApp", "Outro"]

// --- HELPERS ---
const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
// Ajuste de Fuso
const fmtDate = (d: string | Date) => {
  const date = new Date(d)
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
  return date.toLocaleDateString('pt-BR')
}
const isZero = (val: number) => Math.abs(val) < 0.01

// --- COMPONENTE DE INPUT FINANCEIRO (ATM) ---
interface MoneyInputProps {
    value: number
    onChange: (val: number) => void
    className?: string
    placeholder?: string
}

function MoneyInput({ value, onChange, className, placeholder }: MoneyInputProps) {
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
            placeholder={placeholder}
            onFocus={(e) => e.target.select()}
        />
    )
}

// --- COMPONENTE PRINCIPAL ---

export function NegotiationForm({ units }: { units: NegotiationUnit[] }) {
    const { 
        selectedUnitId, setSelectedUnitId,
        lead, updateLead, setLead,
        targetPrice, setTargetPrice,
        conditions, setConditions,
        standardFlow, setStandardFlow
    } = useNegotiation()

    const selectedUnit = units.find(u => u.id === selectedUnitId)
    // [CORREÇÃO] Filtrando pelo novo campo statusComercial
    const availableUnits = units.filter(u => u.statusComercial === 'DISPONIVEL')

    // Ordenação
    const sortedUnits = useMemo(() => {
        return [...availableUnits].sort((a, b) => {
            const blockDiff = a.blocoNome.localeCompare(b.blocoNome, undefined, { numeric: true, sensitivity: 'base' })
            if (blockDiff !== 0) return blockDiff
            return a.unidade.localeCompare(b.unidade, undefined, { numeric: true, sensitivity: 'base' })
        })
    }, [availableUnits])

    // Carregar Dados ao Selecionar Unidade
    useEffect(() => {
        if (!selectedUnit) return

        // O valorTabela aqui já inclui o fatorCorrecao (calculado no server action getSalesMirrorData)
        setTargetPrice(selectedUnit.valorTabela)
        
        calculateStandardFlow(selectedUnit.id, selectedUnit.valorTabela).then(data => {
            setStandardFlow(data)
            
            const initialConditions = data.map(flow => ({
                id: crypto.randomUUID(),
                tipo: flow.tipo === 'SEMESTRAL' ? 'INTERMEDIARIAS' : flow.tipo, 
                periodicidade: flow.periodicidade,
                qtdeParcelas: flow.qtdeParcelas,
                valorParcela: flow.valorParcela,
                vencimento: new Date(flow.primeiroVencimento).toISOString().split('T')[0]
            }))
            setConditions(initialConditions)
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUnitId])

    // --- CÁLCULOS ---
    const totalDistributed = conditions.reduce((acc, curr) => acc + (curr.valorParcela * curr.qtdeParcelas), 0)
    const remaining = targetPrice - totalDistributed
    const isClosed = isZero(remaining)
    const isPositive = remaining > 0.01

    // --- AÇÕES ---
    const addCondition = (type: string) => {
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
        setConditions(conditions.filter(c => c.id !== id))
    }

    const updateCondition = (id: string, field: keyof CustomCondition, value: string | number) => {
        setConditions(conditions.map(c => c.id === id ? { ...c, [field]: value } : c))
    }

    const handleClear = () => {
        setConditions([])
        setLead({ nome: "", email: "", telefone: "", origem: "" })
        if (selectedUnit) {
            setTargetPrice(selectedUnit.valorTabela)
        }
    }

    const handleResetToStandard = () => {
        if (!selectedUnit) return

        setTargetPrice(selectedUnit.valorTabela)
        
        calculateStandardFlow(selectedUnit.id, selectedUnit.valorTabela).then(data => {
            setStandardFlow(data)
            const initialConditions = data.map(flow => ({
                id: crypto.randomUUID(),
                tipo: flow.tipo === 'SEMESTRAL' ? 'INTERMEDIARIAS' : flow.tipo, 
                periodicidade: flow.periodicidade,
                qtdeParcelas: flow.qtdeParcelas,
                valorParcela: flow.valorParcela,
                vencimento: new Date(flow.primeiroVencimento).toISOString().split('T')[0]
            }))
            setConditions(initialConditions)
        })
    }

    const handleSave = async () => {
        if (!selectedUnitId) return toast.error("Selecione uma unidade")
        if (!lead.nome) return toast.error("Preencha o nome do cliente")
        if (!isClosed) return toast.error(`Valores não batem. Diferença: ${remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)

        const payload = {
            unidadeId: selectedUnitId,
            lead,
            valorProposta: targetPrice,
            condicoes: conditions
        }

        const res = await saveProposal(payload)
        if (res.success) {
            toast.success("Proposta salva com sucesso!")
            handleClear()
            setSelectedUnitId("") 
            setLead({ nome: "", email: "", telefone: "", origem: "" })
        } else {
            toast.error(res.message)
        }
    }

    return (
        <div className="space-y-6">
            
            {/* === LINHA 1: CABEÇALHO === */}
            <Card className="border-l-4 border-l-blue-600 shadow-sm">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Coluna Unidade (4 cols) */}
                        <div className="md:col-span-4 space-y-4 border-r pr-6">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-700"><RefreshCw className="w-5 h-5"/></div>
                                <h3 className="font-bold text-lg text-gray-800">1. Seleção da Unidade</h3>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Unidade Disponível</Label>
                                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                                    <SelectTrigger className="h-11 text-base">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortedUnits.map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                <span className="font-bold">{u.unidade}</span> 
                                                <span className="text-muted-foreground mx-2">|</span> 
                                                <span className="text-xs uppercase">{u.blocoNome}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedUnit && (
                                <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-3 rounded border">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Área Privativa</p>
                                        <p className="font-bold">{selectedUnit.areaPrivativa} m²</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Valor Tabela</p>
                                        <p className="font-bold text-blue-700">{fmtCurrency(selectedUnit.valorTabela)}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Coluna Lead (8 cols) */}
                        <div className="md:col-span-8 pl-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-700"><Wallet className="w-5 h-5"/></div>
                                <h3 className="font-bold text-lg text-gray-800">2. Dados do Comprador</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Nome Completo *</Label>
                                    <Input 
                                        value={lead.nome} 
                                        onChange={e => updateLead('nome', e.target.value)} 
                                        className="h-10" 
                                        placeholder="Preencha o nome do cliente..." 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Telefone / WhatsApp *</Label>
                                    <Input 
                                        value={lead.telefone} 
                                        onChange={e => updateLead('telefone', e.target.value)} 
                                        className="h-10" 
                                        placeholder="Preencha o telefone..." 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Email</Label>
                                    <Input 
                                        value={lead.email} 
                                        onChange={e => updateLead('email', e.target.value)} 
                                        className="h-10" 
                                        placeholder="Preencha o email..." 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Origem</Label>
                                    <Select value={lead.origem} onValueChange={v => updateLead('origem', v)}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ORIGIN_OPTIONS.map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* === LINHA 2: NEGOCIAÇÃO === */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COLUNA ESQUERDA: CONDIÇÃO PADRÃO */}
                <Card className="lg:col-span-4 bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base text-muted-foreground flex items-center gap-2">
                            <Calculator className="w-4 h-4"/>
                            Condição Padrão
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {standardFlow.length === 0 ? (
                            <div className="text-center py-8 text-sm text-muted-foreground">Selecione uma unidade para ver.</div>
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
                                    <span className="text-sm font-bold text-slate-600">TOTAL DA TABELA</span>
                                    <span className="text-sm font-bold text-slate-900">{selectedUnit ? fmtCurrency(selectedUnit.valorTabela) : '-'}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* COLUNA DIREITA: PROPOSTA PERSONALIZADA */}
                <Card className="lg:col-span-8 border-blue-200 shadow-md">
                    <CardHeader className="bg-blue-50/50 pb-4 border-b border-blue-100">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <CardTitle className="text-blue-900 flex items-center gap-2">
                                <Save className="w-5 h-5"/> 3. Proposta Personalizada
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
                                    isClosed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}>
                                    {isClosed ? "OK" : isPositive ? "A COMPLETAR" : "EXCEDENTE"}
                                </span>
                                <span className={cn("font-bold text-lg", isClosed ? "text-green-600" : "text-red-600")}>
                                    {fmtCurrency(Math.abs(remaining))}
                                </span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 bg-slate-50/50 min-h-[400px]">
                        {/* Grid de 3 Colunas (Buckets) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {ALLOWED_TYPES.map((type) => {
                                const typeConditions = conditions.filter(c => c.tipo === type)
                                
                                return (
                                    <div key={type} className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                                            <span className="text-xs font-bold text-slate-500 uppercase">{type}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addCondition(type)}>
                                                <Plus className="w-3 h-3 text-blue-600" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            {typeConditions.map(cond => {
                                                const totalItem = cond.valorParcela * cond.qtdeParcelas
                                                const percentItem = targetPrice > 0 ? (totalItem / targetPrice) * 100 : 0
                                                
                                                return (
                                                    <div key={cond.id} className="bg-white border rounded-md p-2 shadow-sm relative group">
                                                        <button 
                                                            onClick={() => removeCondition(cond.id)}
                                                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-600"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>

                                                        <div className="grid gap-2">
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div className="col-span-2">
                                                                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Vencimento</label>
                                                                    <Input 
                                                                        type="date" 
                                                                        className="h-7 text-xs px-1"
                                                                        value={cond.vencimento}
                                                                        onChange={e => updateCondition(cond.id, 'vencimento', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Parcelas</label>
                                                                    <Input 
                                                                        type="number" 
                                                                        className="h-7 text-xs px-1 text-center"
                                                                        value={cond.qtdeParcelas}
                                                                        onChange={e => updateCondition(cond.id, 'qtdeParcelas', Number(e.target.value))}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-muted-foreground uppercase font-bold">Valor Parcela</label>
                                                                <MoneyInput 
                                                                    value={cond.valorParcela}
                                                                    onChange={v => updateCondition(cond.id, 'valorParcela', v)}
                                                                    className="h-7 text-xs font-bold"
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
                    </CardContent>
                    
                    <div className="p-4 border-t bg-white flex justify-end gap-3">
                        <Button variant="outline" onClick={handleResetToStandard}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Tabela Padrão
                        </Button>
                        <Button variant="outline" onClick={handleClear} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="mr-2 h-4 w-4" /> Limpar Tudo
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700 w-48" onClick={handleSave}>
                            <Save className="mr-2 h-4 w-4" /> Salvar Proposta
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    )
}