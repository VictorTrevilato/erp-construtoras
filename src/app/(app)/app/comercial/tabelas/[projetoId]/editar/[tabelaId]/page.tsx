import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getPriceTableData, getFlows } from "@/app/actions/commercial-prices"
import { PriceGrid } from "./_components/price-grid"
import { FlowManager } from "./_components/flow-manager"
import { TableResult } from "./_components/table-result"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Props {
    params: Promise<{ projetoId: string, tabelaId: string }>
}

export default async function EditTablePage({ params }: Props) {
    const session = await auth()
    if (!session) redirect("/login")
    
    const { projetoId, tabelaId } = await params

    const header = await prisma.ycTabelasPreco.findUnique({
        where: { id: BigInt(tabelaId) }
    })
    
    if (!header) return <div>Tabela não encontrada</div>

    // Buscas paralelas
    const [priceData, flows] = await Promise.all([
        getPriceTableData(tabelaId, projetoId),
        getFlows(tabelaId)
    ])

    // Helper de Data (UTC fix)
    const fmtDate = (d: Date) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Link href={`/app/comercial/tabelas/${projetoId}`}>
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {header.nome}
                            <span className="text-sm font-normal text-muted-foreground bg-slate-100 px-2 py-0.5 rounded border">
                                {header.codigo}
                            </span>
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Vigência: {fmtDate(header.vigenciaInicial)} a {fmtDate(header.vigenciaFinal)} • Juros: {Number(header.taxaJuros)}% a.m.
                        </p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="precificacao" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                    <TabsTrigger value="precificacao" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent pb-3 px-6">
                        1. Precificação
                    </TabsTrigger>
                    <TabsTrigger value="fluxos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent pb-3 px-6">
                        2. Fluxos de Pagamento
                    </TabsTrigger>
                    <TabsTrigger value="resultado" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent pb-3 px-6">
                        3. Resultado da Tabela
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="precificacao">
                        <PriceGrid 
                            tabelaId={tabelaId} 
                            initialData={priceData} 
                        />
                    </TabsContent>
                    
                    <TabsContent value="fluxos">
                        <FlowManager 
                            tabelaId={tabelaId} 
                            initialFlows={flows} 
                        />
                    </TabsContent>

                    <TabsContent value="resultado">
                         <TableResult 
                            priceData={priceData}
                            flows={flows}
                         />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}