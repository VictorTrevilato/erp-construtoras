export default function PortalDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Olá, Victor!</h1>
        <p className="text-gray-500">Aqui está o andamento da sua unidade no <strong>Residencial Flora</strong>.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Status da Obra</h3>
          <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
            <div className="bg-green-600 h-4 rounded-full" style={{ width: "75%" }}></div>
          </div>
          <p className="text-right text-sm text-gray-600 mt-2">75% Concluído</p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Próximos Passos</h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Instalação de Pisos</li>
            <li>Pintura Final</li>
            <li>Vistoria de Entrega</li>
          </ul>
        </div>
      </div>
    </div>
  )
}