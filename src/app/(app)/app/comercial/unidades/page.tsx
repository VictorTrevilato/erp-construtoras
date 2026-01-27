import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getCommercialProjects } from "@/app/actions/commercial-units"
import { CommercialProjectsList } from "./_components/projects-list"

export default async function CommercialUnitsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const projects = await getCommercialProjects()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        {/* [AJUSTE] Sem ícone e subtítulo simplificado */}
        <h1 className="text-3xl font-bold tracking-tight">
          Gestão de Unidades
        </h1>
        <p className="text-muted-foreground">
          Selecione um empreendimento para gerenciar o estoque e disponibilidade.
        </p>
      </div>

      <CommercialProjectsList projects={projects} />
    </div>
  )
}