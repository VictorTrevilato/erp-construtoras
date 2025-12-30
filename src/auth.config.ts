import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [], // Providers ficam vazios aqui (preenchidos no auth.ts)
  callbacks: {
    // 1. O JWT é gerado no login e atualizado
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // [CORREÇÃO] Adicionamos '|| false' para garantir que nunca seja undefined
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
    // 3. Authorized (Opcional, mas bom ter padrão)
    authorized({ auth }) {
      return !!auth?.user // Retorna true se tiver usuário
    },
  },
} satisfies NextAuthConfig