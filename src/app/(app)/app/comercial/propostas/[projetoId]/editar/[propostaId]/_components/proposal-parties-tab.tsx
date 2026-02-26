"use client"

import { useState, useMemo } from "react"
import { ProposalFullDetail, ProposalPartyItem, saveProposalParties } from "@/app/actions/commercial-proposals"
import { getEntitiesPaginated } from "@/app/actions/entities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Users, UserPlus, Link2, Trash2, Save, Lock, Unlock, AlertTriangle, Loader2, UserCog } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

import { DataLookupModal, LookupColumn } from "@/components/shared/data-lookup-modal"
import { EntityFormModal } from "@/components/shared/entity-form-modal"

interface Props {
  proposal: ProposalFullDetail
  initialParties: ProposalPartyItem[]
}

const PARTICIPACAO_OPCOES = [
    { value: 'COMPRADOR', label: 'Comprador Principal' },
    { value: 'CO_COMPRADOR', label: 'Co-Comprador' },
    { value: 'CONJUGE', label: 'Cônjuge' },
    { value: 'AVALISTA', label: 'Avalista / Fiador' },
    { value: 'PROCURADOR', label: 'Procurador' },
]

const ORDEM_QUALIFICACAO: Record<string, number> = {
    'COMPRADOR': 1,
    'CO_COMPRADOR': 2,
    'CONJUGE': 3,
    'AVALISTA': 4,
    'PROCURADOR': 5,
}

