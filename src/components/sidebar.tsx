"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { serverSignOut } from "@/app/actions/auth-actions"
import { usePermission } from "@/providers/permission-provider"
import { 
  LayoutDashboard, 
  Building2, 
  HardHat, 
  DollarSign, 
  Settings,
  Briefcase,
  ShoppingCart,
  Calculator,
  ChevronDown,
  ChevronRight,
  LogOut,
  UserCircle,
  LucideIcon,
  FolderOpen,
  ShieldAlert,
  Users
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// Tipagem
type MenuItem = {
  label: string
  href?: string
  icon?: LucideIcon
  permission?: string 
  children?: MenuItem[]
}

// --- MENU CONTEXTO: ERP (O que definimos antes) ---
const ERP_MENU_ITEMS: MenuItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  {
    label: "Cadastros",
    icon: FolderOpen,
    permission: "CADASTROS_VER",
    children: [
      { label: "Pessoas Físicas", href: "/app/cadastros/pessoas-fisicas", permission: "PESSOAS_FISICAS_VER" },
      { label: "Pessoas Jurídicas", href: "/app/cadastros/pessoas-juridicas", permission: "PESSOAS_JURIDICAS_VER" },
    ]
  },
  {
    label: "Engenharia",
    icon: HardHat,
    permission: "ENGENHARIA_VER",
    children: [
      { label: "Projetos", href: "/app/engenharia/projetos", permission: "PROJETOS_VER" },
      { label: "Orçamentos", href: "/app/engenharia/orcamentos", permission: "ORCAMENTOS_VER" },
      { label: "Planejamentos", href: "/app/engenharia/planejamento", permission: "PLANEJAMENTO_VER" },
      { label: "Acompanhamentos", href: "/app/engenharia/acompanhamento", permission: "ACOMPANHAMENTO_VER" },
      { label: "Relatórios", href: "/app/engenharia/relatorios", permission: "RELATORIOS_ENGENHARIA" },
    ]
  },
  {
    label: "Suprimentos",
    icon: ShoppingCart,
    permission: "SUPRIMENTOS_VER",
    children: [
      { label: "Insumos", href: "/app/suprimentos/insumos", permission: "INSUMOS_VER" },
      { label: "Compras", href: "/app/suprimentos/compras", permission: "COMPRAS_VER" },
      { label: "Medições", href: "/app/suprimentos/medicoes", permission: "MEDICOES_VER" },
      { label: "Estoques", href: "/app/suprimentos/estoques", permission: "ESTOQUES_VER" },
      { label: "Relatórios", href: "/app/suprimentos/relatorios", permission: "RELATORIOS_SUPRIMENTOS" },
    ]
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    permission: "FINANCEIRO_VER",
    children: [
      { label: "Contas a Receber", href: "/app/financeiro/receber", permission: "CONTAS_RECEBER_VER" },
      { label: "Contas a Pagar", href: "/app/financeiro/pagar", permission: "CONTAS_PAGAR_VER" },
      { label: "Caixa e Bancos", href: "/app/financeiro/caixa", permission: "CAIXA_BANCOS_VER" },
      { label: "Relatórios", href: "/app/financeiro/relatorios", permission: "RELATORIOS_FINANCEIRO" },
    ]
  },
  {
    label: "Contabilidade",
    icon: Calculator,
    permission: "CONTABILIDADE_VER",
    children: [
      { label: "Dashboard Fiscal", href: "/app/contabilidade/dashboard", permission: "FISCAL_VER" },
      { label: "Custo Orçado e Incorrido", href: "/app/contabilidade/custos", permission: "CUSTOS_VER" },
      { label: "Acomp. de Correção", href: "/app/contabilidade/correcao", permission: "CORRECAO_VER" },
      { label: "Relatórios", href: "/app/contabilidade/relatorios", permission: "RELATORIOS_CONTABILIDADE" },
    ]
  },
  {
    label: "Comercial",
    icon: Briefcase,
    permission: "COMERCIAL_VER",
    children: [
      { label: "Gestão de Unidades", href: "/app/comercial/unidades", permission: "UNIDADES_VER" },
      { label: "Preços e Fluxos", href: "/app/comercial/tabelas", permission: "PRECOS_VER" },
      { label: "Mesa de Negociação", href: "/app/comercial/mesa", permission: "MESA_VER" },
      { label: "Propostas e Contratos", href: "/app/comercial/contratos", permission: "CONTRATOS_VER" },
      { label: "Relatórios", href: "/app/comercial/relatorios", permission: "RELATORIOS_COMERCIAL" },
    ]
  },
  {
    label: "Configurações",
    icon: Settings,
    permission: "CONFIG_VER",
    children: [
      { label: "Dados da Empresa", href: "/app/configuracoes/empresa", permission: "EMPRESA_VER" },
      { label: "Usuários e Acessos", href: "/app/configuracoes/usuarios", permission: "USUARIOS_VER" },
      { label: "Cargos e Permissões", href: "/app/configuracoes/cargos", permission: "CARGOS_VER" },
      { label: "Escopos de Trabalho", href: "/app/configuracoes/escopos", permission: "ESCOPOS_VER" },
    ]
  }
]

// --- MENU CONTEXTO: ADMIN (SuperAdmin / SaaS Management) ---
const ADMIN_MENU_ITEMS: MenuItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Empresas", href: "/admin/tenants", icon: Building2 },
  { label: "Usuários Globais", href: "/admin/users", icon: Users },
  { label: "Permissões Mestre", href: "/admin/permissions", icon: ShieldAlert },
]

