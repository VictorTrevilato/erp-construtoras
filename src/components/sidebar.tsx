"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { serverSignOut } from "@/app/actions/auth-actions"
import { usePermission } from "@/providers/permission-provider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  LayoutDashboard, Building2, HardHat, DollarSign, Settings,
  Briefcase, ShoppingCart, Calculator, ChevronDown, ChevronRight,
  LogOut, UserCircle, LucideIcon, FolderOpen, ShieldAlert, Users, ChevronLeft, Pin
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

type MenuItem = {
  label: string
  href?: string
  icon?: LucideIcon
  permission?: string 
  children?: MenuItem[]
}

// --- ARRAYS FORMATADOS E LEGÍVEIS ---

const ERP_MENU_ITEMS: MenuItem[] = [
  { 
    label: "Dashboard", 
    href: "/app/dashboard", 
    icon: LayoutDashboard 
  },
  { 
    label: "Cadastros", 
    icon: FolderOpen, 
    permission: "CADASTROS_VER", 
    children: [
      { label: "Pessoas Físicas", href: "/app/cadastros/pessoas-fisicas", permission: "PESSOAS_FISICAS_VER" }, 
      { label: "Pessoas Jurídicas", href: "/app/cadastros/pessoas-juridicas", permission: "PESSOAS_JURIDICAS_VER" }
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
      { label: "Relatórios", href: "/app/engenharia/relatorios", permission: "RELATORIOS_ENGENHARIA" }
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
      { label: "Relatórios", href: "/app/suprimentos/relatorios", permission: "RELATORIOS_SUPRIMENTOS" }
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
      { label: "Relatórios", href: "/app/financeiro/relatorios", permission: "RELATORIOS_FINANCEIRO" }
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
      { label: "Relatórios", href: "/app/contabilidade/relatorios", permission: "RELATORIOS_CONTABILIDADE" }
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
      { label: "Propostas Comerciais", href: "/app/comercial/propostas", permission: "CONTRATOS_VER" }, 
      { label: "Aprovações de Propostas", href: "/app/comercial/aprovacoes", permission: "PRECOS_VER" }, 
      { label: "Relatórios", href: "/app/comercial/relatorios", permission: "RELATORIOS_COMERCIAL" }
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
      { label: "Escopos de Trabalho", href: "/app/configuracoes/escopos", permission: "ESCOPOS_VER" }
    ] 
  }
]

const ADMIN_MENU_ITEMS: MenuItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Empresas", href: "/admin/tenants", icon: Building2 },
  { label: "Usuários Globais", href: "/admin/users", icon: Users },
  { label: "Permissões Mestre", href: "/admin/permissions", icon: ShieldAlert },
]

