import { Building2 } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="bg-slate-900 py-12 text-slate-400">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 font-bold text-xl text-white">
          <Building2 className="h-6 w-6 text-primary" />
          <span>YouCenter - ERP</span>
        </div>
        
        <p className="text-sm">
          © {new Date().getFullYear()} VHF System. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}