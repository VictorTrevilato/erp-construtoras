import { redirect, notFound } from "next/navigation"
import { RoleForm } from "../_components/role-form"
import { getUserPermissions, getAllSystemPermissions } from "@/app/actions/permissions"
import { getRoleById } from "@/app/actions/roles"
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cargos e Permissões",
};

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 1. Verificação de Segurança (Permissões)
  const userPermissions = await getUserPermissions()
  const canEdit = userPermissions.includes("CARGOS_EDITAR")
  const canView = userPermissions.includes("CARGOS_VER")

  if (!canView && !canEdit) {
    redirect("/app/dashboard")
  }

  // 2. Buscas de Dados em Paralelo (Performance)
  const [roleData, allPermissions] = await Promise.all([
    getRoleById(id),
    getAllSystemPermissions()
  ])

  // Se não achou o cargo (ou tenant inválido/sem acesso), 404
  if (!roleData) {
    notFound()
  }

  const isReadOnly = !canEdit

  return (
    <div className="max-w-6xl mx-auto pb-10">
       <RoleForm 
         initialData={roleData} 
         allPermissions={allPermissions} 
         readOnly={isReadOnly} 
       />
    </div>
  )
}