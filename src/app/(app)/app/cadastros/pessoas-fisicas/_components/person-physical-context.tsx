'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface PersonPhysicalContextType {
    activeTab: string
    setActiveTab: (tab: string) => void
}

const PersonPhysicalContext = createContext<PersonPhysicalContextType | undefined>(undefined)

export function PersonPhysicalProvider({ children }: { children: ReactNode }) {
    const [activeTab, setActiveTab] = useState("dados")

    return (
        <PersonPhysicalContext.Provider value={{ activeTab, setActiveTab }}>
            {children}
        </PersonPhysicalContext.Provider>
    )
}

export function usePersonPhysical() {
    const context = useContext(PersonPhysicalContext)
    if (!context) throw new Error("usePersonPhysical deve ser usado dentro de PersonPhysicalProvider")
    return context
}