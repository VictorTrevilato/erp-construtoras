import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { getAvailableScopes, getProjectById } from "@/app/actions/projects"
import { getUserPermissions } from "@/app/actions/permissions"
import { ProjectForm } from "../_components/project-form"

interface Props {
    params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  
  // Busca tudo em paralelo
  const [project, scopes, userPermissions] = await Promise.all([
    getProjectById(id),
    getAvailableScopes(),
    getUserPermissions()
  ])

  if (!project) notFound()

  // Regra de ReadOnly: Se NÃO tiver permissão de editar, ativa o modo leitura.
  const canEdit = userPermissions.includes("PROJETOS_EDITAR")

  return (
    <ProjectForm 
      initialData={project} 
      availableScopes={scopes} 
      readOnly={!canEdit} // Trava o formulário
    />
  )
}