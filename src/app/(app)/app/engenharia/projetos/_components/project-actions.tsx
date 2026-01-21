"use client"

import { Button } from "@/components/ui/button"
import { Pencil, Trash2, PlusCircle, Eye } from "lucide-react"
import { deleteProject } from "@/app/actions/projects"
import { toast } from "sonner"
import Link from "next/link"
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

interface Props {
  mode: "create" | "edit"
  project?: { id: string; nome: string }
  permissions?: {
    canCreate?: boolean
    canEdit?: boolean
    canDelete?: boolean
  }
}

export function ProjectActions({ mode, project, permissions = { canCreate: true, canEdit: true, canDelete: true } }: Props) {
  
  const handleDelete = async () => {
    if (!project) return
    const res = await deleteProject(project.id)
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
  }

  // --- MODO CRIAÇÃO (Botão Novo) ---
  if (mode === "create") {
    // Se não tiver permissão de criar, nem renderiza o botão
    if (!permissions.canCreate) return null

    return (
      <Link href="/app/engenharia/projetos/novo">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </Link>
    )
  }

  // --- MODO EDIÇÃO (Botões da Tabela) ---
  // Lógica do Ícone: Se pode editar = Lápis (Azul), Se só ver = Olho (Cinza/Padrão)
  const ActionIcon = permissions.canEdit ? Pencil : Eye
  const actionLabel = permissions.canEdit ? "Editar Projeto" : "Visualizar Projeto"
  const iconColor = permissions.canEdit ? "text-blue-600" : "text-gray-500"

  return (
    <div className="flex items-center justify-end gap-2">
      <TooltipProvider>
        
        {/* Botão Editar / Visualizar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={`/app/engenharia/projetos/${project?.id}`}>
              <Button variant="ghost" size="icon">
                <ActionIcon className={`h-4 w-4 ${iconColor}`} />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>{actionLabel}</TooltipContent>
        </Tooltip>

        {/* Botão Excluir (Só aparece se tiver permissão) */}
        {permissions.canDelete && (
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Excluir Projeto</TooltipContent>
            </Tooltip>
            
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Projeto?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong>{project?.nome}</strong>?
                  Esta ação é irreversível e pode afetar históricos financeiros.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Confirmar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

      </TooltipProvider>
    </div>
  )
}