"use client"

import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Eye } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation" // <--- IMPORT DO ROUTER PARA ATUALIZAR A TABELA
import { deletePersonPhysical } from "@/app/actions/persons" // <--- IMPORT DA ACTION DE EXCLUSÃO
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
  id: string
  nome: string
  readOnly?: boolean
}

export function PersonActions({ id, nome, readOnly = false }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      // Chamada real para o banco de dados
      const res = await deletePersonPhysical(id)
      
      if (res.success) {
        toast.success(res.message)
        router.refresh() // <--- Força o Next.js a buscar os dados novamente e sumir com a linha
      } else {
        toast.error(res.message)
      }
    } catch {
      toast.error("Erro ao excluir o registro.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <TooltipProvider>
        
        {/* Botão Editar / Visualizar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={`/app/cadastros/pessoas-fisicas/${id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {readOnly ? (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Pencil className="h-4 w-4 text-primary" />
                )}
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>{readOnly ? "Visualizar" : "Editar"} Cadastro</TooltipContent>
        </Tooltip>

        {/* Botão Excluir */}
        {!readOnly && (
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Excluir Registro</TooltipContent>
            </Tooltip>
            
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Pessoa Física?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong className="text-foreground">{nome}</strong>?
                  Esta ação não poderá ser desfeita se houver vínculos com propostas ou contratos ativos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete} 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

      </TooltipProvider>
    </div>
  )
}