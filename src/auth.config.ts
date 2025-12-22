// src/auth.config.ts
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      
      // Rotas protegidas
      const isOnAdmin = nextUrl.pathname.startsWith("/admin")
      const isOnApp = nextUrl.pathname.startsWith("/app") // Novo
      const isOnPortal = nextUrl.pathname.startsWith("/portal") // Novo
      
      // Rotas de Autenticação
      const isOnLogin = nextUrl.pathname.startsWith("/login")
      const isOnSelectOrg = nextUrl.pathname.startsWith("/select-org")

      // 1. Proteção das Rotas Privadas
      // Se tentar acessar Admin, App ou Portal sem estar logado -> Login
      if (isOnAdmin || isOnApp || isOnPortal || isOnSelectOrg) {
        if (isLoggedIn) return true
        return false // Redireciona para /login
      }
      
      // 2. Redirecionamento de quem já está logado
      // Se estiver no Login, mas já estiver logado -> Manda pro LOBBY (Select Org)
      if (isOnLogin) {
        if (isLoggedIn) {
          // AQUI ESTAVA O ERRO: Antes mandava para /admin/dashboard
          return Response.redirect(new URL("/select-org", nextUrl)) 
        }
        return true
      }
      
      return true
    },
    jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub
      return session
    },
  },
} satisfies NextAuthConfig