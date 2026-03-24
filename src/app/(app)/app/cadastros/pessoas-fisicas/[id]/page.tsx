import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { getPersonPhysicalById, getAvailableScopes } from "@/app/actions/persons" // <--- IMPORT CORRIGIDO
import { PersonPhysicalWrapper } from "../_components/person-physical-wrapper"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Editar Pessoa Física",
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPersonPhysicalPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  
  const [person, availableScopes] = await Promise.all([
    getPersonPhysicalById(id),
    getAvailableScopes() 
  ])

  if (!person) notFound()

  return (
    <PersonPhysicalWrapper 
      initialData={person} 
      availableScopes={availableScopes} 
    />
  )
}