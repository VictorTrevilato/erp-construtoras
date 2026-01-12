// src/app/(app)/app/configuracoes/empresa/page.tsx

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { TenantForm } from "./_components/tenant-form"

export default async function CompanySettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const cookieStore = await cookies()
  const tenantIdStr = cookieStore.get("tenant-id")?.value

  if (!tenantIdStr) {
    redirect("/select-org")
  }

  const company = await prisma.ycEmpresas.findUnique({
    where: { id: BigInt(tenantIdStr) },
    select: {
      nome: true,
      cnpj: true, // <--- ADICIONADO AQUI
      corPrimaria: true,
      corSecundaria: true,
      logo: true
    }
  })

  if (!company) {
    return <div>Empresa não encontrada.</div>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dados da Empresa</h1>
        <p className="text-muted-foreground">
          Gerencie as informações principais e a identidade visual da sua organização.
        </p>
      </div>

      <TenantForm initialData={company} />
    </div>
  )
}