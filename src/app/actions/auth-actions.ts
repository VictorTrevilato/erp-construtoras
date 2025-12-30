"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"

// Action temporária para criar o primeiro usuário (Seed Manual)
export async function registerFirstUser() {
  const email = "admin@construtora.com"
  const password = "admin"
  const nome = "Administrador Sistema"

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const exists = await prisma.ycUsuarios.findUnique({ where: { email } })
    if (exists) return { success: false, message: "Usuário já existe. Delete-o no banco se quiser recriar." }

    await prisma.ycUsuarios.create({
      data: {
        nome,
        email,
        passwordHash: hashedPassword,
        ativo: true,
        isSuperAdmin: true, // [CRÍTICO] Adicione isso!
        sysCreatedAt: new Date()
      }
    })

    return { success: true, message: "Usuário Admin criado com sucesso!" }
  } catch (error) {
    console.error("Erro ao registrar:", error)
    return { success: false, message: "Erro ao criar usuário." }
  }
}

// Action de Login
export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", formData, { redirectTo: "/select-org" })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Credenciais inválidas."
        default:
          return "Algo deu errado."
      }
    }
    throw error
  }
}

// Action de Logout
export async function serverSignOut() {
  await signOut({ redirectTo: "/login" })
}
