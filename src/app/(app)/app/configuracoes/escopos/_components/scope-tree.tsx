"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Building2, 
  Home, 
  HardHat, 
  Folder, 
  Plus, 
  Pencil, 
  Trash2, 
  CornerDownRight, 
  Landmark, 
  CircleDashed 
} from "lucide-react"
import { deleteScope } from "@/app/actions/scopes"
import { useState } from "react"
import { toast } from "sonner"
import { ScopeFormDialog } from "./scope-form-dialog"
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

type ScopeItem = {
  id: string
  nome: string
  tipo: string
  idPai: string | null
  caminho: string
  nivel: number
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType, color: string, label: string }> = {
  HOLDING:      { icon: Landmark,    color: "text-primary bg-primary/10", label: "Holding" },
  MATRIZ:       { icon: Building2,   color: "text-info bg-info/10",     label: "Matriz" },
  FILIAL:       { icon: Home,        color: "text-success bg-success/10", label: "Filial" },
  OBRA:         { icon: HardHat,     color: "text-warning bg-warning/10", label: "Obra" },
  DEPARTAMENTO: { icon: Folder,      color: "text-muted-foreground bg-muted",     label: "Depto." },
}

export function ScopeTree({ scopes }: { scopes: ScopeItem[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingScope, setEditingScope] = useState<ScopeItem | null>(null)
  const [parentForNew, setParentForNew] = useState<string | null>(null)

  const [scopeToDelete, setScopeToDelete] = useState<ScopeItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreateRoot = () => {
    setEditingScope(null)
    setParentForNew(null)
    setIsModalOpen(true)
  }

  const handleAddChild = (parentId: string) => {
    setEditingScope(null)
    setParentForNew(parentId)
    setIsModalOpen(true)
  }

  const handleEdit = (scope: ScopeItem) => {
    setParentForNew(null)
    setEditingScope(scope)
    setIsModalOpen(true)
  }

  const handleDeleteClick = (scope: ScopeItem) => {
    setScopeToDelete(scope)
  }

  const confirmDelete = async () => {
    if (!scopeToDelete) return
    setIsDeleting(true)
    try {
      const res = await deleteScope(scopeToDelete.id)
      if (res.success) {
        toast.success(res.message)
        setScopeToDelete(null)
      } else {
        toast.error(res.message)
      }
    } catch {
      toast.error("Erro ao excluir.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreateRoot}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Raiz
        </Button>
      </div>

      <div className="space-y-1">
        {scopes.length === 0 && (
          <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-lg bg-muted/50">
            Nenhum escopo definido. Comece criando sua Holding ou Matriz.
          </div>
        )}

        <TooltipProvider delayDuration={300}>
          {scopes.map((scope) => {
            const config = TYPE_CONFIG[scope.tipo] || { 
              icon: CircleDashed, 
              color: "text-muted-foreground bg-muted", 
              label: scope.tipo 
            }
            
            const Icon = config.icon
            const indent = (scope.nivel - 1) * 32 

            return (
              <div 
                key={scope.id} 
                className="flex items-center group relative hover:bg-muted/50 p-2 rounded-md transition-colors border border-transparent hover:border-border"
                style={{ marginLeft: `${indent}px` }}
              >
                {scope.nivel > 1 && (
                  <CornerDownRight className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                )}

                <div className={`p-2 rounded-md mr-3 shrink-0 ${config.color}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{scope.nome}</span>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground shrink-0">
                      {config.label}
                    </Badge>
                  </div>
                  
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5 hidden group-hover:block truncate">
                    Path: {scope.caminho}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-foreground" onClick={() => handleAddChild(scope.id)}>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Adicionar filho</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10" onClick={() => handleEdit(scope)}>
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar escopo</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(scope)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir escopo</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )
          })}
        </TooltipProvider>
      </div>
      
      <ScopeFormDialog 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        parentId={parentForNew}
        editingScope={editingScope}
        allScopes={scopes} 
      />

      <AlertDialog open={!!scopeToDelete} onOpenChange={(open) => !open && setScopeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá o escopo <strong className="text-foreground">{scopeToDelete?.nome}</strong>. 
              <br/>Isso não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}