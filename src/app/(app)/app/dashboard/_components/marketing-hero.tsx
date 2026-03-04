import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export function MarketingHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-xl">
      {/* Background Pattern (Decorativo) */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 h-[300px] w-[300px] rounded-full bg-background/10 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-[200px] w-[200px] rounded-full bg-secondary/20 blur-2xl"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 gap-6">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-background/20 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm border border-primary-foreground/20">
            <Sparkles className="h-3 w-3" />
            <span>Lançamento do Mês</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            Edifício Hyde
          </h2>
          <p className="text-primary-foreground/90 text-lg md:text-xl opacity-90">
            Onde o Bairro encontra o Futuro.
          </p>
          <div className="pt-2">
            <Button variant="secondary" className="font-semibold gap-2">
              Ver Apresentação
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="hidden md:flex w-64 h-40 bg-background/10 rounded-lg backdrop-blur-sm border border-background/20 items-center justify-center transform rotate-3 shadow-2xl">
           <span className="text-primary-foreground/70 text-sm">Imagem do Empreendimento</span>
        </div>
      </div>
    </div>
  )
}