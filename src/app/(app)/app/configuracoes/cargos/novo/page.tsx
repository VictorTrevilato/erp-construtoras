import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { RoleForm } from "../_components/role-form"
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastrar Cargo e Permissão",
};

export default async function NewRolePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const permissions = await prisma.ycPermissoes.findMany({
    orderBy: { categoria: 'asc' }
  })

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