import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { cookies } from "next/headers"
import { RoleForm } from "../_components/role-form"
import { getUserPermissions } from "@/app/actions/permissions"

// [CORREÇÃO 1] O tipo de params agora é uma Promise
export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const cookieStore = await cookies()
  const tenantIdStr = cookieStore.get("tenant-id")?.value
  if (!tenantIdStr) redirect("/select-org")

  // [CORREÇÃO 2] Precisamos aguardar o params antes de desestruturar
  const { id } = await params

  // 1. Verificação de Segurança (Permissões)
  const userPermissions = await getUserPermissions()
  const canEdit = userPermissions.includes("CARGOS_EDITAR")
  const canView = userPermissions.includes("CARGOS_VER")

  if (!canView && !canEdit) {
    redirect("/app/dashboard")
  }

  const isReadOnly = !canEdit

  try {
    const role = await prisma.ycCargos.findUnique({
      where: { 
        id: BigInt(id),
        sysTenantId: BigInt(tenantIdStr)
      },
      include: {
        ycCargosPermissoes: true
      }
    })

    if (!role) {
      notFound()
    }

    const allPermissions = await prisma.ycPermissoes.findMany({
      orderBy: { categoria: 'asc' }
    })

    const serializedPermissions = allPermissions.map(p => ({
      id: p.id.toString(),
      codigo: p.codigo,
      descricao: p.descricao,
      categoria: p.categoria
    }))

    const roleData = {
      id: role.id.toString(),
      nome: role.nome,
      descricao: role.descricao,
      permissoesAtuais: role.ycCargosPermissoes.map(cp => cp.permissaoId.toString())
    }

    return (
      <div className="max-w-6xl mx-auto pb-10">
         <RoleForm 
           initialData={roleData} 
           allPermissions={serializedPermissions} 
           readOnly={isReadOnly} 
         />
      </div>
    )

  } catch (error) {
    console.error("Erro ao carregar cargo:", error)
    return <div>Erro ao carregar dados do cargo.</div>
  }
}