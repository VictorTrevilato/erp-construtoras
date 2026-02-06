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
  andar: number | null
  tipo: string
  
  statusComercial: string
  statusInterno: string
  qtdeVagas: number
  
  tipoVaga: string | null
  tipoDeposito: string | null
  
  areaDeposito: string | number
  
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
  unit: Unit | null    
  blocks: Block[]      
  isOpen: boolean
  onClose: () => void
  readOnly?: boolean
}

const initialFormState = {
  blocoId: "",
  unidade: "",
  andar: "",
  tipo: "",
  
  qtdeVagas: "0",
  tipoVaga: "NENHUMA",
  statusComercial: "DISPONIVEL",
  statusInterno: "DISPONIVEL",
  tipoDeposito: "NENHUM",
  areaDeposito: "0",

  areaPrivativaPrincipal: "",
  areaOutrasPrivativas: "",
  areaPrivativaTotal: "",
  areaUsoComum: "",
  areaRealTotal: "",
  coeficienteProporcionalidade: "",
  fracaoIdealTerreno: ""
}

export function UnitFormDialog({ projetoId, unit, blocks, isOpen, onClose, readOnly = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState(initialFormState)

  useEffect(() => {
    if (isOpen) {
      if (unit) {
        setFormData({
          blocoId: unit.blocoId || "",
          unidade: unit.unidade || "",
          andar: unit.andar?.toString() || "0",
          tipo: unit.tipo || "",
          
          qtdeVagas: unit.qtdeVagas?.toString() || "0",
          tipoVaga: unit.tipoVaga || "NENHUMA",
          statusComercial: unit.statusComercial || "DISPONIVEL",
          statusInterno: unit.statusInterno || "DISPONIVEL",
          tipoDeposito: unit.tipoDeposito || "NENHUM",
          areaDeposito: unit.areaDeposito?.toString().replace(',', '.') || "0",

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

  useEffect(() => {
    if (readOnly) return 

    const privPrinc = parseFloat(formData.areaPrivativaPrincipal?.replace(',', '.') || "0")
    const privOutras = parseFloat(formData.areaOutrasPrivativas?.replace(',', '.') || "0")
    const comum = parseFloat(formData.areaUsoComum?.replace(',', '.') || "0")

    const totalPriv = privPrinc + privOutras
    const totalReal = totalPriv + comum

    setFormData(prev => ({
      ...prev,
      areaPrivativaTotal: totalPriv > 0 ? totalPriv.toFixed(4).replace('.', ',') : prev.areaPrivativaTotal,
      areaRealTotal: totalReal > 0 ? totalReal.toFixed(4).replace('.', ',') : prev.areaRealTotal
    }))
  }, [formData.areaPrivativaPrincipal, formData.areaOutrasPrivativas, formData.areaUsoComum, readOnly])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? `Detalhes da Unidade ${formData.unidade}` : (unit ? `Editar Unidade ${unit.unidade}` : "Nova Unidade")}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <Tabs defaultValue="identificacao" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="identificacao">Básico</TabsTrigger>
              <TabsTrigger value="comercial">Comercial</TabsTrigger>
              <TabsTrigger value="areas">Áreas</TabsTrigger>
              <TabsTrigger value="atributos">Atributos</TabsTrigger>
              <TabsTrigger value="fracoes">Frações</TabsTrigger>
            </TabsList>

            <TabsContent value="identificacao" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Bloco / Torre *</Label>
                    <Select 
                      value={formData.blocoId} 
                      onValueChange={(val) => handleChange("blocoId", val)} 
                      disabled={readOnly || !!unit}
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
                    <Label>Andar</Label>
                    <Input 
                      type="number"
                      value={formData.andar} 
                      onChange={(e) => handleChange("andar", e.target.value)} 
                      placeholder="0" 
                      disabled={readOnly}
                    />
                 </div>
              </div>
            </TabsContent>

            <TabsContent value="comercial" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Status Comercial</Label>
                        <Select 
                          value={formData.statusComercial} 
                          onValueChange={(val) => handleChange("statusComercial", val)}
                          disabled={readOnly}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                                <SelectItem value="RESERVADO">Reservado</SelectItem>
                                <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                                <SelectItem value="VENDIDO">Vendido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Status Interno</Label>
                        <Select 
                          value={formData.statusInterno} 
                          onValueChange={(val) => handleChange("statusInterno", val)}
                          disabled={readOnly}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                                <SelectItem value="PERMUTA">Permuta</SelectItem>
                                <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                                <SelectItem value="JURIDICO">Jurídico</SelectItem>
                                <SelectItem value="CAUCAO">Caução</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </TabsContent>

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
                        readOnly 
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
                        readOnly 
                        className="bg-slate-50 font-medium"
                     />
                  </div>
               </div>
            </TabsContent>
            
            <TabsContent value="atributos" className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 border p-4 rounded-md">
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">Garagem</h4>
                        
                        <div className="space-y-2">
                            <Label>Tipo de Vaga</Label>
                            <Select 
                              value={formData.tipoVaga} 
                              onValueChange={(val) => handleChange("tipoVaga", val)}
                              disabled={readOnly}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NENHUMA">Nenhuma</SelectItem>
                                    <SelectItem value="FIXA">Fixa / Determinada</SelectItem>
                                    <SelectItem value="ROTATIVA">Rotativa / Indeterminada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Qtde Vagas</Label>
                            <Input 
                              type="number" 
                              value={formData.qtdeVagas} 
                              onChange={(e) => handleChange("qtdeVagas", e.target.value)} 
                              disabled={readOnly}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 border p-4 rounded-md">
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">Depósito / Hobby Box</h4>
                        
                        <div className="space-y-2">
                            <Label>Tipo Depósito</Label>
                            <Select 
                              value={formData.tipoDeposito} 
                              onValueChange={(val) => handleChange("tipoDeposito", val)}
                              disabled={readOnly}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NENHUM">Nenhum</SelectItem>
                                    <SelectItem value="PRIVATIVO">Privativo (Na vaga)</SelectItem>
                                    <SelectItem value="ANDAR">No Andar</SelectItem>
                                    <SelectItem value="SUBSOLO">No Subsolo (Área Comum)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Área Depósito (m²)</Label>
                            <Input 
                              type="number" 
                              // [CORREÇÃO CRÍTICA] Adicionado step para permitir decimais
                              step="0.0001"
                              value={formData.areaDeposito} 
                              onChange={(e) => handleChange("areaDeposito", e.target.value)} 
                              placeholder="0,00"
                              disabled={readOnly}
                            />
                        </div>
                    </div>
                </div>
            </TabsContent>

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