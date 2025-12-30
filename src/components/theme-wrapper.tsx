"use client"

import { useEffect } from "react"

export function ThemeWrapper({ 
  theme, 
  children 
}: { 
  theme: string
  children: React.ReactNode 
}) {
  useEffect(() => {
    // Adiciona a classe do tema (ex: theme-admin) ao body
    document.body.classList.add(theme)
    
    // Remove a classe quando sair dessa rota (limpeza)
    return () => {
      document.body.classList.remove(theme)
    }
  }, [theme])

  return <>{children}</>
}