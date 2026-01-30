import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProjectsForTables } from "@/app/actions/commercial-prices"
import { TablesProjectsList } from "./_components/tables-projects-list"

export default async function TablesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const projects = await getProjectsForTables()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Tabelas de Preço
        </h1>
        <p className="text-muted-foreground">
          Selecione um empreendimento para gerenciar suas campanhas de venda e regras de precificação.
        </p>
      </div>

      <TablesProjectsList projects={projects} />
    </div>
  )
}