import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getSalesMirrorData, getNegotiationHeader, getProjectActiveFlows } from "@/app/actions/commercial-negotiation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { NegotiationPageWrapper } from "./_components/negotiation-page-wrapper" // [NOVO]

interface Props {
    params: Promise<{ projetoId: string }>
}

export default async function ProjectMesaPage({ params }: Props) {
    const session = await auth()
    if (!session) redirect("/login")

    const { projetoId } = await params
  
    const [header, units, flows] = await Promise.all([
        getNegotiationHeader(projetoId),
        getSalesMirrorData(projetoId),
        getProjectActiveFlows(projetoId)
    ])

    if (!header) return <div>Projeto não encontrado</div>

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/app/comercial/mesa">
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {header.nome}
                            {header.tabelaCodigo && (
                                <span className="text-sm font-normal text-muted-foreground bg-slate-100 px-2 py-0.5 rounded border">
                                    {header.tabelaCodigo}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {header.localizacao}
                        </p>
                    </div>
                </div>
            </div>

            {/* [NOVO] Renderiza o Wrapper Cliente que tem o Contexto */}
            <NegotiationPageWrapper units={units} flows={flows} />
        </div>
    )
}