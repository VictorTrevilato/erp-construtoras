'use client'

import { NegotiationProvider, useNegotiation } from "./negotiation-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SalesMirror } from "./sales-mirror"
import { PriceListView } from "./price-list-view"
import { NegotiationForm } from "./negotiation-form"
import { DocumentsTab } from "./documents-tab" // <-- IMPORT DA NOVA ABA
import { NegotiationUnit } from "@/app/actions/commercial-negotiation"

type ServerFlow = {
    tipo: string
    percentual: number
    qtdeParcelas: number
    periodicidade: number 
    primeiroVencimento: Date | string
}

type WrapperProps = {
    projetoId: string // <-- NOVO PARAMETRO
    units: NegotiationUnit[]
    flows: ServerFlow[]
    projetoNome?: string
    tabelaCodigo?: string | null
    logoUrl?: string | null
}

function NegotiationTabs({ projetoId, units, flows, projetoNome, tabelaCodigo, logoUrl }: WrapperProps) {
    const { activeTab, setActiveTab } = useNegotiation()

    const triggerClass = "rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-6 text-muted-foreground data-[state=active]:text-foreground"

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto overflow-y-hidden border-b">
                <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto flex-nowrap">
                    <TabsTrigger value="espelho" className={triggerClass}>1. Espelho de Vendas</TabsTrigger>
                    <TabsTrigger value="tabela" className={triggerClass}>2. Tabela de Preços</TabsTrigger>
                    <TabsTrigger value="negociacao" className={triggerClass}>3. Negociação</TabsTrigger>
                    <TabsTrigger value="documentos" className={triggerClass}>4. Documentos</TabsTrigger>
                </TabsList>
            </div>

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

                <TabsContent value="documentos" className="focus-visible:ring-0 focus-visible:outline-none">
                    <DocumentsTab projetoId={projetoId} units={units} />
                </TabsContent>
            </div>
        </Tabs>
    )
}

export function NegotiationPageWrapper({ projetoId, units, flows, projetoNome, tabelaCodigo, logoUrl }: WrapperProps) {
    return (
        <NegotiationProvider>
            <NegotiationTabs 
                projetoId={projetoId}
                units={units} 
                flows={flows} 
                projetoNome={projetoNome}
                tabelaCodigo={tabelaCodigo}
                logoUrl={logoUrl}
            />
        </NegotiationProvider>
    )
}