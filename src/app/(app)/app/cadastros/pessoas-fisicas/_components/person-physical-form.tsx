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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Save,
  Loader2,
  MapPin,
  Contact,
  PhoneCall,
  Home,
  Search,
  FolderSync,
  UserStar, // Ícone para Cliente
  UserCog,  // Ícone para Funcionário
  UserCheck // Ícone para Corretor
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { ScopeSelect } from "@/components/scope-select"
import { savePersonPhysical } from "@/app/actions/persons"
import { fetchAddressByCep } from "@/app/actions/viacep"

export interface ScopeOption {
  id: string
  nome: string
  tipo: string
  nivel: number
}

// --- SCHEMA DE VALIDAÇÃO (ZOD) ---
const personPhysicalSchema = zod.object({
  id: zod.string(),
  escopoId: zod.string().min(1, "O Escopo Organizacional é obrigatório"),
  nome: zod.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  documento: zod.string().min(14, "CPF incompleto"),
  dataNascimento: zod.string(),
  rg: zod.string(),
  estadoCivil: zod.string(),
  regimeBens: zod.string(),
  nacionalidade: zod.string(),
  profissao: zod.string(),
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
  isCorretor: zod.boolean(),
  isFuncionario: zod.boolean(),
  creci: zod.string(),
}).refine((data) => {
  // Validação condicional: CRECI é obrigatório se for Corretor
  if (data.isCorretor && (!data.creci || data.creci.trim() === "")) return false;
  return true;
}, {
  message: "O número do CRECI é obrigatório para corretores",
  path: ["creci"],
});

type PersonPhysicalFormValues = zod.infer<typeof personPhysicalSchema>

export interface InitialPersonData {
  id: string
  escopoId: string
  nome: string
  documento: string
  dataNascimento: string
  rg: string
  estadoCivil: string
  regimeBens: string
  nacionalidade: string
  profissao: string
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
  isCorretor: boolean
  isFuncionario: boolean
  creci: string
}

interface Props {
  initialData?: InitialPersonData | null
  availableScopes: ScopeOption[]
  readOnly?: boolean
}

