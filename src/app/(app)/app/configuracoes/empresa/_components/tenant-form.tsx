"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useActionState, useEffect, useState } from "react" 
import { updateTenant, TenantFormState } from "@/app/actions/tenant-settings"
import { toast } from "sonner"
import { Loader2, Save, Lock } from "lucide-react" // Adicionei o icone Lock

interface TenantData {
  nome: string
  cnpj: string // <--- Tipagem atualizada
  corPrimaria: string | null
  corSecundaria: string | null
}

const initialState: TenantFormState = { message: "", errors: {} }

export function TenantForm({ initialData }: { initialData: TenantData }) {
  const [state, formAction, isPending] = useActionState(updateTenant, initialState)
  
  const [primaryColor, setPrimaryColor] = useState(initialData.corPrimaria || "#000000")
  const [secondaryColor, setSecondaryColor] = useState(initialData.corSecundaria || "#ffffff")

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state])

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Identidade Visual</CardTitle>
          <CardDescription>
            Personalize o nome e as cores que representam sua empresa no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Grid: Nome e CNPJ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="nome">Nome Fantasia</Label>
              </div>
              
              <Input 
                id="nome" 
                name="nome" 
                defaultValue={initialData.nome} 
                placeholder="Ex: Construtora Exemplo Ltda" 
              />
              {state.errors?.nome && (
                <p className="text-sm text-red-500">{state.errors.nome[0]}</p>
              )}
            </div>

            {/* Campo CNPJ - Bloqueado */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cnpj">CNPJ</Label>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Não editável
                </span>
              </div>
              <Input 
                id="cnpj" 
                value={initialData.cnpj} 
                disabled 
                className="bg-gray-100 text-gray-500 cursor-not-allowed" 
              />
            </div>
          </div>

          {/* Logo (Placeholder) */}
          <div className="space-y-2">
            <Label>Logotipo</Label>
            <div className="flex items-center gap-4 border border-dashed rounded-md p-4 bg-gray-50">
              <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                Logo
              </div>
              <div className="text-sm text-muted-foreground">
                Funcionalidade de upload de logo em breve.
              </div>
            </div>
          </div>

          {/* Cores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="corPrimaria">Cor Primária</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  className="w-12 h-10 p-1 cursor-pointer" 
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
                <Input 
                  id="corPrimaria" 
                  name="corPrimaria" 
                  value={primaryColor} 
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#000000" 
                />
              </div>
              <p className="text-xs text-muted-foreground">Usada na Sidebar e botões principais.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="corSecundaria">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  className="w-12 h-10 p-1 cursor-pointer"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
                <Input 
                  id="corSecundaria" 
                  name="corSecundaria" 
                  value={secondaryColor} 
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#ffffff" 
                />
              </div>
              <p className="text-xs text-muted-foreground">Usada em detalhes e destaques.</p>
            </div>
          </div>

        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-gray-50/50 flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}