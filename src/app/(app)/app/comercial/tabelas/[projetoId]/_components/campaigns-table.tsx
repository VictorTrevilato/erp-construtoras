"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
// [ADICIONADO] Calculator no import
import { Search, Edit2, Plus, Trash2, ArrowRight, Calendar as CalendarIcon, Loader2, Calculator } from "lucide-react"
import { upsertCampaign, deleteCampaign } from "@/app/actions/commercial-prices"
import { toast } from "sonner"
// ... (outros imports mantidos: Dialog, Label, Tooltip, AlertDialog, Link, useRouter) ...
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Campaign {
  id: string
  codigo: string
  nome: string
  vigenciaInicial: Date
  vigenciaFinal: Date
  taxaJuros: number
}

interface Props {
  campaigns: Campaign[]
  projetoId: string
}

export function CampaignsTable({ campaigns, projetoId }: Props) {
  // ... (Hooks de estado, router e lógica de filtro mantidos iguais) ...
  const router = useRouter()
  const [filterText, setFilterText] = useState("")
  const [filterDateStart, setFilterDateStart] = useState("")
  const [filterDateEnd, setFilterDateEnd] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filteredCampaigns = campaigns.filter(c => {
    const matchesText = c.nome.toLowerCase().includes(filterText.toLowerCase()) || 
                        c.codigo.toLowerCase().includes(filterText.toLowerCase())
    let matchesDate = true
    if (filterDateStart) matchesDate = matchesDate && new Date(c.vigenciaInicial) >= new Date(filterDateStart)
    if (filterDateEnd) matchesDate = matchesDate && new Date(c.vigenciaFinal) <= new Date(filterDateEnd)
    return matchesText && matchesDate
  })

  // ... (Handlers: handleCreate, handleEdit, handleSubmit, confirmDelete mantidos iguais) ...
  const handleCreate = () => {
    setEditingCampaign(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    const tabelaId = editingCampaign ? editingCampaign.id : null
    const res = await upsertCampaign(projetoId, tabelaId, formData)
    if (res.success) {
      toast.success(res.message)
      setIsDialogOpen(false)
      router.refresh()
    } else {
      toast.error(res.message)
    }
    setIsPending(false)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    const res = await deleteCampaign(deleteId)
    if (res.success) {
      toast.success(res.message)
      router.refresh()
    } else {
      toast.error(res.message)
    }
    setDeleteId(null)
  }

  // [CORREÇÃO] Formatador de data ajustado para UTC (Bug Fix anterior)
  const fmtDate = (d: Date) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  const fmtDateInput = (d: Date) => d.toISOString().split('T')[0]

  return (
    <TooltipProvider>
      {/* [ALTERAÇÃO] Barra de Topo com Botões alinhados */}
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="sm" className="gap-2" disabled>
             <Calculator className="w-4 h-4" /> Simulador de Venda
        </Button>

        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Nova Tabela
        </Button>
      </div>

      <Card>
        {/* ... (Conteúdo da Tabela e Filtros mantidos iguais) ... */}
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row gap-4 p-4 border-b bg-gray-50/50 items-end">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou código..." 
                className="pl-8 bg-white"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <div className="grid gap-1 flex-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Vigência De</span>
                    <Input type="date" className="bg-white" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} />
                </div>
                <div className="grid gap-1 flex-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Até</span>
                    <Input type="date" className="bg-white" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} />
                </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Código</TableHead>
                <TableHead>Nome da Tabela</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Taxa Juros (a.m)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma tabela encontrada.</TableCell></TableRow>
              ) : (
                filteredCampaigns.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50">
                    <TableCell className="font-bold text-gray-800">{c.codigo}</TableCell>
                    <TableCell className="text-gray-600">{c.nome}</TableCell>
                    <TableCell className="text-gray-600">
                        <div className="flex items-center gap-2">
                           <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                           {fmtDate(c.vigenciaInicial)} até {fmtDate(c.vigenciaFinal)}
                        </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{Number(c.taxaJuros).toFixed(2)}%</TableCell>
                    
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-1">
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" asChild>
                                 <Link href={`/app/comercial/tabelas/${projetoId}/editar/${c.id}`}>
                                    <ArrowRight className="h-4 w-4 text-green-600" />
                                 </Link>
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Acessar Configurações</TooltipContent>
                           </Tooltip>

                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                                  <Edit2 className="h-4 w-4 text-blue-600" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Editar Propriedades</TooltipContent>
                           </Tooltip>

                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Excluir Tabela</TooltipContent>
                           </Tooltip>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Criar/Editar (Mantido igual) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingCampaign ? "Editar Tabela" : "Nova Tabela de Preço"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4 py-2">
                <div className="grid gap-2">
                    <Label>Nome da Campanha</Label>
                    <Input 
                        name="nome" 
                        defaultValue={editingCampaign?.nome} 
                        placeholder="Ex: Tabela Lançamento Torre A" 
                        required 
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Código (SKU)</Label>
                        <Input 
                            name="codigo" 
                            defaultValue={editingCampaign?.codigo} 
                            placeholder="Ex: TAB-LANC-01" 
                            required 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Taxa Juros (a.m)</Label>
                        <div className="relative">
                            <Input 
                                name="taxaJuros" 
                                type="number" 
                                step="0.01"
                                defaultValue={editingCampaign?.taxaJuros} 
                                placeholder="0.00" 
                                className="pr-8"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Vigência Inicial</Label>
                        <Input 
                            name="vigenciaInicial" 
                            type="date" 
                            defaultValue={editingCampaign ? fmtDateInput(editingCampaign.vigenciaInicial) : ""} 
                            required 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Vigência Final</Label>
                        <Input 
                            name="vigenciaFinal" 
                            type="date" 
                            defaultValue={editingCampaign ? fmtDateInput(editingCampaign.vigenciaFinal) : ""} 
                            required 
                        />
                    </div>
                </div>
                
                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Tabela
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* Modal Exclusão (Mantido igual) */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tabela?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tabela? Todos os preços e fluxos configurados nela serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}