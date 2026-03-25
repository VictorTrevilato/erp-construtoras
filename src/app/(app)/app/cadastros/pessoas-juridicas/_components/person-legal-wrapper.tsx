"use client"

import { PersonLegalProvider, usePersonLegal } from "./person-legal-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Lock } from "lucide-react"
import Link from "next/link"

// Importamos o formulário e as tipagens exatas da Pessoa Jurídica
import { PersonLegalForm, ScopeOption, InitialLegalPersonData } from "./person-legal-form"

interface Props {
  initialData?: InitialLegalPersonData | null
  availableScopes: ScopeOption[]
  readOnly?: boolean
}

function PersonLegalTabs({ initialData, availableScopes, readOnly }: Props) {
    const { activeTab, setActiveTab } = usePersonLegal()
    const isNew = !initialData?.id

    const triggerClass = "rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-6 text-muted-foreground data-[state=active]:text-foreground whitespace-nowrap"

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto overflow-y-hidden border-b">
                <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto flex-nowrap">
                    <TabsTrigger value="dados" className={triggerClass}>1. Dados Cadastrais</TabsTrigger>
                    <TabsTrigger 
                        value="anexos" 
                        className={triggerClass} 
                        disabled={isNew} 
                        title={isNew ? "Salve para habilitar anexos" : ""}
                    >
                        2. Documentos e Anexos
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="mt-6">
                <TabsContent value="dados" className="focus-visible:outline-none focus-visible:ring-0">
                    <PersonLegalForm 
                        initialData={initialData} 
                        availableScopes={availableScopes}
                        readOnly={readOnly} 
                    />
                </TabsContent>

                <TabsContent value="anexos" className="focus-visible:outline-none focus-visible:ring-0">
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/10 text-center">
                        <div className="bg-background p-4 rounded-full shadow-sm mb-4">
                            <Lock className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">Gestão de Documentos</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-2">
                            Área destinada ao upload de Contrato Social, Cartão CNPJ e demais documentos jurídicos.
                        </p>
                        <Button variant="outline" className="mt-6" disabled>
                            Em breve: Upload via S3
                        </Button>
                    </div>
                </TabsContent>
            </div>
        </Tabs>
    )
}

export function PersonLegalWrapper(props: Props) {
    return (
        <div className="w-full pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        {props.initialData ? `Editar Pessoa Jurídica` : "Nova Pessoa Jurídica"}
                        {props.readOnly && (
                            <Badge variant="outline" className="text-warning border-warning gap-1">
                                <Lock className="w-3 h-3"/> Somente Leitura
                            </Badge>
                        )}
                    </h2>
                    <p className="text-muted-foreground">
                        {props.initialData 
                            ? "Gerencie as informações cadastrais e documentos desta empresa." 
                            : "Preencha os campos para cadastrar uma nova pessoa jurídica no sistema."}
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <Link href="/app/cadastros/pessoas-juridicas">
                        <Button variant="outline" type="button">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                    </Link>
                </div>
            </div>

            <PersonLegalProvider>
                <PersonLegalTabs {...props} />
            </PersonLegalProvider>
        </div>
    )
}