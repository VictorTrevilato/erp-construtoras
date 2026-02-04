import { Sidebar } from "@/components/sidebar"
import { ThemeWrapper } from "@/components/theme-wrapper"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PermissionProvider } from "@/providers/permission-provider"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  
  const tenantCount = await prisma.ycUsuariosEmpresas.count({
    where: {
      usuarioId: BigInt(session?.user?.id || 0),
      ativo: true,
      ycEmpresas: { ativo: true }
    }
  })

  const showSwitch = tenantCount > 1

  return (
    <ThemeWrapper theme="theme-app">
      <PermissionProvider>
        <div className="flex h-screen bg-gray-50">
          <Sidebar 
            title="YouCon ERP" 
            color="bg-blue-700" 
            profile="erp" 
            showTenantSwitch={showSwitch} 
          />
          <main className="flex-1 ml-72 p-8 overflow-y-auto">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </PermissionProvider>
    </ThemeWrapper>
  )
}