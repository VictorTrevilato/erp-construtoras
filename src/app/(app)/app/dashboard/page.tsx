import { HardHat, DollarSign, AlertCircle } from "lucide-react"

export default function AppDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Visão Geral da Construtora</h1>
        <span className="text-sm text-gray-500">Atualizado hoje às 08:00</span>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Obras Ativas</p>
              <h3 className="text-2xl font-bold text-gray-900">3</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Faturamento (Mês)</p>
              <h3 className="text-2xl font-bold text-gray-900">R$ 1.2M</h3>
            </div>
          </div>
        </div>
        
        {/* Adicione mais cards se quiser */}
      </div>

      <div className="rounded-xl border bg-white p-8 text-center shadow-sm h-64 flex flex-col items-center justify-center text-gray-400">
        <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
        <p>Gráficos de evolução física virão aqui...</p>
      </div>
    </div>
  )
}