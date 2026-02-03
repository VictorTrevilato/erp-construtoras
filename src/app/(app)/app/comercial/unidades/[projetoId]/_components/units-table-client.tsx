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
  status: string
  vagas: number
  codigoTabela: string
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
      case 'DISPONIVEL': return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200'
      case 'VENDIDO': return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200'
      case 'RESERVADO': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200'
      case 'BLOQUEADO': return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
}

export function UnitsTableClient({ units, blocks, projetoId }: { units: Unit[], blocks: Block[], projetoId: string }) {
  const [filterText, setFilterText] = useState("")
  const [filterBlock, setFilterBlock] = useState("ALL")
  const [filterStatus, setFilterStatus] = useState("ALL")
  
  // Controle do Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)

  // Controle de Deleção
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
    const matchesStatus = filterStatus === "ALL" || unit.status === filterStatus
    return matchesText && matchesBlock && matchesStatus
  })

  return (
    <TooltipProvider>
      <div className="flex justify-between items-center mb-4">
        <BlocksManager projetoId={projetoId} blocks={blocks} />
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Nova Unidade
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Barra de Filtros */}
          <div className="flex flex-col md:flex-row gap-4 p-4 border-b bg-gray-50/50">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por número..." 
                className="pl-8 bg-white"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <Select value={filterBlock} onValueChange={setFilterBlock}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Bloco" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Blocos</SelectItem>
                {blocks.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Status</SelectItem>
                <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                <SelectItem value="RESERVADO">Reservado</SelectItem>
                <SelectItem value="VENDIDO">Vendido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[180px]">Bloco & Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Andar</TableHead>
                <TableHead className="text-right">Vagas</TableHead>
                <TableHead className="text-right">Área Priv.</TableHead>
                <TableHead className="text-right">Área Comum</TableHead>
                <TableHead className="text-right">Fração Ideal</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
              ) : (
                filteredUnits.map((unit) => (
                  <TableRow key={unit.id} className="hover:bg-slate-50">
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">{unit.blocoNome}</span>
                          <span className="font-bold text-base text-gray-800">{unit.unidade}</span>
                       </div>
                    </TableCell>

                    <TableCell><Badge className={getStatusColor(unit.status)}>{unit.status}</Badge></TableCell>

                    <TableCell className="text-muted-foreground">{unit.tipo}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{unit.andar !== null ? unit.andar : "-"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{unit.vagas || "-"}</TableCell>
                    
                    <TableCell className="text-right text-muted-foreground">{unit.areaPrivativaTotal || "-"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{unit.areaUsoComum || "-"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{unit.fracaoIdealTerreno || "-"}</TableCell>

                    <TableCell className="text-right">
                       <div className="flex justify-end gap-1">
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => handleView(unit)}>
                                  <Eye className="h-4 w-4 text-gray-500" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Ver Detalhes</TooltipContent>
                           </Tooltip>

                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => handleEdit(unit)}>
                                  <Edit2 className="h-4 w-4 text-blue-600" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Editar</TooltipContent>
                           </Tooltip>

                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => setDeleteId(unit.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
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

      {/* Modal de Formulário / Detalhes */}
      <UnitFormDialog 
        projetoId={projetoId}
        unit={editingUnit} 
        blocks={blocks}
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        readOnly={isReadOnly}
      />

      {/* Modal de Confirmação de Exclusão */}
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
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </TooltipProvider>
  )
}