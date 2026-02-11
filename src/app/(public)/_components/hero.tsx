import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2 } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-50 pt-16 pb-32 md:pt-24 lg:pb-40">
       {/* Background Elements */}
       <div className="absolute top-0 right-0 -mt-20 -mr-20 h-[500px] w-[500px] rounded-full bg-blue-50 blur-3xl opacity-70 pointer-events-none"></div>
       <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-[500px] w-[500px] rounded-full bg-indigo-50 blur-3xl opacity-70 pointer-events-none"></div>

      {/* ADICIONADO: max-w-7xl e px-6 lg:px-8 */}
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          {/* Texto */}
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
               <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
               Plataforma Multi-tenant
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl leading-tight">
              O controle total da sua <span className="text-blue-600">construtora</span> em um só lugar.
            </h1>
            
            <p className="text-lg text-slate-600 md:text-xl leading-relaxed">
              Integre engenharia, comercial e financeiro em uma plataforma robusta, desenhada para escalar com a sua operação. Abandone as planilhas e ganhe previsibilidade.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                 <Button size="lg" className="w-full sm:w-auto gap-2 text-base font-semibold px-8">
                    Começar Agora <ArrowRight className="h-5 w-5" />
                 </Button>
              </Link>
               <Button size="lg" variant="outline" className="w-full sm:w-auto text-base font-semibold px-8">
                  Falar com Consultor
               </Button>
            </div>

            <ul className="space-y-3 text-slate-600 pt-4">
              {['Gestão unificada de múltiplas obras', 'Controle financeiro e fluxo de caixa real', 'CRM e gestão de vendas integrado'].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ilustração "Dashboard Visual" */}
          <div className="relative hidden lg:block lg:ml-auto w-full max-w-lg"> {/* Forcei um max-width na imagem também */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-20 blur-2xl rounded-[30px]"></div>
            <div className="relative rounded-[20px] bg-white border border-slate-200 shadow-2xl overflow-hidden transform rotate-3 hover:rotate-0 transition-all duration-500 ease-out">
                {/* Mockup de uma barra de topo de sistema */}
                <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2">
                   <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-400"></div>
                      <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                      <div className="h-3 w-3 rounded-full bg-green-400"></div>
                   </div>
                   <div className="h-4 w-48 bg-slate-200 rounded ml-4"></div>
                </div>
                {/* Placeholder de conteúdo com gradiente */}
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-blue-50 p-6 grid grid-cols-3 gap-4 opacity-80">
                   <div className="col-span-2 h-32 bg-blue-600/10 rounded-lg border border-blue-600/20 animate-pulse"></div>
                   <div className="h-32 bg-indigo-600/10 rounded-lg border border-indigo-600/20 animate-pulse delay-75"></div>
                   <div className="h-32 bg-indigo-600/10 rounded-lg border border-indigo-600/20 animate-pulse delay-100"></div>
                   <div className="col-span-2 h-32 bg-blue-600/10 rounded-lg border border-blue-600/20 animate-pulse delay-150"></div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}