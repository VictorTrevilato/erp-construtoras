"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, Loader2, MapPin, PhoneCall, Home, Search, FolderSync, UserStar, UserCog, UserCheck, Building } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { ScopeSelect } from "@/components/scope-select"
import { savePersonLegal } from "@/app/actions/legal-persons"
import { fetchAddressByCep } from "@/app/actions/viacep"

export interface ScopeOption {
  id: string
  nome: string
  tipo: string
  nivel: number
}

// --- SCHEMA DE VALIDAÇÃO (PJ) ---
const personLegalSchema = zod.object({
  id: zod.string(),
  escopoId: zod.string().min(1, "O Escopo Organizacional é obrigatório"),
  nome: zod.string().min(3, "Razão Social deve ter pelo menos 3 caracteres"),
  documento: zod.string().min(18, "CNPJ incompleto"), // 18 chars com máscara
  nomeFantasia: zod.string(),
  inscricaoEstadual: zod.string(),
  representanteLegal: zod.string(),
  telefone_1: zod.string(),
  telefone_2: zod.string(),
  email_1: zod.string().email("E-mail inválido").or(zod.literal("")),
  email_2: zod.string().email("E-mail inválido").or(zod.literal("")),
  cep: zod.string(),
  logradouro: zod.string(),
  numero: zod.string(),
  complemento: zod.string(),
  bairro: zod.string(),
  cidade: zod.string(),
  uf: zod.string(),
  isCliente: zod.boolean(),
  isImobiliaria: zod.boolean(),
  isFornecedor: zod.boolean(),
  creci: zod.string(),
}).refine((data) => {
  if (data.isImobiliaria && (!data.creci || data.creci.trim() === "")) return false;
  return true;
}, {
  message: "O número do CRECI é obrigatório para imobiliárias",
  path: ["creci"],
});

type PersonLegalFormValues = zod.infer<typeof personLegalSchema>

export interface InitialLegalPersonData {
  id: string
  escopoId: string
  nome: string
  documento: string
  nomeFantasia: string
  inscricaoEstadual: string
  representanteLegal: string
  telefone_1: string
  telefone_2: string
  email_1: string
  email_2: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  isCliente: boolean
  isImobiliaria: boolean
  isFornecedor: boolean
  creci: string
}

interface Props {
  initialData?: InitialLegalPersonData | null
  availableScopes: ScopeOption[]
  readOnly?: boolean
}

