export default function PortalDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Olá, Leonardo!</h1>
        <p className="text-muted-foreground">
          Aqui está o andamento da sua unidade no <strong className="text-foreground">Residencial Flora</strong>.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm">
          <h3 className="font-semibold text-lg mb-4 text-foreground">Status da Obra</h3>
          <div className="w-full bg-muted rounded-full h-4">
            <div className="bg-success h-4 rounded-full" style={{ width: "75%" }}></div>
          </div>
          <p className="text-right text-sm text-muted-foreground mt-2">75% Concluído</p>
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm">
          <h3 className="font-semibold text-lg mb-4 text-foreground">Próximos Passos</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Instalação de Pisos</li>
            <li>Pintura Final</li>
            <li>Vistoria</li>
          </ul>
        </div>
      </div>
    </div>
  )
}