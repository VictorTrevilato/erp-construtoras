import NextAuth from "next-auth"
import { authConfig } from "./auth.config" 

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const user = req.auth?.user
  const isSuperAdmin = user?.isSuperAdmin
  
  // [CORREÇÃO] Verificamos se o ID realmente existe no token
  const hasValidId = !!user?.id 
  
  const { nextUrl } = req
  
  const isAdminRoute = nextUrl.pathname.startsWith('/admin')
  const isAuthRoute = nextUrl.pathname.startsWith('/login')

  // 1. Proteção de Rotas Admin
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return Response.redirect(new URL('/login', nextUrl))
    }
    
    if (!isSuperAdmin) {
      return Response.redirect(new URL('/select-org', nextUrl))
    }
    
    return
  }

  // 2. Redirecionamento de quem já está logado (Evitar Loop)
  if (isAuthRoute && isLoggedIn) {
    // [CORREÇÃO CRÍTICA]
    // Só redirecionamos para /select-org se o usuário tiver um ID válido.
    // Se ele tiver logado mas sem ID (cookie corrompido), deixamos ele na tela de login
    // para que possa se autenticar novamente e consertar o cookie.
    if (hasValidId) {
      return Response.redirect(new URL('/select-org', nextUrl))
    }
    // Se não tiver ID válido, deixamos passar para o /login (return undefined)
  }

  return
})

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}