import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getCampaigns } from "@/app/actions/commercial-prices"
import { getProjectById } from "@/app/actions/projects"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2 } from "lucide-react" 
import Link from "next/link"
import { CampaignsTable } from "./_components/campaigns-table"
import { Card } from "@/components/ui/card"

interface Props { params: Promise<{ projetoId: string }> }

export default async function CampaignsPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  
  const { projetoId } = await params
  const [project, campaigns] = await Promise.all([
    getProjectById(projetoId),
    getCampaigns(projetoId)
  ])

  if(!project) return <div>Projeto não encontrado</div>

  // --- Lógica de Status (KPIs) ---
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let activeCount = 0
  let scheduledCount = 0
  let expiredCount = 0

  campaigns.forEach(c => {
    const start = new Date(c.vigenciaInicial)
    const end = new Date(c.vigenciaFinal)
    start.setUTCHours(0,0,0,0)
    end.setUTCHours(23,59,59,999)

    if (end < today) {
        expiredCount++
    } else if (start > today) {
        scheduledCount++
    } else {
        activeCount++
    }
  })

  return (
    <div className="space-y-6">
      
      {/* Header com KPIs */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6">
        <div className="flex flex-col gap-2">
            <Button variant="ghost" size="sm" asChild className="w-fit -ml-3 text-muted-foreground hover:text-foreground">
                <Link href="/app/comercial/tabelas">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Building2 className="w-8 h-8 text-muted-foreground" />
                {project.nome}
            </h1>
            <p className="text-muted-foreground">
                Campanhas de venda e precificação.
            </p>
        </div>
        
        {/* Cards de Status */}
        <div className="flex gap-4">
            <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-success/10 border-success/20">
                <span className="text-[10px] text-success uppercase font-bold">Vigentes</span>
                <span className="text-2xl font-bold text-success">{activeCount}</span>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-info/10 border-info/20">
                <span className="text-[10px] text-info uppercase font-bold">Futuras</span>
                <span className="text-2xl font-bold text-info">{scheduledCount}</span>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-muted border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Histórico</span>
                <span className="text-2xl font-bold text-muted-foreground">{expiredCount}</span>
            </Card>
        </div>
      </div>

      <CampaignsTable campaigns={campaigns} projetoId={projetoId} />
    </div>
  )
}