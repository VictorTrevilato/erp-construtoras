"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { ApprovalDetail } from "@/app/actions/commercial-approvals"

interface ApprovalContextType {
  proposals: ApprovalDetail[]
  selectedId: string | null
  setSelectedId: (id: string) => void
  selectedProposal: ApprovalDetail | undefined
}

const ApprovalContext = createContext<ApprovalContextType | undefined>(undefined)

export function ApprovalProvider({ 
  children, 
  proposals 
}: { 
  children: ReactNode
  proposals: ApprovalDetail[] 
}) {
  // Seleciona a primeira proposta automaticamente se houver
  const [selectedId, setSelectedId] = useState<string | null>(
    proposals.length > 0 ? proposals[0].id : null
  )

  const selectedProposal = proposals.find(p => p.id === selectedId)

  return (
    <ApprovalContext.Provider value={{ proposals, selectedId, setSelectedId, selectedProposal }}>
      {children}
    </ApprovalContext.Provider>
  )
}

export function useApproval() {
  const context = useContext(ApprovalContext)
  if (!context) throw new Error("useApproval deve ser usado dentro de ApprovalProvider")
  return context
}