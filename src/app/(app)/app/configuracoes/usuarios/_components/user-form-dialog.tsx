"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { saveUser, UserFormState } from "@/app/actions/users"
import { useActionState, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { 
  Loader2, 
  Building2, 
  Home, 
  HardHat, 
  Folder, 
  Landmark, 
  CircleDashed,
  CornerDownRight,
  ShieldCheck,
  Upload,
  KeyRound,
  Lock,
  Ban,
  CheckCircle2,
  MinusCircle,
  Eye,
  EyeOff
} from "lucide-react"

interface ScopeOption {
  id: string
  nome: string
  tipo: string
  nivel: number
  caminho: string
}

interface RoleOption {
  id: string
  nome: string
}

interface PermissionOption {
  id: string
  codigo: string
  descricao: string
  categoria: string
}

interface UserData {
  usuarioEmpresaId: string
  usuarioGlobalId: string
  nome: string
  email: string
  cargoId: string
  escoposAtuais: string[]
  permissoesExtras: Record<string, boolean>
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingUser: UserData | null
  allRoles: RoleOption[]
  allScopes: ScopeOption[]
  allPermissions: PermissionOption[]
}

const initialState: UserFormState = { message: "", errors: {} }

const SCOPE_CONFIG: Record<string, { icon: React.ElementType, color: string }> = {
  HOLDING:      { icon: Landmark,    color: "text-indigo-600" },
  MATRIZ:       { icon: Building2,   color: "text-blue-600" },
  FILIAL:       { icon: Home,        color: "text-purple-600" },
  OBRA:         { icon: HardHat,     color: "text-orange-600" },
  DEPARTAMENTO: { icon: Folder,      color: "text-gray-600" },
}

export function UserFormDialog({ open, onOpenChange, editingUser, allRoles, allScopes, allPermissions }: UserFormDialogProps) {
  const saveWithId = saveUser.bind(null, editingUser?.usuarioEmpresaId || null)
  const [state, formAction, isPending] = useActionState(saveWithId, initialState)
  
  // --- ESTADO CONTROLADO ---
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    cargoId: "",
    password: "",
    confirmPassword: ""
  })

  // Estado para Escopos (Array de IDs)
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  
  // Estado para Permissões (Mapa: ID -> "ALLOW" | "DENY" | "INHERIT")
  const [permissionsData, setPermissionsData] = useState<Record<string, string>>({})

  // Controles Visuais
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  // Sincronização Inicial
  useEffect(() => {
    if (open) {
      if (editingUser) {
        // Modo Edição
        setFormData({
          nome: editingUser.nome || "",
          email: editingUser.email || "",
          cargoId: editingUser.cargoId || "",
          password: "",
          confirmPassword: ""
        })
        setSelectedScopes(editingUser.escoposAtuais)
        
        // Inicializa Permissões
        const initialPerms: Record<string, string> = {}
        if (editingUser.permissoesExtras) {
            Object.entries(editingUser.permissoesExtras).forEach(([id, val]) => {
                if (val === true) initialPerms[id] = "ALLOW"
                if (val === false) initialPerms[id] = "DENY"
            })
        }
        setPermissionsData(initialPerms)
        
        setShowPasswordFields(false)
      } else {
        // Modo Criação
        setFormData({
            nome: "",
            email: "",
            cargoId: "",
            password: "",
            confirmPassword: ""
        })
        setSelectedScopes([])
        setPermissionsData({})
        setShowPasswordFields(true)
      }
      setShowPass(false)
      setShowConfirmPass(false)
    }
  }, [open, editingUser])

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
      onOpenChange(false)
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state, onOpenChange])

  // --- Lógica de Cascata (Escopos) ---
  const implicitSelectedScopes = useMemo(() => {
    const implicitIds = new Set<string>()
    selectedScopes.forEach(selectedId => {
      const parentScope = allScopes.find(s => s.id === selectedId)
      if (!parentScope) return
      allScopes.forEach(scope => {
        if (scope.id !== parentScope.id && scope.caminho.startsWith(parentScope.caminho)) {
          implicitIds.add(scope.id)
        }
      })
    })
    return implicitIds
  }, [selectedScopes, allScopes])

  const handleScopeToggle = (scopeId: string) => {
    const targetScope = allScopes.find(s => s.id === scopeId)
    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(prev => prev.filter(id => id !== scopeId))
    } else {
      setSelectedScopes(prev => {
        const newSelection = [...prev, scopeId]
        if (targetScope) {
           return newSelection.filter(existingId => {
             if (existingId === scopeId) return true
             const existingScope = allScopes.find(s => s.id === existingId)
             if (!existingScope) return true
             const isChildOfNewTarget = existingScope.caminho.startsWith(targetScope.caminho)
             return !isChildOfNewTarget
           })
        }
        return newSelection
      })
    }
  }

  // Helper para atualizar permissões
  const handlePermissionChange = (permId: string, value: string) => {
      setPermissionsData(prev => {
          if (value === "INHERIT") {
              const newState = { ...prev }
              delete newState[permId]
              return newState
          }
          return { ...prev, [permId]: value }
      })
  }

  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.categoria]) acc[perm.categoria] = []
    acc[perm.categoria].push(perm)
    return acc
  }, {} as Record<string, PermissionOption[]>)
  const sortedCategories = Object.keys(groupedPermissions).sort()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          <DialogDescription>
            Gerencie o acesso, escopos e exceções de permissão.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex-1 flex flex-col min-h-0">
          
          {/* --- INPUTS OCULTOS --- */}
          <input type="hidden" name="nome" value={formData.nome} />
          {/* Email também vai no hidden para não perder o valor no submit */}
          <input type="hidden" name="email" value={formData.email} />
          <input type="hidden" name="cargoId" value={formData.cargoId} />
          {showPasswordFields && (
            <>
                <input type="hidden" name="password" value={formData.password} />
                <input type="hidden" name="confirmPassword" value={formData.confirmPassword} />
            </>
          )}

          {selectedScopes.map(scopeId => (
             <input key={`hidden-scope-${scopeId}`} type="hidden" name="escopos" value={scopeId} />
          ))}

          {Object.entries(permissionsData).map(([permId, value]) => (
             <input key={`hidden-perm-${permId}`} type="hidden" name={`perm_${permId}`} value={value} />
          ))}


          <Tabs defaultValue="geral" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 shrink-0">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
                <TabsTrigger value="escopos">Escopos</TabsTrigger>
                <TabsTrigger value="permissoes">Exceções de Acesso</TabsTrigger>
              </TabsList>
            </div>

            {/* ABA 1: DADOS GERAIS */}
            <TabsContent value="geral" className="flex-1 flex-col min-h-0 data-[state=active]:flex">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border-2 border-dashed border-gray-300">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gray-50 text-gray-400">
                      <Upload className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">Foto de Perfil</h4>
                    <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Máx 2MB.</p>
                    <Button type="button" variant="outline" size="sm" disabled className="h-8 text-xs">
                      Alterar Foto (Em breve)
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input 
                      id="nome" 
                      placeholder="Ex: João da Silva" 
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      required
                    />
                    {state.errors?.nome && <p className="text-xs text-red-500">{state.errors.nome[0]}</p>}
                  </div>

                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label htmlFor="email">E-mail</Label>
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="joao@empresa.com" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      // [AJUSTE] Bloqueia se estiver editando
                      disabled={!!editingUser}
                      className={editingUser ? "bg-muted text-muted-foreground" : ""}
                    />
                    {/* [AJUSTE] Texto explicativo */}
                    {editingUser && (
                        <p className="text-[10px] text-muted-foreground">O e-mail não pode ser alterado.</p>
                    )}
                    {state.errors?.email && <p className="text-xs text-red-500">{state.errors.email[0]}</p>}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="cargo">Cargo / Função</Label>
                    <Select 
                        key={formData.cargoId}
                        value={formData.cargoId || ""} 
                        onValueChange={(val) => setFormData({...formData, cargoId: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allRoles.map(role => (
                          <SelectItem key={role.id} value={role.id.toString()}>{role.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {state.errors?.cargoId && <p className="text-xs text-red-500">{state.errors.cargoId[0]}</p>}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-gray-500" />
                      Credenciais de Acesso
                    </Label>
                    {editingUser && !showPasswordFields && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-blue-600 hover:text-blue-700 h-8"
                        onClick={() => setShowPasswordFields(true)}
                      >
                        Redefinir Senha
                      </Button>
                    )}
                    {editingUser && showPasswordFields && (
                      <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-gray-500 h-8"
                          onClick={() => {
                              setShowPasswordFields(false)
                              setFormData({...formData, password: "", confirmPassword: ""})
                          }}
                      >
                          Cancelar alteração
                      </Button>
                    )}
                  </div>

                  {showPasswordFields && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md border">
                      <div className="space-y-2">
                        <Label htmlFor="password">Nova Senha</Label>
                        <div className="relative">
                          <Input 
                            id="password" 
                            type={showPass ? "text" : "password"}
                            placeholder="Mínimo 6 caracteres"
                            className="pr-10"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                          </button>
                        </div>
                        {state.errors?.password && <p className="text-xs text-red-500">{state.errors.password[0]}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                        <div className="relative">
                          <Input 
                            id="confirmPassword" 
                            type={showConfirmPass ? "text" : "password"}
                            placeholder="Digite novamente"
                            className="pr-10"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                          </button>
                        </div>
                        {state.errors?.confirmPassword && <p className="text-xs text-red-500">{state.errors.confirmPassword[0]}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: ESCOPOS */}
            <TabsContent value="escopos" className="flex-1 flex-col min-h-0 data-[state=active]:flex p-6 pt-2 gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800 flex items-start gap-2 shrink-0">
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção:</strong> Ao selecionar um escopo pai, o acesso aos filhos é concedido automaticamente.
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border rounded-md bg-gray-50/50">
                <div className="p-2 space-y-1">
                  {allScopes.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum escopo cadastrado.</p>}
                  
                  {allScopes.map(scope => {
                    const config = SCOPE_CONFIG[scope.tipo] || { icon: CircleDashed, color: "text-slate-500" }
                    const Icon = config.icon
                    const indent = (scope.nivel - 1) * 24
                    
                    const isExplicitlySelected = selectedScopes.includes(scope.id)
                    const isImplicitlySelected = implicitSelectedScopes.has(scope.id)
                    const isChecked = isExplicitlySelected || isImplicitlySelected

                    return (
                      <div 
                        key={scope.id} 
                        className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                          isImplicitlySelected ? "bg-gray-100 opacity-70" : "hover:bg-gray-100"
                        }`}
                        style={{ paddingLeft: `${indent + 8}px` }}
                      >
                        {scope.nivel > 1 && <CornerDownRight className="w-3 h-3 text-gray-300 shrink-0" />}
                        
                        <Checkbox 
                          id={`scope-${scope.id}`}
                          checked={isChecked}
                          disabled={isImplicitlySelected} 
                          onCheckedChange={() => handleScopeToggle(scope.id)}
                          className={isImplicitlySelected ? "data-[state=checked]:bg-gray-400 border-gray-300" : ""}
                        />
                        
                        <Label 
                          htmlFor={`scope-${scope.id}`} 
                          className={`flex items-center gap-2 flex-1 ${isImplicitlySelected ? "cursor-default text-muted-foreground" : "cursor-pointer"}`}
                        >
                          <Icon className={`w-4 h-4 ${config.color}`} />
                          <span className="font-medium text-sm">
                            {scope.nome} 
                            {isImplicitlySelected && <span className="text-[10px] font-normal ml-2 text-gray-400">(Herdado)</span>}
                          </span>
                          
                          <Badge variant="outline" className="text-[10px] h-5 px-1 font-normal text-muted-foreground ml-auto">
                            {scope.tipo}
                          </Badge>
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: PERMISSÕES */}
            <TabsContent value="permissoes" className="flex-1 flex-col min-h-0 data-[state=active]:flex p-6 pt-2 gap-4">
               <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800 flex items-start gap-2 shrink-0">
                <Lock className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <strong>Exceções de Acesso:</strong> Configure permissões que fogem à regra do Cargo selecionado.
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border rounded-md bg-white">
                <div className="divide-y">
                    {sortedCategories.map(category => (
                        <div key={category} className="p-0">
                            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 border-b z-10">
                                {category}
                            </div>
                            <div className="divide-y">
                                {groupedPermissions[category].map(perm => {
                                    const currentVal = permissionsData[perm.id] || "INHERIT"

                                    return (
                                        <div key={perm.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50">
                                            <div className="space-y-0.5">
                                                <div className="text-sm font-medium">
                                                    {perm.descricao.replace(/Visualizar Menu - |Visualizar Módulo - /, "")}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-mono">
                                                    {perm.codigo}
                                                </div>
                                            </div>
                                            
                                            <Select 
                                                value={currentVal}
                                                onValueChange={(val) => handlePermissionChange(perm.id, val)}
                                            >
                                                <SelectTrigger className="w-[130px] h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="INHERIT">
                                                        <div className="flex items-center gap-2 text-gray-500">
                                                            <MinusCircle className="w-3 h-3" /> Padrão
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="ALLOW">
                                                        <div className="flex items-center gap-2 text-green-600">
                                                            <CheckCircle2 className="w-3 h-3" /> Permitir
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="DENY">
                                                        <div className="flex items-center gap-2 text-red-600">
                                                            <Ban className="w-3 h-3" /> Negar
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            </TabsContent>

          </Tabs>

          <DialogFooter className="p-6 border-t bg-gray-50 mt-auto shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}