export function PersonPhysicalForm({ initialData, availableScopes, readOnly }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitIntent, setSubmitIntent] = useState<'save' | 'close'>('close')
  const [isFetchingCep, setIsFetchingCep] = useState(false)

  // Formatação inicial do documento (CPF) vindo do banco
  let docFormatado = initialData?.documento || ""
  if (docFormatado.length === 11) {
    docFormatado = docFormatado.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }

  // Inicialização do Formulário com React Hook Form
  const form = useForm<PersonPhysicalFormValues>({
    resolver: zodResolver(personPhysicalSchema),
    defaultValues: {
      id: initialData?.id || "",
      escopoId: initialData?.escopoId || "",
      nome: initialData?.nome || "",
      documento: docFormatado,
      dataNascimento: initialData?.dataNascimento || "",
      rg: initialData?.rg || "",
      estadoCivil: initialData?.estadoCivil || "",
      regimeBens: initialData?.regimeBens || "",
      nacionalidade: initialData?.nacionalidade || "Brasileiro",
      profissao: initialData?.profissao || "",
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
      isCorretor: !!initialData?.isCorretor,
      isFuncionario: !!initialData?.isFuncionario,
      creci: initialData?.creci || ""
    }
  })

  // Watchers para renderização condicional de campos
  const isCorretorWatcher = form.watch("isCorretor")
  const estadoCivilWatcher = form.watch("estadoCivil")

  // Máscara de CPF em tempo real
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, '')
    value = value.replace(/(\d{3})(\d)/, '$1.$2')
    value = value.replace(/(\d{3})(\d)/, '$1.$2')
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    onChange(value)
  }

  // Integração com ViaCEP para autopreenchimento de endereço
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
        toast.success("Endereço preenchido automaticamente!")
      } else {
        toast.error(res.message || "Erro ao buscar CEP.")
      }
      setIsFetchingCep(false)
    }
  }

  // Função de envio do formulário (Criação ou Edição)
  async function onSubmit(values: PersonPhysicalFormValues) {
    setIsSubmitting(true)
    try {
      // Limpeza dos dados mascarados antes de enviar para a Server Action
      const cleanData = {
        ...values,
        documento: values.documento.replace(/\D/g, ""),
        cep: values.cep.replace(/\D/g, "")
      }

      const res = await savePersonPhysical(cleanData)

      if (res.success) {
        toast.success(res.message)
        if (submitIntent === 'close') {
          router.push("/app/cadastros/pessoas-fisicas")
        } else {
          router.refresh() // Atualiza os dados se permanecer na página
        }
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

        {/* --- SEÇÃO 1: IDENTIFICAÇÃO BÁSICA E PESSOAL --- */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6 text-primary font-semibold">
              <Contact className="w-5 h-5" />
              <span>Identificação Básica e Pessoal</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Campo: Escopo Organizacional (Hierarquia) */}
              <FormField
                control={form.control}
                name="escopoId"
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Escopo Organizacional *</FormLabel>
                    <FormControl>
                      <ScopeSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={availableScopes}
                        disabled={readOnly || !!initialData?.id} // Bloqueia alteração de escopo na edição
                        error={form.formState.errors.escopoId?.message}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Campo: Nome Completo */}
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: João da Silva" // Placeholder atualizado
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: CPF (com Máscara) */}
              <FormField
                control={form.control}
                name="documento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="000.000.000-00"
                        disabled={readOnly || !!initialData?.id} // Bloqueia alteração de CPF na edição
                        maxLength={14}
                        value={field.value}
                        onChange={(e) => handleCpfChange(e, field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Linha 2 da Identificação */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <FormField
                control={form.control}
                name="dataNascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={readOnly} {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RG</FormLabel>
                    <FormControl><Input placeholder="Número do RG" disabled={readOnly} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nacionalidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nacionalidade</FormLabel>
                    <FormControl><Input placeholder="Ex: Brasileiro" disabled={readOnly} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="profissao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissão</FormLabel>
                    <FormControl><Input placeholder="Ex: Engenheiro" disabled={readOnly} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Linha 3 da Identificação: Estado Civil e Regime de Bens */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <FormField
                control={form.control}
                name="estadoCivil"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Estado Civil</FormLabel>
                    <Select disabled={readOnly} onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                        <SelectItem value="CASADO">Casado(a)</SelectItem>
                        <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                        <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                        <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="regimeBens"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Regime de Bens</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Comunhão Parcial"
                        // Campo só habilita se for Casado
                        disabled={readOnly || estadoCivilWatcher !== "CASADO"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* --- SEÇÃO 2: CONTATOS --- */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6 text-primary font-semibold">
              <PhoneCall className="w-5 h-5" />
              <span>Contatos</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="telefone_1" render={({ field }) => (
                <FormItem><FormLabel>Telefone Principal</FormLabel><FormControl><Input placeholder="(00) 00000-0000" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email_1" render={({ field }) => (
                <FormItem><FormLabel>E-mail Principal</FormLabel><FormControl><Input type="email" placeholder="email@exemplo.com" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telefone_2" render={({ field }) => (
                <FormItem><FormLabel>Telefone Secundário</FormLabel><FormControl><Input placeholder="(00) 0000-0000" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email_2" render={({ field }) => (
                <FormItem><FormLabel>E-mail Secundário</FormLabel><FormControl><Input type="email" placeholder="secundario@exemplo.com" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* --- SEÇÃO 3: ENDEREÇO RESIDENCIAL --- */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6 text-primary font-semibold">
              <Home className="w-5 h-5" />
              <span>Endereço Residencial</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Campo CEP com ícone de busca/loading embutido */}
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>CEP</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          placeholder="00000-000"
                          disabled={readOnly || isFetchingCep}
                          maxLength={9}
                          value={field.value}
                          onChange={(e) => handleCepChange(e, field.onChange)}
                        />
                      </FormControl>
                      {/* Alterna entre ícone de busca e spinner de loading */}
                      {isFetchingCep ? (
                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-primary animate-spin" />
                      ) : (
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-300 pointer-events-none" />
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="logradouro" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel>Logradouro</FormLabel><FormControl><Input placeholder="Rua, Avenida, etc." disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <FormField control={form.control} name="numero" render={({ field }) => (
                <FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="123" disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="complemento" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel>Complemento</FormLabel><FormControl><Input placeholder="Apto, Sala, Bloco..." disabled={readOnly} {...field} /></FormControl><FormMessage /></FormItem>
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

        {/* --- SEÇÃO 4: VÍNCULOS E PERFIL (CHECKBOXES) --- */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <MapPin className="w-5 h-5" />
              <span>Perfil e Vínculos Organizacionais</span>
            </div>
            <Separator />
            {/* Grid dos Perfis com ícones atualizados */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/20 p-6 rounded-lg border border-dashed border-border">
              {/* Perfil: Cliente -> Ícone UserStar */}
              <FormField
                control={form.control}
                name="isCliente"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border border-border p-4 bg-card shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} /></FormControl>
                    <UserStar className="w-5 h-5 text-success" /> {/* Ícone atualizado */}
                    <FormLabel className="font-bold cursor-pointer">Cliente</FormLabel>
                  </FormItem>
                )}
              />
              {/* Perfil: Corretor -> Ícone UserCheck */}
              <FormField
                control={form.control}
                name="isCorretor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border border-border p-4 bg-card shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} /></FormControl>
                    <UserCheck className="w-5 h-5 text-warning" /> {/* Ícone atualizado */}
                    <FormLabel className="font-bold cursor-pointer">Corretor</FormLabel>
                  </FormItem>
                )}
              />
              {/* Perfil: Funcionário -> Ícone UserCog */}
              <FormField
                control={form.control}
                name="isFuncionario"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border border-border p-4 bg-card shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} /></FormControl>
                    <UserCog className="w-5 h-5 text-info" /> {/* Ícone atualizado */}
                    <FormLabel className="font-bold cursor-pointer">Funcionário</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Bloco condicional para o CRECI (aparece se for Corretor) */}
            {isCorretorWatcher && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Card className="bg-warning/5 border border-warning/20 shadow-none">
                  <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-1">
                      {/* Título com ícone UserCheck padronizado */}
                      <h4 className="font-semibold text-warning flex items-center gap-2">
                        <UserCheck className="w-4 h-4" /> {/* Ícone atualizado */}
                        Registro Profissional
                      </h4>
                      <p className="text-sm text-muted-foreground">O número do CRECI é obrigatório para o perfil de Corretor.</p>
                    </div>
                    <FormField
                      control={form.control}
                      name="creci"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-warning font-semibold">Número do CRECI</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 123456-F"
                              disabled={readOnly}
                              {...field}
                              className="border-warning/50 focus-visible:ring-warning"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- RODAPÉ DE AÇÕES (BOTÕES FIXOS) --- */}
        {!readOnly && (
          <div className="flex items-center justify-end gap-3 bg-card p-4 rounded-lg border border-border shadow-sm sticky bottom-4 z-10">
            {/* Botão Cancelar */}
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push("/app/cadastros/pessoas-fisicas")}
            >
              Cancelar
            </Button>

            {/* Botão Salvar (Sucesso/Verde) -> Permanece na página */}
            <Button
              variant="outline"
              type="submit"
              disabled={isSubmitting}
              className="gap-2 text-success border-success hover:bg-success/10 hover:text-success"
              onClick={() => setSubmitIntent('save')} // Define intenção de apenas salvar
            >
              {(isSubmitting && submitIntent === 'save') ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {initialData?.id ? "Salvar Alterações" : "Salvar Cadastro"}
            </Button>

            {/* Botão Salvar e Fechar (Principal) -> Volta para listagem */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 min-w-[180px]"
              onClick={() => setSubmitIntent('close')} // Define intenção de salvar e fechar
            >
              {(isSubmitting && submitIntent === 'close') ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FolderSync className="w-4 h-4" />
              )}
              {initialData?.id ? "Salvar e Fechar" : "Cadastrar e Fechar"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}