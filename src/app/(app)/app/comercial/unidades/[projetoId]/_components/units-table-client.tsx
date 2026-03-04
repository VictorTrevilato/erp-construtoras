"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, Edit2, Plus, Trash2, Eye } from "lucide-react"
import { UnitFormDialog } from "./unit-form-dialog"
import { BlocksManager } from "./blocks-manager"
import { deleteUnit } from "@/app/actions/commercial-units"
import { toast } from "sonner"
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

interface Block {
  id: string
  nome: string
}

interface Unit {
  id: string
  unidade: string
  andar: number | null
  blocoId: string
  blocoNome: string
  tipo: string
  
  statusComercial: string
  statusInterno: string
  qtdeVagas: number
  
  tipoVaga: string | null
  tipoDeposito: string | null
  
  areaDeposito: string | number
  
  areaPrivativaPrincipal: string
  areaOutrasPrivativas: string
  areaPrivativaTotal: string
  areaUsoComum: string
  areaRealTotal: string
  coeficienteProporcionalidade: string
  fracaoIdealTerreno: string
}

const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPONIVEL': return 'bg-success/20 text-success hover:bg-success/30 border-success/30'
      case 'VENDIDO': return 'bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30'
      case 'RESERVADO': return 'bg-warning/20 text-warning hover:bg-warning/30 border-warning/30'
      case 'EM_ANALISE': return 'bg-info/20 text-info hover:bg-info/30 border-info/30'
      default: return 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
    }
}

const formatStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        'DISPONIVEL': 'DISPONÍVEL',
        'RESERVADO': 'RESERVADO',
        'VENDIDO': 'VENDIDO',
        'EM_ANALISE': 'EM ANÁLISE',
        'BLOQUEADO': 'BLOQUEADO'
    }
    return map[status] || status
}

export function UnitsTableClient({ units, blocks, projetoId }: { units: Unit[], blocks: Block[], projetoId: string }) {
  const [filterText, setFilterText] = useState("")
  const [filterBlock, setFilterBlock] = useState("ALL")
  const [filterStatus, setFilterStatus] = useState("ALL")
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleCreate = () => {
    setEditingUnit(null)
    setIsReadOnly(false)
    setIsModalOpen(true)
  }

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit)
    setIsReadOnly(false)
    setIsModalOpen(true)
  }

  const handleView = (unit: Unit) => {
    setEditingUnit(unit)
    setIsReadOnly(true)
    setIsModalOpen(true)
  }

  const confirmDelete = async () => {
      if (!deleteId) return
      const res = await deleteUnit(deleteId)
      if(res.success) toast.success(res.message)
      else toast.error(res.message)
      setDeleteId(null)
  }

  const filteredUnits = units.filter(unit => {
    const matchesText = unit.unidade.toLowerCase().includes(filterText.toLowerCase())
    const matchesBlock = filterBlock === "ALL" || unit.blocoId === filterBlock
    const matchesStatus = filterStatus === "ALL" || unit.statusComercial === filterStatus
    return matchesText && matchesBlock && matchesStatus
  })

  return (
    <TooltipProvider>
      <div className="flex justify-between items-center mb-4">
        <BlocksManager projetoId={projetoId} blocks={blocks} />
        <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nova Unidade
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row gap-4 p-4 border-b bg-muted/30">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por número..." 
                className="pl-8 bg-background"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <Select value={filterBlock} onValueChange={setFilterBlock}>
              <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Bloco" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Blocos</SelectItem>
                {blocks.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Status Comercial" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Status</SelectItem>
                <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                <SelectItem value="RESERVADO">Reservado</SelectItem>
                <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                <SelectItem value="VENDIDO">Vendido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {/* [ATUALIZAÇÃO] Removido width fixo */}
                <TableHead>Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                {/* [ATUALIZAÇÃO] Vagas saiu, Área Priv, Comum e Total entraram na ordem */}
                <TableHead className="text-right">Área Priv.</TableHead>
                <TableHead className="text-right">Área Com.</TableHead>
                <TableHead className="text-right">Área Total</TableHead>
                <TableHead className="text-right">Fração Ideal</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
              ) : (
                filteredUnits.map((unit) => (
                  <TableRow key={unit.id} className="hover:bg-muted/50">
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">{unit.blocoNome}</span>
                          <span className="font-bold text-base text-foreground">{unit.unidade}</span>
                          {unit.statusInterno !== 'DISPONIVEL' && (
                             <span className="text-[10px] text-warning font-medium">{unit.statusInterno}</span>
                          )}
                       </div>
                    </TableCell>

                    <TableCell>
                        <Badge className={getStatusColor(unit.statusComercial)}>
                            {formatStatusLabel(unit.statusComercial)}
                        </Badge>
                    </TableCell>

                    <TableCell className="text-muted-foreground">{unit.tipo}</TableCell>
                    
                    {/* [ATUALIZAÇÃO] Colunas de Área reordenadas e Área Total inclusa */}
                    <TableCell className="text-right text-muted-foreground">{unit.areaPrivativaTotal || "-"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{unit.areaUsoComum || "-"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{unit.areaRealTotal || "-"}</TableCell>
                    
                    <TableCell className="text-right text-muted-foreground">{unit.fracaoIdealTerreno || "-"}</TableCell>

                    <TableCell className="text-right">
                       <div className="flex justify-end gap-1">
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => handleView(unit)}>
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Ver Detalhes</TooltipContent>
                           </Tooltip>

                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => handleEdit(unit)}>
                                  <Edit2 className="h-4 w-4 text-primary" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Editar</TooltipContent>
                           </Tooltip>

                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => setDeleteId(unit.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Excluir</TooltipContent>
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

      <UnitFormDialog 
        projetoId={projetoId}
        unit={editingUnit} 
        blocks={blocks}
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        readOnly={isReadOnly}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Unidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} variant="destructive">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </TooltipProvider>
  )
}