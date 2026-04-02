"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"
import { cookies } from "next/headers"

export async function authenticate(prevState: string | undefined, formData: FormData) {
  const cookieStore = await cookies()
  let destinationUrl = "/select-org"

  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // 1. BLINDAGEM: Garante que o usuário existe e está globalmente ATIVO
    const user = await prisma.ycUsuarios.findUnique({
      where: { 
        email: email,
      },
      include: {
        usuariosEmpresas: {
          where: { 
            ativo: true, 
            ycEmpresas: { ativo: true } 
          },
          select: { sysTenantId: true }
        }
      }
    })

    // Checa se encontrou, se está ativo e se a senha confere
    if (!user || !user.ativo || !(await bcrypt.compare(password, user.passwordHash))) {
      return "Credenciais inválidas ou usuário inativo."
    }

    // 2. Setar Cookie de Tenant se necessário (Apenas 1 empresa ativa)
    const activeTenants = user.usuariosEmpresas
    
    if (activeTenants.length === 1) {
      const tenantId = activeTenants[0].sysTenantId.toString()
      cookieStore.set("tenant-id", tenantId, {
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
      })
      destinationUrl = "/app/dashboard"
    }

    // 3. SignIn com Redirecionamento Nativo (Throw)
    await signIn("credentials", formData, { redirectTo: destinationUrl })

  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Credenciais inválidas."
        default:
          return "Algo deu errado."
      }
    }
    // Relançar erros de sistema (como o NEXT_REDIRECT do signIn)
    throw error
  }
}

export async function serverSignOut() {
  // BLINDAGEM: Limpa o contexto da empresa ao sair para evitar resíduos em PCs compartilhados
  const cookieStore = await cookies()
  cookieStore.delete("tenant-id")

  await signOut({ redirectTo: "/login" })
}