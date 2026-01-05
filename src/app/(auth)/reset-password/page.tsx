"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  // Estados separados para controlar a visibilidade de cada campo
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simular delay e sucesso
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    toast.success("Senha alterada com sucesso!")
    setIsLoading(false)
    
    // Redirecionar para login
    router.push("/login")
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      
      {/* LADO ESQUERDO */}
      <div className="hidden bg-slate-900 lg:flex flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[500px] w-[500px] rounded-full bg-emerald-900 blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[500px] w-[500px] rounded-full bg-slate-800 blur-3xl opacity-40"></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-900/20">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">ERP Construtoras</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight mb-6 leading-tight">
            Defina sua nova senha.
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Escolha uma senha forte para proteger os dados da sua construtora. Recomendamos o uso de caracteres especiais e números.
          </p>
        </div>

        <div className="relative z-10 text-sm text-slate-500">
           <span>© {new Date().getFullYear()} VHF System. Todos os direitos reservados.</span>
        </div>
      </div>

      {/* LADO DIREITO */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto w-full max-w-sm space-y-8">
          
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="lg:hidden flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Nova Senha
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Preencha os campos abaixo para finalizar a recuperação.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* CAMPO 1: NOVA SENHA */}
            <div className="grid gap-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1} // Evita foco ao navegar com TAB
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* CAMPO 2: CONFIRMAR SENHA */}
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
              {isLoading ? "Atualizando..." : "Alterar Senha"}
              {!isLoading && <CheckCircle2 className="ml-2 h-4 w-4" />}
            </Button>
          </form>

        </div>
      </div>
    </div>
  )
}