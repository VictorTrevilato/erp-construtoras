import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile-form"

export default async function MePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  // Buscar dados frescos do banco
  const user = await prisma.ycUsuarios.findUnique({
    where: { id: BigInt(session.user.id) },
    select: { nome: true, email: true }
  })

  if (!user) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Minha Conta</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais.
        </p>
      </div>

      <div className="max-w-3xl">
        <ProfileForm initialData={user} />
      </div>
    </div>
  )
}