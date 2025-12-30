import { auth, signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Building2, LogOut, ArrowRight } from "lucide-react"

export default async function SelectOrgPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // 1. REGRA SUPER ADMIN
  // Se for Super Admin, ignora tenants e vai direto para o Backoffice
  if (session.user.isSuperAdmin) {
    redirect("/admin/dashboard")
  }

  // 2. BUSCAR VÍNCULOS (Tenants)
  // Buscamos as empresas onde o usuário tem vínculo ativo
  const userLinks = await prisma.ycUsuariosEmpresas.findMany({
    where: {
      usuarioId: BigInt(session.user.id),
      ativo: true,
      ycEmpresas: { ativo: true } // Apenas empresas ativas
    },
    include: {
      ycEmpresas: true,
      ycCargos: true
    }
  })

  // 3. REGRA: SEM ACESSO
  if (userLinks.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <Building2 className="h-6 w-6 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Acesso Pendente</h2>
          <p className="text-gray-500">
            Seu usuário foi criado, mas você ainda não está vinculado a nenhuma empresa.
            Solicite o acesso ao administrador.
          </p>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button className="text-sm font-medium text-red-600 hover:underline">
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 4. REGRA: VÍNCULO ÚNICO (Redirecionamento Automático)
  if (userLinks.length === 1) {
    const link = userLinks[0]
    
    // Precisamos definir o destino baseados no tipo do Cargo (Interno vs Cliente)
    // interno = true  -> /app (ERP)
    // interno = false -> /portal (Área do Cliente)
    
    if (link.ycCargos.interno) {
      // Nota: Futuramente aqui setaremos um Cookie de "Tenant Selecionado"
      redirect("/app/dashboard")
    } else {
      redirect("/portal/dashboard")
    }
  }

  // 5. REGRA: MÚLTIPLOS VÍNCULOS (Renderizar Lista)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Selecione uma Organização</h2>
          <p className="mt-2 text-sm text-gray-600">
            Você possui acesso a múltiplas empresas.
          </p>
        </div>

        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
          {userLinks.map((link) => (
            <li key={link.id.toString()} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 sm:px-6">
              <div className="flex min-w-0 gap-x-4">
                {/* Logo Placeholder */}
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-gray-100">
                   <Building2 className="h-6 w-6 text-gray-500" />
                </div>
                <div className="min-w-0 flex-auto">
                  <p className="text-sm font-semibold leading-6 text-gray-900">
                    <span className="absolute inset-x-0 -top-px bottom-0" />
                    {/* Link para API que define o cookie e redireciona (Faremos depois) */}
                    <a href={`/api/auth/select-tenant?id=${link.sysTenantId}&type=${link.ycCargos.interno ? 'app' : 'portal'}`}>
                        {link.ycEmpresas.nome}
                    </a>
                  </p>
                  <p className="mt-1 flex text-xs leading-5 text-gray-500">
                    <span className="truncate">{link.ycCargos.nome}</span>
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-x-4">
                <ArrowRight className="h-5 w-5 flex-none text-gray-400" />
              </div>
            </li>
          ))}
        </ul>

        <div className="text-center">
           <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button className="flex items-center justify-center w-full gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}