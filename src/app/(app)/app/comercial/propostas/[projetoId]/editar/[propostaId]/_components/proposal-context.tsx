'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ProposalContextType {
    activeTab: string
    setActiveTab: (tab: string) => void
}

const ProposalContext = createContext<ProposalContextType | undefined>(undefined)

export function ProposalProvider({ children }: { children: ReactNode }) {
    const [activeTab, setActiveTab] = useState("resumo")

    return (
        <ProposalContext.Provider value={{ activeTab, setActiveTab }}>
            {children}
        </ProposalContext.Provider>
    )
}

export function useProposal() {
    const context = useContext(ProposalContext)
    if (!context) throw new Error("useProposal deve ser usado dentro de ProposalProvider")
    return context
}