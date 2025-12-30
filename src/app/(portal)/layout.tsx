import { Sidebar } from "@/components/sidebar-temp"
import { ThemeWrapper } from "@/components/theme-wrapper"
import { auth } from "@/auth" // Import necessário para pegar a sessão
import { prisma } from "@/lib/prisma" // Import para consultar o banco

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  // Conta quantos vínculos ativos o usuário tem para decidir se mostra o botão "Trocar Perfil"
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
    <ThemeWrapper theme="theme-portal">
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar 
          title="Área do Cliente" 
          color="bg-emerald-700" 
          profile="portal" 
          showTenantSwitch={showSwitch} // [Novo] Lógica aplicada
        />
        
        <main className="flex-1 ml-64 p-8">
          <div className="min-h-screen w-full">
            {children}
          </div>
        </main>
      </div>
    </ThemeWrapper>
  )
}