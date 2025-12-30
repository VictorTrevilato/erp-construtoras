import NextAuth from "next-auth"
import { authConfig } from "./auth.config" 
// Importamos a config separada para evitar erro de Edge Runtime com Prisma/Bcrypt no middleware

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isSuperAdmin = req.auth?.user?.isSuperAdmin
  
  const { nextUrl } = req
  
  // Rotas que queremos proteger
  const isAdminRoute = nextUrl.pathname.startsWith('/admin')
  const isAuthRoute = nextUrl.pathname.startsWith('/login')
  
  // [CORREÇÃO] Removemos a variável isPublicRoute pois não é usada na lógica abaixo

  // 1. Se estiver na rota de Admin
  if (isAdminRoute) {
    // Se não estiver logado -> Manda pro Login
    if (!isLoggedIn) {
      return Response.redirect(new URL('/login', nextUrl))
    }
    
    // Se estiver logado mas NÃO for SuperAdmin -> Manda pro Lobby (Select Org)
    if (!isSuperAdmin) {
      return Response.redirect(new URL('/select-org', nextUrl))
    }
    
    // Se for SuperAdmin -> Deixa passar (return null/void)
    return
  }

  // 2. Se estiver logado e tentar acessar Login -> Manda pro Lobby
  if (isAuthRoute && isLoggedIn) {
    return Response.redirect(new URL('/select-org', nextUrl))
  }

  return
})

// Configuração do Matcher: Onde o middleware deve rodar
export const config = {
  matcher: [
    // Roda em todas as rotas, exceto arquivos estáticos e API
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}