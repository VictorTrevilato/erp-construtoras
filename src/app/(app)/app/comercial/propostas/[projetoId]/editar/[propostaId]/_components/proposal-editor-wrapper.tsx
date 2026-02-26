"use client"

import { ProposalProvider, useProposal } from "./proposal-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProposalFullDetail, ProposalConditionItem, ProposalInstallmentItem, ProposalPartyItem, ProposalCommissionItem, ProposalHistoryItem } from "@/app/actions/commercial-proposals"
import { StandardFlow } from "@/app/actions/commercial-negotiation"
import { ProposalSummaryTab } from "./proposal-summary-tab"
import { ProposalConditionsTab } from "./proposal-conditions-tab"
import { ProposalInstallmentsTab } from "./proposal-installments-tab"
import { ProposalPartiesTab } from "./proposal-parties-tab"
import { ProposalCommissionsTab } from "./proposal-commissions-tab"
import { ProposalAttachmentsTab } from "./proposal-attachments-tab"
import { ProposalExecutionTab } from "./proposal-execution-tab"
import { ProposalHistoryTab } from "./proposal-history-tab"

interface Props {
  proposal: ProposalFullDetail
  projetoId: string
  initialConditions: ProposalConditionItem[]
  standardFlow: StandardFlow[]
  initialInstallments: ProposalInstallmentItem[]
  initialParties: ProposalPartyItem[]
  initialCommissions: ProposalCommissionItem[]
  initialHistory: ProposalHistoryItem[]
}

function ProposalTabs({ proposal, initialConditions, standardFlow, initialInstallments, initialParties, initialCommissions, initialHistory }: Props) {
    const { activeTab, setActiveTab } = useProposal()

    const triggerClass = "rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent pb-3 px-6 text-muted-foreground data-[state=active]:text-foreground whitespace-nowrap"

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto overflow-y-hidden">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto flex-nowrap">
                    <TabsTrigger value="resumo" className={triggerClass}>1. Proposta</TabsTrigger>
                    <TabsTrigger value="condicoes" className={triggerClass}>2. Condições</TabsTrigger>
                    <TabsTrigger value="parcelas" className={triggerClass}>3. Parcelas</TabsTrigger>
                    <TabsTrigger value="partes" className={triggerClass}>4. Partes</TabsTrigger>
                    <TabsTrigger value="comissoes" className={triggerClass}>5. Comissões</TabsTrigger>
                    <TabsTrigger value="anexos" className={triggerClass}>6. Anexos</TabsTrigger>
                    <TabsTrigger value="efetivacao" className={triggerClass}>7. Efetivação</TabsTrigger>
                    <TabsTrigger value="historico" className={triggerClass}>8. Histórico</TabsTrigger>
                </TabsList>
            </div>

            <div className="mt-6">
                <TabsContent value="resumo" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalSummaryTab proposal={proposal} />
                </TabsContent>

                <TabsContent value="condicoes" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalConditionsTab 
                        proposal={proposal} 
                        initialConditions={initialConditions} 
                        standardFlow={standardFlow} 
                    />
                </TabsContent>

                <TabsContent value="parcelas" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalInstallmentsTab 
                        proposal={proposal} 
                        initialInstallments={initialInstallments} 
                    />
                </TabsContent>

                <TabsContent value="partes" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalPartiesTab 
                        proposal={proposal} 
                        initialParties={initialParties} 
                    />
                </TabsContent>

                <TabsContent value="comissoes" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalCommissionsTab 
                        proposal={proposal} 
                        initialCommissions={initialCommissions} 
                    />
                </TabsContent>

                <TabsContent value="anexos" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalAttachmentsTab proposal={proposal} />
                </TabsContent>

                <TabsContent value="efetivacao" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalExecutionTab proposal={proposal} />
                </TabsContent>

                <TabsContent value="historico" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalHistoryTab proposal={proposal} initialHistory={initialHistory} />
                </TabsContent>
            </div>
        </Tabs>
    )
}

export function ProposalEditorWrapper({ proposal, projetoId, initialConditions, standardFlow, initialInstallments, initialParties, initialCommissions, initialHistory }: Props) {
    return (
        <ProposalProvider>
            <ProposalTabs 
                proposal={proposal} 
                projetoId={projetoId} 
                initialConditions={initialConditions}
                standardFlow={standardFlow}
                initialInstallments={initialInstallments}
                initialParties={initialParties}
                initialCommissions={initialCommissions}
                initialHistory={initialHistory}
            />
        </ProposalProvider>
    )
}