const PORTAL_MENU_ITEMS: MenuItem[] = [
  { label: "Meu Painel", href: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Minha Obra", href: "/portal/obras", icon: HardHat },
  { label: "Financeiro", href: "/portal/financeiro", icon: DollarSign },
]

// --- COMPONENTE PAI (WRAPPER) ---
export function SidebarLayout({ 
  children, title, logoUrl, logoMiniUrl, profile, showTenantSwitch = false,
  sidebarTheme = "primary", sidebarNavTheme = "primary", topbarTheme = "primary", tooltipsTheme = "primary"
}: { 
  children: React.ReactNode, title: string, logoUrl?: string | null, logoMiniUrl?: string | null, 
  profile: "admin" | "erp" | "portal", showTenantSwitch?: boolean,
  sidebarTheme?: string | null, sidebarNavTheme?: string | null, topbarTheme?: string | null, tooltipsTheme?: string | null
}) {
  const [isPinned, setIsPinned] = useState(true)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (isPinned) setIsOpen(true)
  }, [isPinned])

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen bg-gray-50 overflow-hidden relative" data-topbar-theme={topbarTheme}>
        <Sidebar 
          isPinned={isPinned}
          setIsPinned={setIsPinned}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          title={title} 
          logoUrl={logoUrl} 
          logoMiniUrl={logoMiniUrl}
          profile={profile} 
          showTenantSwitch={showTenantSwitch} 
          sidebarTheme={sidebarTheme}
          sidebarNavTheme={sidebarNavTheme}
          tooltipsTheme={tooltipsTheme}
        />
        
        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isPinned ? 'ml-72' : 'ml-20'}`}>
          <div className="mx-auto max-w-6xl p-8">
            {children}
          </div>
        </main>

        {!isPinned && isOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </TooltipProvider>
  )
}

// --- TIPAGEM DO SIDEBAR ---
interface SidebarProps {
  isPinned: boolean
  setIsPinned: (val: boolean) => void
  isOpen: boolean
  setIsOpen: (val: boolean) => void
  title: string
  logoUrl?: string | null
  logoMiniUrl?: string | null
  profile: "admin" | "erp" | "portal"
  showTenantSwitch?: boolean
  sidebarTheme?: string | null
  sidebarNavTheme?: string | null
  tooltipsTheme?: string | null
}

// --- COMPONENTE SIDEBAR (FILHO) ---
function Sidebar({ isPinned, setIsPinned, isOpen, setIsOpen, title, logoUrl, logoMiniUrl, profile, showTenantSwitch, sidebarTheme, sidebarNavTheme, tooltipsTheme }: SidebarProps) {
  const { can, isLoading } = usePermission()
  const isExpanded = isOpen

  const headerBgClass = sidebarTheme === 'secondary' 
    ? 'bg-secondary text-secondary-foreground border-secondary/10' 
    : 'bg-primary text-primary-foreground border-primary/10'

  const activeNavClass = sidebarNavTheme === 'secondary' 
    ? 'bg-secondary/10 text-secondary' 
    : 'bg-primary/10 text-primary'

  const activeIconClass = sidebarNavTheme === 'secondary' 
    ? 'text-secondary' 
    : 'text-primary'

  const tooltipBgClass = tooltipsTheme === 'secondary' 
    ? 'bg-secondary text-secondary-foreground' 
    : 'bg-primary text-primary-foreground'

  const handleToggle = () => {
    if (!isOpen) setIsOpen(true)
    else if (!isPinned) setIsPinned(true)
    else { setIsPinned(false); setIsOpen(false) }
  }

  let menuToRender: MenuItem[] = []
  let shouldCheckPermissions = false

  if (profile === "admin") { menuToRender = ADMIN_MENU_ITEMS; shouldCheckPermissions = false } 
  else if (profile === "portal") { menuToRender = PORTAL_MENU_ITEMS; shouldCheckPermissions = false } 
  else { menuToRender = ERP_MENU_ITEMS; shouldCheckPermissions = true }

  if (shouldCheckPermissions && isLoading) return <SidebarSkeleton />

  const visibleItems = shouldCheckPermissions 
    ? menuToRender.filter(item => !item.permission || can(item.permission))
    : menuToRender

  return (
    <div className={`flex h-screen flex-col border-r bg-white fixed left-0 top-0 z-50 transition-all duration-300 ${
      isExpanded ? "w-72 shadow-2xl" : "w-20"
    }`}>
      
      <div className={`relative flex h-16 items-center justify-center px-4 border-b ${headerBgClass}`}>
        <div className="relative w-full h-10 flex items-center justify-center">
          {isExpanded ? (
            logoUrl ? (
              <Image src={logoUrl} alt={title} fill className="object-contain" unoptimized />
            ) : (
              <h2 className="text-lg font-bold truncate whitespace-nowrap">{title}</h2>
            )
          ) : (
            logoMiniUrl ? (
              <Image src={logoMiniUrl} alt={title} fill className="object-contain" unoptimized />
            ) : (
              <h2 className="text-2xl font-bold">{title.charAt(0)}</h2>
            )
          )}
        </div>

        <button 
          onClick={handleToggle}
          className="absolute -right-3 top-5 flex h-6 w-6 items-center justify-center rounded-full border bg-white text-gray-700 shadow-sm hover:bg-gray-50 z-50 transition-transform"
        >
          {!isOpen ? <ChevronRight size={14} /> : !isPinned ? <Pin size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {visibleItems.map((item, index) => (
          <SidebarItem 
            key={index} item={item} can={can} checkPermission={shouldCheckPermissions} 
            isExpanded={isExpanded} setIsOpen={setIsOpen} isPinned={isPinned} 
            activeNavClass={activeNavClass} activeIconClass={activeIconClass} tooltipBgClass={tooltipBgClass}
          />
        ))}
      </nav>

      <SidebarFooter showTenantSwitch={showTenantSwitch} isExpanded={isExpanded} setIsOpen={setIsOpen} isPinned={isPinned} activeNavClass={activeNavClass} tooltipBgClass={tooltipBgClass}/>
    </div>
  )
}

function SidebarTooltip({ children, label, isExpanded, tooltipBgClass }: { children: React.ReactNode, label: string, isExpanded: boolean, tooltipBgClass: string }) {
  if (isExpanded) return <>{children}</> 
  
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className={`border-none text-xs font-medium px-3 py-1.5 shadow-md ${tooltipBgClass}`}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

// --- TIPAGEM DO ITEM DO SIDEBAR ---
interface SidebarItemProps {
  item: MenuItem
  can: (permission: string) => boolean
  checkPermission: boolean
  isExpanded: boolean
  setIsOpen: (val: boolean) => void
  isPinned: boolean
  activeNavClass: string
  activeIconClass: string
  tooltipBgClass: string
}

function SidebarItem({ item, can, checkPermission, isExpanded, setIsOpen, isPinned, activeNavClass, activeIconClass, tooltipBgClass }: SidebarItemProps) {
  const pathname = usePathname()
  const [isOpenDropdown, setIsOpenDropdown] = useState(false)

  const isRouteActive = (href?: string) => {
    if (!href || !pathname) return false
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const isActiveParent = item.children?.some((child: MenuItem) => isRouteActive(child.href))
  
  useEffect(() => {
    if (isActiveParent) setIsOpenDropdown(true)
  }, [isActiveParent])

  const hasChildren = item.children && item.children.length > 0
  const isActive = isRouteActive(item.href)
  
  const visibleChildren = checkPermission
    ? item.children?.filter((child: MenuItem) => !child.permission || can(child.permission))
    : item.children

  if (hasChildren && visibleChildren?.length === 0) return null

  const baseClasses = `flex items-center gap-3 rounded-md transition-all duration-300 h-10 min-w-0 w-full px-4 ${
    isExpanded ? "text-sm font-medium" : ""
  }`

  if (hasChildren && item.icon) {
    const Icon = item.icon
    return (
      <div className="mb-1">
        <SidebarTooltip label={item.label} isExpanded={isExpanded} tooltipBgClass={tooltipBgClass}>
          <button
            onClick={() => {
              if (!isExpanded) {
                setIsOpen(true)
                setIsOpenDropdown(true)
              } else {
                setIsOpenDropdown(!isOpenDropdown)
              }
            }}
            className={`${baseClasses} ${isExpanded ? "justify-between" : ""} ${
              isActiveParent ? activeNavClass : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className={`shrink-0 h-6 w-6 ${isActiveParent ? activeIconClass : "text-gray-400"}`} />
              {isExpanded && <span className="whitespace-nowrap truncate">{item.label}</span>}
            </div>
            {isExpanded && (isOpenDropdown ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />)}
          </button>
        </SidebarTooltip>

        {isOpenDropdown && isExpanded && (
          <div className="ml-9 mt-1 space-y-1 border-l pl-2">
            {visibleChildren?.map((child: MenuItem, idx: number) => {
              const isChildActive = isRouteActive(child.href)
              return (
                <Link
                  key={idx}
                  href={child.href || "#"}
                  onClick={() => { if (!isPinned) setIsOpen(false) }}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap truncate ${
                    isChildActive ? activeNavClass : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
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

  if (item.icon) {
    const Icon = item.icon
    return (
      <SidebarTooltip label={item.label} isExpanded={isExpanded} tooltipBgClass={tooltipBgClass}>
        <Link
          href={item.href || "#"}
          onClick={() => { if (!isPinned && isExpanded) setIsOpen(false) }}
          className={`${baseClasses} ${isActive ? activeNavClass : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
        >
          <Icon className={`shrink-0 h-6 w-6 ${isActive ? activeIconClass : "text-gray-400"}`} />
          {isExpanded && <span className="whitespace-nowrap truncate">{item.label}</span>}
        </Link>
      </SidebarTooltip>
    )
  }

  return null
}

// --- TIPAGEM DO FOOTER DO SIDEBAR ---
interface SidebarFooterProps {
  showTenantSwitch?: boolean
  isExpanded: boolean
  setIsOpen: (val: boolean) => void
  isPinned: boolean
  activeNavClass: string
  tooltipBgClass: string
}

function SidebarFooter({ showTenantSwitch, isExpanded, setIsOpen, isPinned, activeNavClass, tooltipBgClass }: SidebarFooterProps) {
  const pathname = usePathname()
  const isContextAdmin = pathname?.startsWith('/admin')
  const isContextPortal = pathname?.startsWith('/portal')
  
  const profileLink = isContextAdmin ? '/admin/me' : isContextPortal ? '/portal/me' : '/app/me'
  const handleNav = () => { if (!isPinned && isExpanded) setIsOpen(false) }

  return (
    <div className="border-t p-4 bg-gray-50 space-y-2 overflow-hidden">
      {showTenantSwitch && isExpanded && (
        <Link href="/select-org" onClick={handleNav} className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors overflow-hidden">
          <span className="whitespace-nowrap truncate">← Trocar Perfil</span>
        </Link>
      )}

      <SidebarTooltip label="Minha Conta" isExpanded={isExpanded} tooltipBgClass={tooltipBgClass}>
        <Link 
          href={profileLink}
          onClick={handleNav}
          className={`flex items-center gap-3 rounded-md transition-all duration-300 h-10 w-full px-3 ${
            isExpanded ? "text-sm font-medium" : ""
          } ${pathname === profileLink ? activeNavClass : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
        >
          <UserCircle className="h-6 w-6 shrink-0" />
          {isExpanded && <span className="whitespace-nowrap truncate">Minha Conta</span>}
        </Link>
      </SidebarTooltip>

      <SidebarTooltip label="Sair do Sistema" isExpanded={isExpanded} tooltipBgClass={tooltipBgClass}>
        <button 
          onClick={() => serverSignOut()} 
          className={`flex items-center gap-3 rounded-md transition-all duration-300 h-10 w-full px-3 ${
            isExpanded ? "text-sm font-medium" : ""
          } text-red-600 hover:text-red-700 hover:bg-red-50`}
        >
          <LogOut className="h-6 w-6 shrink-0" />
          {isExpanded && <span className="whitespace-nowrap truncate">Sair do Sistema</span>}
        </button>
      </SidebarTooltip>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="flex h-screen w-72 flex-col border-r bg-white fixed left-0 top-0 p-4 space-y-4 z-50">
      <Skeleton className="h-8 w-3/4 bg-gray-200" />
      <div className="space-y-3 mt-8">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-10 w-full bg-gray-100" />)}
      </div>
    </div>
  )
}