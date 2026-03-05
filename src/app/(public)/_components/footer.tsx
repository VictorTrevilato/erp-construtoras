import Link from "next/link"
import Image from "next/image"

export function SiteFooter() {
  return (
    <footer className="bg-slate-900 py-12 text-slate-400">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2">
                  <Image 
                    src="/logo.png" 
                    alt="YouCenter" 
                    width={140} 
                    height={40} 
                    className="h-8 w-auto object-contain brightness-0 invert"
                    priority
                  />
                </Link>
        
        <p className="text-sm">
          © {new Date().getFullYear()} VHF System. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}