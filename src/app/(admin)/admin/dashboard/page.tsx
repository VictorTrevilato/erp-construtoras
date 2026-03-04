import { auth, signOut } from "@/auth"
import { Button } from "@/components/ui/button"
import { LogOut, CheckCircle2 } from "lucide-react"

export default async function Dashboard() {
  const session = await auth()

  return (
    <div className="p-6 md:p-10 font-sans bg-background min-h-screen">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Login Realizado com Sucesso! 🔓
        </h1>
      </div>
      
      <div className="mt-8 p-6 bg-card text-card-foreground shadow-sm rounded-xl border border-border max-w-2xl">
        <h2 className="font-bold text-lg mb-4">Dados da Sessão (Auth.js + Prisma):</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <strong className="text-foreground">Nome:</strong> {session?.user?.name}
          </li>
          <li>
            <strong className="text-foreground">Email:</strong> {session?.user?.email}
          </li>
          <li>
            <strong className="text-foreground">ID (Banco):</strong> {session?.user?.id}
          </li>
        </ul>
      </div>

      <form
        action={async () => {
          "use server"
          await signOut({ redirectTo: "/login" })
        }}
        className="mt-8"
      >
        <Button variant="destructive" type="submit" className="gap-2">
          <LogOut className="h-4 w-4" />
          Sair do Sistema
        </Button>
      </form>
    </div>
  )
}