// --- MENU CONTEXTO: PORTAL (Cliente Final) ---
const PORTAL_MENU_ITEMS: MenuItem[] = [
  { label: "Meu Painel", href: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Minha Obra", href: "/portal/obras", icon: HardHat },
  { label: "Financeiro", href: "/portal/financeiro", icon: DollarSign },
]

interface SidebarProps {
  title: string
  color: string
  profile: "admin" | "erp" | "portal"
  showTenantSwitch?: boolean
}

export function Sidebar({ title, color, profile, showTenantSwitch = false }: SidebarProps) {
  const { can, isLoading } = usePermission()
  
  // LÓGICA DE SELEÇÃO DE MENU
  let menuToRender: MenuItem[] = []
  let shouldCheckPermissions = false

  if (profile === "admin") {
    menuToRender = ADMIN_MENU_ITEMS
    shouldCheckPermissions = false // Admin vê tudo
  } else if (profile === "portal") {
    menuToRender = PORTAL_MENU_ITEMS
    shouldCheckPermissions = false // Portal tem lógica simples (ou implementaremos depois)
  } else {
    // Default: ERP
    menuToRender = ERP_MENU_ITEMS
    shouldCheckPermissions = true // ERP usa o sistema de permissões granulares
  }

  // Se for ERP e estiver carregando permissões, mostra Skeleton
  // Se for Admin, NÃO mostra Skeleton (pois não depende do hook de permissões)
  if (shouldCheckPermissions && isLoading) {
    return <SidebarSkeleton />
  }

  // Filtra itens (apenas se for ERP/Permissionado)
  const visibleItems = shouldCheckPermissions 
    ? menuToRender.filter(item => !item.permission || can(item.permission))
    : menuToRender

  return (
    <div className="flex h-screen w-72 flex-col border-r bg-white fixed left-0 top-0 z-50 transition-all duration-300">
      {/* Header */}
      <div className={`flex h-16 items-center px-6 ${color} text-white`}>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        {visibleItems.map((item, index) => (
          <SidebarItem 
            key={index} 
            item={item} 
            can={can} 
            checkPermission={shouldCheckPermissions} // Passamos essa flag adiante
          />
        ))}
      </nav>

      {/* Footer */}
      <SidebarFooter showTenantSwitch={showTenantSwitch} />
    </div>
  )
}

function SidebarItem({ 
  item, 
  can, 
  checkPermission 
}: { 
  item: MenuItem, 
  can: (code: string) => boolean,
  checkPermission: boolean
}) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  // [CORREÇÃO] Helper para verificar se a rota é ativa (suporta sub-rotas como /novo ou /[id])
  const isRouteActive = (href?: string) => {
    if (!href || !pathname) return false
    if (pathname === href) return true // Match exato
    if (pathname.startsWith(`${href}/`)) return true // Match parcial (ex: /cargos/novo)
    return false
  }

  // Verifica se algum filho está ativo para manter o menu pai aberto e pintado
  const isActiveParent = item.children?.some(child => isRouteActive(child.href))
  
  useState(() => {
    if (isActiveParent) setIsOpen(true)
  })

  const hasChildren = item.children && item.children.length > 0
  
  // [CORREÇÃO] Usa a nova função para o item atual
  const isActive = isRouteActive(item.href)
  
  // Filtra filhos baseado na permissão (se necessário)
  const visibleChildren = checkPermission
    ? item.children?.filter(child => !child.permission || can(child.permission))
    : item.children

  // Se tem filhos mas nenhum é visível, esconde o pai
  if (hasChildren && visibleChildren?.length === 0) return null

  const baseClasses = "flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"

  if (hasChildren) {
    return (
      <div className="mb-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`${baseClasses} justify-between ${
            isActiveParent ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center gap-3">
            {item.icon && <item.icon className={`h-5 w-5 ${isActiveParent ? "text-gray-900" : "text-gray-400"}`} />}
            {item.label}
          </div>
          {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </button>

        {isOpen && (
          <div className="ml-9 mt-1 space-y-1 border-l pl-2">
            {visibleChildren?.map((child, idx) => {
              // [CORREÇÃO] Verifica atividade do filho individualmente
              const isChildActive = isRouteActive(child.href)
              return (
                <Link
                  key={idx}
                  href={child.href || "#"}
                  className={`block rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                    isChildActive
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {child.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href || "#"}
      className={`${baseClasses} ${
        isActive
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {item.icon && <item.icon className={`h-5 w-5 ${isActive ? "text-gray-900" : "text-gray-400"}`} />}
      {item.label}
    </Link>
  )
}

function SidebarFooter({ showTenantSwitch }: { showTenantSwitch: boolean }) {
  const pathname = usePathname()
  const isContextAdmin = pathname?.startsWith('/admin')
  const isContextPortal = pathname?.startsWith('/portal')
  
  const profileLink = isContextAdmin ? '/admin/me' : isContextPortal ? '/portal/me' : '/app/me'

  return (
    <div className="border-t p-4 bg-gray-50 space-y-2">
      {showTenantSwitch && (
        <Link 
          href="/select-org" 
          className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          <span>← Trocar Perfil</span>
        </Link>
      )}

      <Link 
        href={profileLink}
        className={`flex items-center gap-2 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
           pathname === profileLink 
             ? "text-gray-900 bg-gray-100" 
             : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
        }`}
      >
        <UserCircle className="h-4 w-4" />
        <span>Minha Conta</span>
      </Link>

      <button 
        onClick={() => serverSignOut()} 
        className="flex w-full items-center gap-2 px-2 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
      >
        <LogOut className="h-4 w-4" />
        <span>Sair do Sistema</span>
      </button>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="flex h-screen w-72 flex-col border-r bg-white fixed left-0 top-0 p-4 space-y-4">
      <Skeleton className="h-8 w-3/4 bg-gray-200" />
      <div className="space-y-3 mt-8">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-10 w-full bg-gray-100" />
        ))}
      </div>
    </div>
  )
}