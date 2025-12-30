'use client'

import { useState, useActionState, useTransition, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
// [CORREÇÃO] Importar ActionState
import { createTenant, updateTenant, deleteTenant, createTenantMasterAccess, getTenantMaster, ActionState } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  Trash2, Plus, Search, ChevronLeft, ChevronRight, Image as ImageIcon, 
  ArrowUpDown, ArrowUp, ArrowDown, Pencil, UserPlus, Dices, Eye, EyeOff,
  UserCheck
} from 'lucide-react'

// Tipos
type Tenant = {
  id: string
  nome: string
  cnpj: string
  sysCreatedAt: Date | string
  ativo: boolean
  corPrimaria: string | null
  corSecundaria: string | null
}

type Meta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function TenantClient({ initialData, meta }: { initialData: Tenant[], meta?: Meta }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // States CRUD
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  
  // States WIZARD MASTER
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [newTenantData, setNewTenantData] = useState<Tenant | null>(null)
  const [masterEmail, setMasterEmail] = useState('')
  const [masterPassword, setMasterPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // States MODAL INFORMATIVO (Admin Já Existe)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [existingMaster, setExistingMaster] = useState<{ nome: string, email: string } | null>(null)
  const [isCheckingMaster, setIsCheckingMaster] = useState(false)

  // States Form Visuais (cor, cnpj, ativo...)
  const [corPrimaria, setCorPrimaria] = useState('#000000')
  const [corSecundaria, setCorSecundaria] = useState('#ffffff')
  const [cnpjValue, setCnpjValue] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')

  // Server Action: Create/Update Tenant
  // [CORREÇÃO] Tipagem ActionState e inicialização não-nula
  const [state, formAction, isSaving] = useActionState(async (prev: ActionState, formData: FormData) => {
    let result;
    if (editingTenant) {
      formData.append('id', editingTenant.id)
      result = await updateTenant(prev, formData)
    } else {
      result = await createTenant(prev, formData)
    }

    if (result.success) {
      toast.success(result.message)
      setIsDialogOpen(false)
      
      // SE FOI CRIAÇÃO, ABRIR WIZARD
      if (!editingTenant && result.data) {
        openWizard(result.data as Tenant)
      }

      setEditingTenant(null)
      resetFormStates()
    } else {
      toast.error(result.message)
    }
    return result
  }, { success: false, message: '' })

  // Server Action: Wizard Master
  // [CORREÇÃO] Removemos a variável '_wizardState' deixando apenas a vírgula
  const [, wizardAction, isWizardSaving] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createTenantMasterAccess(prev, formData)
    if (result.success) {
      toast.success(result.message)
      setIsWizardOpen(false)
      setNewTenantData(null)
      setMasterPassword('')
    } else {
      toast.error(result.message)
    }
    return result
  }, { success: false, message: '' })

  // Lógica Inteligente do Botão UserPlus
  const handleMasterClick = async (tenant: Tenant) => {
    setIsCheckingMaster(true)
    
    const check = await getTenantMaster(tenant.id)
    
    setIsCheckingMaster(false)

    if (check.success && check.data) {
      setExistingMaster(check.data)
      setIsInfoOpen(true)
    } else {
      openWizard(tenant)
    }
  }

  const openWizard = (tenant: Tenant) => {
    setNewTenantData(tenant)
    
    const cleanName = tenant.nome
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")

    setMasterEmail(`admin@${cleanName}.com.br`)
    setIsWizardOpen(true)
  }

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let pass = ""
    for (let i = 0; i < 16; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
    setMasterPassword(pass)
  }
  
  const resetFormStates = () => {
    setCnpjValue('')
    setCorPrimaria('#000000')
    setCorSecundaria('#ffffff')
    setAtivo(true)
  }

  useEffect(() => {
    if (editingTenant) {
      setIsDialogOpen(true)
      setCnpjValue(editingTenant.cnpj)
      setCorPrimaria(editingTenant.corPrimaria || '#000000')
      setCorSecundaria(editingTenant.corSecundaria || '#ffffff')
      setAtivo(editingTenant.ativo)
    } else {
      resetFormStates()
    }
  }, [editingTenant])

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) setTimeout(() => setEditingTenant(null), 300)
  }

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 14) value = value.slice(0, 14)
    setCnpjValue(value)
  }

  const updateUrl = (params: URLSearchParams) => { startTransition(() => { router.push(`${pathname}?${params.toString()}`) }) }
  const handleSearch = () => { const params = new URLSearchParams(searchParams); if (searchTerm) params.set('search', searchTerm); else params.delete('search'); params.set('page', '1'); updateUrl(params) }
  const handlePageChange = (n: number) => { const params = new URLSearchParams(searchParams); params.set('page', n.toString()); updateUrl(params) }
  const handlePageSizeChange = (v: string) => { const params = new URLSearchParams(searchParams); params.set('pageSize', v); params.set('page', '1'); updateUrl(params) }
  const handleSort = (f: string) => { const p = new URLSearchParams(searchParams); const s = p.get('sortBy'); const d = p.get('sortDir'); if (s === f) { if (d === 'asc') p.set('sortDir', 'desc'); else { p.delete('sortBy'); p.delete('sortDir') } } else { p.set('sortBy', f); p.set('sortDir', 'asc') } updateUrl(p) }
  const getSortIcon = (f: string) => { const s = searchParams.get('sortBy'); const d = searchParams.get('sortDir'); if (s !== f) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />; return d === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-primary" /> : <ArrowDown className="ml-2 h-4 w-4 text-primary" /> }
  const confirmDelete = async () => { if (!deleteId) return; const res = await deleteTenant(deleteId); if (res.success) toast.success(res.message); else toast.error(res.message); setDeleteId(null) }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
            <p className="text-muted-foreground">Gestão das empresas e construtoras do sistema.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTenant(null)}>
                <Plus className="mr-2 h-4 w-4" /> Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTenant ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}</DialogTitle>
                <DialogDescription>{editingTenant ? 'Altere os dados da empresa abaixo.' : 'Preencha os dados da construtora.'}</DialogDescription>
              </DialogHeader>
              <form action={formAction} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome Empresarial</Label>
                  <Input id="nome" name="nome" defaultValue={editingTenant?.nome || ''} placeholder="Ex: Construtora Silva" required />
                  {state?.errors?.nome && <p className="text-sm text-red-500">{state.errors.nome}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cnpj">CNPJ (Somente Números)</Label>
                  <Input id="cnpj" name="cnpj" value={cnpjValue} onChange={handleCnpjChange} placeholder="00000000000199" required />
                  {state?.errors?.cnpj && <p className="text-sm text-red-500">{state.errors.cnpj}</p>}
                </div>
                
                {/* TOOLTIP: UPLOAD DESABILITADO */}
                <div className="grid gap-2">
                  <Label htmlFor="logo">Logotipo</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">
                        <Input id="logo" type="file" accept="image/*" disabled title="" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload será ativado na etapa de Infra</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <input type="hidden" name="ativo" value={ativo ? 'on' : 'off'} />
                  <Switch id="ativo-mode" checked={ativo} onCheckedChange={setAtivo} />
                  <Label htmlFor="ativo-mode">Empresa Ativa</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="w-12 p-1 h-9 cursor-pointer" />
                      <Input name="corPrimaria" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="flex-1 uppercase" maxLength={7} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Cor Secundária</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={corSecundaria} onChange={(e) => setCorSecundaria(e.target.value)} className="w-12 p-1 h-9 cursor-pointer" />
                      <Input name="corSecundaria" value={corSecundaria} onChange={(e) => setCorSecundaria(e.target.value)} className="flex-1 uppercase" maxLength={7} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Salvando...' : (editingTenant ? 'Atualizar Empresa' : 'Criar e Configurar Acesso')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-purple-700">
                  <UserPlus className="h-5 w-5" /> Configurar Acesso Master
                </DialogTitle>
                <DialogDescription>
                  {/* [CORREÇÃO] Aspas escapadas */}
                  A empresa <strong>{newTenantData?.nome}</strong> está pronta. <br/>
                  Defina o usuário &quot;Administrador Master&quot;.
                </DialogDescription>
              </DialogHeader>
              <form action={wizardAction} className="space-y-4 py-2">
                <input type="hidden" name="tenantId" value={newTenantData?.id || ''} />
                <div className="grid gap-2">
                  <Label htmlFor="master-nome">Nome do Administrador</Label>
                  <Input id="master-nome" name="nome" defaultValue="Admin Master" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="master-email">E-mail de Login</Label>
                  <div className="flex gap-2">
                    <Input id="master-email" name="email" value={masterEmail} onChange={(e) => setMasterEmail(e.target.value)} placeholder="admin@empresa.com.br" required />
                  </div>
                  <p className="text-xs text-muted-foreground">Sugestão automática baseada no nome da empresa.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="master-pass">Senha de Acesso</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input id="master-pass" name="password" type={showPassword ? "text" : "password"} value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} required />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    {/* TOOLTIP: GERAR SENHA */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="outline" size="icon" onClick={generatePassword}>
                          <Dices className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Gerar Senha Forte</p>
                      </TooltipContent>
                    </Tooltip>

                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsWizardOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isWizardSaving} className="bg-purple-600 hover:bg-purple-700 text-white">{isWizardSaving ? 'Vinculando...' : 'Criar Acesso Master'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-700">
                  <UserCheck className="h-5 w-5" /> Admin Encontrado
                </DialogTitle>
                <DialogDescription>
                  Esta empresa já possui um Administrador configurado.
                </DialogDescription>
              </DialogHeader>
              
              <div className="bg-muted/50 p-4 rounded-md border space-y-3">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Nome do Administrador</Label>
                  <p className="font-medium">{existingMaster?.nome}</p>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">E-mail de Acesso</Label>
                  <p className="font-mono text-sm">{existingMaster?.email}</p>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => setIsInfoOpen(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>

        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar por nome ou CNPJ..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={handleSearch} disabled={isPending}>Buscar</Button>
        </div>

        <div className="border rounded-md relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">ID</TableHead>
                <TableHead className="w-[60px]">Logo</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('nome')}>
                  <div className="flex items-center gap-2">Nome {getSortIcon('nome')}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('cnpj')}>
                  <div className="flex items-center gap-2">CNPJ {getSortIcon('cnpj')}</div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cores</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ))
              ) : initialData.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhum registro encontrado.</TableCell></TableRow>
              ) : (
                initialData.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="text-muted-foreground text-xs">{tenant.id}</TableCell>
                    <TableCell>
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center border"><ImageIcon className="h-4 w-4 text-muted-foreground/50" /></div>
                    </TableCell>
                    <TableCell className="font-medium">{tenant.nome}</TableCell>
                    <TableCell className="text-sm">{tenant.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}</TableCell>
                    <TableCell>
                      {tenant.ativo ? <Badge className="bg-emerald-600 hover:bg-emerald-700">Ativo</Badge> : <Badge variant="destructive" className="bg-rose-600 hover:bg-rose-700">Inativo</Badge>}
                    </TableCell>
                    
                    {/* CORES COM TOOLTIP */}
                    <TableCell>
                      <div className="flex gap-1">
                        {tenant.corPrimaria && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-6 w-6 rounded-full border cursor-help shadow-sm" style={{ backgroundColor: tenant.corPrimaria }} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono uppercase">{tenant.corPrimaria}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {tenant.corSecundaria && (
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-6 w-6 rounded-full border cursor-help shadow-sm" style={{ backgroundColor: tenant.corSecundaria }} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono uppercase">{tenant.corSecundaria}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* COLUNA DE AÇÕES - TOOLTIPS */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-purple-600 hover:text-purple-700 transition-colors"
                              disabled={isCheckingMaster} 
                              onClick={() => handleMasterClick(tenant)}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Configurar Acesso Master</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" 
                              onClick={() => setEditingTenant(tenant)}
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
                              onClick={() => setDeleteId(tenant.id)}
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
                <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => handlePageChange(meta.page - 1)} disabled={meta.page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => handlePageChange(meta.page + 1)} disabled={meta.page >= meta.totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="Excluir Tenant"
          description="Atenção: A exclusão removerá todos os dados vinculados."
          confirmText="Excluir"
          variant="destructive"
          onConfirm={confirmDelete}
        />
      </div>
    </TooltipProvider>
  )
}