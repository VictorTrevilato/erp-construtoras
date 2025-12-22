import { auth, signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ShieldCheck, Building2, HardHat, ArrowRight } from "lucide-react"
import { selectContextAction } from "@/app/actions/select-context"

// Força a página a ser dinâmica para trazer dados atualizados do banco
export const dynamic = "force-dynamic"

export default async function SelectOrgPage() {
  const session = await auth()
  
  if (!session?.user?.email) {
    redirect("/login")
  }

  // 1. Busca usuário e seus vínculos
  const user = await prisma.ycUsuarios.findUnique({
    where: { email: session.user.email },
    include: {
      // Se você renomeou no schema para "usuariosEmpresas", use assim.
      // Se NÃO renomeou, use o nome gigante: ycUsuariosEmpresas_ycUsuariosEmpresas_usuarioIdToycUsuarios
      usuariosEmpresas: { 
        include: {
          ycEmpresas: true, // Nome da relação no schema [cite: 49]
          ycCargos: true,   // Nome da relação no schema [cite: 48]
        },
      },
    },
  })

  if (!user) return <div>Erro: Usuário não encontrado.</div>

  const options = []

  // Opção A: Super Admin
  if (user.isSuperAdmin) {
    options.push({
      id: "admin-global",
      name: "VHF System",
      role: "Super Admin Global",
      type: "ADMIN",
      href: "/admin/dashboard",
      tenantId: "0",
      icon: ShieldCheck,
      color: "bg-purple-100 text-purple-700",
      borderColor: "hover:border-purple-500",
    })
  }

  // Opção B: Vínculos (Loop nos resultados do banco)
  // user.usuariosEmpresas é o array vindo do include acima
  user.usuariosEmpresas.forEach((vinculo) => {
    // Acessa as relações aninhadas (ycCargos e ycEmpresas)
    const cargo = vinculo.ycCargos
    const empresa = vinculo.ycEmpresas
    
    // Verifica se é interno baseado na coluna 'interno' do Cargo [cite: 9]
    const isInterno = cargo?.interno === true
    
    const targetUrl = isInterno ? "/app/dashboard" : "/portal/dashboard"
    const roleType = isInterno ? "ERP" : "PORTAL"
    
    const theme = isInterno 
      ? { icon: Building2, color: "bg-blue-100 text-blue-700", border: "hover:border-blue-500" }
      : { icon: HardHat, color: "bg-green-100 text-green-700", border: "hover:border-green-500" }

    options.push({
      // toString() é necessário pois IDs são BigInt [cite: 43]
      id: `${vinculo.sysTenantId.toString()}-${vinculo.cargoId.toString()}`,
      name: empresa.nome,
      role: cargo?.nome || "Sem Cargo",
      type: roleType,
      href: targetUrl,
      tenantId: vinculo.sysTenantId.toString(),
      icon: theme.icon,
      color: theme.color,
      borderColor: theme.border,
    })
  })

  // 3. Lógica de Redirecionamento Único
  if (options.length === 1) {
    const uniqueOption = options[0]
    if (uniqueOption.type === "ADMIN") {
      redirect(uniqueOption.href)
    } else {
      await selectContextAction(uniqueOption.tenantId, uniqueOption.href)
    }
  }

  // 4. Render (igual ao anterior)
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Bem-vindo, {user.nome?.split(" ")[0]}
          </h1>
          <p className="mt-2 text-gray-500">
            Selecione o contexto de trabalho para continuar.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          {options.map((opt) => {
            const Icon = opt.icon
            
            return (
              <form 
                key={opt.id} 
                action={async () => {
                  "use server"
                  if (opt.type === "ADMIN") {
                    redirect(opt.href)
                  } else {
                    await selectContextAction(opt.tenantId, opt.href)
                  }
                }}
              >
                <button
                  type="submit"
                  className={`group w-full relative flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md ${opt.borderColor}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${opt.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {opt.name}
                      </h3>
                      <p className="text-sm text-gray-500">{opt.role}</p>
                    </div>
                  </div>
                  
                  <div className="text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-500">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </button>
              </form>
            )
          })}
        </div>
        
        <div className="text-center">
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
                <button className="text-sm text-gray-400 hover:text-red-600">Sair da conta</button>
            </form>
        </div>
      </div>
    </div>
  )
}