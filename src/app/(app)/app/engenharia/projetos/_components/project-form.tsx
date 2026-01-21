"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveProject, ProjectFormState } from "@/app/actions/projects"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, MapPin, Building, FileText, ArrowLeft, Save, Lock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ScopeSelect } from "@/components/scope-select" // Importando nosso novo componente

// Lista completa de estados BR
const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", 
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
]

interface ScopeOption {
  id: string
  nome: string
  tipo: string
  nivel: number
}

interface ProjectData {
  id: string
  nome: string
  tipo: string
  status: string
  descricao: string
  escopoId: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  cnpj: string
  registroIncorporacao: string
  matricula: string
  areaTotal: string
}

interface ProjectFormProps {
  initialData?: ProjectData | null
  availableScopes: ScopeOption[]
  readOnly?: boolean // Nova prop para travar o form
}

const initialState: ProjectFormState = { message: "", errors: {} }

export function ProjectForm({ initialData, availableScopes, readOnly = false }: ProjectFormProps) {
  const router = useRouter()
  const saveWithId = saveProject.bind(null, initialData?.id || null)
  const [state, formAction, isPending] = useActionState(saveWithId, initialState)
  
  const [formData, setFormData] = useState({
    escopoId: initialData?.escopoId || "",
    tipo: initialData?.tipo || "OBRA",
    status: initialData?.status || "LANCAMENTO",
    estado: initialData?.estado || ""
  })

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
      router.push("/app/engenharia/projetos")
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state, router])

  return (
    <form action={formAction} className="w-full pb-10">
      
      {/* INPUTS OCULTOS (Essenciais para Server Actions) */}
      <input type="hidden" name="escopoId" value={formData.escopoId} />
      <input type="hidden" name="tipo" value={formData.tipo} />
      <input type="hidden" name="status" value={formData.status} />
      <input type="hidden" name="estado" value={formData.estado} />

      {/* --- HEADER (Padrão: Título Esquerda / Botões Direita) --- */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {initialData ? `Editar Projeto` : "Novo Projeto"}
            {readOnly && (
              <Badge variant="outline" className="text-amber-600 border-amber-600 gap-1">
                <Lock className="w-3 h-3"/> Somente Leitura
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            {initialData 
              ? "Visualize ou altere as informações deste empreendimento." 
              : "Preencha os dados para cadastrar um novo empreendimento."}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/app/engenharia/projetos">
            <Button variant="outline" type="button">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          
          {/* Só mostra botão Salvar se NÃO for ReadOnly. Se for ReadOnly, não mostra nada. */}
          {!readOnly && (
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                 <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
              ) : (
                 <><Save className="mr-2 h-4 w-4" /> Salvar Projeto</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* --- CONTEÚDO (Cards Separados) --- */}
      <div className="space-y-6">
        
        {/* CARD 1: IDENTIFICAÇÃO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" /> Identificação e Vínculo
            </CardTitle>
            <CardDescription>Defina a qual unidade organizacional este projeto pertence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Escopo Organizacional *</Label>
                {/* Componente Reutilizável de Escopo */}
                <ScopeSelect 
                  value={formData.escopoId}
                  onValueChange={(val) => setFormData({...formData, escopoId: val})}
                  options={availableScopes}
                  disabled={readOnly}
                  error={state.errors?.escopoId?.[0]}
                />
              </div>

              <div className="space-y-2">
                <Label>Nome do Empreendimento *</Label>
                <Input 
                  name="nome" 
                  placeholder="Ex: Residencial Vista Alegre" 
                  defaultValue={initialData?.nome} 
                  required 
                  disabled={readOnly}
                />
                {state.errors?.nome && <p className="text-xs text-red-500">{state.errors.nome[0]}</p>}
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
                  <Input name="areaTotal" placeholder="0,00" defaultValue={initialData?.areaTotal} disabled={readOnly} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea name="descricao" placeholder="Detalhes adicionais..." defaultValue={initialData?.descricao} disabled={readOnly} />
            </div>

          </CardContent>
        </Card>

        {/* CARD 2: LOCALIZAÇÃO (Ordem Corrigida) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-600" /> Endereço Físico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Linha 1: CEP (Menor) + Logradouro (Maior) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 col-span-1">
                <Label>CEP</Label>
                <Input name="cep" placeholder="00000-000" defaultValue={initialData?.cep} disabled={readOnly} />
              </div>
              <div className="space-y-2 col-span-3">
                <Label>Logradouro</Label>
                <Input name="logradouro" defaultValue={initialData?.logradouro} disabled={readOnly} />
              </div>
            </div>

            {/* Linha 2: Número + Bairro + Cidade */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 col-span-1">
                <Label>Número</Label>
                <Input name="numero" defaultValue={initialData?.numero} disabled={readOnly} />
              </div>
              <div className="space-y-2 col-span-1">
                <Label>Bairro</Label>
                <Input name="bairro" defaultValue={initialData?.bairro} disabled={readOnly} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Cidade</Label>
                <Input name="cidade" defaultValue={initialData?.cidade} disabled={readOnly} />
              </div>
            </div>

            {/* Linha 3: Estado + Complemento */}
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
                 <Input name="complemento" defaultValue={initialData?.complemento} disabled={readOnly} />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* CARD 3: DADOS LEGAIS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" /> Dados Legais e Cartorários
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>CNPJ (SPE)</Label>
                  <Input name="cnpj" placeholder="00.000.000/0000-00" defaultValue={initialData?.cnpj} disabled={readOnly} />
                </div>
                <div className="space-y-2">
                  <Label>Registro Incorp. (RI)</Label>
                  <Input name="registroIncorporacao" defaultValue={initialData?.registroIncorporacao} disabled={readOnly} />
                </div>
                <div className="space-y-2">
                  <Label>Matrícula Mãe</Label>
                  <Input name="matricula" defaultValue={initialData?.matricula} disabled={readOnly} />
                </div>
              </div>
          </CardContent>
        </Card>

      </div>
    </form>
  )
}