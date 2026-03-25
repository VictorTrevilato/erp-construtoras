import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { getPersonLegalById, getAvailableScopes } from "@/app/actions/legal-persons"
import { PersonLegalWrapper } from "../_components/person-legal-wrapper"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Editar Pessoa Jurídica",
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPersonLegalPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  
  // Busca a PJ e os Escopos em paralelo para maior performance
  const [person, availableScopes] = await Promise.all([
    getPersonLegalById(id),
    getAvailableScopes() 
  ])

  // Se o usuário tentar acessar um ID que não existe (ou de outro tenant), dá erro 404
  if (!person) notFound()

  return (
    <PersonLegalWrapper 
      initialData={person} 
      availableScopes={availableScopes} 
    />
  )
}