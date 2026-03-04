import type { Metadata } from "next"
import { auth, signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Building2, LogOut, ArrowRight } from "lucide-react"
import Image from "next/image"

export const metadata: Metadata = {
  title: {
    absolute: "Selecionar Organização | YouCenter",
  },
}

export default async function SelectOrgPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  if (session.user.isSuperAdmin) {
    redirect("/admin/dashboard")
  }

  const userLinks = await prisma.ycUsuariosEmpresas.findMany({
    where: {
      usuarioId: BigInt(session.user.id), 
      ativo: true,
      ycEmpresas: { ativo: true }
    },
    include: {
      ycEmpresas: true,
      ycCargos: true
    }
  })

  if (userLinks.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="mb-8">
          <Image 
            src="/logo.png" 
            alt="YouCenter" 
            width={140} 
            height={40} 
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <Building2 className="h-6 w-6 text-warning" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Acesso Pendente</h2>
          <p className="text-muted-foreground">
            Seu usuário foi criado, mas você ainda não está vinculado a nenhuma empresa.
            Solicite o acesso ao administrador.
          </p>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button className="text-sm font-medium text-destructive hover:underline transition-colors">
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (userLinks.length === 1) {
    const link = userLinks[0]
    
    if (link.ycCargos.interno) {
      redirect("/app/dashboard")
    } else {
      redirect("/portal/dashboard")
    }
  }

  const baseUrl = process.env.STORAGE_BASE_URL?.replace(/\/$/, '') || ''

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <Image 
          src="/logo.png" 
          alt="YouCenter" 
          width={140} 
          height={40} 
          className="h-8 w-auto object-contain"
          priority
        />
      </div>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Selecione uma Organização</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Você possui acesso a múltiplas empresas.
          </p>
        </div>

        <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border/50">
          {userLinks.map((link) => {
            const logoMiniUrl = link.ycEmpresas.logoMini 
              ? (link.ycEmpresas.logoMini.startsWith('http') ? link.ycEmpresas.logoMini : `${baseUrl}/${link.ycEmpresas.logoMini}`) 
              : null

            return (
              <li key={link.id.toString()} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-muted/50 transition-colors sm:px-6">
                <div className="flex min-w-0 gap-x-4">
                  
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-primary/10 overflow-hidden border border-border/50">
                    {logoMiniUrl ? (
                       <Image 
                         src={logoMiniUrl} 
                         alt={link.ycEmpresas.nome} 
                         width={48} 
                         height={48} 
                         className="h-full w-full object-cover" 
                       />
                    ) : (
                       <Building2 className="h-6 w-6 text-primary" />
                    )}
                  </div>

                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-foreground">
                      <span className="absolute inset-x-0 -top-px bottom-0" />
                      <a href={`/api/auth/select-tenant?id=${link.sysTenantId}&type=${link.ycCargos.interno ? 'app' : 'portal'}`}>
                          {link.ycEmpresas.nome}
                      </a>
                    </p>
                    <p className="mt-1 flex text-xs leading-5 text-muted-foreground">
                      <span className="truncate">{link.ycCargos.nome}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-x-4">
                  <ArrowRight className="h-5 w-5 flex-none text-muted-foreground" />
                </div>
              </li>
            )
          })}
        </ul>

        <div className="text-center">
           <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button className="flex items-center justify-center w-full gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}