import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProposals } from "@/app/actions/commercial-approvals"
import { getNegotiationHeader } from "@/app/actions/commercial-negotiation" // Reuso da função de header
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ApprovalPageWrapper } from "./_components/approval-page-wrapper"

interface Props {
    params: Promise<{ projetoId: string }>
}

export default async function ApprovalOutlookPage({ params }: Props) {
    const session = await auth()
    if (!session) redirect("/login")

    const { projetoId } = await params
    
    // Busca dados em paralelo
    const [header, proposals] = await Promise.all([
        getNegotiationHeader(projetoId),
        getProposals(projetoId)
    ])

    if (!header) return <div>Projeto não encontrado</div>

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
            {/* Header Fixo */}
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/app/comercial/aprovacoes">
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {header.nome}
                            <span className="text-sm font-normal text-muted-foreground bg-slate-100 px-2 py-0.5 rounded border">
                                Aprovações
                            </span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {header.localizacao}
                        </p>
                    </div>
                </div>
            </div>

            {/* Conteúdo Master-Detail */}
            <div className="flex-1 min-h-0">
                <ApprovalPageWrapper proposals={proposals} />
            </div>
        </div>
    )
}