import { SidebarLayout } from "@/components/sidebar"
import { ThemeWrapper } from "@/components/theme-wrapper"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user?.isSuperAdmin) {
    redirect("/app/dashboard")
  }

  return (
    <ThemeWrapper theme="theme-admin">
      <SidebarLayout 
        title="VHF Admin" 
        logoUrl={null} 
        logoMiniUrl={null}
        profile="admin" 
        showTenantSwitch={true}
        sidebarTheme="primary"
        sidebarNavTheme="primary"
        tooltipsTheme="primary"
      >
        {children}
      </SidebarLayout>
    </ThemeWrapper>
  )
}