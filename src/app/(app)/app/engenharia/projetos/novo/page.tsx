import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAvailableScopes } from "@/app/actions/projects"
import { ProjectWrapper } from "../_components/project-wrapper"
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastrar Projeto",
};

export default async function NewProjectPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const scopes = await getAvailableScopes()

  return <ProjectWrapper availableScopes={scopes} />
}