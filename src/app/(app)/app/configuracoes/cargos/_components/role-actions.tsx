"use client"

import { Button } from "@/components/ui/button"
import { Trash2, Pencil, Eye } from "lucide-react"
import Link from "next/link"
import { deleteRole } from "@/app/actions/roles"
import { usePermission } from "@/providers/permission-provider"
import { useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface RoleActionsProps {
  roleId: string
  userCount: number
}

export function RoleActions({ roleId, userCount }: RoleActionsProps) {
  const { can } = usePermission()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteRole(roleId)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error("Erro inesperado ao excluir.")
    } finally {
      setIsDeleting(false)
    }
  }

  // --- Lógica de Permissões ---
  const canEdit = can("CARGOS_EDITAR")
  const canDelete = can("CARGOS_EXCLUIR")

  // Texto do Tooltip do Botão Principal
  const actionTooltipText = canEdit ? "Editar cargo" : "Visualizar detalhes"

  // Texto e Estado do Botão de Excluir
  const isDeleteDisabled = !canDelete || userCount > 0
  let deleteTooltipText = "Excluir cargo"
  if (userCount > 0) deleteTooltipText = "Não é possível excluir cargos com usuários vinculados."
  if (!canDelete) deleteTooltipText = "Você não tem permissão para excluir."

  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-2">
        
        {/* 1. Botão Ver/Editar com Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/app/configuracoes/cargos/${roleId}`}>
                {canEdit ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{actionTooltipText}</p>
          </TooltipContent>
        </Tooltip>

        {/* 2. Botão Excluir com Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}> 
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={canDelete && !isDeleteDisabled ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-gray-300"}
                    disabled={isDeleteDisabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente o cargo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Excluindo..." : "Sim, excluir cargo"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{deleteTooltipText}</p>
          </TooltipContent>
        </Tooltip>

      </div>
    </TooltipProvider>
  )
}