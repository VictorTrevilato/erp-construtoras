"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createUnit, updateUnit } from "@/app/actions/commercial-units"
import { useState, useTransition, useEffect } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface Block {
  id: string
  nome: string
}

interface Unit {
  id: string
  blocoId: string
  unidade: string
  tipo: string
  vagas: number | string // Pode vir number do banco ou string do form
  status: string
  codigoTabela: string
  areaPrivativaPrincipal: string
  areaOutrasPrivativas: string
  areaPrivativaTotal: string
  areaUsoComum: string
  areaRealTotal: string
  coeficienteProporcionalidade: string
  fracaoIdealTerreno: string
}

interface Props {
  projetoId: string
  unit: Unit | null     // [CORREÇÃO] Tipagem correta
  blocks: Block[]       // [CORREÇÃO] Tipagem correta
  isOpen: boolean
  onClose: () => void
  readOnly?: boolean
}

// Estado inicial vazio
const initialFormState = {
  blocoId: "",
  unidade: "",
  tipo: "",
  vagas: "0",
  status: "DISPONIVEL",
  codigoTabela: "",
  areaPrivativaPrincipal: "",
  areaOutrasPrivativas: "",
  areaPrivativaTotal: "", // Calculado
  areaUsoComum: "",
  areaRealTotal: "",      // Calculado
  coeficienteProporcionalidade: "",
  fracaoIdealTerreno: ""
}

