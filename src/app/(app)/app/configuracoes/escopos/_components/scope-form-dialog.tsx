"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { saveScope, ScopeFormState } from "@/app/actions/scopes"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { 
  Loader2, 
  Building2, 
  Home, 
  HardHat, 
  Folder, 
  Landmark, 
  CircleDashed,
  Globe // Icone para a Raiz
} from "lucide-react"

// Interface atualizada para incluir o TIPO
interface ScopeOption {
  id: string
  nome: string
  caminho: string
  tipo: string // <--- Necessário para a cor/icone
}

interface ScopeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId: string | null
  editingScope: { id: string, nome: string, tipo: string, idPai: string | null } | null
  allScopes: ScopeOption[]
}

const initialState: ScopeFormState = { message: "", errors: {} }

const STANDARD_TYPES = ["HOLDING", "MATRIZ", "FILIAL", "OBRA", "DEPARTAMENTO"]

// Configuração Visual (Copiada para garantir funcionamento isolado)
const TYPE_CONFIG: Record<string, { icon: React.ElementType, color: string }> = {
  HOLDING:      { icon: Landmark,    color: "text-indigo-600" },
  MATRIZ:       { icon: Building2,   color: "text-blue-600" },
  FILIAL:       { icon: Home,        color: "text-purple-600" },
  OBRA:         { icon: HardHat,     color: "text-orange-600" },
  DEPARTAMENTO: { icon: Folder,      color: "text-gray-600" },
}

export function ScopeFormDialog({ open, onOpenChange, parentId, editingScope, allScopes }: ScopeFormDialogProps) {
  const saveWithId = saveScope.bind(null, editingScope?.id || null)
  const [state, formAction, isPending] = useActionState(saveWithId, initialState)
  
  const [selectedType, setSelectedType] = useState<string>("OBRA")
  const [customType, setCustomType] = useState("")

  useEffect(() => {
    if (open) {
      if (editingScope) {
        if (STANDARD_TYPES.includes(editingScope.tipo)) {
          setSelectedType(editingScope.tipo)
          setCustomType("")
        } else {
          setSelectedType("OUTRO")
          setCustomType(editingScope.tipo)
        }
      } else {
        setSelectedType("OBRA")
        setCustomType("")
      }
    }
  }, [open, editingScope])

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
      onOpenChange(false)
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state, onOpenChange])

  const defaultParentValue = parentId || editingScope?.idPai || "root"

  // Função auxiliar para renderizar item no Select de Pais
  const renderScopeOption = (scope: ScopeOption) => {
    const config = TYPE_CONFIG[scope.tipo] || { icon: CircleDashed, color: "text-slate-500" }
    const Icon = config.icon
    
    return (
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className="truncate">{scope.nome}</span>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingScope ? "Editar Escopo" : "Novo Escopo"}</DialogTitle>
          <DialogDescription>
            {editingScope 
              ? "Altere o nome, tipo ou mova este escopo para outro local." 
              : "Defina os detalhes da nova unidade organizacional."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          
          <div className="space-y-2">
            <Label>Nome da Unidade</Label>
            <Input 
              name="nome" 
              placeholder="Ex: Obra Shopping Center" 
              defaultValue={editingScope?.nome} 
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOLDING">Holding</SelectItem>
                  <SelectItem value="MATRIZ">Matriz</SelectItem>
                  <SelectItem value="FILIAL">Filial / Regional</SelectItem>
                  <SelectItem value="OBRA">Obra</SelectItem>
                  <SelectItem value="DEPARTAMENTO">Departamento</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="tipo" value={selectedType === "OUTRO" ? customType : selectedType} />
            </div>

            {/* Campo de Seleção do PAI com Icones Coloridos */}
            <div className="space-y-2">
              <Label>Localização (Pai)</Label>
              <Select name="idPai" defaultValue={defaultParentValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o pai..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  
                  {/* Opção Raiz Customizada */}
                  <SelectItem value="root">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <Globe className="w-4 h-4" />
                      <span>-- Raiz --</span>
                    </div>
                  </SelectItem>
                  
                  {allScopes
                    .filter(s => s.id !== editingScope?.id)
                    .map((scope) => (
                    <SelectItem key={scope.id} value={scope.id}>
                      {renderScopeOption(scope)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedType === "OUTRO" && (
            <div className="space-y-2">
              <Label>Nome do Tipo Personalizado</Label>
              <Input 
                value={customType}
                onChange={(e) => setCustomType(e.target.value.toUpperCase())}
                placeholder="Ex: SETOR TI"
                required
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}