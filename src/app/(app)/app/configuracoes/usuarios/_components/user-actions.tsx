"use client"

import { Button } from "@/components/ui/button"
import { Pencil, Trash2, PlusCircle } from "lucide-react"
import { useState } from "react"
import { UserFormDialog } from "./user-form-dialog"
import { removeUser } from "@/app/actions/users"
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

// --- Tipagem Completa e Segura ---

// Esta interface deve bater com o que vem do 'getUsers' (backend) 
// e com o que o 'UserFormDialog' espera.
interface UserProp {
  usuarioEmpresaId: string
  usuarioGlobalId: string
  nome: string
  email: string
  cargoId: string
  escoposAtuais: string[]
  permissoesExtras: Record<string, boolean>
  // Campos opcionais que vêm da listagem mas não são usados no form direto
  cargoNome?: string
  ativo?: boolean
}

interface RoleProp {
  id: string
  nome: string
}

interface ScopeProp {
  id: string
  nome: string
  tipo: string
  nivel: number
  caminho: string
}

interface PermissionProp {
  id: string
  codigo: string
  descricao: string
  categoria: string
}

interface Props {
  mode: "create" | "edit"
  user?: UserProp 
  roles: RoleProp[]
  scopes: ScopeProp[]
  allPermissions: PermissionProp[]
}

export function UserActions({ mode, user, roles, scopes, allPermissions }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  
  const handleDelete = async () => {
    if (!user) return
    const res = await removeUser(user.usuarioEmpresaId)
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
  }

  // [CORREÇÃO] Removemos a variável 'userDataForDialog' que não estava sendo usada.

  if (mode === "create") {
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
        <UserFormDialog 
          open={isOpen} 
          onOpenChange={setIsOpen} 
          editingUser={null}
          allRoles={roles}
          allScopes={scopes}
          allPermissions={allPermissions}
        />
      </>
    )
  }

  // Mode Edit
  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
                <Pencil className="h-4 w-4 text-blue-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar Usuário</TooltipContent>
          </Tooltip>

          <AlertDialog>
             <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Revogar Acesso</TooltipContent>
            </Tooltip>
            
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revogar acesso?</AlertDialogTitle>
                <AlertDialogDescription>
                  O usuário <strong>{user?.nome}</strong> perderá o acesso a esta empresa imediatamente.
                  O cadastro global dele não será excluído.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TooltipProvider>
      </div>

      <UserFormDialog 
        open={isOpen} 
        onOpenChange={setIsOpen} 
        // [CORREÇÃO] Removemos o 'as any'. Como UserProp agora tem a estrutura correta,
        // o TypeScript aceita passar 'user' (ou null se undefined).
        editingUser={user || null} 
        allRoles={roles}
        allScopes={scopes}
        allPermissions={allPermissions}
      />
    </>
  )
}