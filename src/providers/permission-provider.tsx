"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { getUserPermissions } from "@/app/actions/permissions" 
import { useSession } from "next-auth/react" // [IMPORTANTE] Importar isso

type PermissionContextType = {
  permissions: string[]
  isLoading: boolean
  can: (code: string) => boolean
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: [],
  isLoading: true,
  can: () => false,
})

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession() // [IMPORTANTE] Observar o status da sessão
  const [permissions, setPermissions] = useState<string[]>([])
  
  // O loading começa true, mas vamos controlá-lo baseado na sessão
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 1. Se a sessão ainda está carregando, não faz nada (mantém isLoading true)
    if (status === "loading") return

    // 2. Se não estiver autenticado, paramos o loading e limpamos permissões
    if (status === "unauthenticated") {
      setPermissions([])
      setIsLoading(false)
      return
    }

    // 3. Só buscamos se estiver 'authenticated'
    const loadPermissions = async () => {
      try {
        const perms = await getUserPermissions()
        setPermissions(perms)
      } catch (error) {
        console.error("Erro ao carregar permissões:", error)
        setPermissions([]) // Garante array vazio em caso de erro
      } finally {
        setIsLoading(false)
      }
    }

    loadPermissions()
  }, [status]) // [IMPORTANTE] Dispara novamente quando o status muda de 'loading' para 'authenticated'

  const can = (code: string) => {
    // Aqui podes adicionar lógica de SuperAdmin se o token JWT tiver essa flag
    // Ex: if (session?.user?.isSuperAdmin) return true
    return permissions.includes(code)
  }

  return (
    <PermissionContext.Provider value={{ permissions, isLoading, can }}>
      {children}
    </PermissionContext.Provider>
  )
}

export const usePermission = () => {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error("usePermission deve ser usado dentro de um PermissionProvider")
  }
  return context
}