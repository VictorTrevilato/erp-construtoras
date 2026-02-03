'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { StandardFlow } from "@/app/actions/commercial-negotiation"

// Tipos
type LeadData = { nome: string, email: string, telefone: string, origem: string }
type ConditionData = {
    id: string
    tipo: string
    periodicidade: string
    qtdeParcelas: number
    valorParcela: number
    vencimento: string
}

interface NegotiationContextType {
    // Controle de Navegação
    activeTab: string
    setActiveTab: (tab: string) => void
    
    // Seleção de Unidade
    selectedUnitId: string
    setSelectedUnitId: (id: string) => void

    // Dados do Formulário (Persistência)
    lead: LeadData
    setLead: (lead: LeadData) => void // Aceita o objeto direto
    updateLead: (field: keyof LeadData, value: string) => void // Helper para campos individuais
    
    targetPrice: number
    setTargetPrice: (val: number) => void
    
    conditions: ConditionData[]
    setConditions: (conds: ConditionData[]) => void
    
    standardFlow: StandardFlow[]
    setStandardFlow: (flows: StandardFlow[]) => void
}

const NegotiationContext = createContext<NegotiationContextType | undefined>(undefined)

export function NegotiationProvider({ children }: { children: ReactNode }) {
    const [activeTab, setActiveTab] = useState("espelho")
    const [selectedUnitId, setSelectedUnitId] = useState("")
    
    // Estado do Lead (Inicia vazio)
    const [lead, setLead] = useState<LeadData>({ 
        nome: "", email: "", telefone: "", origem: "" 
    })

    // Estado da Proposta
    const [targetPrice, setTargetPrice] = useState(0)
    const [conditions, setConditions] = useState<ConditionData[]>([])
    const [standardFlow, setStandardFlow] = useState<StandardFlow[]>([])

    const updateLead = (field: keyof LeadData, value: string) => {
        setLead(prev => ({ ...prev, [field]: value }))
    }

    return (
        <NegotiationContext.Provider value={{
            activeTab, setActiveTab,
            selectedUnitId, setSelectedUnitId,
            lead, setLead, updateLead,
            targetPrice, setTargetPrice,
            conditions, setConditions,
            standardFlow, setStandardFlow
        }}>
            {children}
        </NegotiationContext.Provider>
    )
}

export function useNegotiation() {
    const context = useContext(NegotiationContext)
    if (!context) throw new Error("useNegotiation deve ser usado dentro de NegotiationProvider")
    return context
}