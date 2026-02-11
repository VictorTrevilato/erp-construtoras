import { redirect, notFound } from "next/navigation"
import { RoleForm } from "../_components/role-form"
import { getUserPermissions, getAllSystemPermissions } from "@/app/actions/permissions"
// Importamos a nova action
import { getRoleById } from "@/app/actions/roles"

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 1. Verificação de Segurança (Permissões)
  // Nota: Não precisamos mais checar login/tenant aqui manualmente, 
  // pois as actions getUserPermissions e getRoleById já validam isso internamente
  // e retornam null/vazio, o que trataremos abaixo.

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