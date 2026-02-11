import { 
  Building2, 
  Wallet, 
  LineChart, 
  ShieldCheck,
  Users,
  Briefcase
} from "lucide-react"

const features = [
  {
    title: "Engenharia & Obras",
    description: "Controle físico-financeiro, gestão de suprimentos, diário de obra e acompanhamento de medições em tempo real.",
    icon: Building2,
    color: "text-blue-600 bg-blue-100",
  },
  {
    title: "Gestão Financeira",
    description: "Contas a pagar/receber, fluxo de caixa projetado, conciliação bancária e visão consolidada de múltiplos CNPJs.",
    icon: Wallet,
    color: "text-emerald-600 bg-emerald-100",
  },
  {
    title: "Comercial & Vendas",
    description: "CRM integrado, espelho de vendas interativo, geração de propostas, controle de comissões e gestão de contratos.",
    icon: LineChart,
    color: "text-purple-600 bg-purple-100",
  },
  {
    title: "Segurança e Auditoria",
    description: "Controle de acesso granular por cargo e logs detalhados de todas as operações realizadas no sistema.",
    icon: ShieldCheck,
    color: "text-orange-600 bg-orange-100",
  },
  {
    title: "Portal do Cliente",
    description: "Área exclusiva para seus clientes acompanharem a obra, acessarem boletos e documentos financeiros.",
    icon: Users,
    color: "text-pink-600 bg-pink-100",
  },
  {
    title: "Multi-Empresas",
    description: "Gerencie diferentes SPEs e construtoras em um único ambiente, com painéis consolidados ou individuais.",
    icon: Briefcase,
    color: "text-indigo-600 bg-indigo-100",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-24 bg-white">
      {/* ADICIONADO: max-w-7xl e px-6 lg:px-8 */}
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Tudo o que sua construtora precisa para crescer.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Uma suíte completa de ferramentas integradas, eliminando o retrabalho e garantindo a confiabilidade das informações.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="relative group p-8 rounded-2xl border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl mb-6 ${feature.color}`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}