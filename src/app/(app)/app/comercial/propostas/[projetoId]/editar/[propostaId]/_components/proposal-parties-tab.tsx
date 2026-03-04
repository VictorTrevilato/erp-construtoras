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
    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
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
                <Badge variant="outline" className={item.tipo === 'PJ' ? 'text-primary bg-primary/10 border-primary/20' : 'text-info bg-info/10 border-info/20'}>
                    {item.tipo}
                </Badge>
                <span className="font-medium text-foreground">{item.nome}</span>
            </div>
        )},
        { key: 'documento', label: 'CPF / CNPJ', render: (item) => <span className="text-muted-foreground text-sm">{item.documento}</span> }
    ]

    const handleSyncEntities = (selectedFromModal: { id: string, nome: string, documento: string, tipo: string }[]) => {
        if (!isUnlocked) return
        
        let newParties = [...parties]
        const selectedIds = selectedFromModal.map(s => s.id)
        
        newParties = newParties.filter(p => selectedIds.includes(p.entidadeId))

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

    const currentMappedParties = parties.map(p => ({
        id: p.entidadeId,
        nome: p.nome,
        documento: p.documento,
        tipo: p.tipoEntidade
    }))

    // --- AÇÕES DO GRID ---
    const updateParty = (id: string, field: keyof ProposalPartyItem, value: string | number | boolean) => {
        if (!isUnlocked) return
        
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

        if (field === 'numGrupo') {
            const updated = parties.map(p => p.id === id ? { ...p, numGrupo: value as number, isResponsavel: false } : p)
            setParties(normalizeGroups(updated)) 
            return
        }

        setParties(parties.map(p => p.id === id ? ({ ...p, [field]: value } as ProposalPartyItem) : p))
    }

    const confirmRemoveParty = async () => {
        if (!partyToDelete || !isUnlocked) return
        
        let newParties = parties.filter(p => p.id !== partyToDelete)
        newParties = normalizeGroups(newParties) 
        
        setParties(newParties)
        setPartyToDelete(null)

        if (newParties.length === 0) {
            await performSave(newParties)
        }
    }

    // --- VALIDAÇÃO E SALVAMENTO ---
    const performSave = async (payloadToSave: ProposalPartyItem[]) => {
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

            <EntityFormModal 
                isOpen={isCreateOpen}
                onClose={() => { setIsCreateOpen(false); setEntityIdToEdit(null); }}
                entityIdToEdit={entityIdToEdit}
                onSuccess={(newEntity) => {
                    if (entityIdToEdit) {
                        setParties(parties.map(p => p.entidadeId === newEntity.id ? { ...p, nome: newEntity.nome } : p))
                    } else {
                        handleSyncEntities([...currentMappedParties, newEntity])
                    }
                }}
            />

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
                        <AlertDialogAction onClick={confirmRemoveParty} variant="destructive">Sim, remover</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                    Atenção: Ao salvar, o status retornará para &quot;Em Análise&quot; automaticamente.
                </div>
            )}

            {/* HEADER DE AÇÕES */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> Qualificação das Partes
                    </h2>
                    <p className="text-sm text-muted-foreground">Adicione e configure a participação de cada cliente na aquisição.</p>
                </div>
                
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-background" disabled={!isUnlocked} onClick={() => setIsLookupOpen(true)}>
                        <Link2 className="w-4 h-4 mr-2" /> Vincular Existente
                    </Button>
                    <Button disabled={!isUnlocked} onClick={() => setIsCreateOpen(true)}>
                        <UserPlus className="w-4 h-4 mr-2" /> Cadastrar Novo
                    </Button>
                </div>
            </div>

            {/* EMPTY STATE */}
            {parties.length === 0 ? (
                <Card className="border-dashed border-2 shadow-none bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Nenhum comprador vinculado</h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
                            Você precisa vincular as partes envolvidas (Compradores, Cônjuges, Avalistas) para prosseguir com a emissão do contrato.
                        </p>
                        <div className="flex gap-2">
                            <Button disabled={!isUnlocked} onClick={() => setIsLookupOpen(true)} variant="outline" className="bg-background">
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
                        <Card key={numGrupo} className={cn("shadow-sm transition-all overflow-visible border-border", !isUnlocked && "opacity-80 grayscale-[0.2]")}>
                            <CardHeader className="py-3 px-4 border-b bg-muted/30 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-foreground uppercase">
                                    Grupo Econômico {numGrupo}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 divide-y divide-border">
                                {grupoPartes.map(party => (
                                    <div key={party.id} className="p-4 flex flex-col xl:flex-row gap-6 items-start xl:items-center hover:bg-muted/30 transition-colors">
                                        
                                        {/* Avatar e Identificação */}
                                        <div className="flex items-center gap-4 flex-1 min-w-[250px]">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", 
                                                party.tipoEntidade === 'PJ' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-info/20 text-info border border-info/30'
                                            )}>
                                                {party.tipoEntidade}
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground leading-tight truncate">{party.nome}</p>
                                                <p className="text-xs text-muted-foreground mt-1 uppercase">Doc: {formatDoc(party.documento, party.tipoEntidade)}</p>
                                            </div>
                                        </div>

                                        {/* Controles de Qualificação */}
                                        <div className="flex flex-wrap md:flex-nowrap items-center gap-4 flex-1">
                                            
                                            <div className="grid gap-1 w-[80px]">
                                                <Label className="text-[10px] uppercase text-muted-foreground">Grupo</Label>
                                                <Select 
                                                    value={String(party.numGrupo)} 
                                                    onValueChange={v => updateParty(party.id, 'numGrupo', Number(v))} 
                                                    disabled={!isUnlocked}
                                                >
                                                    <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {allGroupNumbers.map(n => (
                                                            <SelectItem key={n} value={String(n)}>G{n}</SelectItem>
                                                        ))}
                                                        <SelectItem value={String(maxGroupNumber + 1)} className="text-primary font-bold">Novo (+)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid gap-1 w-[160px]">
                                                <Label className="text-[10px] uppercase text-muted-foreground">Qualificação</Label>
                                                <Select value={party.tipoParticipacao} onValueChange={v => updateParty(party.id, 'tipoParticipacao', v)} disabled={!isUnlocked}>
                                                    <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {PARTICIPACAO_OPCOES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid gap-1 w-[100px]">
                                                <Label className="text-[10px] uppercase text-muted-foreground">Participação</Label>
                                                <div className="relative">
                                                    <Input 
                                                        type="number" 
                                                        className="h-9 pr-6 bg-background" 
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
                                                <Label htmlFor={`resp-${party.id}`} className="text-xs font-semibold cursor-pointer leading-tight text-foreground">
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
                                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => { setEntityIdToEdit(party.entidadeId); setIsCreateOpen(true); }}>
                                                                <UserCog className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Editar Entidade</TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {isUnlocked && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setPartyToDelete(party.id)}>
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
                            <Button size="lg" className="min-w-[200px]" onClick={handleSave} disabled={isPending}>
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