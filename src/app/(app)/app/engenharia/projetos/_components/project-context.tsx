'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ProjectContextType {
    activeTab: string
    setActiveTab: (tab: string) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [activeTab, setActiveTab] = useState("dados")

    return (
        <ProjectContext.Provider value={{ activeTab, setActiveTab }}>
            {children}
        </ProjectContext.Provider>
    )
}

export function useProject() {
    const context = useContext(ProjectContext)
    if (!context) throw new Error("useProject deve ser usado dentro de ProjectProvider")
    return context
}