export function PersonLegalForm({ initialData, availableScopes, readOnly }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitIntent, setSubmitIntent] = useState<'save' | 'close'>('close')
  const [isFetchingCep, setIsFetchingCep] = useState(false)

  let docFormatado = initialData?.documento || ""
  if (docFormatado.length === 14) {
    docFormatado = docFormatado.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  }

  const form = useForm<PersonLegalFormValues>({
    resolver: zodResolver(personLegalSchema),
    defaultValues: {
      id: initialData?.id || "",
      escopoId: initialData?.escopoId || "",
      nome: initialData?.nome || "",
      documento: docFormatado,
      nomeFantasia: initialData?.nomeFantasia || "",
      inscricaoEstadual: initialData?.inscricaoEstadual || "",
      representanteLegal: initialData?.representanteLegal || "",
      telefone_1: initialData?.telefone_1 || "",
      telefone_2: initialData?.telefone_2 || "",
      email_1: initialData?.email_1 || "",
      email_2: initialData?.email_2 || "",
      cep: initialData?.cep || "",
      logradouro: initialData?.logradouro || "",
      numero: initialData?.numero || "",
      complemento: initialData?.complemento || "",
      bairro: initialData?.bairro || "",
      cidade: initialData?.cidade || "",
      uf: initialData?.uf || "",
      isCliente: !!initialData?.isCliente,
      isImobiliaria: !!initialData?.isImobiliaria,
      isFornecedor: !!initialData?.isFornecedor,
      creci: initialData?.creci || ""
    }
  })

  const isImobiliariaWatcher = form.watch("isImobiliaria")

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, '')
    value = value.replace(/^(\d{2})(\d)/, '$1.$2')
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2')
    value = value.replace(/(\d{4})(\d)/, '$1-$2')
    onChange(value)
  }

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2')
    onChange(value)

    const cleanCep = value.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      setIsFetchingCep(true)
      const res = await fetchAddressByCep(cleanCep)
      if (res.success && res.data) {
        form.setValue("logradouro", res.data.logradouro)
        form.setValue("bairro", res.data.bairro)
        form.setValue("cidade", res.data.cidade)
        form.setValue("uf", res.data.uf)
        toast.success("Endereço preenchido!")
      } else {
        toast.error(res.message || "Erro ao buscar CEP.")
      }
      setIsFetchingCep(false)
    }
  }

  async function onSubmit(values: PersonLegalFormValues) {
    setIsSubmitting(true)
    try {
      const cleanData = {
        ...values,
        documento: values.documento.replace(/\D/g, ""),
        cep: values.cep.replace(/\D/g, "")
      }
      const res = await savePersonLegal(cleanData)
      if (res.success) {
        toast.success(res.message)
        if (submitIntent === 'close') router.push("/app/cadastros/pessoas-juridicas")
        else router.refresh()
      } else {
        toast.error(res.message)
      }
    } catch {
      toast.error("Erro ao salvar os dados. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        {/* SEÇÃO 1: IDENTIFICAÇÃO EMPRESARIAL */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6 text-primary font-semibold">
              <Building className="w-5 h-5" />
              <span>Identificação Empresarial</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <FormField control={form.control} name="escopoId" render={({ field }) => (
                <FormItem className="md:col-span-4">
                  <FormLabel>Escopo Organizacional *</FormLabel>
                  <FormControl>
                    <ScopeSelect value={field.value} onValueChange={field.onChange} options={availableScopes} disabled={readOnly || !!initialData?.id} error={form.formState.errors.escopoId?.message} />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Razão Social *</FormLabel>
                  <FormControl><Input placeholder="Ex: YouCon Construtora LTDA" disabled={readOnly} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nome Fantasia</FormLabel>
                  <FormControl><Input placeholder="Ex: Construtora YouCon" disabled={readOnly} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField control={form.control} name="documento" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ *</FormLabel>
                  <FormControl>
                    <Input placeholder="00.000.000/0000-00" disabled={readOnly || !!initialData?.id} maxLength={18} value={field.value} onChange={(e) => handleCnpjChange(e, field.onChange)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="inscricaoEstadual" render={({ field }) => (
                <FormItem>
                  <FormLabel>Inscrição Estadual (IE)</FormLabel>
                  <FormControl><Input placeholder="Ex: 123.456.789.000" disabled={readOnly} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="representanteLegal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Representante Legal</FormLabel>
                  <FormControl><Input placeholder="Nome do representante" disabled={readOnly} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 2: CONTATOS */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6 text-primary font-semibold">
              <PhoneCall className="w-5 h-5" />
              <span>Contatos</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="telefone_1" render={({ field }) => (
                <FormItem><FormLabel>Telefone / Comercial</FormLabel><FormControl><Input placeholder="(00) 0000-0000" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email_1" render={({ field }) => (
                <FormItem><FormLabel>E-mail Principal</FormLabel><FormControl><Input type="email" placeholder="contato@empresa.com.br" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telefone_2" render={({ field }) => (
                <FormItem><FormLabel>WhatsApp / Celular</FormLabel><FormControl><Input placeholder="(00) 00000-0000" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email_2" render={({ field }) => (
                <FormItem><FormLabel>E-mail Secundário (Financeiro)</FormLabel><FormControl><Input type="email" placeholder="financeiro@empresa.com.br" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 3: ENDEREÇO (IDÊNTICO A PF) */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6 text-primary font-semibold">
              <Home className="w-5 h-5" />
              <span>Endereço Comercial</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <FormField control={form.control} name="cep" render={({ field }) => (
                <FormItem className="col-span-1"><FormLabel>CEP</FormLabel>
                  <div className="relative">
                    <FormControl><Input placeholder="00000-000" disabled={readOnly || isFetchingCep} maxLength={9} value={field.value} onChange={(e) => handleCepChange(e, field.onChange)} /></FormControl>
                    {isFetchingCep ? <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-primary animate-spin" /> : <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-300 pointer-events-none" />}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="logradouro" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel>Logradouro</FormLabel><FormControl><Input placeholder="Rua, Avenida, etc." disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <FormField control={form.control} name="numero" render={({ field }) => (
                <FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="123" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="complemento" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel>Complemento</FormLabel><FormControl><Input placeholder="Sala, Galpão, Andar..." disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <FormField control={form.control} name="bairro" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Bairro</FormLabel><FormControl><Input placeholder="Nome do bairro" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cidade" render={({ field }) => (
                <FormItem className="md:col-span-1"><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Cidade" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="uf" render={({ field }) => (
                <FormItem className="md:col-span-1"><FormLabel>UF</FormLabel><FormControl><Input placeholder="SP" maxLength={2} disabled={readOnly} {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 4: VÍNCULOS E PERFIL (PJ) */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <MapPin className="w-5 h-5" />
              <span>Perfil e Vínculos Organizacionais</span>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/20 p-6 rounded-lg border border-dashed border-border">
              <FormField control={form.control} name="isCliente" render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border border-border p-4 bg-card shadow-sm">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} /></FormControl>
                  <UserStar className="w-5 h-5 text-success" />
                  <FormLabel className="font-bold cursor-pointer">Cliente</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="isImobiliaria" render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border border-border p-4 bg-card shadow-sm">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} /></FormControl>
                  <UserCheck className="w-5 h-5 text-warning" />
                  <FormLabel className="font-bold cursor-pointer">Imobiliária</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="isFornecedor" render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border border-border p-4 bg-card shadow-sm">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} /></FormControl>
                  <UserCog className="w-5 h-5 text-info" />
                  <FormLabel className="font-bold cursor-pointer">Fornecedor</FormLabel>
                </FormItem>
              )} />
            </div>

            {isImobiliariaWatcher && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Card className="bg-warning/5 border border-warning/20 shadow-none">
                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-warning flex items-center gap-2"><UserCheck className="w-4 h-4" /> Registro Jurídico (CRECI J)</h4>
                      <p className="text-sm text-muted-foreground">O número do CRECI Jurídico é obrigatório para imobiliárias parceiras.</p>
                    </div>
                    <FormField control={form.control} name="creci" render={({ field }) => (
                      <FormItem><FormLabel className="text-warning font-semibold">Número do CRECI (PJ)</FormLabel>
                        <FormControl><Input placeholder="Ex: 12345-J" disabled={readOnly} {...field} className="border-warning/50 focus-visible:ring-warning" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RODAPÉ DE AÇÕES */}
        {!readOnly && (
          <div className="flex items-center justify-end gap-3 bg-card p-4 rounded-lg border border-border shadow-sm sticky bottom-4 z-10">
            <Button variant="outline" type="button" onClick={() => router.push("/app/cadastros/pessoas-juridicas")}>Cancelar</Button>
            <Button variant="outline" type="submit" disabled={isSubmitting} className="gap-2 text-success border-success hover:bg-success/10 hover:text-success" onClick={() => setSubmitIntent('save')}>
              {(isSubmitting && submitIntent === 'save') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {initialData?.id ? "Salvar Alterações" : "Salvar Cadastro"}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2 min-w-[180px]" onClick={() => setSubmitIntent('close')}>
              {(isSubmitting && submitIntent === 'close') ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderSync className="w-4 h-4" />}
              {initialData?.id ? "Salvar e Fechar" : "Cadastrar e Fechar"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}