export function UnitFormDialog({ projetoId, unit, blocks, isOpen, onClose, readOnly = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState(initialFormState)

  // Carregar dados ao abrir
  useEffect(() => {
    if (isOpen) {
      if (unit) {
        setFormData({
          blocoId: unit.blocoId || "",
          unidade: unit.unidade || "",
          tipo: unit.tipo || "",
          vagas: unit.vagas?.toString() || "0",
          status: unit.status || "DISPONIVEL",
          codigoTabela: unit.codigoTabela || "",
          areaPrivativaPrincipal: unit.areaPrivativaPrincipal || "",
          areaOutrasPrivativas: unit.areaOutrasPrivativas || "",
          areaPrivativaTotal: unit.areaPrivativaTotal || "",
          areaUsoComum: unit.areaUsoComum || "",
          areaRealTotal: unit.areaRealTotal || "",
          coeficienteProporcionalidade: unit.coeficienteProporcionalidade || "",
          fracaoIdealTerreno: unit.fracaoIdealTerreno || ""
        })
      } else {
        setFormData(initialFormState)
      }
    }
  }, [isOpen, unit])

  // Cálculo Automático de Áreas
  useEffect(() => {
    if (readOnly) return // Não calcula no modo leitura para manter o que veio do banco

    const privPrinc = parseFloat(formData.areaPrivativaPrincipal?.replace(',', '.') || "0")
    const privOutras = parseFloat(formData.areaOutrasPrivativas?.replace(',', '.') || "0")
    const comum = parseFloat(formData.areaUsoComum?.replace(',', '.') || "0")

    const totalPriv = privPrinc + privOutras
    const totalReal = totalPriv + comum

    setFormData(prev => ({
      ...prev,
      areaPrivativaTotal: totalPriv > 0 ? totalPriv.toFixed(2).replace('.', ',') : prev.areaPrivativaTotal,
      areaRealTotal: totalReal > 0 ? totalReal.toFixed(2).replace('.', ',') : prev.areaRealTotal
    }))
  }, [formData.areaPrivativaPrincipal, formData.areaOutrasPrivativas, formData.areaUsoComum, readOnly])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    // Construção manual do FormData para garantir que campos ocultos nas abas sejam enviados
    const payload = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value)
    })

    startTransition(async () => {
      let res;
      if (unit) {
        res = await updateUnit(unit.id, payload)
      } else {
        res = await createUnit(projetoId, payload)
      }

      if (res.success) {
        toast.success(res.message)
        onClose()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? `Detalhes da Unidade ${formData.unidade}` : (unit ? `Editar Unidade ${unit.unidade}` : "Nova Unidade")}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <Tabs defaultValue="identificacao" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="identificacao">Básico</TabsTrigger>
              <TabsTrigger value="areas">Áreas</TabsTrigger>
              <TabsTrigger value="fracoes">Frações</TabsTrigger>
              <TabsTrigger value="comercial">Comercial</TabsTrigger>
            </TabsList>

            {/* ABA 1: IDENTIFICAÇÃO */}
            <TabsContent value="identificacao" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Bloco / Torre *</Label>
                    <Select 
                      value={formData.blocoId} 
                      onValueChange={(val) => handleChange("blocoId", val)} 
                      disabled={readOnly || !!unit} // Bloqueia troca de bloco na edição para evitar conflitos de SKU
                    >
                       <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                       <SelectContent>
                          {blocks.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label>Unidade *</Label>
                    <Input 
                      value={formData.unidade} 
                      onChange={(e) => handleChange("unidade", e.target.value)} 
                      placeholder="Ex: 101" 
                      disabled={readOnly}
                    />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Input 
                      value={formData.tipo} 
                      onChange={(e) => handleChange("tipo", e.target.value)} 
                      placeholder="Ex: APTO_TIPO" 
                      disabled={readOnly}
                    />
                 </div>
                 <div className="space-y-2">
                    <Label>Vagas de Garagem</Label>
                    <Input 
                      type="number" 
                      value={formData.vagas} 
                      onChange={(e) => handleChange("vagas", e.target.value)} 
                      disabled={readOnly}
                    />
                 </div>
              </div>
            </TabsContent>

            {/* ABA 2: ÁREAS TÉCNICAS */}
            <TabsContent value="areas" className="space-y-4 py-4">
               <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                     <Label>Privativa Princ. (m²)</Label>
                     <Input 
                        value={formData.areaPrivativaPrincipal} 
                        onChange={(e) => handleChange("areaPrivativaPrincipal", e.target.value)} 
                        placeholder="0,00" 
                        disabled={readOnly}
                     />
                  </div>
                  <div className="space-y-2">
                     <Label>Outras Privativas</Label>
                     <Input 
                        value={formData.areaOutrasPrivativas} 
                        onChange={(e) => handleChange("areaOutrasPrivativas", e.target.value)} 
                        placeholder="0,00" 
                        disabled={readOnly}
                     />
                  </div>
                  <div className="space-y-2">
                     <Label className="font-bold text-blue-600">Privativa Total</Label>
                     <Input 
                        value={formData.areaPrivativaTotal} 
                        readOnly // Calculado
                        className="bg-slate-50 font-medium"
                     />
                  </div>
                  <div className="space-y-2">
                     <Label>Área Comum</Label>
                     <Input 
                        value={formData.areaUsoComum} 
                        onChange={(e) => handleChange("areaUsoComum", e.target.value)} 
                        placeholder="0,00" 
                        disabled={readOnly}
                     />
                  </div>
                  <div className="space-y-2">
                     <Label className="font-bold text-blue-600">Área Real Total</Label>
                     <Input 
                        value={formData.areaRealTotal} 
                        readOnly // Calculado
                        className="bg-slate-50 font-medium"
                     />
                  </div>
               </div>
            </TabsContent>

            {/* ABA 3: FRAÇÕES */}
            <TabsContent value="fracoes" className="space-y-4 py-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label>Coeficiente Proporcionalidade</Label>
                     <Input 
                        value={formData.coeficienteProporcionalidade} 
                        onChange={(e) => handleChange("coeficienteProporcionalidade", e.target.value)} 
                        placeholder="0,000000" 
                        disabled={readOnly}
                     />
                  </div>
                  <div className="space-y-2">
                     <Label>Fração Ideal Terreno</Label>
                     <Input 
                        value={formData.fracaoIdealTerreno} 
                        onChange={(e) => handleChange("fracaoIdealTerreno", e.target.value)} 
                        placeholder="0,000000" 
                        disabled={readOnly}
                     />
                  </div>
               </div>
            </TabsContent>

            {/* ABA 4: COMERCIAL */}
            <TabsContent value="comercial" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select 
                          value={formData.status} 
                          onValueChange={(val) => handleChange("status", val)}
                          disabled={readOnly}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                                <SelectItem value="RESERVADO">Reservado</SelectItem>
                                <SelectItem value="VENDIDO">Vendido</SelectItem>
                                <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                                <SelectItem value="PERMUTA">Permuta</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Cód. Tabela (SKU Comercial)</Label>
                        <Input 
                          value={formData.codigoTabela} 
                          onChange={(e) => handleChange("codigoTabela", e.target.value)} 
                          placeholder="Link com Tabela de Preço" 
                          disabled={readOnly}
                        />
                    </div>
                </div>
            </TabsContent>

            <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={onClose}>
                  {readOnly ? "Fechar" : "Cancelar"}
                </Button>
                {!readOnly && (
                  <Button type="button" onClick={handleSubmit} disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {unit ? "Salvar Alterações" : "Criar Unidade"}
                  </Button>
                )}
            </DialogFooter>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}