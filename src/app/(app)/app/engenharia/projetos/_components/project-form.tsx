"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveProject } from "@/app/actions/projects"
import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Loader2, MapPin, Building, FileText, Save, ImageIcon, UploadCloud } from "lucide-react"
import { ScopeSelect } from "@/components/scope-select"
import Image from "next/image"
import { ImageCropperModal } from "@/components/shared/image-cropper-modal"
import { cn } from "@/lib/utils"

const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", 
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
]

// --- TIPAGENS DO FORMULÁRIO ---
export interface ProjectFormData {
    escopoId: string
    logo: string | null
    nome: string
    razaoSocial: string
    tipo: string
    status: string
    descricao: string
    cnpj: string
    dataPrevistaConclusao: string
    registroIncorporacao: string
    matricula: string
    cartorioRegistro: string
    areaTotal: string
    percComissaoPadrao: string
    cep: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    estado: string
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

  // Estados para Upload e Recorte de Logo
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const [croppedLogo, setCroppedLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(formData.logo || null)

  useEffect(() => {
      // Limpeza de memória do navegador ao desmontar o componente
      return () => {
          if (logoPreview && !logoPreview.startsWith('http')) URL.revokeObjectURL(logoPreview)
          if (tempImageUrl) URL.revokeObjectURL(tempImageUrl)
      }
  }, [logoPreview, tempImageUrl])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name as keyof ProjectFormData]: e.target.value })
  }

  // --- LÓGICA DA LOGO ---
  const handleUploadClick = () => {
      if (readOnly) return
      fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
          if (!file.type.startsWith('image/')) {
              toast.error('Selecione uma imagem válida (JPG, PNG).')
              return
          }
          const objectUrl = URL.createObjectURL(file)
          setTempImageUrl(objectUrl)
      }
      event.target.value = ''
  }

  const handleCropComplete = (croppedFile: File) => {
      const objectUrl = URL.createObjectURL(croppedFile)
      setLogoPreview(objectUrl)
      setCroppedLogo(croppedFile)
      setTempImageUrl(null)
  }

  // --- SUBMIT ---
  const handleSave = async () => {
    setIsPending(true)
    setErrors({})
    
    const fd = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
        // CORREÇÃO: Ignoramos a chave 'logo' de texto para não dar conflito com o Arquivo!
        if (value !== null && value !== undefined && key !== 'logo') {
            fd.append(key, value as string)
        }
    })

    // Adiciona APENAS o arquivo da logo ao FormData
    if (croppedLogo) {
        fd.append('logo', croppedLogo)
    }

    const res = await saveProject(initialData?.id || null, { message: "", errors: {} }, fd)
    
    if (res.success) {
      toast.success(res.message)
      
      // A MÁGICA DO LIVE-UPDATE ACONTECE AQUI:
      setCroppedLogo(null) // Limpa o arquivo da memória para não reenviar atoa
      
      if (res.newLogoUrl) {
          setLogoPreview(res.newLogoUrl) // Atualiza visualmente com a URL definitiva
          setFormData({ ...formData, logo: res.newLogoUrl }) // Atualiza o state do form
      }

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

        {/* CROPPER MODAL INVISÍVEL */}
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/jpeg, image/png, image/webp" 
            onChange={handleFileChange}
        />

        <ImageCropperModal
            isOpen={!!tempImageUrl}
            onClose={() => setTempImageUrl(null)}
            imageUrl={tempImageUrl || ''}
            onCropComplete={handleCropComplete}
            title="Recortar Logo do Empreendimento"
            aspectRatio={4 / 1} // Proporção retangular perfeita para cabeçalhos
        />
        
        {/* CARD 1: IDENTIFICAÇÃO E VÍNCULO */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" /> Identificação e Vínculo
            </CardTitle>
            <CardDescription>Defina a identidade do projeto e a sua organização.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* NOVO LAYOUT DA LOGO + ESCOPO + NOME */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6"> {/* <--- Alterado para 5 colunas */}
                
                {/* COLUNA 1: LOGO (Agora ocupa 2/5 do espaço) */}
                <div className="col-span-1 md:col-span-2 flex flex-col gap-2"> {/* <--- md:col-span-2 adicionado */}
                    <Label>Logo do Empreendimento</Label>
                    <div onClick={handleUploadClick} className={cn(
                        "w-full flex-1 group relative flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-2 transition-colors min-h-[120px]",
                        !readOnly && "hover:bg-muted/50 cursor-pointer"
                    )}>
                        {logoPreview ? (
                            <Image src={logoPreview} alt="Logo" fill className="object-contain p-2" unoptimized />
                        ) : (
                            <div className="flex flex-col items-center text-muted-foreground">
                                <ImageIcon className="h-6 w-6 mb-2" />
                                <span className="text-xs">Clique para upload</span>
                            </div>
                        )}
                        {!readOnly && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-md">
                                <UploadCloud className="h-5 w-5 text-white" />
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUNAS 2 E 3: CAMPOS (Agora ocupam 3/5 do espaço) */}
                <div className="col-span-1 md:col-span-3 flex flex-col gap-4 justify-between"> {/* <--- md:col-span-3 adicionado */}
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
                        <Label>Nome Fantasia do Empreendimento *</Label>
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
            </div>

            <div className="space-y-2">
                <Label>Razão Social (SPE / Incorporadora)</Label>
                <Input 
                    name="razaoSocial" 
                    placeholder="Ex: Vista Alegre Incorporações SPE LTDA" 
                    value={formData.razaoSocial} 
                    onChange={handleChange}
                    disabled={readOnly}
                />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Tipo de Empreendimento</Label>
                <Select disabled={readOnly} value={formData.tipo} onValueChange={(val) => setFormData({...formData, tipo: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPE">SPE / Empreendimento Padrão</SelectItem>
                    <SelectItem value="OBRA">Obra</SelectItem>
                    <SelectItem value="REFORMA">Reforma</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status Atual</Label>
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
            </div>

            <div className="space-y-2">
              <Label>Descrição Técnica ou Comercial</Label>
              <Textarea name="descricao" placeholder="Detalhes adicionais do empreendimento..." value={formData.descricao} onChange={handleChange} disabled={readOnly} />
            </div>

          </CardContent>
        </Card>

        {/* CARD 2: DADOS LEGAIS & COMERCIAIS */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Dados Legais e Comerciais
            </CardTitle>
            <CardDescription>Informações fundamentais para a geração de contratos e comissões.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>CNPJ da SPE</Label>
                  <Input name="cnpj" placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={handleChange} disabled={readOnly} />
                </div>
                <div className="space-y-2">
                  <Label>Previsão de Conclusão / Entrega</Label>
                  <Input type="date" name="dataPrevistaConclusao" value={formData.dataPrevistaConclusao} onChange={handleChange} disabled={readOnly} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Comissão Padrão do Projeto (%)</Label>
                  <PercentInput 
                      name="percComissaoPadrao" 
                      value={formData.percComissaoPadrao} 
                      onChange={(val) => setFormData({...formData, percComissaoPadrao: val})} 
                      disabled={readOnly} 
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Registro Incorp. (RI)</Label>
                  <Input name="registroIncorporacao" placeholder="Ex: R.03/12345" value={formData.registroIncorporacao} onChange={handleChange} disabled={readOnly} />
                </div>
                <div className="space-y-2">
                  <Label>Matrícula Mãe</Label>
                  <Input name="matricula" placeholder="Ex: 54.321" value={formData.matricula} onChange={handleChange} disabled={readOnly} />
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
                  <Label>Cartório de Registro de Imóveis (Ofício)</Label>
                  <Input name="cartorioRegistro" placeholder="Ex: 2º Cartório de Registro de Imóveis de São Paulo/SP" value={formData.cartorioRegistro} onChange={handleChange} disabled={readOnly} />
              </div>

          </CardContent>
        </Card>

        {/* CARD 3: LOCALIZAÇÃO */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Endereço Físico
            </CardTitle>
            <CardDescription>Endereço oficial do terreno ou da obra.</CardDescription>
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
                 <Input name="complemento" placeholder="Ex: Lote 1, Quadra B" value={formData.complemento} onChange={handleChange} disabled={readOnly} />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* RODAPÉ DE AÇÃO */}
        {!readOnly && (
            <div className="flex justify-end pt-2 pb-10">
                <Button size="lg" className="min-w-[200px]" onClick={handleSave} disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    {isPending ? "Salvando..." : "Salvar Projeto"}
                </Button>
            </div>
        )}

    </div>
  )
}