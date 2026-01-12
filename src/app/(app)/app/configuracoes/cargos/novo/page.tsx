import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { RoleForm } from "../_components/role-form"

export default async function NewRolePage() {
  const session = await auth()
  if (!session) redirect("/login")

  // Busca todas as permissões do sistema para exibir no form
  const permissions = await prisma.ycPermissoes.findMany({
    orderBy: { categoria: 'asc' }
  })

  // Serializa BigInt para String
  const serializedPermissions = permissions.map(p => ({
    id: p.id.toString(),
    codigo: p.codigo,
    descricao: p.descricao,
    categoria: p.categoria
  }))

  return (
    <div className="max-w-6xl mx-auto pb-10">
       <RoleForm allPermissions={serializedPermissions} />
    </div>
  )
}