export function ProposalPartiesTab({ proposal, initialParties }: Props) {
    const router = useRouter()
    
    // --- ESTADOS PRINCIPAIS ---
    const [parties, setParties] = useState<ProposalPartyItem[]>(initialParties)
    // Trava de Segurança
    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
    // Se está formalizando, NUNCA destrava. Se está aprovado, destrava se o usuário clicar.
    const [isUnlocked, setIsUnlocked] = useState(proposal.status !== 'APROVADO' && !isFormalizing)
    const [isPending, setIsPending] = useState(false)
    
    // --- ESTADOS DOS MODAIS ---
    const [isLookupOpen, setIsLookupOpen] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [entityIdToEdit, setEntityIdToEdit] = useState<string | null>(null)
    const [partyToDelete, setPartyToDelete] = useState<string | null>(null)

    // Agrupa e calcula informações globais
    const groupedParties = useMemo(() => {
        const groups: Record<number, ProposalPartyItem[]> = {}
        
        parties.forEach(p => {
            if (!groups[p.numGrupo]) groups[p.numGrupo] = []
            groups[p.numGrupo].push(p)
        })

        // Ordena os cards dentro de cada grupo em tempo real
        Object.keys(groups).forEach(key => {
            groups[Number(key)].sort((a, b) => {
                const pesoA = ORDEM_QUALIFICACAO[a.tipoParticipacao] || 99
                const pesoB = ORDEM_QUALIFICACAO[b.tipoParticipacao] || 99
                return pesoA - pesoB
            })
        })

        return groups
    }, [parties])

    const maxGroupNumber = parties.length > 0 ? Math.max(...parties.map(p => p.numGrupo)) : 0
    const allGroupNumbers = Array.from(new Set(parties.map(p => p.numGrupo))).sort()

    // --- MÁSCARA DE EXIBIÇÃO ---
    const formatDoc = (doc: string, tipo: string) => {
        const d = doc.replace(/\D/g, '')
        if (tipo === 'PF' && d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
        if (tipo === 'PJ' && d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
        return doc
    }

    // --- COMPACTADOR DE GRUPOS ---
    const normalizeGroups = (list: ProposalPartyItem[]) => {
        const uniqueGroups = Array.from(new Set(list.map(p => p.numGrupo))).sort((a, b) => a - b)
        return list.map(p => ({ ...p, numGrupo: uniqueGroups.indexOf(p.numGrupo) + 1 }))
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
        
        let newParties = [...parties]
        const selectedIds = selectedFromModal.map(s => s.id)
        
        // 1. Remove quem foi desmarcado no modal
        newParties = newParties.filter(p => selectedIds.includes(p.entidadeId))

        // 2. Adiciona os novos
        const existingEntityIds = newParties.map(p => p.entidadeId)
        const added = selectedFromModal.filter(s => !existingEntityIds.includes(s.id))

        const newGroupNum = newParties.length > 0 ? Math.max(...newParties.map(p => p.numGrupo)) + 1 : 1

        const addedParties = added.map((ent, idx) => ({
            id: crypto.randomUUID(),
            entidadeId: ent.id,
            nome: ent.nome,
            documento: ent.documento,
            tipoEntidade: ent.tipo,
            tipoParticipacao: (newParties.length === 0 && idx === 0) ? 'COMPRADOR' : 'CO_COMPRADOR', 
            percParticipacao: (newParties.length === 0 && idx === 0) ? 100 : 0, 
            isResponsavel: (newParties.length === 0 && idx === 0), 
            numGrupo: newGroupNum
        }))

        setParties(normalizeGroups([...newParties, ...addedParties]))
    }

    // Para o modal saber quem já está marcado
    const currentMappedParties = parties.map(p => ({
        id: p.entidadeId,
        nome: p.nome,
        documento: p.documento,
        tipo: p.tipoEntidade
    }))

    // --- AÇÕES DO GRID ---
    const updateParty = (id: string, field: keyof ProposalPartyItem, value: string | number | boolean) => {
        if (!isUnlocked) return
        
        // Regra de Ouro: Apenas 1 responsável principal por grupo
        if (field === 'isResponsavel' && value === true) {
            const partyTarget = parties.find(p => p.id === id)
            if (!partyTarget) return
            
            setParties(parties.map(p => {
                if (p.numGrupo === partyTarget.numGrupo) {
                    return { ...p, isResponsavel: p.id === id }
                }
                return p
            }))
            return
        }

        // NOVA REGRA: Se mudou de grupo, perde a flag de responsável e compacta a numeração
        if (field === 'numGrupo') {
            // "as number" garante ao compilador que este valor será numérico
            const updated = parties.map(p => p.id === id ? { ...p, numGrupo: value as number, isResponsavel: false } : p)
            setParties(normalizeGroups(updated)) 
            return
        }

        // "as ProposalPartyItem" garante que o objeto resultante tem a tipagem perfeita
        setParties(parties.map(p => p.id === id ? ({ ...p, [field]: value } as ProposalPartyItem) : p))
    }

    // Executa a exclusão após o Alert
    const confirmRemoveParty = async () => {
        if (!partyToDelete || !isUnlocked) return
        
        let newParties = parties.filter(p => p.id !== partyToDelete)
        newParties = normalizeGroups(newParties) // <-- Normaliza a lista após excluir
        
        setParties(newParties)
        setPartyToDelete(null)

        // Lógica: Se excluiu a última, Auto-Save pra efetivar no banco
        if (newParties.length === 0) {
            //toast.info("Última parte removida. Atualizando dados...")
            await performSave(newParties)
        }
    }

    // --- VALIDAÇÃO E SALVAMENTO ---
    const performSave = async (payloadToSave: ProposalPartyItem[]) => {
        // Soma a participação de TODOS os vínculos, independente da qualificação
        const totalPerc = payloadToSave
            .reduce((acc, curr) => acc + Number(curr.percParticipacao), 0)

        if (payloadToSave.length > 0 && Math.abs(totalPerc - 100) > 0.01) {
            toast.error(`A soma da Participação (%) de todas as partes deve ser exata 100%. Atual: ${totalPerc}%`)
            return false
        }

        if (payloadToSave.length > 0 && !payloadToSave.some(p => p.isResponsavel)) {
            toast.error("Selecione ao menos um Responsável Principal em algum grupo.")
            return false
        }

        setIsPending(true)
        const unlockTriggered = proposal.status === 'APROVADO' && isUnlocked
        const res = await saveProposalParties(proposal.id, payloadToSave, unlockTriggered)
        
        if (res.success) {
            toast.success(res.message)
            router.refresh()
        } else {
            toast.error(res.message)
        }
        setIsPending(false)
        return res.success
    }

    const handleSave = () => performSave(parties)

    return (
        <div className="space-y-4">
            
            {/* Modal de Busca (Lookup) */}
            <DataLookupModal 
                isOpen={isLookupOpen}
                onClose={() => setIsLookupOpen(false)}
                onConfirm={handleSyncEntities}
                fetchData={getEntitiesPaginated}
                columns={lookupColumns}
                title="Vincular Entidades"
                description="Busque e selecione os clientes que farão parte desta proposta."
                multiSelect={true}
                initialSelected={currentMappedParties}
            />

            {/* Modal de Cadastro/Edição Rápida */}
            <EntityFormModal 
                isOpen={isCreateOpen}
                onClose={() => { setIsCreateOpen(false); setEntityIdToEdit(null); }}
                entityIdToEdit={entityIdToEdit}
                onSuccess={(newEntity) => {
                    if (entityIdToEdit) {
                        // Atualiza a visualização da tela se foi edição
                        setParties(parties.map(p => p.entidadeId === newEntity.id ? { ...p, nome: newEntity.nome } : p))
                    } else {
                        // Se foi novo cadastro, vincula ele na tela
                        handleSyncEntities([...currentMappedParties, newEntity])
                    }
                }}
            />

            {/* Modal Confirmação de Exclusão */}
            <AlertDialog open={!!partyToDelete} onOpenChange={(open) => !open && setPartyToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover vínculo</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover esta entidade da proposta?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemoveParty} className="bg-red-600 hover:bg-red-700">Sim, remover</AlertDialogAction>
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
                        <Users className="w-5 h-5 text-blue-600" /> Qualificação das Partes
                    </h2>
                    <p className="text-sm text-muted-foreground">Adicione e configure a participação de cada cliente na aquisição.</p>
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
            {parties.length === 0 ? (
                <Card className="border-dashed border-2 shadow-none bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-1">Nenhum comprador vinculado</h3>
                        <p className="text-sm text-slate-500 mb-6 max-w-md text-center">
                            Você precisa vincular as partes envolvidas (Compradores, Cônjuges, Avalistas) para prosseguir com a emissão do contrato.
                        </p>
                        <div className="flex gap-2">
                            <Button disabled={!isUnlocked} onClick={() => setIsLookupOpen(true)} variant="outline" className="bg-white">
                                <Link2 className="w-4 h-4 mr-2" /> Vincular Existente
                            </Button>
                            <Button disabled={!isUnlocked} onClick={() => setIsCreateOpen(true)}>
                                <UserPlus className="w-4 h-4 mr-2" /> Cadastrar Novo
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6 mt-4">
                    {/* LISTA DE GRUPOS */}
                    {Object.entries(groupedParties).map(([numGrupo, grupoPartes]) => (
                        <Card key={numGrupo} className={cn("shadow-sm transition-all overflow-visible", !isUnlocked && "opacity-80 grayscale-[0.2]")}>
                            <CardHeader className="py-3 px-4 border-b bg-slate-50 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-700 uppercase">
                                    Grupo Econômico {numGrupo}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 divide-y">
                                {grupoPartes.map(party => (
                                    <div key={party.id} className="p-4 flex flex-col xl:flex-row gap-6 items-start xl:items-center hover:bg-slate-50/50 transition-colors">
                                        
                                        {/* Avatar e Identificação */}
                                        <div className="flex items-center gap-4 flex-1 min-w-[250px]">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", 
                                                party.tipoEntidade === 'PJ' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                                            )}>
                                                {party.tipoEntidade}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 leading-tight truncate">{party.nome}</p>
                                                <p className="text-xs text-slate-500 mt-1 uppercase">Doc: {formatDoc(party.documento, party.tipoEntidade)}</p>
                                            </div>
                                        </div>

                                        {/* Controles de Qualificação */}
                                        <div className="flex flex-wrap md:flex-nowrap items-center gap-4 flex-1">
                                            
                                            <div className="grid gap-1 w-[80px]">
                                                <Label className="text-[10px] uppercase text-slate-500">Grupo</Label>
                                                <Select 
                                                    value={String(party.numGrupo)} 
                                                    onValueChange={v => updateParty(party.id, 'numGrupo', Number(v))} 
                                                    disabled={!isUnlocked}
                                                >
                                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {allGroupNumbers.map(n => (
                                                            <SelectItem key={n} value={String(n)}>G{n}</SelectItem>
                                                        ))}
                                                        <SelectItem value={String(maxGroupNumber + 1)} className="text-blue-600 font-bold">Novo (+)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid gap-1 w-[160px]">
                                                <Label className="text-[10px] uppercase text-slate-500">Qualificação</Label>
                                                <Select value={party.tipoParticipacao} onValueChange={v => updateParty(party.id, 'tipoParticipacao', v)} disabled={!isUnlocked}>
                                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {PARTICIPACAO_OPCOES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid gap-1 w-[100px]">
                                                <Label className="text-[10px] uppercase text-slate-500">Participação</Label>
                                                <div className="relative">
                                                    <Input 
                                                        type="number" 
                                                        className="h-9 pr-6" 
                                                        value={party.percParticipacao}
                                                        onChange={e => updateParty(party.id, 'percParticipacao', Number(e.target.value))}
                                                        disabled={!isUnlocked}
                                                    />
                                                    <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">%</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-4 md:mt-0 w-[140px]">
                                                <Checkbox 
                                                    id={`resp-${party.id}`} 
                                                    checked={party.isResponsavel}
                                                    onCheckedChange={c => updateParty(party.id, 'isResponsavel', c)}
                                                    disabled={!isUnlocked}
                                                />
                                                <Label htmlFor={`resp-${party.id}`} className="text-xs font-semibold cursor-pointer leading-tight">
                                                    Responsável<br/>Principal
                                                </Label>
                                            </div>
                                        </div>

                                        {/* Ação */}
                                        <div className="ml-auto flex gap-2">
                                            <TooltipProvider delayDuration={300}>
                                                {isUnlocked && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => { setEntityIdToEdit(party.entidadeId); setIsCreateOpen(true); }}>
                                                                <UserCog className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Editar Entidade</TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {isUnlocked && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setPartyToDelete(party.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Remover Vínculo</TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                    
                    {/* RODAPÉ DE AÇÃO */}
                    {isUnlocked && (
                        <div className="flex justify-between items-center pt-4">
                            <div className="text-sm text-muted-foreground">
                                Lembre-se: A soma das participações dos Compradores deve fechar em 100%.
                            </div>
                            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 min-w-[200px]" onClick={handleSave} disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                {isPending ? "Salvando..." : "Salvar Qualificações"}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}