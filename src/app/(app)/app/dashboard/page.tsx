import { auth } from "@/auth"
import { MarketingHero } from "./_components/marketing-hero"
import { CompanyWall } from "./_components/company-wall"
import { ProjectSpotlight } from "./_components/project-spotlight"

export default async function DashboardPage() {
  const session = await auth()
  const userName = session?.user?.name?.split(" ")[0] || "Colaborador"

  // Data atual formatada (Ex: Terça-feira, 10 de Fevereiro)
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. Header Simples e Pessoal */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Olá, {userName}
        </h1>
        <p className="text-slate-500 capitalize text-sm">
          {today}
        </p>
      </div>

      {/* 2. Banner de Marketing (O destaque visual) */}
      <MarketingHero />

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3">
        {/* Lado Esquerdo (Maior): Projetos */}
        <div className="lg:col-span-2 space-y-8">
          <ProjectSpotlight />
          
          {/* Seção Extra: Links Rápidos Genéricos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {['Portal do Colaborador', 'Suporte TI', 'Reservas de Sala', 'Documentos'].map((item) => (
                <div key={item} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm text-center text-sm font-medium text-slate-600 hover:text-blue-600 hover:border-blue-200 cursor-pointer transition-colors">
                  {item}
                </div>
             ))}
          </div>
        </div>

        {/* Lado Direito (Menor): Mural de Avisos */}
        <div className="lg:col-span-1">
          <CompanyWall />
        </div>
      </div>
    </div>
  )
}