"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { serverSignOut } from "@/app/actions/auth-actions" // [Novo] Import da Action
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  HardHat, 
  DollarSign, 
  FileText,
  LucideIcon,
  ShieldCheck,
  LogOut // [Novo] Ícone
} from "lucide-react"

// ... (Tipos e MENUS mantidos iguais) ...
type MenuItem = {
  label: string
  href: string
  icon: LucideIcon
}

const MENUS: Record<string, MenuItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Empresas", href: "/admin/tenants", icon: Building2 },
    { label: "Usuários", href: "/admin/users", icon: Users },
    { label: "Permissões", href: "/admin/permissions", icon: ShieldCheck },
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
  profile: "admin" | "erp" | "portal"
  showTenantSwitch?: boolean
}

export function Sidebar({ title, color, profile, showTenantSwitch = false }: SidebarProps) {
  const pathname = usePathname()
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
      <div className="border-t p-4 bg-gray-50 space-y-2">
        {/* Botão Trocar Perfil (Condicional) */}
        {showTenantSwitch && (
          <Link 
            href="/select-org" 
            className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <span>← Trocar Perfil</span>
          </Link>
        )}

        {/* Botão Sair (Sempre visível) */}
        <button 
          onClick={() => serverSignOut()} 
          className="flex w-full items-center gap-2 px-2 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </div>
  )
}