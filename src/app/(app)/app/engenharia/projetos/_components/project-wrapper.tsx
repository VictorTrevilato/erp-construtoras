"use client"

import { useState } from "react"
import { ProjectProvider, useProject } from "./project-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectAttachmentItem } from "@/app/actions/projects"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Lock } from "lucide-react"
import Link from "next/link"

// Importamos a tipagem do formulário que criamos no passo anterior
import { ProjectForm, ProjectFormData } from "./project-form"
import { ProjectAttachmentsTab } from "./project-attachments-tab"

// --- TIPAGENS ---
export interface ScopeOption {
    id: string
    nome: string
    tipo: string
    nivel: number
}

// Tipo exato do retorno da função getProjectById do backend
export interface InitialProjectData {
    id: string
    nome: string
    razaoSocial: string         // <--- NOVO
    logo: string | null         // <--- NOVO
    tipo: string
    status: string
    descricao: string
    escopoId: string
    cidade: string
    estado: string
    logradouro: string
    numero: string
    bairro: string
    cep: string
    complemento: string
    cnpj: string
    dataPrevistaConclusao: string // <--- NOVO
    matricula: string
    registroIncorporacao: string
    cartorioRegistro: string      // <--- NOVO
    areaTotal: string
    percComissaoPadrao: string
}

interface Props {
  initialData?: InitialProjectData | null
  availableScopes: ScopeOption[]
  readOnly?: boolean
  initialAttachments?: ProjectAttachmentItem[]
}

// Estendemos as Props base para incluir os estados gerenciados no Wrapper
interface ProjectTabsProps extends Props {
    formData: ProjectFormData
    setFormData: React.Dispatch<React.SetStateAction<ProjectFormData>>
    attachments: ProjectAttachmentItem[]
    setAttachments: React.Dispatch<React.SetStateAction<ProjectAttachmentItem[]>>
}

function ProjectTabs({ initialData, availableScopes, readOnly, formData, setFormData, attachments, setAttachments }: ProjectTabsProps) {
    const { activeTab, setActiveTab } = useProject()
    const isNew = !initialData?.id

    const triggerClass = "rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-6 text-muted-foreground data-[state=active]:text-foreground whitespace-nowrap"

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto overflow-y-hidden border-b">
                <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto flex-nowrap">
                    <TabsTrigger value="dados" className={triggerClass}>1. Dados do Projeto</TabsTrigger>
                    <TabsTrigger value="anexos" className={triggerClass} disabled={isNew} title={isNew ? "Salve o projeto para habilitar anexos" : ""}>
                        2. Documentos e Templates
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="mt-6">
                <TabsContent value="dados" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProjectForm 
                        initialData={initialData} 
                        availableScopes={availableScopes} 
                        readOnly={readOnly}
                        formData={formData}
                        setFormData={setFormData}
                        onSaveSuccess={(newId: string) => {
                            if (isNew) {
                                window.history.replaceState(null, '', `/app/engenharia/projetos/${newId}`)
                                window.location.reload()
                            }
                        }}
                    />
                </TabsContent>

                <TabsContent value="anexos" className="focus-visible:outline-none focus-visible:ring-0">
                    <ProjectAttachmentsTab 
                        projectId={initialData?.id}
                        attachments={attachments}
                        setAttachments={setAttachments}
                        readOnly={readOnly}
                    />
                </TabsContent>
            </div>
        </Tabs>
    )
}

export function ProjectWrapper(props: Props) {
    const [formData, setFormData] = useState<ProjectFormData>({
        escopoId: props.initialData?.escopoId || "",
        logo: props.initialData?.logo || null,                     // <--- NOVO
        nome: props.initialData?.nome || "",
        razaoSocial: props.initialData?.razaoSocial || "",         // <--- NOVO
        tipo: props.initialData?.tipo || "OBRA",
        status: props.initialData?.status || "LANCAMENTO",
        descricao: props.initialData?.descricao || "",
        cep: props.initialData?.cep || "",
        logradouro: props.initialData?.logradouro || "",
        numero: props.initialData?.numero || "",
        complemento: props.initialData?.complemento || "",
        bairro: props.initialData?.bairro || "",
        cidade: props.initialData?.cidade || "",
        estado: props.initialData?.estado || "",
        cnpj: props.initialData?.cnpj || "",
        dataPrevistaConclusao: props.initialData?.dataPrevistaConclusao || "", // <--- NOVO
        registroIncorporacao: props.initialData?.registroIncorporacao || "",
        matricula: props.initialData?.matricula || "",
        cartorioRegistro: props.initialData?.cartorioRegistro || "",           // <--- NOVO
        areaTotal: props.initialData?.areaTotal || "",
        percComissaoPadrao: props.initialData?.percComissaoPadrao || "",
    })

    const [attachments, setAttachments] = useState<ProjectAttachmentItem[]>(props.initialAttachments || [])

    return (
        <div className="w-full pb-10">
            {/* CABEÇALHO GLOBAL */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        {props.initialData ? `Editar Projeto` : "Novo Projeto"}
                        {props.readOnly && (
                            <Badge variant="outline" className="text-warning border-warning gap-1">
                                <Lock className="w-3 h-3"/> Somente Leitura
                            </Badge>
                        )}
                    </h2>
                    <p className="text-muted-foreground">
                        Gerencie as informações, configurações e documentos deste empreendimento.
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <Link href="/app/engenharia/projetos">
                        <Button variant="outline" type="button">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                    </Link>
                </div>
            </div>

            <ProjectProvider>
                <ProjectTabs 
                    {...props} 
                    formData={formData}
                    setFormData={setFormData}
                    attachments={attachments}
                    setAttachments={setAttachments}
                />
            </ProjectProvider>
        </div>
    )
}