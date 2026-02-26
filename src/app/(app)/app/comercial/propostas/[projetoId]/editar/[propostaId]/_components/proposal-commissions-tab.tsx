"use client"

import { useState } from "react"
import { ProposalFullDetail, ProposalCommissionItem, saveProposalCommissions } from "@/app/actions/commercial-proposals"
import { getEntitiesPaginated } from "@/app/actions/entities"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Briefcase, UserPlus, Link2, Trash2, Save, Lock, Unlock, AlertTriangle, Loader2, UserCog, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

import { DataLookupModal, LookupColumn } from "@/components/shared/data-lookup-modal"
import { EntityFormModal } from "@/components/shared/entity-form-modal"

// --- COMPONENTE INLINE: MONEY INPUT COM EFEITO BLUR MÁGICO ---
interface BlurredMoneyInputProps {
    value: number
    onChange: (val: number) => void
    disabled?: boolean
}

function BlurredMoneyInput({ value, onChange, disabled }: BlurredMoneyInputProps) {
    const displayValue = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "")
        if (!rawValue) { onChange(0); return }
        const floatValue = parseInt(rawValue, 10) / 100
        onChange(floatValue)
    }

    return (
        <div className="relative group w-full cursor-pointer">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold z-10 pointer-events-none">R$</span>
            <Input 
                className="h-9 bg-white border-slate-300 focus:border-blue-500 text-right pl-8 font-semibold text-slate-700"
                value={displayValue}
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
                disabled={disabled}
            />
            {/* O truque do Blur de Privacidade */}
            <div className="absolute inset-0 bg-white/30 backdrop-blur-[4px] group-hover:backdrop-blur-none group-focus-within:backdrop-blur-none transition-all duration-300 pointer-events-none rounded-md border border-transparent flex items-center justify-center opacity-100 group-hover:opacity-0 group-focus-within:opacity-0">
                <EyeOff className="w-4 h-4 text-slate-500/50" />
            </div>
        </div>
    )
}

// --- MAIN COMPONENT ---
interface Props {
  proposal: ProposalFullDetail
  initialCommissions: ProposalCommissionItem[]
}

