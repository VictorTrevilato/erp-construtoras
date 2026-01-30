import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getCampaigns } from "@/app/actions/commercial-prices"
import { getProjectById } from "@/app/actions/projects"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2 } from "lucide-react" // [REMOVIDO] Calculator
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

    if (today >= start && today <= end) {
        activeCount++
    } else if (today < start) {
        scheduledCount++
    } else {
        expiredCount++
    }
  })

  return (
    <div className="space-y-6">
      
      {/* Header e Navegação */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
           <Link href="/app/comercial/tabelas">
              <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
           </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Building2 className="h-8 w-8 text-gray-700" />
                    {project.nome}
                </h1>
                <p className="text-muted-foreground">
                    Campanhas de venda e precificação.
                </p>
            </div>
            
            {/* Cards de Status */}
            <div className="flex gap-4">
                <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-green-50 border-green-200">
                    <span className="text-[10px] text-green-700 uppercase font-bold">Vigentes</span>
                    <span className="text-2xl font-bold text-green-700">{activeCount}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-blue-50 border-blue-200">
                    <span className="text-[10px] text-blue-700 uppercase font-bold">Futuras</span>
                    <span className="text-2xl font-bold text-blue-700">{scheduledCount}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-slate-50 border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Histórico</span>
                    <span className="text-2xl font-bold text-slate-600">{expiredCount}</span>
                </Card>
            </div>
        </div>
      </div>

      {/* [ALTERAÇÃO] Removido o botão solto daqui. Ele agora vive dentro do componente abaixo. */}
      
      <CampaignsTable campaigns={campaigns} projetoId={projetoId} />
    </div>
  )
}