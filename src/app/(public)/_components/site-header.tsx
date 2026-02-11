import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Building2 } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      {/* ADICIONADO: max-w-7xl para limitar a largura e px-6 lg:px-8 para margens maiores */}
      <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-2 font-bold text-xl text-blue-900">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <span>ERP Construtoras</span>
        </div>
        
        <nav className="flex items-center gap-4">
          <Link href="/login">
            <Button>Acessar Plataforma</Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}