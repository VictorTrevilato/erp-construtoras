"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Trash2, Plus, AlertCircle, CheckCircle2 } from "lucide-react"
import { saveFlows } from "@/app/actions/commercial-prices"
import { toast } from "sonner"

// --- TIPOS ---
type Flow = {
    id?: string
    localId: number
    tipo: string
    percentual: number
    qtdeParcelas: number
    periodicidade: number // 1=Mensal, 0=Unica, 7=Semanal, 15=Quinzenal, etc.
    dataPrimeiroVencimento: string
}

// --- COMPONENTE DE INPUT COM MÁSCARA ---
interface FlowInputProps {
    value: number
    onChange: (val: number) => void
    decimals: number
    suffix?: string
}

function FlowInput({ value, onChange, decimals, suffix }: FlowInputProps) {
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
            <Input 
                className="h-9 bg-white border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-right pr-8"
                value={displayValue}
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
            />
            {suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-medium">
                    {suffix}
                </span>
            )}
        </div>
    )
}

// --- COMPONENTE PRINCIPAL ---

type ServerFlow = Omit<Flow, 'dataPrimeiroVencimento' | 'localId'> & { dataPrimeiroVencimento: Date, id: string }

export function FlowManager({ tabelaId, initialFlows }: { tabelaId: string, initialFlows: ServerFlow[] }) {
    const [flows, setFlows] = useState<Flow[]>(
        initialFlows.map((f, i) => ({ 
            ...f, 
            localId: i, 
            dataPrimeiroVencimento: new Date(f.dataPrimeiroVencimento).toISOString().split('T')[0] 
        }))
    )
    const [isSaving, setIsSaving] = useState(false)

    const addFlow = () => {
        setFlows([...flows, {
            localId: Date.now(),
            tipo: "MENSAL",
            percentual: 0,
            qtdeParcelas: 1,
            periodicidade: 1,
            dataPrimeiroVencimento: new Date().toISOString().split('T')[0]
        }])
    }

    const removeFlow = (localId: number) => {
        setFlows(flows.filter(f => f.localId !== localId))
    }

    const updateFlow = (localId: number, field: keyof Flow, value: string | number) => {
        setFlows(flows.map(f => f.localId === localId ? { ...f, [field]: value } : f))
    }

    const totalPercent = flows.reduce((acc, curr) => acc + Number(curr.percentual), 0)
    const isValid = Math.abs(totalPercent - 100) < 0.01

    const handleSave = async () => {
        if (!isValid) {
            toast.error(`A soma deve ser 100%. Atual: ${totalPercent.toFixed(2)}%`)
            return
        }
        setIsSaving(true)
        const res = await saveFlows(tabelaId, flows)
        if (res.success) toast.success(res.message)
        else toast.error(res.message)
        setIsSaving(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Condições de Pagamento Padrão</h3>
                <div className={`flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-full ${isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    Total: {totalPercent.toFixed(4).replace('.', ',')}%
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-40">Tipo</TableHead>
                            <TableHead className="w-32">1º Vencimento</TableHead>
                            <TableHead className="w-40">Periodicidade</TableHead>
                            <TableHead className="w-24">Parcelas</TableHead>
                            <TableHead className="w-32">% do Total</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {flows.map((flow) => (
                            <TableRow key={flow.localId}>
                                <TableCell>
                                    <Select 
                                        value={flow.tipo} 
                                        onValueChange={v => updateFlow(flow.localId, 'tipo', v)}
                                    >
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        
                                        {/* [CORREÇÃO] Removidas as classes de scroll/altura para mostrar tudo */}
                                        <SelectContent>
                                            <SelectItem value="ENTRADA">Entrada / Sinal</SelectItem>
                                            <SelectItem value="MENSAL">Mensais</SelectItem>
                                            {/* [CORREÇÃO] Valor alterado para INTERMEDIARIAS para salvar corretamente */}
                                            <SelectItem value="INTERMEDIARIAS">Intermediárias</SelectItem>
                                            <SelectItem value="ANUAL">Anuais</SelectItem>
                                            <SelectItem value="CHAVES">Chaves</SelectItem>
                                            <SelectItem value="FINANCIAMENTO">Financiamento</SelectItem>
                                            <SelectItem value="OUTROS">Outros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        type="date" 
                                        value={flow.dataPrimeiroVencimento} 
                                        onChange={e => updateFlow(flow.localId, 'dataPrimeiroVencimento', e.target.value)}
                                        className="bg-white"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Select 
                                        value={flow.periodicidade.toString()} 
                                        onValueChange={v => updateFlow(flow.localId, 'periodicidade', Number(v))}
                                    >
                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        
                                        {/* [CORREÇÃO] Removidas as classes de scroll/altura */}
                                        <SelectContent>
                                            <SelectItem value="0">Única</SelectItem>
                                            <SelectItem value="7">Semanal</SelectItem>
                                            <SelectItem value="15">Quinzenal</SelectItem>
                                            <SelectItem value="1">Mensal</SelectItem>
                                            <SelectItem value="2">Bimestral</SelectItem>
                                            <SelectItem value="3">Trimestral</SelectItem>
                                            <SelectItem value="6">Semestral</SelectItem>
                                            <SelectItem value="12">Anual</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        value={flow.qtdeParcelas} 
                                        onChange={e => updateFlow(flow.localId, 'qtdeParcelas', Number(e.target.value))}
                                        className="bg-white"
                                    />
                                </TableCell>
                                <TableCell>
                                    <FlowInput 
                                        value={Number(flow.percentual)}
                                        onChange={(v) => updateFlow(flow.localId, 'percentual', v)}
                                        decimals={4}
                                        suffix="%"
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => removeFlow(flow.localId)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline" onClick={addFlow}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Parcela
                </Button>
                <Button onClick={handleSave} disabled={isSaving || !isValid} className="bg-green-600 hover:bg-green-700">
                    {isSaving ? "Salvando..." : "Salvar Fluxo"}
                </Button>
            </div>
        </div>
    )
}