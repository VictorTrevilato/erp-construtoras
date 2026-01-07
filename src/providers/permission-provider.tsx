"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { getUserPermissions } from "@/app/actions/permissions" 

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
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const perms = await getUserPermissions()
        setPermissions(perms)
      } catch (error) {
        console.error("Erro ao carregar permissões:", error)
        setPermissions([])
      } finally {
        setIsLoading(false)
      }
    }
    loadPermissions()
  }, [])

  const can = (code: string) => {
    // Aqui podes adicionar lógica de SuperAdmin se o token JWT tiver essa flag
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