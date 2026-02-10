"use client"

import { useActionState, useState } from "react"
import { authenticate } from "@/app/actions/auth-actions"
import { Building2, ArrowRight, CheckCircle2, Star, Quote, Eye, EyeOff } from "lucide-react"

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
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[500px] w-[500px] rounded-full bg-blue-900 blur-3xl opacity-30"></div>
        
        {/* Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-900/20">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">ERP Construtoras</span>
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
              <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                 <CheckCircle2 className="h-4 w-4 text-blue-400" />
              </div>
              <span className="font-medium">Controle financeiro e fluxo de caixa</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                 <CheckCircle2 className="h-4 w-4 text-blue-400" />
              </div>
              <span className="font-medium">Gestão centralizada de múltiplas obras</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                 <CheckCircle2 className="h-4 w-4 text-blue-400" />
              </div>
              <span className="font-medium">Portal do cliente com acompanhamento real</span>
            </li>
          </ul>

          <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm border border-white/10">
            <div className="flex gap-1 mb-3">
              {[1,2,3,4,5].map((_, i) => (
                <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <div className="relative">
              <Quote className="absolute -top-2 -left-2 h-8 w-8 text-white/10 rotate-180" />
              <p className="text-sm text-slate-300 italic pl-4 relative z-10">
                &quot;O ERP transformou a maneira como acompanhamos nossos custos. A transparência com os investidores aumentou drasticamente.&quot;
              </p>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500"></div>
              <div>
                <p className="text-xs font-semibold text-white">Ricardo Mendes</p>
                <p className="text-[10px] text-slate-400">Diretor de Engenharia, Construtora Alpha</p>
              </div>
            </div>
          </div>
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
            <div className="lg:hidden flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mb-4">
              <Building2 className="h-6 w-6" />
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
                  className="block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 pl-3"
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
                  <a href="#" className="font-semibold text-blue-600 hover:text-blue-500">
                    Esqueceu a senha?
                  </a>
                </div>
              </div>
              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  // Alterna entre text e password baseado no estado
                  type={showPassword ? "text" : "password"} 
                  autoComplete="current-password"
                  required
                  // Adicionado pr-10 para o texto não ficar por baixo do ícone
                  className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
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
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 border border-red-200 flex justify-center text-center">
                {errorMessage}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full justify-center items-center gap-2 rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
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