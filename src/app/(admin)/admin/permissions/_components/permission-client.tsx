'use client'

import { useState, useActionState, useTransition, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createPermission, updatePermission, deletePermission, ActionState } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  ArrowUpDown, ArrowUp, ArrowDown, Pencil 
} from 'lucide-react'

type Permission = {
  id: string
  codigo: string
  descricao: string
  categoria: string
  sysCreatedAt: Date | string
}

type Meta = {
  page: number; pageSize: number; total: number; totalPages: number
}

export function PermissionClient({ initialData, meta }: { initialData: Permission[], meta?: Meta }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // States
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<Permission | null>(null)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')

  // Efeito para preencher form na edição
  useEffect(() => {
    if (editingItem) {
      setIsDialogOpen(true)
    }
  }, [editingItem])

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) setTimeout(() => setEditingItem(null), 300)
  }

  // Server Action
  // [CORREÇÃO] Removemos '| null' do tipo e inicializamos com um objeto válido no final
  const [state, formAction, isSaving] = useActionState(async (prev: ActionState, formData: FormData) => {
    let result;
    if (editingItem) {
      formData.append('id', editingItem.id)
      result = await updatePermission(prev, formData)
    } else {
      result = await createPermission(prev, formData)
    }

    if (result.success) {
      toast.success(result.message)
      setIsDialogOpen(false)
      setEditingItem(null)
    } else {
      toast.error(result.message)
    }
    return result
  }, { success: false, message: '' }) // <--- Inicialização válida (não nula)

  const confirmDelete = async () => {
    if (!deleteId) return
    const result = await deletePermission(deleteId)
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    setDeleteId(null)
  }

  // Navegação e Filtros (Reaproveitado)
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
            <h1 className="text-3xl font-bold tracking-tight">Permissões</h1>
            <p className="text-muted-foreground">Dicionário global de ações do sistema.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingItem(null)}>
                <Plus className="mr-2 h-4 w-4" /> Nova Permissão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar Permissão' : 'Nova Permissão'}</DialogTitle>
                <DialogDescription>Defina uma regra de acesso (Ex: FINANCEIRO_VER).</DialogDescription>
              </DialogHeader>
              <form action={formAction} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="codigo">Código (Slug)</Label>
                  <Input 
                    id="codigo" name="codigo" 
                    defaultValue={editingItem?.codigo || ''} 
                    placeholder="EX: FINANCEIRO_CRIAR" 
                    className="uppercase font-mono"
                    required 
                  />
                  {state?.errors?.codigo && <p className="text-sm text-red-500">{state.errors.codigo}</p>}
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição Legível</Label>
                  <Input 
                    id="descricao" name="descricao" 
                    defaultValue={editingItem?.descricao || ''} 
                    placeholder="Permite criar novos registros financeiros" 
                    required 
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input 
                    id="categoria" name="categoria" 
                    defaultValue={editingItem?.categoria || ''} 
                    placeholder="Ex: Financeiro, Obras, Administrativo" 
                    required 
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Salvando...' : (editingItem ? 'Atualizar' : 'Criar')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search" placeholder="Buscar código ou descrição..." className="pl-8"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch} disabled={isPending}>Buscar</Button>
        </div>

        <div className="border rounded-md relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('codigo')}>
                  <div className="flex items-center">Código {getSortIcon('codigo')}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('descricao')}>
                  <div className="flex items-center">Descrição {getSortIcon('descricao')}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('categoria')}>
                  <div className="flex items-center">Categoria {getSortIcon('categoria')}</div>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : initialData.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhuma permissão encontrada.</TableCell></TableRow>
              ) : (
                initialData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground text-xs">{item.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-muted/50">{item.codigo}</Badge>
                    </TableCell>
                    <TableCell>{item.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.categoria}</Badge>
                    </TableCell>
                    
                    {/* AÇÕES COM TOOLTIPS */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" 
                              onClick={() => setEditingItem(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors" 
                              onClick={() => setDeleteId(item.id)}
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

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="Excluir Permissão"
          description="Atenção: Se esta permissão estiver em uso por algum Cargo, a exclusão será bloqueada."
          confirmText="Excluir"
          variant="destructive"
          onConfirm={confirmDelete}
        />
      </div>
    </TooltipProvider>
  )
}