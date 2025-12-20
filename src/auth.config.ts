// src/auth.config.ts
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [], // Mantém vazio aqui
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnAdmin = nextUrl.pathname.startsWith("/admin")
      const isOnLogin = nextUrl.pathname.startsWith("/login")

      if (isOnAdmin) {
        if (isLoggedIn) return true
        return false 
      }
      
      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/admin/dashboard", nextUrl))
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