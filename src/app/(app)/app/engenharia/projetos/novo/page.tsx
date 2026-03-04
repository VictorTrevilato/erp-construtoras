import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAvailableScopes } from "@/app/actions/projects"
import { ProjectForm } from "../_components/project-form"
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projetos",
};

export default async function NewProjectPage() {
  const session = await auth()
  if (!session) redirect("/login") //Permissão

  const scopes = await getAvailableScopes()

  return <ProjectForm availableScopes={scopes} />
}