export function ProposalCommissionsTab({ proposal, initialCommissions }: Props) {
    const router = useRouter()
    
    // --- ESTADOS PRINCIPAIS ---
    const [commissions, setCommissions] = useState<ProposalCommissionItem[]>(initialCommissions)
    // Trava de Segurança
    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
    // Se está formalizando, NUNCA destrava. Se está aprovado, destrava se o usuário clicar.
    const [isUnlocked, setIsUnlocked] = useState(proposal.status !== 'APROVADO' && !isFormalizing)
    const [isPending, setIsPending] = useState(false)
    
    // --- ESTADOS DOS MODAIS ---
    const [isLookupOpen, setIsLookupOpen] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [entityIdToEdit, setEntityIdToEdit] = useState<string | null>(null)
    const [commissionToDelete, setCommissionToDelete] = useState<string | null>(null)

    // --- CÁLCULOS TOTAIS ---
    const valorComissaoTotal = proposal.valorComissaoTotal || 0
    const currentTotalRateio = commissions.reduce((acc, curr) => acc + Number(curr.percRateio), 0)
    const currentTotalValor = commissions.reduce((acc, curr) => acc + Number(curr.valor), 0)

    // --- MÁSCARA DE EXIBIÇÃO ---
    const formatDoc = (doc: string, tipo: string) => {
        const d = doc.replace(/\D/g, '')
        if (tipo === 'PF' && d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
        if (tipo === 'PJ' && d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
        return doc
    }

    // --- LOOKUP SYNC ---
    const lookupColumns: LookupColumn<{ id: string, nome: string, documento: string, tipo: string }>[] = [
        { key: 'nome', label: 'Nome / Razão Social', render: (item) => (
            <div className="flex items-center gap-2">
                <Badge variant="outline" className={item.tipo === 'PJ' ? 'text-indigo-600 bg-indigo-50' : 'text-emerald-600 bg-emerald-50'}>
                    {item.tipo}
                </Badge>
                <span className="font-medium text-slate-800">{item.nome}</span>
            </div>
        )},
        { key: 'documento', label: 'CPF / CNPJ', render: (item) => <span className="text-slate-500 text-sm">{item.documento}</span> }
    ]

    const handleSyncEntities = (selectedFromModal: { id: string, nome: string, documento: string, tipo: string }[]) => {
        if (!isUnlocked) return
        
        let newCommissions = [...commissions]
        const selectedIds = selectedFromModal.map(s => s.id)
        
        // 1. Remove quem foi desmarcado no modal
        newCommissions = newCommissions.filter(c => selectedIds.includes(c.entidadeId))

        // 2. Adiciona os novos
        const existingEntityIds = newCommissions.map(c => c.entidadeId)
        const added = selectedFromModal.filter(s => !existingEntityIds.includes(s.id))

        const addedCommissions = added.map((ent, idx) => {
            const initialPerc = (newCommissions.length === 0 && idx === 0) ? 100 : 0;
            const initialValor = (initialPerc / 100) * valorComissaoTotal;
            
            return {
                id: crypto.randomUUID(),
                entidadeId: ent.id,
                nome: ent.nome,
                documento: ent.documento,
                tipoEntidade: ent.tipo,
                percRateio: initialPerc, 
                valor: initialValor,
                isResponsavel: (newCommissions.length === 0 && idx === 0), 
            }
        })

        setCommissions([...newCommissions, ...addedCommissions])
    }

    const currentMappedCommissions = commissions.map(c => ({
        id: c.entidadeId,
        nome: c.nome,
        documento: c.documento,
        tipo: c.tipoEntidade
    }))

    // --- AÇÕES DO GRID ---
    const updateCommission = (id: string, field: keyof ProposalCommissionItem, value: string | number | boolean) => {
        if (!isUnlocked) return
        
        // Regra: Apenas 1 Agência/Corretor Responsável
        if (field === 'isResponsavel' && value === true) {
            setCommissions(commissions.map(c => ({ ...c, isResponsavel: c.id === id } as ProposalCommissionItem)))
            return
        }

        // Lógica de cálculo cruzado bidirecional
        if (field === 'percRateio') {
            const perc = Number(value) || 0
            const calculatedValor = (perc / 100) * valorComissaoTotal
            setCommissions(commissions.map(c => c.id === id ? ({ ...c, percRateio: perc, valor: calculatedValor } as ProposalCommissionItem) : c))
            return
        }

        if (field === 'valor') {
            const val = Number(value) || 0
            const calculatedPerc = valorComissaoTotal > 0 ? (val / valorComissaoTotal) * 100 : 0
            // Limita a 2 casas decimais visualmente sem truncar a precisão no JS
            const roundedPerc = Number(calculatedPerc.toFixed(2))
            setCommissions(commissions.map(c => c.id === id ? ({ ...c, valor: val, percRateio: roundedPerc } as ProposalCommissionItem) : c))
            return
        }

        setCommissions(commissions.map(c => c.id === id ? ({ ...c, [field]: value } as ProposalCommissionItem) : c))
    }

    const confirmRemoveCommission = async () => {
        if (!commissionToDelete || !isUnlocked) return
        
        const newCommissions = commissions.filter(c => c.id !== commissionToDelete)
        setCommissions(newCommissions)
        setCommissionToDelete(null)

        if (newCommissions.length === 0) {
            await performSave(newCommissions)
        }
    }

    // --- VALIDAÇÃO E SALVAMENTO ---
    const performSave = async (payloadToSave: ProposalCommissionItem[]) => {
        const sumRateio = payloadToSave.reduce((acc, curr) => acc + Number(curr.percRateio), 0)
        const sumValor = payloadToSave.reduce((acc, curr) => acc + Number(curr.valor), 0)

        // Trava matemática (usamos tolerância de 0.05 para margens de arredondamento de centavos)
        if (payloadToSave.length > 0) {
            if (Math.abs(sumRateio - 100) > 0.05) {
                toast.error(`A soma do Rateio (%) deve ser exatos 100%. Atual: ${sumRateio.toFixed(2)}%`)
                return false
            }
            if (Math.abs(sumValor - valorComissaoTotal) > 0.05) {
                toast.error(`A soma dos valores está divergente do Total da Comissão.`)
                return false
            }
        }

        if (payloadToSave.length > 0 && !payloadToSave.some(c => c.isResponsavel)) {
            toast.error("Selecione um Corretor ou Imobiliária como Responsável.")
            return false
        }

        setIsPending(true)
        const unlockTriggered = proposal.status === 'APROVADO' && isUnlocked
        const res = await saveProposalCommissions(proposal.id, payloadToSave, unlockTriggered)
        
        if (res.success) {
            toast.success(res.message)
            router.refresh()
        } else {
            toast.error(res.message)
        }
        setIsPending(false)
        return res.success
    }

    return (
        <div className="space-y-4">
            
            <DataLookupModal 
                isOpen={isLookupOpen}
                onClose={() => setIsLookupOpen(false)}
                onConfirm={handleSyncEntities}
                fetchData={getEntitiesPaginated}
                columns={lookupColumns}
                title="Vincular Corretores / Imobiliárias"
                description="Busque e selecione os intermediadores desta proposta."
                multiSelect={true}
                initialSelected={currentMappedCommissions}
            />

            <EntityFormModal 
                isOpen={isCreateOpen}
                onClose={() => { setIsCreateOpen(false); setEntityIdToEdit(null); }}
                entityIdToEdit={entityIdToEdit}
                onSuccess={(newEntity) => {
                    if (entityIdToEdit) {
                        setCommissions(commissions.map(c => c.entidadeId === newEntity.id ? { ...c, nome: newEntity.nome } : c))
                    } else {
                        handleSyncEntities([...currentMappedCommissions, newEntity])
                    }
                }}
            />

            <AlertDialog open={!!commissionToDelete} onOpenChange={(open) => !open && setCommissionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover vínculo</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover este intermediador da proposta?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemoveCommission} className="bg-red-600 hover:bg-red-700">Sim, remover</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                    Atenção: Ao salvar, o status retornará para &quot;Em Análise&quot; automaticamente.
                </div>
            )}

            {/* HEADER DE AÇÕES */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-600" /> Intermediação e Comissões
                    </h2>
                    <p className="text-sm text-muted-foreground">Adicione corretores, agências e configure o rateio.</p>
                </div>
                
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-white" disabled={!isUnlocked} onClick={() => setIsLookupOpen(true)}>
                        <Link2 className="w-4 h-4 mr-2" /> Vincular Existente
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" disabled={!isUnlocked} onClick={() => setIsCreateOpen(true)}>
                        <UserPlus className="w-4 h-4 mr-2" /> Cadastrar Novo
                    </Button>
                </div>
            </div>

            {/* EMPTY STATE */}
            {commissions.length === 0 ? (
                <Card className="border-dashed border-2 shadow-none bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <Briefcase className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-1">Nenhum intermediador vinculado</h3>
                        <p className="text-sm text-slate-500 mb-6 max-w-md text-center">
                            Você precisa vincular as agências ou corretores envolvidos na negociação para processar as comissões.
                        </p>
                        <div className="flex gap-2">
                            <Button disabled={!isUnlocked} onClick={() => setIsLookupOpen(true)} variant="outline" className="bg-white">
                                <Link2 className="w-4 h-4 mr-2" /> Vincular Existente
                            </Button>
                            <Button disabled={!isUnlocked} onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <UserPlus className="w-4 h-4 mr-2" /> Cadastrar Novo
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4 mt-4">
                    
                    {/* LISTA DE COMISSÕES */}
                    {commissions.map((commission) => (
                        <Card key={commission.id} className={cn("shadow-sm transition-all overflow-visible", !isUnlocked && "opacity-80 grayscale-[0.2]")}>
                            <CardContent className="p-4 flex flex-col xl:flex-row gap-6 items-start xl:items-center">
                                
                                {/* Avatar e Identificação */}
                                <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-inner border-2", 
                                        commission.tipoEntidade === 'PJ' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                    )}>
                                        {commission.tipoEntidade}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 leading-tight truncate">{commission.nome}</p>
                                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Doc: {formatDoc(commission.documento, commission.tipoEntidade)}</p>
                                    </div>
                                </div>

                                {/* Controles Financeiros */}
                                <div className="flex flex-wrap md:flex-nowrap items-center justify-end gap-6 flex-1 bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                                    
                                    {/* RESPONSÁVEL */}
                                    <div className="flex items-center gap-2 w-[120px]">
                                        <Checkbox 
                                            id={`resp-${commission.id}`} 
                                            checked={commission.isResponsavel}
                                            onCheckedChange={c => updateCommission(commission.id, 'isResponsavel', c)}
                                            disabled={!isUnlocked}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                        <Label htmlFor={`resp-${commission.id}`} className="text-xs font-semibold cursor-pointer leading-tight text-slate-600">
                                            Responsável
                                        </Label>
                                    </div>

                                    {/* RATEIO % */}
                                    <div className="grid gap-1.5 w-[100px]">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400">Rateio</Label>
                                        <div className="relative">
                                            <Input 
                                                type="number" 
                                                className="h-9 pr-7 font-bold text-blue-700 bg-white" 
                                                value={commission.percRateio}
                                                onChange={e => updateCommission(commission.id, 'percRateio', Number(e.target.value))}
                                                disabled={!isUnlocked}
                                            />
                                            <span className="absolute right-2.5 top-2.5 text-xs font-bold text-blue-700/60 pointer-events-none">%</span>
                                        </div>
                                    </div>

                                    {/* VALOR DA COMISSÃO (COM BLUR DE PRIVACIDADE) */}
                                    <div className="grid gap-1.5 w-[160px]">
                                        <Label className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                                            Valor Bruto
                                        </Label>
                                        <BlurredMoneyInput 
                                            value={commission.valor} 
                                            onChange={v => updateCommission(commission.id, 'valor', v)} 
                                            disabled={!isUnlocked}
                                        />
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="ml-auto flex gap-2 pl-2">
                                    <TooltipProvider delayDuration={300}>
                                        {isUnlocked && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => { setEntityIdToEdit(commission.entidadeId); setIsCreateOpen(true); }}>
                                                        <UserCog className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Editar Entidade</TooltipContent>
                                            </Tooltip>
                                        )}
                                        {isUnlocked && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setCommissionToDelete(commission.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Remover Vínculo</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TooltipProvider>
                                </div>

                            </CardContent>
                        </Card>
                    ))}
                    
                    {/* RODAPÉ DE RESUMO E AÇÃO */}
                    {isUnlocked && (
                        <div className="flex flex-col md:flex-row justify-between items-center pt-6 gap-4">
                            
                            {/* Resumo Bloqueado pela Privacidade Visual */}
                            <div className="flex items-center gap-6 bg-slate-50 border rounded-lg px-4 py-3 overflow-x-auto">
                                {/* 1. Rateio */}
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Rateio Total</p>
                                    <p className={cn("text-lg font-black tracking-tight", Math.abs(currentTotalRateio - 100) < 0.05 ? "text-emerald-600" : "text-amber-500")}>
                                        {currentTotalRateio.toFixed(2)}%
                                    </p>
                                </div>
                                
                                <div className="w-px h-8 bg-slate-200"></div>
                                
                                {/* 2. NOVO: Soma Distribuída */}
                                <div className="group relative cursor-pointer min-w-[140px]">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">Soma Distribuída <EyeOff className="w-3 h-3 inline group-hover:hidden" /> <Eye className="w-3 h-3 hidden group-hover:block" /></p>
                                    <p className={cn("text-lg font-black tracking-tight blur-[5px] group-hover:blur-none transition-all duration-300", Math.abs(currentTotalValor - valorComissaoTotal) < 0.05 ? "text-emerald-600" : "text-amber-500")}>
                                        {currentTotalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>

                                <div className="w-px h-8 bg-slate-200"></div>

                                {/* 3. Total Alvo */}
                                <div className="group relative cursor-pointer min-w-[140px]">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">Total Comissões <EyeOff className="w-3 h-3 inline group-hover:hidden" /> <Eye className="w-3 h-3 hidden group-hover:block" /></p>
                                    <p className="text-lg font-black text-slate-700 tracking-tight blur-[5px] group-hover:blur-none transition-all duration-300">
                                        {valorComissaoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                            </div>

                            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 min-w-[200px]" onClick={() => performSave(commissions)} disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                {isPending ? "Salvando..." : "Salvar Intermediação"}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}