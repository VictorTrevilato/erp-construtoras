"use client"

import { useActionState, useState } from "react"
import { authenticate } from "@/app/actions/auth-actions"
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function LoginPage() {
  const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined)
  
  // Estado para controlar a visibilidade da senha
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      
      {/* LADO ESQUERDO: Branding */}
      <div className="hidden bg-slate-900 lg:flex flex-col justify-between p-12 text-white relative overflow-hidden">
        
        {/* Efeitos de Fundo */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[500px] w-[500px] rounded-full bg-slate-800 blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[500px] w-[500px] rounded-full bg-primary/30 blur-3xl opacity-30"></div>
        
        {/* Header */}
        <div className="relative z-10 flex items-center mb-8">
          <Image 
            src="/logo.png" 
            alt="YouCenter" 
            width={160} 
            height={48} 
            className="h-10 w-auto object-contain brightness-0 invert" 
            priority
          />
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">
            Construindo o futuro da sua gestão.
          </h1>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            Unifique o controle de obras, financeiro e suprimentos em uma única plataforma projetada para escalar com a sua construtora.
          </p>
          
          <ul className="space-y-4 text-slate-300 mb-12">
            <li className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                 <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Controle financeiro e fluxo de caixa</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                 <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Gestão centralizada de múltiplas obras</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                 <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Portal do cliente com acompanhamento real</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-slate-500 flex justify-between items-end">
           <span>© {new Date().getFullYear()} VHF System. Todos os direitos reservados.</span>
        </div>
      </div>

      {/* LADO DIREITO: Formulário */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto w-full max-w-sm space-y-8">
          
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="lg:hidden mb-6 flex items-center justify-center">
              <Image 
                src="/logo.png" 
                alt="YouCenter" 
                width={140} 
                height={40} 
                className="h-8 w-auto object-contain"
                priority
              />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Boas-vindas
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Entre com suas credenciais para acessar o painel.
            </p>
          </div>

          <form action={dispatch} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                E-mail
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 pl-3"
                  placeholder="admin@empresa.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                  Senha
                </label>
                <div className="text-sm">
                  <Link href="/forgot-password" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                    Esqueceu a senha?
                  </Link>
                </div>
              </div>
              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"} 
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 flex justify-center text-center">
                {errorMessage}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full justify-center items-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-semibold leading-6 text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {isPending ? "Autenticando..." : "Entrar na Plataforma"}
                {!isPending && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}