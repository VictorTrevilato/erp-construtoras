"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveProject } from "@/app/actions/projects"
import { useState } from "react"
import { toast } from "sonner"
import { Loader2, MapPin, Building, FileText, Save } from "lucide-react"
import { ScopeSelect } from "@/components/scope-select"

const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", 
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
]

// --- TIPAGENS DO FORMULÁRIO ---
export interface ProjectFormData {
    escopoId: string
    tipo: string
    status: string
    estado: string
    nome: string
    descricao: string
    cep: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    cnpj: string
    registroIncorporacao: string
    matricula: string
    areaTotal: string
    percComissaoPadrao: string
}

interface ScopeOption {
    id: string
    nome: string
    tipo: string
    nivel: number
}

interface Props {
    initialData?: { id: string } | null
    availableScopes: ScopeOption[]
    readOnly?: boolean
    formData: ProjectFormData
    setFormData: (data: ProjectFormData) => void
    onSaveSuccess?: (id: string) => void
}

// --- COMPONENTE INLINE: PERCENT INPUT MASK ---
interface PercentInputProps {
    value: string | number
    onChange: (val: string) => void
    disabled?: boolean
    name?: string
}

function PercentInput({ value, onChange, disabled, name }: PercentInputProps) {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    const displayValue = !isNaN(numValue) && numValue > 0 
        ? numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
        : ""

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "")
        if (!rawValue) { 
            onChange("")
            return 
        }
        const floatValue = parseInt(rawValue, 10) / 100
        onChange(floatValue.toString())
    }

    return (
        <div className="relative w-full">
            <Input 
                name={name}
                className="pr-8 bg-background"
                value={displayValue}
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
                disabled={disabled}
                placeholder="0,00"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">%</span>
        </div>
    )
}

// --- COMPONENTE INLINE: AREA INPUT MASK ---
interface AreaInputProps {
    value: string | number
    onChange: (val: string) => void
    disabled?: boolean
    name?: string
}

function AreaInput({ value, onChange, disabled, name }: AreaInputProps) {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    const displayValue = !isNaN(numValue) && numValue > 0 
        ? numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
        : ""

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "")
        if (!rawValue) { 
            onChange("")
            return 
        }
        const floatValue = parseInt(rawValue, 10) / 100
        onChange(floatValue.toString())
    }

    return (
        <Input 
            name={name}
            className="bg-background"
            value={displayValue}
            onChange={handleChange}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            placeholder="0,00"
        />
    )
}

