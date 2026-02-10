"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useSession } from "next-auth/react"

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

export function PermissionProvider({ 
  children, 
  initialPermissions = [] 
}: { 
  children: React.ReactNode
  initialPermissions?: string[] 
}) {
  const { status } = useSession()
  
  const [permissions, setPermissions] = useState<string[]>(initialPermissions)
  const [isLoading, setIsLoading] = useState(initialPermissions.length === 0)

  useEffect(() => {
    if (initialPermissions.length > 0) {
      setPermissions(initialPermissions)
      setIsLoading(false)
    } else if (status === "unauthenticated") {
      setPermissions([])
      setIsLoading(false)
    } else if (status === "authenticated" && initialPermissions.length === 0) {
      // Se autenticado mas sem dados, assume que não tem permissão ou falhou
      setIsLoading(false)
    }
  }, [initialPermissions, status])

  const can = (code: string) => {
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