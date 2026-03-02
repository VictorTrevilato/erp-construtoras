import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile-form"

export default async function MePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.ycUsuarios.findUnique({
    where: { id: BigInt(session.user.id) },
    select: { 
      nome: true, 
      email: true,
      avatarUrl: true
    }
  })

  if (!user) redirect("/login")

  // Montagem da URL completa
  // Removemos a barra no final do STORAGE_BASE_URL (se houver) para evitar "net//public-assets"
  const baseUrl = process.env.STORAGE_BASE_URL?.replace(/\/$/, '') || '';
  const fullAvatarUrl = user.avatarUrl ? `${baseUrl}/${user.avatarUrl}` : null;

  // Criamos um novo objeto herdando os dados do usuario mas substituindo o avatarUrl
  const userData = {
    ...user,
    avatarUrl: fullAvatarUrl
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Minha Conta</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais.
        </p>
      </div>

      <div className="max-w-3xl">
        <ProfileForm initialData={userData} />
      </div>
    </div>
  )
}