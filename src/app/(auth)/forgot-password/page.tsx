"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, ArrowRight, CheckCircle2, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulação de delay de rede
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    setIsLoading(false)
    setIsSubmitted(true)
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      
      {/* LADO ESQUERDO: Branding (Mantendo o padrão do Login) */}
      <div className="hidden bg-slate-900 lg:flex flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[500px] w-[500px] rounded-full bg-purple-900 blur-3xl opacity-40"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[500px] w-[500px] rounded-full bg-blue-900 blur-3xl opacity-30"></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-900/20">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">ERP Construtoras</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight mb-6 leading-tight">
            Recupere seu acesso com segurança.
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Não se preocupe, acontece com todo mundo. Vamos te ajudar a criar uma nova senha e voltar ao trabalho em poucos instantes.
          </p>
        </div>

        <div className="relative z-10 text-sm text-slate-500">
           <span>© {new Date().getFullYear()} VHF System. Todos os direitos reservados.</span>
        </div>
      </div>

      {/* LADO DIREITO: Formulário */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto w-full max-w-sm space-y-8">
          
          {/* Header Mobile */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="lg:hidden flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mb-4">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Esqueceu a senha?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Digite seu e-mail corporativo abaixo para receber as instruções de redefinição.
            </p>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail Cadastrado</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@empresa.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar Link de Recuperação"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Voltar para o Login
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">E-mail Enviado!</h3>
                <p className="text-sm text-gray-500">
                  Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
                </p>
              </div>
              
              <div className="pt-4 space-y-4">
                <Button variant="outline" className="w-full" onClick={() => setIsSubmitted(false)}>
                  Tentar outro e-mail
                </Button>
                <div className="block">
                  <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                    Voltar para o Login
                  </Link>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}