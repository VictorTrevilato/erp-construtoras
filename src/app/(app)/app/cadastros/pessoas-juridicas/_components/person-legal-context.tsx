'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface PersonLegalContextType {
    activeTab: string
    setActiveTab: (tab: string) => void
}

const PersonLegalContext = createContext<PersonLegalContextType | undefined>(undefined)

export function PersonLegalProvider({ children }: { children: ReactNode }) {
    const [activeTab, setActiveTab] = useState("dados")

    return (
        <PersonLegalContext.Provider value={{ activeTab, setActiveTab }}>
            {children}
        </PersonLegalContext.Provider>
    )
}

export function usePersonLegal() {
    const context = useContext(PersonLegalContext)
    if (!context) throw new Error("usePersonLegal deve ser usado dentro de PersonLegalProvider")
    return context
}