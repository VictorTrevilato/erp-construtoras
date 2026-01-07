"use client"

import { usePermission } from "@/providers/permission-provider"
import { ReactNode } from "react"

interface ProtectProps {
  children: ReactNode
  permission: string
  fallback?: ReactNode // Opcional: O que mostrar se não tiver permissão (ex: um cadeado)
}

export function Protect({ children, permission, fallback = null }: ProtectProps) {
  const { can, isLoading } = usePermission()

  // Enquanto carrega, não mostra nada (ou poderia ser um skeleton)
  if (isLoading) return null

  // Se tem a permissão, mostra o conteúdo
  if (can(permission)) {
    return <>{children}</>
  }

  // Se não tem, mostra o fallback (ou nada)
  return <>{fallback}</>
}