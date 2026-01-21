import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAvailableScopes } from "@/app/actions/projects"
import { ProjectForm } from "../_components/project-form"

export default async function NewProjectPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const scopes = await getAvailableScopes()

  return <ProjectForm availableScopes={scopes} />
}