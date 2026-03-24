import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PersonPhysicalWrapper } from "../_components/person-physical-wrapper"
import { getAvailableScopes } from "@/app/actions/persons" // <--- IMPORT CORRIGIDO
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cadastrar Pessoa Física",
}

export default async function NewPersonPhysicalPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const availableScopes = await getAvailableScopes();

  return (
    <PersonPhysicalWrapper 
      initialData={null} 
      availableScopes={availableScopes} 
    />
  )
}