import { SidebarLayout } from "@/components/sidebar"
import { ThemeWrapper } from "@/components/theme-wrapper"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PermissionProvider } from "@/providers/permission-provider"
import { getUserPermissions } from "@/app/actions/permissions"
import { getCurrentTenantId } from "@/lib/get-current-tenant"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const permissions = await getUserPermissions()

  const tenantIdStr = await getCurrentTenantId()
  let tenantData = null

  if (tenantIdStr) {
    tenantData = await prisma.ycEmpresas.findUnique({
      where: { id: BigInt(tenantIdStr) },
      select: { 
        nome: true, logo: true, logoMini: true, favicon: true,
        corPrimaria: true, corSecundaria: true,
        sidebarTheme: true, sidebarNavTheme: true,
        tooltipsTheme: true, buttonsTheme: true,
        subButtonsTheme: true, accentTheme: true,
        topbarTheme: true
      }
    })
  }

  const tenantCount = await prisma.ycUsuariosEmpresas.count({
    where: {
      usuarioId: BigInt(session?.user?.id || 0),
      ativo: true,
      ycEmpresas: { ativo: true }
    }
  })
  const showSwitch = tenantCount > 1

  const baseUrl = process.env.STORAGE_BASE_URL?.replace(/\/$/, '') || ''
  const logoUrl = tenantData?.logo ? (tenantData.logo.startsWith('http') ? tenantData.logo : `${baseUrl}/${tenantData.logo}`) : null
  const logoMiniUrl = tenantData?.logoMini ? (tenantData.logoMini.startsWith('http') ? tenantData.logoMini : `${baseUrl}/${tenantData.logoMini}`) : null

  return (
    <ThemeWrapper 
      theme="theme-app"
      primaryColor={tenantData?.corPrimaria}
      secondaryColor={tenantData?.corSecundaria}
      buttonsTheme={tenantData?.buttonsTheme}
      subButtonsTheme={tenantData?.subButtonsTheme}
      tooltipsTheme={tenantData?.tooltipsTheme}
      accentTheme={tenantData?.accentTheme}
    >
      <PermissionProvider initialPermissions={permissions}>
        <SidebarLayout 
          title={tenantData?.nome || "YouCenter"} 
          logoUrl={logoUrl}
          logoMiniUrl={logoMiniUrl}
          profile="erp" 
          showTenantSwitch={showSwitch}
          sidebarTheme={tenantData?.sidebarTheme}
          sidebarNavTheme={tenantData?.sidebarNavTheme}
          tooltipsTheme={tenantData?.tooltipsTheme}
          topbarTheme={tenantData?.topbarTheme}
        >
          {children}
        </SidebarLayout>
      </PermissionProvider>
    </ThemeWrapper>
  )
}