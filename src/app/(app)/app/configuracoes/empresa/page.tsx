import { redirect } from "next/navigation"
import { TenantForm } from "./_components/tenant-form"
// Importamos a nova action
import { getTenantSettings } from "@/app/actions/tenant-settings"

export default async function CompanySettingsPage() {
  // Busca os dados via Server Action (que já valida sessão e tenant internamente)
  const company = await getTenantSettings()

  // Se não retornou nada, significa que não tem usuário ou não tem tenant selecionado
  if (!company) {
    redirect("/select-org")
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