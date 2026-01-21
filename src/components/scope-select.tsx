"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, Home, HardHat, Folder, Landmark, CircleDashed } from "lucide-react"
import React from "react" // Importante para o tipo ElementType

// [CORREÇÃO] Trocamos 'any' por 'React.ElementType'
const SCOPE_CONFIG: Record<string, { icon: React.ElementType, color: string }> = {
  HOLDING:      { icon: Landmark,    color: "text-indigo-600" },
  MATRIZ:       { icon: Building2,   color: "text-blue-600" },
  FILIAL:       { icon: Home,        color: "text-purple-600" },
  OBRA:         { icon: HardHat,     color: "text-orange-600" },
  DEPARTAMENTO: { icon: Folder,      color: "text-gray-600" },
}

interface ScopeOption {
  id: string
  nome: string
  tipo: string
  nivel: number
}

interface ScopeSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: ScopeOption[]
  placeholder?: string
  disabled?: boolean
  error?: string
}

export function ScopeSelect({ value, onValueChange, options, placeholder = "Selecione...", disabled, error }: ScopeSelectProps) {
  
  const selectedOption = options.find(o => o.id === value)
  
  const selectedConfig = selectedOption 
    ? SCOPE_CONFIG[selectedOption.tipo] || { icon: CircleDashed, color: "text-slate-500" }
    : null
  
  // O TypeScript agora sabe que SelectedIcon é um componente válido
  const SelectedIcon = selectedConfig?.icon

  return (
    <>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={error ? "border-red-500" : ""}>
          {selectedOption && SelectedIcon ? (
            <div className="flex items-center gap-2">
               <SelectedIcon className={`w-4 h-4 ${selectedConfig?.color}`} />
               <span className="truncate">{selectedOption.nome}</span>
               <span className="text-[10px] text-muted-foreground uppercase border px-1 rounded ml-auto mr-2">
                  {selectedOption.tipo}
               </span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        
        <SelectContent>
          {options.map((scope) => {
            const config = SCOPE_CONFIG[scope.tipo] || { icon: CircleDashed, color: "text-slate-500" }
            const Icon = config.icon
            const indent = (scope.nivel - 1) * 16 

            return (
              <SelectItem key={scope.id} value={scope.id}>
                <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span>{scope.nome}</span>
                  <span className="text-[10px] text-muted-foreground ml-1 uppercase border px-1 rounded">
                    {scope.tipo}
                  </span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </>
  )
}