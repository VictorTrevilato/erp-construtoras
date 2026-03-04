import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProjectsForNegotiation } from "@/app/actions/commercial-negotiation"
import { NegotiationProjectsList } from "./_components/negotiation-projects-list"
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mesa de Negociação",
};

export default async function NegotiationProjectsPage() {
  const session = await auth()
  if (!session) redirect("/login") // Permissão

  const projects = await getProjectsForNegotiation()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Mesa de Negociação
        </h1>
        <p className="text-muted-foreground">
          Selecione um empreendimento para visualizar o espelho de vendas e iniciar propostas.
        </p>
      </div>

      <NegotiationProjectsList projects={projects} />
    </div>
  )
}