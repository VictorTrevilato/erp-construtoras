import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { getAvailableScopes, getProjectById, getProjectAttachments } from "@/app/actions/projects" // <-- IMPORT ATUALIZADO
import { getUserPermissions } from "@/app/actions/permissions"
import { ProjectWrapper } from "../_components/project-wrapper" // <-- IMPORT ATUALIZADO
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editar Projeto",
};

interface Props {
    params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  
  // Busca tudo em paralelo, agora com anexos
  const [project, scopes, userPermissions, attachments] = await Promise.all([
    getProjectById(id),
    getAvailableScopes(),
    getUserPermissions(),
    getProjectAttachments(id) // <-- NOVO
  ])

  if (!project) notFound()

  const canEdit = userPermissions.includes("PROJETOS_EDITAR")

  return (
    <ProjectWrapper 
      initialData={project} 
      availableScopes={scopes} 
      readOnly={!canEdit}
      initialAttachments={attachments} // <-- NOVO
    />
  )
}