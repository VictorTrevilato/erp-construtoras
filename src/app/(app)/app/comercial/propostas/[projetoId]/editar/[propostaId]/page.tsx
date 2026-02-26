import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { 
    getProposalDetails, 
    getProposalConditions, 
    getProposalInstallments,
    getProposalParties,
    getProposalCommissions,
    getProposalHistory
} from "@/app/actions/commercial-proposals"
import { calculateStandardFlow } from "@/app/actions/commercial-negotiation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"
import { ProposalEditorWrapper } from "./_components/proposal-editor-wrapper"

interface Props { 
  params: Promise<{ projetoId: string, propostaId: string }> 
}

export default async function ProposalEditorPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  
  const { projetoId, propostaId } = await params
  
  const proposal = await getProposalDetails(propostaId)

  if (!proposal) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <h2 className="text-2xl font-bold text-slate-700">Proposta não encontrada</h2>
            <Button asChild variant="outline">
                <Link href={`/app/comercial/propostas/${projetoId}`}>Voltar para a lista</Link>
            </Button>
        </div>
    )
  }

  // Busca TUDO em paralelo
  const [conditions, standardFlow, installments, parties, commissions, history] = await Promise.all([
      getProposalConditions(propostaId),
      calculateStandardFlow(proposal.unidade.id, proposal.valorTabelaOriginal),
      getProposalInstallments(propostaId),
      getProposalParties(propostaId),
      getProposalCommissions(propostaId),
      getProposalHistory(propostaId)
  ])

  return (
    <div className="space-y-6 pb-10">
      
      <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-4">
              <Link href={`/app/comercial/propostas/${projetoId}`}>
                  <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
              </Link>
              <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                      <FileText className="h-6 w-6 text-blue-600" />
                      Proposta Comercial
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                      Resumo e formalização da intenção de compra
                  </p>
              </div>
          </div>
      </div>
      
      <ProposalEditorWrapper 
          proposal={proposal} 
          projetoId={projetoId} 
          initialConditions={conditions}
          standardFlow={standardFlow}
          initialInstallments={installments}
          initialParties={parties}
          initialCommissions={commissions}
          initialHistory={history}
      />
      
    </div>
  )
}