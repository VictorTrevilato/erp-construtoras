"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, UserPlus, Search, UserCog } from "lucide-react"
import { toast } from "sonner"
import { createSimpleEntity, updateSimpleEntity, getEntityById, CreateEntityInput } from "@/app/actions/entities"
import { fetchAddressByCep } from "@/app/actions/viacep"

interface EntityFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (newEntity: { id: string, nome: string, documento: string, tipo: string }) => void
    entityIdToEdit?: string | null
}

export function EntityFormModal({ isOpen, onClose, onSuccess, entityIdToEdit }: EntityFormModalProps) {
    const [isPending, setIsPending] = useState(false)
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [isFetchingCep, setIsFetchingCep] = useState(false)
    
    // Estados do Form
    const [tipo, setTipo] = useState<'PF' | 'PJ'>('PF')
    const [estadoCivil, setEstadoCivil] = useState("")
    const [formData, setFormData] = useState<Partial<CreateEntityInput>>({})

    const isEditMode = !!entityIdToEdit

    // Busca os dados se for Edição
    useEffect(() => {
        async function loadEntity() {
            if (isOpen && entityIdToEdit) {
                setIsLoadingData(true)
                const data = await getEntityById(entityIdToEdit)
                if (data) {
                    setTipo(data.tipo as 'PF' | 'PJ')
                    setEstadoCivil(data.estadoCivil || "")
                    
                    // Ajusta data de nascimento para input date (YYYY-MM-DD)
                    let dNasc = ""
                    if (data.dataNascimento) {
                        dNasc = new Date(data.dataNascimento).toISOString().split('T')[0]
                    }

                    // Formata o Doc
                    let docFormatado = data.documento || ""
                    if (data.tipo === 'PF' && docFormatado.length === 11) docFormatado = docFormatado.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
                    if (data.tipo === 'PJ' && docFormatado.length === 14) docFormatado = docFormatado.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")

                    setFormData({
                        ...data,
                        documento: docFormatado,
                        dataNascimento: dNasc
                    })
                } else {
                    toast.error("Erro ao carregar dados da entidade.")
                    onClose()
                }
                setIsLoadingData(false)
            } else if (isOpen && !entityIdToEdit) {
                // Modo Cadastro: Limpa tudo
                setTipo('PF')
                setEstadoCivil("")
                setFormData({})
            }
        }
        loadEntity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, entityIdToEdit])

    const handleFormChange = (field: keyof CreateEntityInput, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '')
        if (tipo === 'PF') {
            value = value.replace(/(\d{3})(\d)/, '$1.$2')
            value = value.replace(/(\d{3})(\d)/, '$1.$2')
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        } else {
            value = value.replace(/^(\d{2})(\d)/, '$1.$2')
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2')
            value = value.replace(/(\d{4})(\d)/, '$1-$2')
        }
        handleFormChange('documento', value)
    }

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '')
        if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2')
        handleFormChange('cep', value)

        if (value.length === 9) {
            setIsFetchingCep(true)
            const res = await fetchAddressByCep(value)
            if (res.success && res.data) {
                setFormData((prev) => ({
                    ...prev,
                    logradouro: res.data!.logradouro,
                    bairro: res.data!.bairro,
                    cidade: res.data!.cidade,
                    uf: res.data!.uf
                }))
                //toast.success("Endereço preenchido automaticamente via Correios.")
            } else {
                toast.error(res.message || "Erro ao buscar CEP.")
            }
            setIsFetchingCep(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsPending(true)

        const payload: CreateEntityInput = {
            tipo,
            nome: formData.nome || "",
            documento: (formData.documento || "").replace(/\D/g, ''),
            dataNascimento: formData.dataNascimento || undefined,
            rg: formData.rg || undefined,
            estadoCivil: estadoCivil || undefined,
            regimeBens: formData.regimeBens || undefined,
            nacionalidade: formData.nacionalidade || undefined,
            profissao: formData.profissao || undefined,
            nomeFantasia: formData.nomeFantasia || undefined,
            inscricaoEstadual: formData.inscricaoEstadual || undefined,
            representanteLegal: formData.representanteLegal || undefined,
            telefone_1: formData.telefone_1 || undefined,
            telefone_2: formData.telefone_2 || undefined,
            email_1: formData.email_1 || undefined,
            email_2: formData.email_2 || undefined,
            cep: formData.cep || undefined, 
            logradouro: formData.logradouro || undefined,
            numero: formData.numero || undefined,
            complemento: formData.complemento || undefined,
            bairro: formData.bairro || undefined,
            cidade: formData.cidade || undefined,
            uf: formData.uf || undefined,
        }

        if (!payload.nome || !payload.documento) {
            toast.error("Nome e Documento são obrigatórios.")
            setIsPending(false)
            return
        }

        let res;
        if (isEditMode) {
            res = await updateSimpleEntity(entityIdToEdit, payload)
        } else {
            res = await createSimpleEntity(payload)
        }

        if (res.success && res.data) {
            toast.success(res.message)
            onSuccess(res.data)
            onClose()
        } else {
            toast.error(res.message)
        }

        setIsPending(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
                
                <DialogHeader className="p-6 pb-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {isEditMode ? <UserCog className="w-5 h-5 text-amber-600" /> : <UserPlus className="w-5 h-5 text-blue-600" />}
                        {isEditMode ? "Editar Dados da Entidade" : "Cadastrar Entidade Completa"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode ? "Atualize as informações cadastrais do cliente selecionado." : "Preencha o formulário para registrar um novo cliente ou empresa."}
                    </DialogDescription>
                </DialogHeader>

                {isLoadingData ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                        <p className="text-slate-500">Carregando dados...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                            
                            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border">
                                <Label className="text-sm font-bold uppercase text-slate-500">Classificação</Label>
                                <RadioGroup value={tipo} onValueChange={(val: string) => setTipo(val as 'PF' | 'PJ')} className="flex gap-6" disabled={isEditMode}>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="PF" id="pf" />
                                        <Label htmlFor="pf" className="cursor-pointer font-medium">Pessoa Física (PF)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="PJ" id="pj" />
                                        <Label htmlFor="pj" className="cursor-pointer font-medium">Pessoa Jurídica (PJ)</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                                    {tipo === 'PF' ? 'Dados Pessoais' : 'Dados da Empresa'}
                                    <Separator className="flex-1" />
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>{tipo === 'PF' ? 'Nome Completo' : 'Razão Social'} <span className="text-red-500">*</span></Label>
                                        <Input name="nome" placeholder={tipo === 'PF' ? 'Ex: João da Silva' : 'Ex: Empresa LTDA'} value={formData.nome || ""} onChange={e => handleFormChange('nome', e.target.value)} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{tipo === 'PF' ? 'CPF' : 'CNPJ'} <span className="text-red-500">*</span></Label>
                                        <Input name="documento" placeholder={tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'} value={formData.documento || ""} onChange={handleDocumentoChange} maxLength={tipo === 'PF' ? 14 : 18} disabled={isEditMode} required />
                                    </div>
                                </div>

                                {tipo === 'PF' ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Data de Nascimento</Label>
                                                <Input name="dataNascimento" type="date" value={formData.dataNascimento || ""} onChange={e => handleFormChange('dataNascimento', e.target.value)} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>RG</Label>
                                                <Input name="rg" placeholder="Número do RG" value={formData.rg || ""} onChange={e => handleFormChange('rg', e.target.value)} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Nacionalidade</Label>
                                                <Input name="nacionalidade" placeholder="Ex: Brasileiro" value={formData.nacionalidade || ""} onChange={e => handleFormChange('nacionalidade', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Estado Civil</Label>
                                                <Select value={estadoCivil} onValueChange={setEstadoCivil}>
                                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                                                        <SelectItem value="CASADO">Casado(a)</SelectItem>
                                                        <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                                                        <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                                                        <SelectItem value="UNIAO_ESTAVEL">União Estável</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Regime de Bens</Label>
                                                <Input name="regimeBens" placeholder="Ex: Comunhão Parcial" value={formData.regimeBens || ""} onChange={e => handleFormChange('regimeBens', e.target.value)} disabled={estadoCivil !== 'CASADO'} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Profissão</Label>
                                                <Input name="profissao" placeholder="Ex: Engenheiro" value={formData.profissao || ""} onChange={e => handleFormChange('profissao', e.target.value)} />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Nome Fantasia</Label>
                                            <Input name="nomeFantasia" placeholder="Nome Fantasia" value={formData.nomeFantasia || ""} onChange={e => handleFormChange('nomeFantasia', e.target.value)} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Inscrição Estadual</Label>
                                            <Input name="inscricaoEstadual" placeholder="IE ou Isento" value={formData.inscricaoEstadual || ""} onChange={e => handleFormChange('inscricaoEstadual', e.target.value)} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Representante Legal</Label>
                                            <Input name="representanteLegal" placeholder="Nome do representante" value={formData.representanteLegal || ""} onChange={e => handleFormChange('representanteLegal', e.target.value)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                                    Contatos
                                    <Separator className="flex-1" />
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Telefone Principal</Label>
                                        <Input name="telefone_1" placeholder="(00) 00000-0000" value={formData.telefone_1 || ""} onChange={e => handleFormChange('telefone_1', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>E-mail Principal</Label>
                                        <Input name="email_1" type="email" placeholder="email@exemplo.com" value={formData.email_1 || ""} onChange={e => handleFormChange('email_1', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Telefone Secundário</Label>
                                        <Input name="telefone_2" placeholder="(00) 0000-0000" value={formData.telefone_2 || ""} onChange={e => handleFormChange('telefone_2', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>E-mail Secundário</Label>
                                        <Input name="email_2" type="email" placeholder="secundario@exemplo.com" value={formData.email_2 || ""} onChange={e => handleFormChange('email_2', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                                    Endereço
                                    <Separator className="flex-1" />
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="flex justify-between items-center">
                                            CEP
                                            {isFetchingCep && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                                        </Label>
                                        <div className="relative">
                                            <Input name="cep" placeholder="00000-000" value={formData.cep || ""} onChange={handleCepChange} maxLength={9} />
                                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-300 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="grid gap-2 md:col-span-2">
                                        <Label>Logradouro</Label>
                                        <Input name="logradouro" placeholder="Rua, Avenida, etc." value={formData.logradouro || ""} onChange={e => handleFormChange('logradouro', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Número</Label>
                                        <Input name="numero" placeholder="123" value={formData.numero || ""} onChange={e => handleFormChange('numero', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="grid gap-2 md:col-span-2">
                                        <Label>Complemento</Label>
                                        <Input name="complemento" placeholder="Apto, Sala, Bloco..." value={formData.complemento || ""} onChange={e => handleFormChange('complemento', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2 md:col-span-2">
                                        <Label>Bairro</Label>
                                        <Input name="bairro" placeholder="Nome do bairro" value={formData.bairro || ""} onChange={e => handleFormChange('bairro', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="grid gap-2 md:col-span-3">
                                        <Label>Cidade</Label>
                                        <Input name="cidade" placeholder="Nome da cidade" value={formData.cidade || ""} onChange={e => handleFormChange('cidade', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>UF</Label>
                                        <Input name="uf" placeholder="SP" value={formData.uf || ""} onChange={e => handleFormChange('uf', e.target.value)} maxLength={2} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-4 bg-slate-50 border-t shrink-0 items-center">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 min-w-[150px]">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isEditMode ? "Salvar Alterações" : "Salvar e Vincular"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}