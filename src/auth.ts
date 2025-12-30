import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig, // <--- AQUI: Ele herda os callbacks de jwt/session do arquivo acima
  providers: [
    Credentials({
      async authorize(credentials) {
        try {
          const parsedCredentials = z
            .object({ email: z.string().email(), password: z.string().min(1) })
            .safeParse(credentials);

          if (parsedCredentials.success) {
            const { email, password } = parsedCredentials.data;
            
            const user = await prisma.ycUsuarios.findUnique({ 
              where: { email } 
            });

            if (!user) return null;

            const passwordsMatch = await bcrypt.compare(password, user.passwordHash);

            if (passwordsMatch) {
              // Retornamos os dados que o callback JWT (no auth.config) vai receber
              return {
                id: user.id.toString(),
                name: user.nome,
                email: user.email,
                isSuperAdmin: user.isSuperAdmin,
              };
            }
          }
          return null;
        } catch (error) {
          console.error("Auth Error:", error);
          return null;
        }
      },
    }),
  ],
})