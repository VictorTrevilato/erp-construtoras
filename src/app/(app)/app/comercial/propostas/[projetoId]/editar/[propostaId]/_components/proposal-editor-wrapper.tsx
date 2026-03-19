"use client"

import { useState } from "react"
import { ProposalProvider, useProposal } from "./proposal-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    ProposalFullDetail, 
    ProposalConditionItem, 
    ProposalInstallmentItem, 
    ProposalPartyItem, 
    ProposalCommissionItem, 
    ProposalHistoryItem, 
    ProposalAttachmentItem 
} from "@/app/actions/commercial-proposals"
import { StandardFlow } from "@/app/actions/commercial-negotiation"

import { ProposalSummaryTab } from "./proposal-summary-tab"
import { ProposalConditionsTab, CustomCondition } from "./proposal-conditions-tab"
import { ProposalInstallmentsTab, GridInstallment } from "./proposal-installments-tab"
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
  initialAttachments: ProposalAttachmentItem[]
}

interface TabsProps extends Props {
    currentProposal: ProposalFullDetail
    setCurrentProposal: React.Dispatch<React.SetStateAction<ProposalFullDetail>>
    
    targetPrice: number
    setTargetPrice: React.Dispatch<React.SetStateAction<number>>
    
    conditions: CustomCondition[]
    setConditions: React.Dispatch<React.SetStateAction<CustomCondition[]>>
    
    installments: GridInstallment[]
    setInstallments: React.Dispatch<React.SetStateAction<GridInstallment[]>>
    
    parties: ProposalPartyItem[] 
    setParties: React.Dispatch<React.SetStateAction<ProposalPartyItem[]>> 
    
    commissions: ProposalCommissionItem[]
    setCommissions: React.Dispatch<React.SetStateAction<ProposalCommissionItem[]>>
    
    percComissaoTotal: number
    setPercComissaoTotal: React.Dispatch<React.SetStateAction<number>>
    
    valorComissaoTotal: number
    setValorComissaoTotal: React.Dispatch<React.SetStateAction<number>>
    
    attachments: ProposalAttachmentItem[]
    setAttachments: React.Dispatch<React.SetStateAction<ProposalAttachmentItem[]>>
}

function ProposalTabs(props: TabsProps) {
    const { activeTab, setActiveTab } = useProposal()

    const triggerClass = "rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-6 text-muted-foreground data-[state=active]:text-foreground whitespace-nowrap"

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
                    <ProposalSummaryTab 
                        proposal={props.currentProposal} 
                        setProposal={props.setCurrentProposal} 
                    />
                </TabsContent>

                <TabsContent value="condicoes" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalConditionsTab 
                        proposal={props.currentProposal} 
                        setProposal={props.setCurrentProposal}
                        initialConditions={props.initialConditions} 
                        standardFlow={props.standardFlow} 
                        conditions={props.conditions}
                        setConditions={props.setConditions}
                        targetPrice={props.targetPrice}
                        setTargetPrice={props.setTargetPrice}
                        setInstallments={props.setInstallments}
                    />
                </TabsContent>

                <TabsContent value="parcelas" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalInstallmentsTab 
                        proposal={props.currentProposal} 
                        setProposal={props.setCurrentProposal}
                        installments={props.installments}
                        setInstallments={props.setInstallments}
                        setConditions={props.setConditions}
                    />
                </TabsContent>

                <TabsContent value="partes" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalPartiesTab 
                        proposal={props.currentProposal} 
                        setProposal={props.setCurrentProposal}
                        parties={props.parties}
                        setParties={props.setParties}
                    />
                </TabsContent>

                <TabsContent value="comissoes" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalCommissionsTab 
                        proposal={props.currentProposal} 
                        setProposal={props.setCurrentProposal}
                        commissions={props.commissions}
                        setCommissions={props.setCommissions}
                        percComissaoTotal={props.percComissaoTotal}
                        setPercComissaoTotal={props.setPercComissaoTotal}
                        valorComissaoTotal={props.valorComissaoTotal}
                        setValorComissaoTotal={props.setValorComissaoTotal}
                    />
                </TabsContent>

                <TabsContent value="anexos" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalAttachmentsTab
                        proposal={props.currentProposal}
                        attachments={props.attachments}
                        setAttachments={props.setAttachments}
                    />
                </TabsContent>

                <TabsContent value="efetivacao" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalExecutionTab 
                        proposal={props.currentProposal} 
                        setProposal={props.setCurrentProposal} 
                        projetoId={props.projetoId}
                        attachments={props.attachments}
                        setAttachments={props.setAttachments}
                        
                    />
                </TabsContent>

                <TabsContent value="historico" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProposalHistoryTab proposal={props.currentProposal} initialHistory={props.initialHistory} />
                </TabsContent>
            </div>
        </Tabs>
    )
}

export function ProposalEditorWrapper(props: Props) {
    // ABA 1: Global
    const [currentProposal, setCurrentProposal] = useState<ProposalFullDetail>(props.proposal)
    
    // ABA 2: Condições
    const [targetPrice, setTargetPrice] = useState<number>(props.proposal.valorProposta)
    const [conditions, setConditions] = useState<CustomCondition[]>(() => 
        props.initialConditions.map((c: ProposalConditionItem) => ({
            id: c.id || crypto.randomUUID(),
            tipo: c.tipo || 'MENSAL',
            periodicidade: 'MENSAL',
            qtdeParcelas: Number(c.qtdeParcelas) || 1,
            valorParcela: Number(c.valorParcela) || 0,
            vencimento: c.dataVencimento ? new Date(c.dataVencimento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }))
    )

    // ABA 3: Parcelas
    const [installments, setInstallments] = useState<GridInstallment[]>(() => 
        props.initialInstallments.map((i: ProposalInstallmentItem) => ({
            id: i.id || crypto.randomUUID(),
            tipo: i.tipo || 'M',
            vencimento: i.vencimento ? new Date(i.vencimento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            valor: Number(i.valor) || 0
        }))
    )

    // ABA 4: Partes
    const [parties, setParties] = useState<ProposalPartyItem[]>(props.initialParties)

    // ABA 5: Comissões
    const [percComissaoTotal, setPercComissaoTotal] = useState<number>(props.proposal.percComissaoTotal || 0)
    const [valorComissaoTotal, setValorComissaoTotal] = useState<number>(props.proposal.valorComissaoTotal || 0)
    const [commissions, setCommissions] = useState<ProposalCommissionItem[]>(props.initialCommissions)

    // ABA 6: Anexos
    const [attachments, setAttachments] = useState<ProposalAttachmentItem[]>(props.initialAttachments)

    return (
        <ProposalProvider>
            <ProposalTabs 
                {...props} 
                currentProposal={currentProposal}
                setCurrentProposal={setCurrentProposal}
                targetPrice={targetPrice}
                setTargetPrice={setTargetPrice}
                conditions={conditions}
                setConditions={setConditions}
                installments={installments}
                setInstallments={setInstallments}
                parties={parties}
                setParties={setParties}
                commissions={commissions}
                setCommissions={setCommissions}
                percComissaoTotal={percComissaoTotal}
                setPercComissaoTotal={setPercComissaoTotal}
                valorComissaoTotal={valorComissaoTotal}
                setValorComissaoTotal={setValorComissaoTotal}
                attachments={attachments}
                setAttachments={setAttachments}
            />
        </ProposalProvider>
    )
}