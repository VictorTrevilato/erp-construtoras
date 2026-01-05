'use client'

import { useActionState, useState, useEffect } from 'react'
import { updateProfile, SettingsState } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Save, Eye, EyeOff } from 'lucide-react'

interface ProfileFormProps {
  initialData: {
    nome: string
    email: string
  }
}

const initialState: SettingsState = {
  success: false,
  message: ''
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState)
  
  // Controle da Seção de Senha (Accordion)
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false)
  
  // Controle de Visibilidade dos Inputs (Olhinho)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message)
        setIsPasswordSectionOpen(false) // Fecha a área de senha após sucesso
        // Reseta visibilidade
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

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Meus Dados</CardTitle>
          <CardDescription>Gerencie suas informações pessoais e de acesso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="" />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="font-medium">Foto de Perfil</h3>
              <p className="text-xs text-muted-foreground">
                Upload de imagens será habilitado em breve.
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
              {state.errors?.nome && <p className="text-xs text-red-500">{state.errors.nome}</p>}
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
                
                {/* Senha Atual */}
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
                      className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Nova Senha */}
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
                      className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {state.errors?.newPassword && <p className="text-xs text-red-500">{state.errors.newPassword}</p>}
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