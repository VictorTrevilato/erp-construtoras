"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useActionState, useEffect, useState, useRef } from "react" 
import { updateTenant, TenantFormState } from "@/app/actions/tenant-settings"
import { toast } from "sonner"
import { Loader2, Save, Lock, UploadCloud, ImageIcon } from "lucide-react"
import Image from "next/image"

interface TenantData {
  nome: string
  cnpj: string
  corPrimaria: string | null
  corSecundaria: string | null
  logo?: string | null
}

const initialState: TenantFormState = { message: "", errors: {} }

export function TenantForm({ initialData }: { initialData: TenantData }) {
  const [state, formAction, isPending] = useActionState(updateTenant, initialState)
  
  const [primaryColor, setPrimaryColor] = useState(initialData.corPrimaria || "#000000")
  const [secondaryColor, setSecondaryColor] = useState(initialData.corSecundaria || "#ffffff")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData.logo || null)

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state])

  const handleLogoClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem válido.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB.')
        return
      }
      const objectUrl = URL.createObjectURL(file)
      setLogoPreview(objectUrl)
    }
  }

  useEffect(() => {
    return () => {
      if (logoPreview && !logoPreview.startsWith('http')) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Identidade Visual</CardTitle>
          <CardDescription>
            Personalize o nome, logotipo e as cores que representam sua empresa no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Fantasia</Label>
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

          <div className="pt-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Logotipo da Empresa</Label>
                <input 
                  type="file" 
                  name="logo" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handleFileChange}
                />
                <div 
                  onClick={handleLogoClick}
                  className="group relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-slate-50 transition-colors cursor-pointer overflow-hidden h-32"
                >
                  {logoPreview ? (
                    <Image 
                      src={logoPreview} 
                      alt="Preview do Logo" 
                      fill
                      className="object-contain p-2 group-hover:opacity-50 transition-opacity" 
                      unoptimized 
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500 transition-colors">
                      <ImageIcon className="h-8 w-8 mb-2" />
                      <span className="text-xs font-medium">Fazer upload do logotipo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/60 text-white rounded-full p-2">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Formatos suportados: PNG, JPG ou WEBP. Max 5MB.</p>
              </div>

              <div className="space-y-4">
                <Label className="block text-sm font-medium">Cores do Sistema</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="corPrimaria" className="text-xs">Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        className="w-10 h-10 p-1 cursor-pointer shrink-0" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                      />
                      <Input 
                        id="corPrimaria" 
                        name="corPrimaria" 
                        className="h-10 text-sm"
                        value={primaryColor} 
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#000000" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="corSecundaria" className="text-xs">Cor Secundária</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        className="w-10 h-10 p-1 cursor-pointer shrink-0"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                      />
                      <Input 
                        id="corSecundaria" 
                        name="corSecundaria" 
                        className="h-10 text-sm"
                        value={secondaryColor} 
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#ffffff" 
                      />
                    </div>
                  </div>
                </div>
              </div>
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