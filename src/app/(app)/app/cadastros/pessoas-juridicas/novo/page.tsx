import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAvailableScopes } from "@/app/actions/legal-persons"
import { PersonLegalWrapper } from "../_components/person-legal-wrapper"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cadastrar Pessoa Jurídica",
}

export default async function NewPersonLegalPage() {
  const session = await auth()
  if (!session) redirect("/login")

  // Busca apenas os escopos para popular o dropdown
  const availableScopes = await getAvailableScopes();

  return (
    <PersonLegalWrapper 
      initialData={null} 
      availableScopes={availableScopes} 
    />
  )
}