"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
    ProposalFullDetail, 
    ProposalAttachmentItem,
    getProjectTemplates, 
    generateDocumentFromTemplate,
    getProposalAttachments,
    getAttachmentDownloadUrl,
    getDirectUploadUrls,
    saveAttachmentsMetadata,
    deleteProposalAttachment
} from "@/app/actions/commercial-proposals"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { FileSignature, FileText, Lock, CheckCircle2, Printer, UploadCloud, Loader2, Trash2, Download, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { FileUploadModal, getFileIcon } from "@/components/shared/file-upload-modal"

interface Props {
  proposal: ProposalFullDetail
  setProposal: React.Dispatch<React.SetStateAction<ProposalFullDetail>>
  projetoId: string
  attachments: ProposalAttachmentItem[]
  setAttachments: React.Dispatch<React.SetStateAction<ProposalAttachmentItem[]>>
}

type TemplateItem = { id: string, nomeArquivo: string, urlArquivo: string }

export function ProposalExecutionTab({ proposal, setProposal, projetoId, attachments, setAttachments }: Props) {
    const router = useRouter()
    
    // Estados de Loading e Modal
    const [isGeneratingTermo, setIsGeneratingTermo] = useState(false)
    const [isGeneratingContrato, setIsGeneratingContrato] = useState(false)
    const [uploadTarget, setUploadTarget] = useState<'termo' | 'contrato' | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [fileToDelete, setFileToDelete] = useState<{ id: string, url: string, type: 'termo' | 'contrato' } | null>(null)

    // Estados para o Motor de Templates
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
    const [availableTemplates, setAvailableTemplates] = useState<TemplateItem[]>([])
    const [selectedTemplateUrl, setSelectedTemplateUrl] = useState<string>("")
    const [targetDocType, setTargetDocType] = useState<'termo' | 'contrato' | null>(null)
    const [confirmSingleTarget, setConfirmSingleTarget] = useState<{type: 'termo' | 'contrato', url: string} | null>(null)

    // Mapeia inteligentemente o estado através dos arquivos que realmente existem no banco!
    const termoGerado = attachments.find(a => a.classificacao === 'Termo Gerado')
    const contratoGerado = attachments.find(a => a.classificacao === 'Contrato Gerado')
    const termoAssinado = attachments.find(a => a.classificacao === 'Termo Assinado')
    const contratoAssinado = attachments.find(a => a.classificacao === 'Contrato Assinado')

    const isApproved = proposal.status === 'APROVADO'
    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
    const isBlocked = !isApproved && !isFormalizing
    const isTermoLocked = !!contratoGerado 

    // --- 1. LÓGICA DE GERAÇÃO (TEMPLATES) ---
    const handleStartGeneration = async (type: 'termo' | 'contrato') => {
        const classNome = type === 'termo' ? "Template de Termo de Intenção" : "Template de Contrato (CCV)"
        
        toast.loading("Buscando templates...", { id: "search-tpl" })
        const templates = await getProjectTemplates(projetoId, classNome)
        toast.dismiss("search-tpl")

        if (templates.length === 0) {
            return toast.error(`Nenhum arquivo classificado como "${classNome}" foi encontrado nos anexos do Projeto.`)
        }

        if (templates.length === 1) {
            setConfirmSingleTarget({ type, url: templates[0].urlArquivo })
        } else {
            setAvailableTemplates(templates)
            setSelectedTemplateUrl(templates[0].urlArquivo)
            setTargetDocType(type)
            setIsTemplateModalOpen(true)
        }
    }

    const processGeneration = async (type: 'termo' | 'contrato', templateUrl: string) => {
        setIsTemplateModalOpen(false)
        setConfirmSingleTarget(null)

        const setGenerating = type === 'termo' ? setIsGeneratingTermo : setIsGeneratingContrato
        setGenerating(true)
        const toastId = toast.loading(`Gerando ${type === 'termo' ? 'Termo' : 'Contrato'}...`)

        try {
            const res = await generateDocumentFromTemplate(proposal.id, templateUrl, type)
            
            if (res.success && res.base64) {
                // Download automático e invisível
                const byteCharacters = atob(res.base64)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i)
                const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

                const link = document.createElement('a')
                link.href = window.URL.createObjectURL(blob)
                link.download = res.fileName || 'Documento.docx'
                document.body.appendChild(link)
                link.click()
                link.remove()

                // Atualiza Anexos para sincronizar com a aba "Anexos" na hora!
                const updatedAttachments = await getProposalAttachments(proposal.id)
                setAttachments(updatedAttachments)

                // Muda Status
                const novoStatus = type === 'termo' ? 'FORMALIZADA' : 'EM_ASSINATURA'
                setProposal(prev => ({ ...prev, status: novoStatus }))
                router.refresh() 

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

    // --- 2. LÓGICA DE VISUALIZAÇÃO/DOWNLOAD ELEGANTE ---
    const handleDownloadDocument = async (urlArquivo: string, nomeArquivo: string) => {
        const toastId = toast.loading(`Iniciando download de ${nomeArquivo}...`)
        
        const res = await getAttachmentDownloadUrl(urlArquivo, nomeArquivo)
        if (res.success && res.url) {
            toast.success("Download iniciado!", { id: toastId })
            const link = document.createElement('a')
            link.href = res.url
            document.body.appendChild(link)
            link.click()
            link.remove()
        } else {
            toast.error("Erro ao gerar link de download.", { id: toastId })
        }
    }

    // --- 3. LÓGICA DE UPLOAD DA VIA ASSINADA ---
    const handleAddFile = async (files: File[]) => {
        if (files.length === 0 || !uploadTarget) return
        const file = files[0]
        const currentTarget = uploadTarget
        setUploadTarget(null)

        const toastId = toast.loading("Enviando documento assinado...")

        try {
            const sasRes = await getDirectUploadUrls(proposal.id, [file.name])
            if (!sasRes.success || sasRes.data.length === 0) throw new Error("Erro de permissão de upload")
            
            const { uploadUrl, relativePath } = sasRes.data[0]
            
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': file.type },
                body: file
            })
            
            if (!uploadRes.ok) throw new Error("Falha no envio para a nuvem.")
            
            const classif = currentTarget === 'termo' ? 'Termo Assinado' : 'Contrato Assinado'
            const labelTarget = currentTarget === 'termo' ? 'Termo' : 'Contrato'
            const observacao = `Via do ${labelTarget} assinada.`
            
            const metaRes = await saveAttachmentsMetadata(proposal.id, [{
                fileName: file.name,
                classificacao: classif,
                observacao: observacao,
                relativePath: relativePath
            }])
            
            if (metaRes.success && metaRes.data) {
                // Sincroniza a aba anexos instantaneamente
                setAttachments(prev => [...prev, ...metaRes.data])

                // Se enviou o Contrato Assinado, muda a proposta para ASSINADO
                if (currentTarget === 'contrato') {
                    setProposal(prev => ({ ...prev, status: 'ASSINADO' }))
                }
                
                router.refresh()
                toast.success("Via assinada anexada com sucesso!", { id: toastId })
            } else {
                throw new Error(metaRes.message)
            }
        } catch (error) {
            console.error(error)
            toast.error("Erro ao processar o upload.", { id: toastId })
        }
    }

    // --- 4. EXCLUSÃO DE ASSINADOS ---
    const confirmDeleteFile = async () => {
        if (!fileToDelete) return
        
        setIsDeleting(true)
        const toastId = toast.loading("Removendo documento...")

        const res = await deleteProposalAttachment(fileToDelete.id, fileToDelete.url)
        
        if (res.success) {
            // Remove da lista instantaneamente
            setAttachments(prev => prev.filter(a => a.id !== fileToDelete.id))

            // Se excluiu o contrato assinado, volta pra Em Assinatura
            if (fileToDelete.type === 'contrato') {
                setProposal(prev => ({ ...prev, status: 'EM_ASSINATURA' }))
            }

            toast.success("Via assinada excluída com sucesso!", { id: toastId })
            router.refresh()
        } else {
            toast.error(res.message, { id: toastId })
        }
        
        setIsDeleting(false)
        setFileToDelete(null)
    }

    return (
        <div className="space-y-6">
            
            {/* ALERTA: Confirmação Rápida (1 Template Único) */}
            <AlertDialog open={!!confirmSingleTarget} onOpenChange={(open) => !open && setConfirmSingleTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmação de Geração</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a emitir o documento oficial da proposta.<br/><br/>
                            <strong className="text-destructive">Atenção:</strong> A geração deste documento mudará o status da proposta e bloqueará permanentemente qualquer edição de valores, condições ou compradores.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => confirmSingleTarget && processGeneration(confirmSingleTarget.type, confirmSingleTarget.url)}>
                            Sim, gerar e bloquear proposta
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* MODAL: Seleção Múltipla de Templates */}
            <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Selecione o Template</DialogTitle>
                        <DialogDescription>
                            Encontramos mais de um modelo disponível. Qual versão você deseja utilizar?
                        </DialogDescription>
                    </DialogHeader>

                    {/* BANNER DE AVISO */}
                    <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-3 text-sm rounded-r flex gap-3 items-start mt-2">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p><strong>Ação Irreversível:</strong> A geração formalizará a proposta e <strong>bloqueará permanentemente</strong> a edição de qualquer dado.</p>
                    </div>

                    <div className="py-2">
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
                        <Button onClick={() => processGeneration(targetDocType!, selectedTemplateUrl)}>Gerar e Bloquear Proposta</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <FileUploadModal 
                isOpen={!!uploadTarget} 
                onClose={() => setUploadTarget(null)} 
                onConfirm={handleAddFile} 
                existingFileNames={attachments.map(a => a.nomeArquivo)} 
            />

            <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir via assinada?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover esta via assinada? O arquivo será <strong>excluído permanentemente</strong> da nuvem e do banco de dados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteFile} variant="destructive" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2"/>}
                            Sim, excluir permanentemente
                        </AlertDialogAction>
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
                                    <h4 className="font-bold text-destructive text-sm">Edição Bloqueada Definitivamente</h4>
                                    <p className="text-sm text-destructive/80 mt-0.5">A proposta avançou para a fase de documentação formal e os valores foram congelados.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* CARD 1: Termo de Intenção */}
                        <Card className={cn("border-2 transition-all flex flex-col", termoGerado ? "border-border bg-muted/30" : "border-info/30 shadow-sm")}>
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
                                
                                {termoGerado ? (
                                    <div className="flex flex-col gap-3 mt-auto w-full">
                                        <div className="flex gap-2 w-full">
                                            <Button variant="outline" className="flex-1 bg-background" onClick={() => handleDownloadDocument(termoGerado.urlArquivo, termoGerado.nomeArquivo)} disabled={!!termoAssinado}>
                                                <Download className="w-4 h-4 mr-2" /> Baixar
                                            </Button>
                                            <Button className="flex-1 w-full bg-info hover:bg-info/90 text-white" onClick={() => setUploadTarget('termo')} disabled={!!termoAssinado}>
                                                <UploadCloud className="w-4 h-4 mr-2" /> Anexar Assinado
                                            </Button>
                                        </div>

                                        {termoAssinado && (
                                            <div className="flex items-center justify-between p-2.5 border border-border rounded-lg bg-background shadow-sm">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center shrink-0 border border-border">{getFileIcon(termoAssinado.nomeArquivo)}</div>
                                                    <div className="min-w-0 flex-1">
                                                        <TooltipProvider delayDuration={300}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <p className="font-bold text-foreground text-xs truncate cursor-help">
                                                                        {termoAssinado.nomeArquivo}
                                                                    </p>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="bg-white text-slate-700 border border-slate-200 shadow-md font-medium px-3 py-1.5">
                                                                    {termoAssinado.nomeArquivo}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <p className="text-[10px] font-medium text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Salvo na Nuvem</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0 ml-2">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleDownloadDocument(termoAssinado.urlArquivo, termoAssinado.nomeArquivo)}>
                                                                    <Download className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Baixar Arquivo</TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setFileToDelete({ id: termoAssinado.id, url: termoAssinado.urlArquivo, type: 'termo' })}>
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Remover e Excluir</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Button className="w-full mt-auto bg-info hover:bg-info/90 text-white" disabled={isTermoLocked || isGeneratingTermo} onClick={() => handleStartGeneration('termo')}>
                                        {isGeneratingTermo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                                        {isTermoLocked ? "Bloqueado pelo Contrato" : (isGeneratingTermo ? "Gerando..." : "Gerar Documento")}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* CARD 2: Contrato Oficial (CCV) */}
                        <Card className={cn("border-2 transition-all flex flex-col", contratoGerado ? "border-border bg-muted/30" : "border-success/30 shadow-sm")}>
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

                                {contratoGerado ? (
                                    <div className="flex flex-col gap-3 mt-auto w-full">
                                        <div className="flex gap-2 w-full">
                                            <Button variant="outline" className="flex-1 bg-background" onClick={() => handleDownloadDocument(contratoGerado.urlArquivo, contratoGerado.nomeArquivo)} disabled={!!contratoAssinado}>
                                                <Download className="w-4 h-4 mr-2" /> Baixar
                                            </Button>
                                            <Button className="flex-1 w-full bg-success hover:bg-success/90 text-white" onClick={() => setUploadTarget('contrato')} disabled={!!contratoAssinado}>
                                                <UploadCloud className="w-4 h-4 mr-2" /> Anexar Assinado
                                            </Button>
                                        </div>

                                        {contratoAssinado && (
                                            <div className="flex items-center justify-between p-2.5 border border-border rounded-lg bg-background shadow-sm">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center shrink-0 border border-border">{getFileIcon(contratoAssinado.nomeArquivo)}</div>
                                                    <div className="min-w-0 flex-1">
                                                        <TooltipProvider delayDuration={300}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <p className="font-bold text-foreground text-xs truncate cursor-help">
                                                                        {contratoAssinado.nomeArquivo}
                                                                    </p>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="bg-white text-slate-700 border border-slate-200 shadow-md font-medium px-3 py-1.5">
                                                                    {contratoAssinado.nomeArquivo}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <p className="text-[10px] font-medium text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Salvo na Nuvem</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0 ml-2">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleDownloadDocument(contratoAssinado.urlArquivo, contratoAssinado.nomeArquivo)}>
                                                                    <Download className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Baixar Arquivo</TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setFileToDelete({ id: contratoAssinado.id, url: contratoAssinado.urlArquivo, type: 'contrato' })}>
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Remover e Excluir</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Button className="w-full mt-auto bg-success hover:bg-success/90 text-white" disabled={isGeneratingContrato} onClick={() => handleStartGeneration('contrato')}>
                                        {isGeneratingContrato ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                                        {isGeneratingContrato ? "Gerando..." : "Gerar Documento"}
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