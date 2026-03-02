import { redirect } from "next/navigation"
import { TenantForm } from "./_components/tenant-form"
import { getTenantSettings } from "@/app/actions/tenant-settings"

export default async function CompanySettingsPage() {
  const company = await getTenantSettings()

  if (!company) {
    redirect("/select-org")
  }

  const baseUrl = process.env.STORAGE_BASE_URL?.replace(/\/$/, '') || '';
  const fullLogoUrl = company.logo ? `${baseUrl}/${company.logo}` : null;

  const companyData = {
    ...company,
    logo: fullLogoUrl
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dados da Empresa</h1>
        <p className="text-muted-foreground">
          Gerencie as informações principais e a identidade visual da sua organização.
        </p>
      </div>

      <TenantForm initialData={companyData} />
    </div>
  )
}