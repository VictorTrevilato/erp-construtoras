import { DefaultSession } from "next-auth"

// Não precisamos importar JWT, pois ao declarar o module "next-auth/jwt" 
// o TypeScript já entende que queremos estender a interface existente.

declare module "next-auth" {
  /**
   * O objeto retornado pelo hook useSession, auth(), etc.
   */
  interface Session {
    user: {
      id: string
      isSuperAdmin: boolean
      // Outros campos que você queira expor (ex: nome, email já existem no DefaultSession)
    } & DefaultSession["user"]
  }

  /**
   * O objeto User que vem do Adapter ou do authorize()
   */
  interface User {
    id: string
    isSuperAdmin: boolean
  }
}

declare module "next-auth/jwt" {
  /**
   * Campos adicionais no Token JWT
   */
  interface JWT {
    id: string
    isSuperAdmin: boolean
  }
}