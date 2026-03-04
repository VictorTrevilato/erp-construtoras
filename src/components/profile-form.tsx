'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { updateProfile, SettingsState } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Save, Eye, EyeOff, Camera } from 'lucide-react'

interface ProfileFormProps {
  initialData: {
    nome: string
    email: string
    avatarUrl?: string | null
  }
}

const initialState: SettingsState = {
  success: false,
  message: ''
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState)
  
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Referencia para o input de arquivo oculto
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Estado para o preview imediato da imagem no front-end
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData.avatarUrl || null)

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message)
        setIsPasswordSectionOpen(false)
        setShowCurrentPassword(false)
        setShowNewPassword(false)
      } else {
        toast.error(state.message)
      }
    }
  }, [state])

  const initials = initialData.nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Valida se e uma imagem
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem válido.')
        return
      }
      
      // Valida o tamanho (exemplo: max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB.')
        return
      }

      // Cria uma URL temporaria para o preview no navegador
      const objectUrl = URL.createObjectURL(file)
      setAvatarPreview(objectUrl)
    }
  }

  // Limpa a memoria do navegador quando o componente desmontar
  useEffect(() => {
    return () => {
      if (avatarPreview && !avatarPreview.startsWith('http')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Meus Dados</CardTitle>
          <CardDescription>Gerencie suas informações pessoais e de acesso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="flex items-center gap-4">
            {/* Input oculto que sera enviado junto com o form */}
            <input 
              type="file" 
              name="avatar" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/jpeg, image/png, image/webp" 
              onChange={handleFileChange}
            />
            
            <div 
              className="relative cursor-pointer group" 
              onClick={handleAvatarClick}
            >
              <Avatar className="h-20 w-20 transition-opacity group-hover:opacity-75 border">
                <AvatarImage src={avatarPreview || undefined} alt={initialData.nome} className="object-cover" />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              
              {/* Overlay com icone de camera no hover */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-medium">Foto de Perfil</h3>
              <p className="text-xs text-muted-foreground">
                Clique na imagem para alterar. Max 5MB.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input 
                id="nome" 
                name="nome" 
                defaultValue={initialData.nome} 
                required 
                minLength={3}
              />
              {/* Cor de erro semântica */}
              {state.errors?.nome && <p className="text-xs text-destructive">{state.errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                defaultValue={initialData.email} 
                disabled 
                className="bg-muted text-muted-foreground" 
              />
              <p className="text-[10px] text-muted-foreground">O e-mail não pode ser alterado.</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
               <Label className="text-base">Alterar Senha</Label>
               <Button 
                 type="button" 
                 variant="outline" 
                 size="sm" 
                 onClick={() => setIsPasswordSectionOpen(!isPasswordSectionOpen)}
               >
                 {isPasswordSectionOpen ? 'Cancelar Alteração' : 'Redefinir Senha'}
               </Button>
            </div>

            {isPasswordSectionOpen && (
              <div className="grid gap-4 md:grid-cols-2 animate-in slide-in-from-top-2 fade-in duration-300">
                
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <div className="relative">
                    <Input 
                      id="currentPassword" 
                      name="currentPassword" 
                      type={showCurrentPassword ? "text" : "password"} 
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <div className="relative">
                    <Input 
                      id="newPassword" 
                      name="newPassword" 
                      type={showNewPassword ? "text" : "password"} 
                      minLength={6} 
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Cor de erro semântica */}
                  {state.errors?.newPassword && <p className="text-xs text-destructive">{state.errors.newPassword}</p>}
                </div>
              </div>
            )}
          </div>

        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Salvar Alterações
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}