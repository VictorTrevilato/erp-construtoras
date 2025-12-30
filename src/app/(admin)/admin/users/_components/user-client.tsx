'use client'

import { useState, useActionState, useTransition, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
// [CORREÇÃO] Importar ActionState
import { createUser, updateUser, deleteUser, changeUserPassword, sendUserResetEmail, ActionState } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  Trash2, Plus, Search, ChevronLeft, ChevronRight, 
  ArrowUpDown, ArrowUp, ArrowDown, Pencil, KeyRound, Mail, ShieldAlert, User
} from 'lucide-react'

// Tipos
type UserData = {
  id: string
  nome: string
  email: string
  ativo: boolean
  isSuperAdmin: boolean
  ultimoLogin: Date | string | null
  sysCreatedAt: Date | string
}

type Meta = {
  page: number; pageSize: number; total: number; totalPages: number
}

export function UserClient({ initialData, meta }: { initialData: UserData[], meta?: Meta }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // --- States Gerais ---
  const [isMainDialogOpen, setIsMainDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  
  // States para Ações Específicas
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [resetEmailId, setResetEmailId] = useState<string | null>(null)
  
  // States para Troca de Senha Manual
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')

  // State do Form Principal
  const [ativo, setAtivo] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')

  // Preencher Form ao Editar
  useEffect(() => {
    if (editingUser) {
      setIsMainDialogOpen(true)
      setAtivo(editingUser.ativo)
      setIsSuperAdmin(editingUser.isSuperAdmin)
    } else {
      setAtivo(true)
      setIsSuperAdmin(false)
    }
  }, [editingUser])

  const handleMainDialogChange = (open: boolean) => {
    setIsMainDialogOpen(open)
    if (!open) setTimeout(() => setEditingUser(null), 300)
  }

  // --- SERVER ACTIONS ---

  // 1. Create / Update
  // [CORREÇÃO] Tipagem ActionState e inicialização não-nula
  const [state, formAction, isSaving] = useActionState(async (prev: ActionState, formData: FormData) => {
    let result;
    if (editingUser) {
      formData.append('id', editingUser.id)
      result = await updateUser(prev, formData)
    } else {
      result = await createUser(prev, formData)
    }

    if (result.success) {
      toast.success(result.message)
      setIsMainDialogOpen(false)
      setEditingUser(null)
    } else {
      toast.error(result.message)
    }
    return result
  }, { success: false, message: '' })

  // 2. Troca de Senha Manual
  const handlePasswordChange = async () => {
    if (!passwordUserId || !newPassword) return
    const result = await changeUserPassword(passwordUserId, newPassword)
    if (result.success) {
      toast.success(result.message)
      setIsPasswordDialogOpen(false)
      setPasswordUserId(null)
      setNewPassword('')
    } else {
      toast.error(result.message)
    }
  }

  // 3. Enviar Email Reset
  const handleSendReset = async () => {
    if (!resetEmailId) return
    const result = await sendUserResetEmail(resetEmailId)
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    setResetEmailId(null)
  }

  // 4. Deletar
  const confirmDelete = async () => {
    if (!deleteId) return
    const result = await deleteUser(deleteId)
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    setDeleteId(null)
  }

  // --- NAVEGAÇÃO (Reutilizável) ---
  const updateUrl = (params: URLSearchParams) => {
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }
  const handleSearch = () => {
    const params = new URLSearchParams(searchParams)
    if (searchTerm) params.set('search', searchTerm)
    else params.delete('search')
    params.set('page', '1')
    updateUrl(params)
  }
  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', p.toString())
    updateUrl(params)
  }
  const handlePageSizeChange = (s: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('pageSize', s)
    params.set('page', '1')
    updateUrl(params)
  }
  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams)
    const currentSort = params.get('sortBy')
    const currentDir = params.get('sortDir')
    if (currentSort === field) {
      if (currentDir === 'asc') params.set('sortDir', 'desc')
      else { params.delete('sortBy'); params.delete('sortDir') }
    } else {
      params.set('sortBy', field); params.set('sortDir', 'asc')
    }
    updateUrl(params)
  }
  const getSortIcon = (field: string) => {
    const currentSort = searchParams.get('sortBy')
    const currentDir = searchParams.get('sortDir')
    if (currentSort !== field) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />
    return currentDir === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-primary" /> : <ArrowDown className="ml-2 h-4 w-4 text-primary" />
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">Gestão de identidades e acessos globais.</p>
          </div>
          
          {/* MODAL PRINCIPAL (CRIAR/EDITAR) */}
          <Dialog open={isMainDialogOpen} onOpenChange={handleMainDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingUser(null)}>
                <Plus className="mr-2 h-4 w-4" /> Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
                <DialogDescription>Dados de acesso ao sistema.</DialogDescription>
              </DialogHeader>
              <form action={formAction} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input id="nome" name="nome" defaultValue={editingUser?.nome || ''} required />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail (Login)</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingUser?.email || ''} required />
                  {state?.errors?.email && <p className="text-sm text-red-500">{state.errors.email}</p>}
                </div>

                {/* Senha só aparece na CRIAÇÃO */}
                {!editingUser && (
                  <div className="grid gap-2">
                    <Label htmlFor="password">Senha Inicial</Label>
                    <Input id="password" name="password" type="password" required />
                    {state?.errors?.password && <p className="text-sm text-red-500">{state.errors.password}</p>}
                  </div>
                )}

                <div className="flex flex-col gap-4 py-2">
                  <div className="flex items-center justify-between border p-3 rounded-md">
                     <div className="space-y-0.5">
                        <Label className="text-base">Ativo</Label>
                        <p className="text-xs text-muted-foreground">Pode realizar login no sistema.</p>
                     </div>
                     <input type="hidden" name="ativo" value={ativo ? 'on' : 'off'} />
                     <Switch checked={ativo} onCheckedChange={setAtivo} />
                  </div>

                  <div className="flex items-center justify-between border p-3 rounded-md border-purple-100 bg-purple-50/50">
                     <div className="space-y-0.5">
                        <Label className="text-base text-purple-900">Super Admin</Label>
                        <p className="text-xs text-purple-700/70">Acesso irrestrito ao sistema (VHF).</p>
                     </div>
                     <input type="hidden" name="isSuperAdmin" value={isSuperAdmin ? 'on' : 'off'} />
                     <Switch checked={isSuperAdmin} onCheckedChange={setIsSuperAdmin} />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Salvando...' : (editingUser ? 'Atualizar' : 'Criar')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* SEARCH */}
        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search" placeholder="Buscar nome ou e-mail..." className="pl-8"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch} disabled={isPending}>Buscar</Button>
        </div>

        {/* TABLE */}
        <div className="border rounded-md relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">ID</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('nome')}>
                  <div className="flex items-center">Nome {getSortIcon('nome')}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('email')}>
                  <div className="flex items-center">E-mail {getSortIcon('email')}</div>
                </TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                 Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                 ))
              ) : initialData.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhum usuário encontrado.</TableCell></TableRow>
              ) : (
                initialData.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="text-muted-foreground text-xs">{user.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                           <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium pt-0.5">{user.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.isSuperAdmin ? (
                        <Badge className="bg-purple-600 hover:bg-purple-700 flex w-fit items-center gap-1">
                          <ShieldAlert className="h-3 w-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.ativo ? 
                        <Badge className="bg-emerald-600 hover:bg-emerald-700">Ativo</Badge> : 
                        <Badge variant="destructive" className="bg-rose-600 hover:bg-rose-700">Inativo</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.ultimoLogin ? new Date(user.ultimoLogin).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-1">
                        
                        {/* Enviar E-mail Reset - Tooltip */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50" 
                              onClick={() => setResetEmailId(user.id)}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enviar E-mail de Recuperação</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Trocar Senha Manual - Tooltip */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-amber-500 hover:text-amber-600 hover:bg-amber-50" 
                              onClick={() => { setPasswordUserId(user.id); setIsPasswordDialogOpen(true); }}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Alterar Senha Manualmente</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Editar - Tooltip */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10" 
                              onClick={() => setEditingUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Excluir - Tooltip */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50" 
                              onClick={() => setDeleteId(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Excluir</p>
                          </TooltipContent>
                        </Tooltip>

                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINAÇÃO */}
        {meta && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mostrar</span>
              <Select defaultValue={meta.pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>registros</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Página {meta.page} de {meta.totalPages || 1}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => handlePageChange(meta.page - 1)} disabled={meta.page <= 1 || isPending}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => handlePageChange(meta.page + 1)} disabled={meta.page >= meta.totalPages || isPending}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAIS DE AÇÃO --- */}

        {/* Confirmar Exclusão */}
        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="Excluir Usuário"
          description="Tem certeza? O usuário perderá o acesso imediatamente."
          confirmText="Excluir"
          variant="destructive"
          onConfirm={confirmDelete}
        />

        {/* Confirmar Envio de Email */}
        <ConfirmDialog
          open={!!resetEmailId}
          onOpenChange={(open) => !open && setResetEmailId(null)}
          title="Enviar E-mail de Senha"
          description="Deseja enviar um e-mail com instruções de recuperação de senha para este usuário?"
          confirmText="Enviar E-mail"
          variant="default"
          onConfirm={handleSendReset}
        />

        {/* Modal Troca de Senha Manual */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Senha Manualmente</DialogTitle>
              <DialogDescription>Defina uma nova senha para este usuário.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handlePasswordChange}>Alterar Senha</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}