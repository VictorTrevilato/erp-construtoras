import type { Metadata } from "next"
import { SidebarLayout } from "@/components/sidebar"
import { ThemeWrapper } from "@/components/theme-wrapper"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: {
    template: "%s | VHF Admin",
    default: "VHF Admin",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" }, // <- Adicionado aqui
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [
      { rel: "icon", url: "/android-chrome-192x192.png", sizes: "192x192" },
      { rel: "icon", url: "/android-chrome-512x512.png", sizes: "512x512" },
    ],
  },
}

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