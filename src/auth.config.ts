import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [], 
  callbacks: {
    // 1. O JWT é gerado no login e atualizado
    async jwt({ token, user }) {
      if (user) {
        // [CORREÇÃO CRÍTICA] Forçar conversão para String. 
        // O Prisma retorna BigInt, mas o JWT (JSON) quebra se receber BigInt.
        token.id = String(user.id)
        
        token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin || false
      }
      return token
    },
    // 2. A Sessão é o que o Middleware e os Componentes leem
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.isSuperAdmin = token.isSuperAdmin as boolean
      }
      return session
    },
    // 3. Authorized
    authorized({ auth }) {
      return !!auth?.user
    },
  },
} satisfies NextAuthConfig