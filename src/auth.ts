// src/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { authConfig } from "./auth.config" // <--- Importamos a config leve

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig, // <--- Estendemos a config leve
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const parsed = await loginSchema.safeParseAsync(credentials)

          if (!parsed.success) return null

          const { email, password } = parsed.data
          
          const user = await prisma.ycUsuarios.findUnique({
            where: { email },
          })

          if (!user) return null

          const passwordsMatch = await bcrypt.compare(password, user.passwordHash)

          if (!passwordsMatch) return null

          // Retornamos o objeto do usuário (convertendo BigInt para string)
          return {
            id: user.id.toString(),
            name: user.nome,
            email: user.email,
          }
        } catch (error) {
          console.error("Erro auth:", error)
          return null
        }
      },
    }),
  ],
})