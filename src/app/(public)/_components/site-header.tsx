import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/logo.png" 
            alt="YouCenter" 
            width={140} 
            height={40} 
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>
        
        <nav className="flex items-center gap-4">
          <Link href="/login">
            <Button>Acessar Plataforma</Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}