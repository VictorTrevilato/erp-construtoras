import { Sidebar } from "@/components/sidebar"
import { ThemeWrapper } from "@/components/theme-wrapper"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  
  // Conta quantos vínculos ativos o usuário tem
  const tenantCount = await prisma.ycUsuariosEmpresas.count({
    where: {
      usuarioId: BigInt(session?.user?.id || 0),
      ativo: true,
      ycEmpresas: { ativo: true }
    }
  })

  // Só mostra o botão se tiver mais de 1 vínculo
  const showSwitch = tenantCount > 1

  return (
    <ThemeWrapper theme="theme-app">
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar 
          title="YouCon ERP" 
          color="bg-blue-700" 
          profile="erp" 
          showTenantSwitch={showSwitch} // [!] Passando a lógica
        />
        <main className="flex-1 ml-64 p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </ThemeWrapper>
  )
}