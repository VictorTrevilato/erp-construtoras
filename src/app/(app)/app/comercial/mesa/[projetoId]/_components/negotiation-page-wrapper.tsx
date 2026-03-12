'use client'

import { NegotiationProvider, useNegotiation } from "./negotiation-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SalesMirror } from "./sales-mirror"
import { PriceListView } from "./price-list-view"
import { NegotiationForm } from "./negotiation-form"
import { NegotiationUnit } from "@/app/actions/commercial-negotiation"

type ServerFlow = {
    tipo: string
    percentual: number
    qtdeParcelas: number
    periodicidade: number 
    primeiroVencimento: Date | string // <--- CORREÇÃO AQUI
}

type WrapperProps = {
    units: NegotiationUnit[]
    flows: ServerFlow[]
    projetoNome?: string
    tabelaCodigo?: string | null
    logoUrl?: string | null
}

function NegotiationTabs({ units, flows, projetoNome, tabelaCodigo, logoUrl }: WrapperProps) {
    const { activeTab, setActiveTab } = useNegotiation()

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                <TabsTrigger 
                    value="espelho" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-6 text-muted-foreground data-[state=active]:text-foreground"
                >
                    1. Espelho de Vendas
                </TabsTrigger>
                <TabsTrigger 
                    value="tabela" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-6 text-muted-foreground data-[state=active]:text-foreground"
                >
                    2. Tabela de Preços
                </TabsTrigger>
                <TabsTrigger 
                    value="negociacao" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-6 text-muted-foreground data-[state=active]:text-foreground"
                >
                    3. Negociação
                </TabsTrigger>
            </TabsList>

            <div className="mt-6">
                <TabsContent value="espelho" className="focus-visible:ring-0 focus-visible:outline-none">
                    <SalesMirror units={units} />
                </TabsContent>
                
                <TabsContent value="tabela" className="focus-visible:ring-0 focus-visible:outline-none">
                    <PriceListView 
                        units={units} 
                        flows={flows} 
                        projetoNome={projetoNome}
                        tabelaCodigo={tabelaCodigo}
                        logoUrl={logoUrl}
                    />
                </TabsContent>
                
                <TabsContent value="negociacao" className="focus-visible:ring-0 focus-visible:outline-none">
                    <NegotiationForm units={units} />
                </TabsContent>
            </div>
        </Tabs>
    )
}

export function NegotiationPageWrapper({ units, flows, projetoNome, tabelaCodigo, logoUrl }: WrapperProps) {
    return (
        <NegotiationProvider>
            <NegotiationTabs 
                units={units} 
                flows={flows} 
                projetoNome={projetoNome}
                tabelaCodigo={tabelaCodigo}
                logoUrl={logoUrl}
            />
        </NegotiationProvider>
    )
}