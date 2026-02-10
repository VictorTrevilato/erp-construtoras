"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"
import { cookies } from "next/headers"

export async function authenticate(prevState: string | undefined, formData: FormData) {
  // 1. Captura o contexto de cookies IMEDIATAMENTE (Primeira linha)
  const cookieStore = await cookies()
  let destinationUrl = "/select-org"

  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // 2. Validação no Banco
    const user = await prisma.ycUsuarios.findUnique({
      where: { email },
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

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return "Credenciais inválidas."
    }

    // 3. Setar Cookie de Tenant se necessário
    const activeTenants = user.usuariosEmpresas
    if (activeTenants.length === 1) {
      const tenantId = activeTenants[0].sysTenantId.toString()
      cookieStore.set("tenant-id", tenantId)
      destinationUrl = "/app/dashboard"
    }

    // 4. SignIn com Redirecionamento Nativo (Throw)
    // REMOVIDO: redirect: false. Deixamos o NextAuth lançar o erro de redirect.
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
    // [IMPORTANTE] Relançar erros de sistema (como o NEXT_REDIRECT do signIn)
    // Se não relançar, o redirecionamento não acontece.
    throw error
  }
}

export async function serverSignOut() {
  await signOut({ redirectTo: "/login" })
}