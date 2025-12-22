"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Building2, 
  HardHat, 
  DollarSign, 
  FileText,
  LucideIcon 
} from "lucide-react"

// Definindo os tipos de Menu
type MenuItem = {
  label: string
  href: string
  icon: LucideIcon
}

// Mapeamento dos Menus por Perfil
const MENUS: Record<string, MenuItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Tenants", href: "/admin/tenants", icon: Building2 },
    { label: "Usuários", href: "/admin/users", icon: Users },
    { label: "Configurações", href: "/admin/settings", icon: Settings },
  ],
  erp: [
    { label: "Visão Geral", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Obras", href: "/app/obras", icon: HardHat },
    { label: "Financeiro", href: "/app/financeiro", icon: DollarSign },
    { label: "Contratos", href: "/app/contratos", icon: FileText },
  ],
  portal: [
    { label: "Minha Obra", href: "/portal/dashboard", icon: HardHat },
    { label: "Documentos", href: "/portal/docs", icon: FileText },
  ]
}

interface SidebarProps {
  title: string
  color: string
  profile: "admin" | "erp" | "portal" // <--- Mudança aqui: Recebemos apenas a CHAVE
}

export function Sidebar({ title, color, profile }: SidebarProps) {
  const pathname = usePathname()
  
  // Carrega o menu baseado na string do perfil
  const items = MENUS[profile] || []

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-white fixed left-0 top-0">
      {/* Header */}
      <div className={`flex h-16 items-center px-6 ${color} text-white`}>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? `bg-gray-100 text-gray-900`
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-gray-900" : "text-gray-400"}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 bg-gray-50">
        <Link href="/select-org" className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <span>← Trocar Perfil</span>
        </Link>
      </div>
    </div>
  )
}