// --- COMPONENTE PRINCIPAL ---
export function ProjectForm({ initialData, availableScopes, readOnly = false, formData, setFormData, onSaveSuccess }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name as keyof ProjectFormData]: e.target.value })
  }

  const handleSave = async () => {
    setIsPending(true)
    setErrors({})
    
    const fd = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      fd.append(key, value as string)
    })

    const res = await saveProject(initialData?.id || null, { message: "", errors: {} }, fd)
    
    if (res.success) {
      toast.success(res.message)
      if (res.dataId && onSaveSuccess) {
          onSaveSuccess(res.dataId)
      }
    } else {
      toast.error(res.message)
      if (res.errors) setErrors(res.errors)
    }
    setIsPending(false)
  }

  return (
    <div className="w-full space-y-6">
        
        {/* CARD 1: IDENTIFICAÇÃO */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" /> Identificação e Vínculo
            </CardTitle>
            <CardDescription>Defina a qual unidade organizacional este projeto pertence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Escopo Organizacional *</Label>
                <ScopeSelect 
                  value={formData.escopoId}
                  onValueChange={(val) => setFormData({...formData, escopoId: val})}
                  options={availableScopes}
                  disabled={readOnly}
                  error={errors?.escopoId?.[0]}
                />
              </div>

              <div className="space-y-2">
                <Label>Nome do Empreendimento *</Label>
                <Input 
                  name="nome" 
                  placeholder="Ex: Residencial Vista Alegre" 
                  value={formData.nome} 
                  onChange={handleChange}
                  disabled={readOnly}
                />
                {errors?.nome && <p className="text-xs text-destructive">{errors.nome[0]}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select disabled={readOnly} value={formData.tipo} onValueChange={(val) => setFormData({...formData, tipo: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPE">SPE</SelectItem>
                    <SelectItem value="OBRA">Obra</SelectItem>
                    <SelectItem value="REFORMA">Reforma</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select disabled={readOnly} value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LANCAMENTO">Lançamento</SelectItem>
                    <SelectItem value="PLANTA">Na Planta</SelectItem>
                    <SelectItem value="FUNDACAO">Fundação</SelectItem>
                    <SelectItem value="ESTRUTURA">Estrutura</SelectItem>
                    <SelectItem value="ACABAMENTO">Acabamento</SelectItem>
                    <SelectItem value="ENTREGUE">Entregue</SelectItem>
                    <SelectItem value="PARALISADO">Paralisado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                  <Label>Área Total (m²)</Label>
                  <AreaInput 
                      name="areaTotal" 
                      value={formData.areaTotal} 
                      onChange={(val) => setFormData({...formData, areaTotal: val})} 
                      disabled={readOnly} 
                  />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea name="descricao" placeholder="Detalhes adicionais..." value={formData.descricao} onChange={handleChange} disabled={readOnly} />
            </div>

          </CardContent>
        </Card>

        {/* CARD 2: LOCALIZAÇÃO */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-warning" /> Endereço Físico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 col-span-1">
                <Label>CEP</Label>
                <Input name="cep" placeholder="00000-000" value={formData.cep} onChange={handleChange} disabled={readOnly} />
              </div>
              <div className="space-y-2 col-span-3">
                <Label>Logradouro</Label>
                <Input name="logradouro" placeholder="Ex: Av. Presidente Vargas" value={formData.logradouro} onChange={handleChange} disabled={readOnly} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 col-span-1">
                <Label>Número</Label>
                <Input name="numero" placeholder="Ex: 1234" value={formData.numero} onChange={handleChange} disabled={readOnly} />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Bairro</Label>
                <Input name="bairro" placeholder="Ex: Jardim Sumaré" value={formData.bairro} onChange={handleChange} disabled={readOnly} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Cidade</Label>
                <Input name="cidade" placeholder="Ex: Ribeirão Preto" value={formData.cidade} onChange={handleChange} disabled={readOnly} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="space-y-2 col-span-1">
                <Label>Estado (UF)</Label>
                <Select disabled={readOnly} value={formData.estado} onValueChange={(val) => setFormData({...formData, estado: val})}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                     {BRAZIL_STATES.map(uf => (
                       <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                     ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-3">
                 <Label>Complemento</Label>
                 <Input name="complemento" placeholder="Ex: Sala 1" value={formData.complemento} onChange={handleChange} disabled={readOnly} />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* CARD 3: DADOS LEGAIS & COMERCIAIS */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-info" /> Dados Legais e Comerciais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="grid md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label>CNPJ (SPE)</Label>
                  <Input name="cnpj" placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={handleChange} disabled={readOnly} />
                </div>
                <div className="space-y-2">
                  <Label>Registro Incorp. (RI)</Label>
                  <Input name="registroIncorporacao" placeholder="0000000000" value={formData.registroIncorporacao} onChange={handleChange} disabled={readOnly} />
                </div>
                <div className="space-y-2">
                  <Label>Matrícula Mãe</Label>
                  <Input name="matricula" placeholder="0000000000" value={formData.matricula} onChange={handleChange} disabled={readOnly} />
                </div>
                <div className="space-y-2">
                  <Label>Comissão Padrão (%)</Label>
                  <PercentInput 
                      name="percComissaoPadrao" 
                      value={formData.percComissaoPadrao} 
                      onChange={(val) => setFormData({...formData, percComissaoPadrao: val})} 
                      disabled={readOnly} 
                  />
                </div>
              </div>
          </CardContent>
        </Card>

        {/* RODAPÉ DE AÇÃO */}
        {!readOnly && (
            <div className="flex justify-end pt-2">
                <Button size="lg" className="min-w-[200px]" onClick={handleSave} disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    {isPending ? "Salvando..." : "Salvar Projeto"}
                </Button>
            </div>
        )}

    </div>
  )
}