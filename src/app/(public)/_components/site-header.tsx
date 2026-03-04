import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Building2 } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-2 font-bold text-xl text-foreground">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <span>YouCenter - ERP</span>
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