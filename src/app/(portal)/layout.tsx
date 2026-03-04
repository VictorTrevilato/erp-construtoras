import { SidebarLayout } from "@/components/sidebar"
import { ThemeWrapper } from "@/components/theme-wrapper"
import { prisma } from "@/lib/prisma"
import { getCurrentTenantId } from "@/lib/get-current-tenant"

export const dynamic = "force-dynamic"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const tenantIdStr = await getCurrentTenantId()
  let tenantData = null

  if (tenantIdStr) {
    tenantData = await prisma.ycEmpresas.findUnique({
      where: { id: BigInt(tenantIdStr) },
      select: { 
        nome: true, logo: true, logoMini: true, 
        corPrimaria: true, corSecundaria: true,
        sidebarTheme: true, sidebarNavTheme: true, 
        tooltipsTheme: true, buttonsTheme: true,
        subButtonsTheme: true, accentTheme: true,
        topbarTheme: true
      }
    })
  }

  const baseUrl = process.env.STORAGE_BASE_URL?.replace(/\/$/, '') || ''
  const logoUrl = tenantData?.logo ? `${baseUrl}/${tenantData.logo}` : null
  const logoMiniUrl = tenantData?.logoMini ? `${baseUrl}/${tenantData.logoMini}` : null

  return (
    <ThemeWrapper 
      theme="theme-portal"
      primaryColor={tenantData?.corPrimaria}
      secondaryColor={tenantData?.corSecundaria}
      buttonsTheme={tenantData?.buttonsTheme}
      subButtonsTheme={tenantData?.subButtonsTheme}
      tooltipsTheme={tenantData?.tooltipsTheme}
      accentTheme={tenantData?.accentTheme}
    >
      <SidebarLayout 
        title={tenantData?.nome || "Portal do Cliente"} 
        logoUrl={logoUrl}
        logoMiniUrl={logoMiniUrl}
        profile="portal" 
        showTenantSwitch={false} 
        sidebarTheme={tenantData?.sidebarTheme}
        sidebarNavTheme={tenantData?.sidebarNavTheme}
        tooltipsTheme={tenantData?.tooltipsTheme}
        topbarTheme={tenantData?.topbarTheme}
      >
        {children}
      </SidebarLayout>
    </ThemeWrapper>
  )
}