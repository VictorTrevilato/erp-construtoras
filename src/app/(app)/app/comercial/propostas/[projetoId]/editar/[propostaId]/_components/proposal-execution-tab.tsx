"use client"

import { useState } from "react"
import { ProposalFullDetail, getProjectTemplates, generateDocumentFromTemplate } from "@/app/actions/commercial-proposals"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { FileSignature, FileText, Lock, CheckCircle2, Printer, UploadCloud, Loader2, Eye, Trash2, Download } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { FileUploadModal, getFileIcon, formatBytes } from "@/components/shared/file-upload-modal"

interface Props {
  proposal: ProposalFullDetail
  setProposal: React.Dispatch<React.SetStateAction<ProposalFullDetail>>
  projetoId: string // <--- NOVA PROP
}

type TemplateItem = { id: string, nomeArquivo: string, urlArquivo: string }

export function ProposalExecutionTab({ proposal, projetoId }: Props) {
    
    // Estados Originais
    const [isGeneratingTermo, setIsGeneratingTermo] = useState(false)
    const [isGeneratingContrato, setIsGeneratingContrato] = useState(false)
    const [uploadTarget, setUploadTarget] = useState<'termo' | 'contrato' | null>(null)
    const [termoFile, setTermoFile] = useState<File | null>(null)
    const [contratoFile, setContratoFile] = useState<File | null>(null)
    const [fileToDelete, setFileToDelete] = useState<'termo' | 'contrato' | null>(null)

    // Novos Estados para o Motor de Templates
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
    const [availableTemplates, setAvailableTemplates] = useState<TemplateItem[]>([])
    const [selectedTemplateUrl, setSelectedTemplateUrl] = useState<string>("")
    const [targetDocType, setTargetDocType] = useState<'termo' | 'contrato' | null>(null)

    const isApproved = proposal.status === 'APROVADO'
    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
    const isBlocked = !isApproved && !isFormalizing

    const isTermoGenerated = proposal.status === 'FORMALIZADA' 
    const isContratoGenerated = ['EM_ASSINATURA', 'ASSINADO'].includes(proposal.status)
    const isTermoLocked = isContratoGenerated 

    // --- LÓGICA DE TEMPLATES ---
    const handleStartGeneration = async (type: 'termo' | 'contrato') => {
        const classNome = type === 'termo' ? "Template de Termo de Intenção" : "Template de Contrato (CCV)"
        
        toast.loading("Buscando templates...", { id: "search-tpl" })
        const templates = await getProjectTemplates(projetoId, classNome)
        toast.dismiss("search-tpl")

        if (templates.length === 0) {
            return toast.error(`Nenhum arquivo classificado como "${classNome}" foi encontrado nos anexos do Projeto.`)
        }

        if (templates.length === 1) {
            // Se só tem 1, não precisa de modal. Passa direto pra geração.
            processGeneration(type, templates[0].urlArquivo)
        } else {
            // Se tem mais de 1 (Ex: V1 e V2), abre o modal pro usuário escolher
            setAvailableTemplates(templates)
            setSelectedTemplateUrl(templates[0].urlArquivo) // Seleciona o primeiro por padrão
            setTargetDocType(type)
            setIsTemplateModalOpen(true)
        }
    }

    // Função que será chamada após a escolha (ou direto se tiver apenas 1 template)
    const processGeneration = async (type: 'termo' | 'contrato', templateUrl: string) => {
        setIsTemplateModalOpen(false)

        const setGenerating = type === 'termo' ? setIsGeneratingTermo : setIsGeneratingContrato
        setGenerating(true)
        const toastId = toast.loading(`Gerando ${type === 'termo' ? 'Termo' : 'Contrato'}...`)

        try {
            const res = await generateDocumentFromTemplate(proposal.id, templateUrl, type)
            
            if (res.success && res.base64) {
                // Converte o Base64 que veio do servidor para um Blob (Arquivo físico na memória do navegador)
                const byteCharacters = atob(res.base64)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

                // Força o download no navegador
                const link = document.createElement('a')
                link.href = window.URL.createObjectURL(blob)
                link.download = res.fileName || 'Documento.docx'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                toast.success("Documento gerado com sucesso!", { id: toastId })
            } else {
                toast.error(res.message || "Erro ao gerar documento.", { id: toastId })
            }
        } catch (error) {
            console.error(error)
            toast.error("Ocorreu um erro de comunicação.", { id: toastId })
        } finally {
            setGenerating(false)
        }
    }

    // --- UPLOAD E DELETE DE ARQUIVOS (Mantido do original) ---
    const handleAddFile = (files: File[]) => {
        if (files.length === 0) return
        const file = files[0]
        if (uploadTarget === 'termo') { setTermoFile(file); toast.success("Via assinada do Termo anexada com sucesso!") }
        else if (uploadTarget === 'contrato') { setContratoFile(file); toast.success("Via assinada do Contrato anexada com sucesso!") }
    }

    const confirmDeleteFile = () => {
        if (fileToDelete === 'termo') setTermoFile(null)
        if (fileToDelete === 'contrato') setContratoFile(null)
        setFileToDelete(null)
    }

    const handleDownloadSingle = (fileName: string) => { toast.info(`Baixando o arquivo: ${fileName}`) }

    return (
        <div className="space-y-6">
            
            {/* NOVO MODAL DE SELEÇÃO DE TEMPLATE */}
            <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Selecione o Template</DialogTitle>
                        <DialogDescription>
                            Encontramos mais de um template disponível para este documento. Qual versão você deseja utilizar?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <RadioGroup value={selectedTemplateUrl} onValueChange={setSelectedTemplateUrl} className="space-y-3">
                            {availableTemplates.map((tpl) => (
                                <div key={tpl.id} className="flex items-center space-x-3 border p-3 rounded-md hover:bg-muted/50 cursor-pointer">
                                    <RadioGroupItem value={tpl.urlArquivo} id={tpl.id} />
                                    <Label htmlFor={tpl.id} className="flex flex-col cursor-pointer w-full">
                                        <span className="font-bold text-foreground">{tpl.nomeArquivo}</span>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>Cancelar</Button>
                        <Button onClick={() => processGeneration(targetDocType!, selectedTemplateUrl)}>Confirmar e Gerar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <FileUploadModal isOpen={!!uploadTarget} onClose={() => setUploadTarget(null)} onConfirm={handleAddFile} existingFileNames={[termoFile?.name, contratoFile?.name].filter(Boolean) as string[]} />

            <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover documento assinado</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja remover esta via assinada? Você precisará anexar novamente para concluir a venda.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteFile} variant="destructive">Sim, remover</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <FileSignature className="w-5 h-5 text-primary" /> Efetivação e Contratos
                    </h2>
                    <p className="text-sm text-muted-foreground">Emita os documentos formais e conclua a venda da unidade.</p>
                </div>
            </div>

            {isBlocked ? (
                <Card className="border-dashed border-2 shadow-none bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Efetivação Bloqueada</h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
                            A geração de contratos e termos só é permitida após a proposta ser aprovada pela diretoria. 
                            Status atual: <strong className="uppercase text-foreground">{proposal.status.replace(/_/g, ' ')}</strong>.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {isFormalizing && (
                        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex gap-3">
                                <div className="p-2 bg-destructive/20 rounded-full h-fit text-destructive"><Lock className="w-5 h-5" /></div>
                                <div>
                                    <h4 className="font-bold text-destructive text-sm">Edição Bloqueada</h4>
                                    <p className="text-sm text-destructive/80 mt-0.5">A proposta está em fase de formalização/assinatura. Nenhuma edição pode ser feita.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* CARD 1: Termo de Intenção */}
                        <Card className={cn("border-2 transition-all flex flex-col", isTermoGenerated ? "border-border bg-muted/30" : "border-info/30 shadow-sm")}>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <FileText className="w-5 h-5 text-info" /> Termo de Intenção de Compra
                                </CardTitle>
                                <CardDescription>Documento simplificado para reserva da unidade e aceite de condições.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-info" /> Congela o preço e a disponibilidade</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-info" /> Qualificação básica do comprador principal</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-info" /> Resumo do fluxo de pagamento aprovado</li>
                                </ul>
                                
                                {isTermoGenerated ? (
                                    <div className="flex flex-col gap-3 mt-auto w-full">
                                        <div className="flex gap-2 w-full">
                                            <Button variant="outline" className="flex-1 bg-background" onClick={() => toast.info("Abrindo PDF do Termo...")} disabled={!!termoFile}>
                                                <Eye className="w-4 h-4 mr-2" /> Visualizar
                                            </Button>
                                            <Button className="flex-1 w-full bg-info hover:bg-info/90 text-white" onClick={() => setUploadTarget('termo')} disabled={!!termoFile}>
                                                <UploadCloud className="w-4 h-4 mr-2" /> Anexar Assinado
                                            </Button>
                                        </div>

                                        {termoFile && (
                                            <div className="flex items-center justify-between p-2.5 border border-border rounded-lg bg-background shadow-sm">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center shrink-0 border border-border">{getFileIcon(termoFile.name)}</div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-foreground text-xs truncate" title={termoFile.name}>{termoFile.name}</p>
                                                        <p className="text-[10px] font-medium text-muted-foreground">{formatBytes(termoFile.size)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0 ml-2">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleDownloadSingle(termoFile.name)}><Download className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Baixar Arquivo</TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setFileToDelete('termo')}><Trash2 className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Remover Anexo</TooltipContent></Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Button className="w-full mt-auto bg-info hover:bg-info/90 text-white" disabled={isTermoLocked || isGeneratingTermo} onClick={() => handleStartGeneration('termo')}>
                                        {isGeneratingTermo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                                        {isTermoLocked ? "Bloqueado pelo Contrato" : (isGeneratingTermo ? "Gerando..." : "Gerar Documento (.docx)")}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* CARD 2: Contrato Oficial (CCV) */}
                        <Card className={cn("border-2 transition-all flex flex-col", isContratoGenerated ? "border-border bg-muted/30" : "border-success/30 shadow-sm")}>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <FileSignature className="w-5 h-5 text-success" /> Contrato de Compra e Venda
                                </CardTitle>
                                <CardDescription>Documento jurídico completo e definitivo para assinatura das partes.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" /> Qualificação completa (Cônjuges, Avalistas)</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" /> Cláusulas contratuais e multas padronizadas</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" /> Rateio de comissões e intermediação</li>
                                </ul>

                                {isContratoGenerated ? (
                                    <div className="flex flex-col gap-3 mt-auto w-full">
                                        <div className="flex gap-2 w-full">
                                            <Button variant="outline" className="flex-1 bg-background" onClick={() => toast.info("Abrindo PDF do Contrato...")} disabled={!!contratoFile}>
                                                <Eye className="w-4 h-4 mr-2" /> Visualizar
                                            </Button>
                                            <Button className="flex-1 w-full bg-success hover:bg-success/90 text-white" onClick={() => setUploadTarget('contrato')} disabled={!!contratoFile}>
                                                <UploadCloud className="w-4 h-4 mr-2" /> Anexar Assinado
                                            </Button>
                                        </div>

                                        {contratoFile && (
                                            <div className="flex items-center justify-between p-2.5 border border-border rounded-lg bg-background shadow-sm">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center shrink-0 border border-border">{getFileIcon(contratoFile.name)}</div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-foreground text-xs truncate" title={contratoFile.name}>{contratoFile.name}</p>
                                                        <p className="text-[10px] font-medium text-muted-foreground">{formatBytes(contratoFile.size)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0 ml-2">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleDownloadSingle(contratoFile.name)}><Download className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Baixar Arquivo</TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setFileToDelete('contrato')}><Trash2 className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent>Remover Anexo</TooltipContent></Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Button className="w-full mt-auto bg-success hover:bg-success/90 text-white" disabled={isGeneratingContrato} onClick={() => handleStartGeneration('contrato')}>
                                        {isGeneratingContrato ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                                        {isGeneratingContrato ? "Gerando..." : "Gerar Documento (.docx)"}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                    </div>
                </>
            )}
        </div>
    )
}