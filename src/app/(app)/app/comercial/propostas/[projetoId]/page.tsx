import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProposalsByProject } from "@/app/actions/commercial-proposals"
import { getProjectById } from "@/app/actions/projects"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2 } from "lucide-react"
import Link from "next/link"
import { ProposalsList } from "./_components/proposals-list"
import { Card } from "@/components/ui/card"

interface Props { params: Promise<{ projetoId: string }> }

export default async function ProjectProposalsPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  
  const { projetoId } = await params
  
  const [project, proposals] = await Promise.all([
    getProjectById(projetoId),
    getProposalsByProject(projetoId)
  ])

  if(!project) return <div>Projeto não encontrado</div>

  // --- Lógica de Status (KPIs) ---
  const totalCount = proposals.length
  const aprovadasCount = proposals.filter(p => p.status === 'APROVADO').length
  const reprovadasCount = proposals.filter(p => p.status === 'REPROVADO').length
  const analiseCount = proposals.filter(p => p.status === 'EM_ANALISE').length

  return (
    <div className="space-y-6">
      
      {/* Header e Navegação */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
           <Link href="/app/comercial/propostas">
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
                    Gestão de pré-contratos e fluxos de venda.
                </p>
            </div>
            
            {/* Cards de Status (KPIs) */}
            <div className="flex gap-4">
                <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-slate-50 border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Total</span>
                    <span className="text-2xl font-bold text-slate-700">{totalCount}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-blue-50 border-blue-200">
                    <span className="text-[10px] text-blue-700 uppercase font-bold">Em Análise</span>
                    <span className="text-2xl font-bold text-blue-700">{analiseCount}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-green-50 border-green-200">
                    <span className="text-[10px] text-green-700 uppercase font-bold">Aprovadas</span>
                    <span className="text-2xl font-bold text-green-700">{aprovadasCount}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-red-50 border-red-200">
                    <span className="text-[10px] text-red-700 uppercase font-bold">Reprovadas</span>
                    <span className="text-2xl font-bold text-red-700">{reprovadasCount}</span>
                </Card>
            </div>
        </div>
      </div>
      
      <ProposalsList proposals={proposals} projetoId={projetoId} />
    </div>
  )
}