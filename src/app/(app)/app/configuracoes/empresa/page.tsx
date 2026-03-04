import { redirect } from "next/navigation"
import { TenantForm } from "./_components/tenant-form"
import { getTenantSettings } from "@/app/actions/tenant-settings"
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dados da Empresa",
};

export default async function CompanySettingsPage() {
  const company = await getTenantSettings()

  if (!company) {
    redirect("/select-org")
  }

  // Pegamos a URL base do Azure
  const baseUrl = process.env.STORAGE_BASE_URL?.replace(/\/$/, '') || '';

  // Montamos as 3 URLs completas dinamicamente
  const companyData = {
    ...company,
    logo: company.logo ? `${baseUrl}/${company.logo}` : null,
    logoMini: company.logoMini ? `${baseUrl}/${company.logoMini}` : null,
    favicon: company.favicon ? `${baseUrl}/${company.favicon}` : null,
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