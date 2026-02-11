import { SiteHeader } from "./_components/site-header"
import { HeroSection } from "./_components/hero"
import { FeaturesSection } from "./_components/features"
import { SiteFooter } from "./_components/footer"

export default function PublicLandingPage() {
  return (
    // flex-col garante que o rodapé vá para o fundo se a página for curta
    // mas aqui o conteúdo é longo, então flui normal.
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
      </main>
      <SiteFooter />
    </div>
  )
}