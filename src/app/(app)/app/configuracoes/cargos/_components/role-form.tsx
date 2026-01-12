"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useActionState, useEffect } from "react"
import { saveRole, RoleFormState } from "@/app/actions/roles"
import { toast } from "sonner"
import { Loader2, Save, ArrowLeft, CheckSquare, Lock } from "lucide-react"
import Link from "next/link"

// Tipos para os dados que vêm do Server Component
interface Permission {
  id: string
  codigo: string
  descricao: string
  categoria: string
}

interface RoleData {
  id?: string
  nome: string
  descricao?: string | null
  permissoesAtuais: string[] 
}

interface RoleFormProps {
  initialData?: RoleData
  allPermissions: Permission[]
  readOnly?: boolean
}

const initialState: RoleFormState = { message: "", errors: {} }

export function RoleForm({ initialData, allPermissions, readOnly = false }: RoleFormProps) {
  const saveRoleWithId = saveRole.bind(null, initialData?.id || null)
  const [state, formAction, isPending] = useActionState(saveRoleWithId, initialState)

  useEffect(() => {
    if (state.message && !state.success) {
      toast.error(state.message)
    }
  }, [state])

  // Agrupamento de Permissões por Categoria
  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.categoria]) acc[perm.categoria] = []
    acc[perm.categoria].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  // Ordenar categorias alfabeticamente
  const sortedCategories = Object.keys(groupedPermissions).sort()

  return (
    <form action={formAction} className="space-y-8">
      
      {/* Cabeçalho e Botões */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {initialData ? "Editar Cargo" : "Novo Cargo"}
            {readOnly && (
              <Badge variant="outline" className="text-amber-600 border-amber-600 gap-1">
                <Lock className="w-3 h-3"/> Somente Leitura
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            {initialData 
              ? "Visualize ou altere as informações e permissões deste cargo." 
              : "Preencha os dados para criar um novo nível de acesso."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild type="button">
            <Link href="/app/configuracoes/cargos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>

          {!readOnly && (
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Cargo
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Dados Básicos */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Cargo</Label>
              <Input 
                id="nome" 
                name="nome" 
                placeholder="Ex: Engenheiro Residente" 
                defaultValue={initialData?.nome} 
                disabled={readOnly} 
              />
              {state.errors?.nome && <p className="text-sm text-red-500">{state.errors.nome[0]}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (Opcional)</Label>
              <Input 
                id="descricao" 
                name="descricao" 
                placeholder="Ex: Responsável técnico pela obra..." 
                defaultValue={initialData?.descricao || ""} 
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>

        {/* Matriz de Permissões */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Permissões de Acesso
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
            {sortedCategories.map((category) => (
              <Card key={category} className="flex flex-col overflow-hidden">
                <CardHeader className="pb-3 bg-gray-50/50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">{category}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {groupedPermissions[category].length}
                    </Badge>
                  </div>
                </CardHeader>
                
                {/* [AJUSTE DE UI] CardContent sem padding + Div interna com scroll e altura máxima */}
                <CardContent className="p-0">
                  <div className="h-[320px] overflow-y-auto p-4 space-y-4 pr-2">
                    {/* Adicionei 'pr-2' para dar um respiro pro scrollbar não colar no texto */}
                    
                    {groupedPermissions[category].map((perm) => (
                      <div key={perm.id} className="flex items-start space-x-3">
                        <div className="flex items-center h-5">
                            <Checkbox 
                                id={`perm-${perm.id}`} 
                                name="permissions" 
                                value={perm.id} 
                                defaultChecked={initialData?.permissoesAtuais.includes(perm.id)}
                                disabled={readOnly}
                            />
                        </div>
                        <div className="grid gap-1.5 leading-none">
                          <Label 
                            htmlFor={`perm-${perm.id}`} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {perm.descricao.replace("Visualizar Menu - ", "").replace("Visualizar Módulo - ", "")}
                          </Label>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {perm.codigo}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </form>
  )
}