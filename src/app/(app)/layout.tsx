import { Sidebar } from "@/components/sidebar"
import { ThemeWrapper } from "@/components/theme-wrapper"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PermissionProvider } from "@/providers/permission-provider"
import { getUserPermissions } from "@/app/actions/permissions"

// Força dinâmica para evitar cache de usuário deslogado
export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  
  // Busca as permissões no servidor. 
  // Se falhar (race condition), virá vazio, mas o Provider vai lidar com isso.
  // Se funcionar (o que o log indicou), virá preenchido.
  const permissions = await getUserPermissions()

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
      <PermissionProvider initialPermissions={permissions}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar 
            title="YouCon" 
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