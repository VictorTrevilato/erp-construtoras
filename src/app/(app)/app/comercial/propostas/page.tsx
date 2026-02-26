import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProposalProjects } from "@/app/actions/commercial-proposals"
import { ProposalsProjectList } from "./_components/proposals-project-list"

export default async function ProposalsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const projects = await getProposalProjects()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Propostas Comerciais
        </h1>
        <p className="text-muted-foreground">
          Selecione um empreendimento para qualificar compradores, gerar fluxo fino e comissionamento.
        </p>
      </div>

      <ProposalsProjectList projects={projects} />
    </div>
  )
}