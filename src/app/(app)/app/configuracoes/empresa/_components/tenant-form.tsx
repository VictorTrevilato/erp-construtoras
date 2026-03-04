"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useActionState, useEffect, useState, useRef } from "react" 
import { updateTenant, TenantFormState } from "@/app/actions/tenant-settings"
import { toast } from "sonner"
import { Loader2, Save, Lock, UploadCloud, ImageIcon, Palette } from "lucide-react"
import { ImageCropperModal } from "@/components/shared/image-cropper-modal"

// --- FUNCOES MATEMATICAS PARA O LIVE PREVIEW ---
function hexToHslString(hex: string): string {
  hex = hex.replace(/^#/, '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function getContrastForeground(hex: string): string {
  hex = hex.replace(/^#/, '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return yiq >= 128 ? "222.2 84% 4.9%" : "210 40% 98%"
}

const initialState: TenantFormState = { message: "", errors: {} }

export interface TenantInitialData {
  nome: string
  cnpj: string
  corPrimaria?: string | null
  corSecundaria?: string | null
  sidebarTheme?: string | null
  sidebarNavTheme?: string | null
  topbarTheme?: string | null
  buttonsTheme?: string | null
  subButtonsTheme?: string | null
  tooltipsTheme?: string | null
  accentTheme?: string | null
  logo?: string | null
  logoMini?: string | null
  favicon?: string | null
}

export function TenantForm({ initialData }: { initialData: TenantInitialData }) {
  const [state, formAction, isPending] = useActionState(updateTenant, initialState)
  
  const [primaryColor, setPrimaryColor] = useState(initialData.corPrimaria || "#000000")
  const [secondaryColor, setSecondaryColor] = useState(initialData.corSecundaria || "#ffffff")

  const [themes, setThemes] = useState({
    sidebarTheme: initialData.sidebarTheme !== 'secondary',
    sidebarNavTheme: initialData.sidebarNavTheme !== 'secondary',
    topbarTheme: initialData.topbarTheme !== 'secondary',
    buttonsTheme: initialData.buttonsTheme !== 'secondary',
    subButtonsTheme: initialData.subButtonsTheme !== 'secondary',
    tooltipsTheme: initialData.tooltipsTheme !== 'secondary',
    accentTheme: initialData.accentTheme !== 'secondary',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropTarget, setCropTarget] = useState<'logo' | 'logoMini' | 'favicon' | null>(null)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const [croppedFiles, setCroppedFiles] = useState<{ [key: string]: File }>({})
  
  const [previews, setPreviews] = useState<{ [key: string]: string | null }>({
    logo: initialData.logo || null,
    logoMini: initialData.logoMini || null,
    favicon: initialData.favicon || null,
  })

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state])

  const handleUploadClick = (target: 'logo' | 'logoMini' | 'favicon') => {
    setCropTarget(target)
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && cropTarget) {
      if (!file.type.startsWith('image/')) {
        toast.error('Selecione uma imagem válida.')
        return
      }
      const objectUrl = URL.createObjectURL(file)
      setTempImageUrl(objectUrl)
    }
    event.target.value = ''
  }

  const handleCropComplete = (croppedFile: File) => {
    if (cropTarget) {
      const objectUrl = URL.createObjectURL(croppedFile)
      setPreviews(prev => ({ ...prev, [cropTarget]: objectUrl }))
      setCroppedFiles(prev => ({ ...prev, [cropTarget]: croppedFile }))
    }
    setTempImageUrl(null)
    setCropTarget(null)
  }

  const handleSubmit = (formData: FormData) => {
    if (croppedFiles.logo) formData.append('logo', croppedFiles.logo)
    if (croppedFiles.logoMini) formData.append('logoMini', croppedFiles.logoMini)
    if (croppedFiles.favicon) formData.append('favicon', croppedFiles.favicon)
    formAction(formData)
  }

  useEffect(() => {
    return () => {
      Object.values(previews).forEach(url => {
        if (url && !url.startsWith('http')) URL.revokeObjectURL(url)
      })
      if (tempImageUrl) URL.revokeObjectURL(tempImageUrl)
    }
  }, [previews, tempImageUrl])

  return (
    <>
      {/* MAGICA DO LIVE PREVIEW: Injeta o CSS em tempo real na classe global do sistema */}
      <style dangerouslySetInnerHTML={{__html: `
        .contents {
          --primary: ${hexToHslString(primaryColor)} !important;
          --primary-foreground: ${getContrastForeground(primaryColor)} !important;
          --ring: ${hexToHslString(primaryColor)} !important;
          --secondary: ${hexToHslString(secondaryColor)} !important;
          --secondary-foreground: ${getContrastForeground(secondaryColor)} !important;
        }
      `}} />

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/jpeg, image/png, image/webp" 
        onChange={handleFileChange}
      />

      <ImageCropperModal
        isOpen={!!tempImageUrl}
        onClose={() => { setTempImageUrl(null); setCropTarget(null); }}
        imageUrl={tempImageUrl || ''}
        onCropComplete={handleCropComplete}
        title={`Recortar ${cropTarget === 'logo' ? 'Logo Principal' : cropTarget === 'logoMini' ? 'Logo Miniatura' : 'Favicon'}`}
        aspectRatio={cropTarget === 'logo' ? 4 / 1 : 1}
      />

      <form action={handleSubmit}>
        <div className="space-y-6">
          
          <Card>
            <CardHeader>
              <CardTitle>Identidade Visual</CardTitle>
              <CardDescription>Informações principais e cores base.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Fantasia</Label>
                  <Input id="nome" name="nome" defaultValue={initialData.nome} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Não editável</span>
                  </div>
                  <Input id="cnpj" value={initialData.cnpj} disabled className="bg-muted text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-6">
                <div className="space-y-2">
                  <Label htmlFor="corPrimaria">Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input type="color" className="w-10 h-10 p-1 cursor-pointer shrink-0" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}/>
                    <Input id="corPrimaria" name="corPrimaria" className="h-10" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}/>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="corSecundaria">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input type="color" className="w-10 h-10 p-1 cursor-pointer shrink-0" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)}/>
                    <Input id="corSecundaria" name="corSecundaria" className="h-10" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)}/>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logotipos e Ícones</CardTitle>
              <CardDescription>Faça o upload das imagens que representarão sua marca no sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="flex flex-col items-center gap-2">
                  <Label className="w-full text-center">Logo Principal</Label>
                  <div onClick={() => handleUploadClick('logo')} className="w-full group relative flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden h-32">
                    {previews.logo ? (
                      <Image src={previews.logo} alt="Logo" fill className="object-contain p-2" unoptimized />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground"><ImageIcon className="h-6 w-6 mb-2" /><span className="text-xs">Upload</span></div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"><UploadCloud className="h-5 w-5 text-white" /></div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <Label className="w-full text-center">Logo Miniatura</Label>
                  <div onClick={() => handleUploadClick('logoMini')} className="group relative flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden h-32 w-32">
                    {previews.logoMini ? (
                      <Image src={previews.logoMini} alt="Logo Mini" fill className="object-contain p-2" unoptimized />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground"><ImageIcon className="h-6 w-6 mb-2" /><span className="text-xs">Upload</span></div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"><UploadCloud className="h-5 w-5 text-white" /></div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <Label className="w-full text-center">Favicon</Label>
                  <div onClick={() => handleUploadClick('favicon')} className="group relative flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden h-20 w-20">
                    {previews.favicon ? (
                      <Image src={previews.favicon} alt="Favicon" fill className="object-contain p-2" unoptimized />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground"><ImageIcon className="h-5 w-5 mb-1" /><span className="text-[10px]">Upload</span></div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"><UploadCloud className="h-4 w-4 text-white" /></div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>Personalização Avançada</CardTitle>
              </div>
              <CardDescription>Defina quais partes do sistema usarão sua cor Primária ou Secundária.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                
                {[
                  { id: 'sidebarTheme', label: 'Fundo da Sidebar' },
                  { id: 'sidebarNavTheme', label: 'Links da Sidebar' },
                  { id: 'topbarTheme', label: 'Barra Superior' },
                  { id: 'buttonsTheme', label: 'Botões Principais' },
                  { id: 'subButtonsTheme', label: 'Botões Secundários' },
                  { id: 'tooltipsTheme', label: 'Dicas e Legendas' },
                  { id: 'accentTheme', label: 'Detalhes Interativos' },
                ].map((item) => {
                  const isPrimary = themes[item.id as keyof typeof themes];
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3 shadow-sm bg-background">
                      <div className="space-y-0.5">
                        <Label htmlFor={item.id} className="text-sm font-medium cursor-pointer">{item.label}</Label>
                        <p className="text-[11px] text-muted-foreground">
                          {isPrimary ? 'Cor Primária' : 'Cor Secundária'}
                        </p>
                      </div>
                      
                      <input type="hidden" name={item.id} value={isPrimary ? 'primary' : 'secondary'} />
                      
                      <Switch 
                        forcePreview
                        id={item.id}
                        checked={isPrimary} 
                        onCheckedChange={(checked) => setThemes(prev => ({ ...prev, [item.id]: checked }))} 
                      />
                    </div>
                  )
                })}

              </div>
            </CardContent>
            
            <CardFooter className="bg-muted/50 flex justify-end p-4 border-t border-border">
              <Button type="submit" disabled={isPending}>
                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="mr-2 h-4 w-4" /> Salvar Configurações</>}
              </Button>
            </CardFooter>
          </Card>

        </div>
      </form>
    </>
  )
}