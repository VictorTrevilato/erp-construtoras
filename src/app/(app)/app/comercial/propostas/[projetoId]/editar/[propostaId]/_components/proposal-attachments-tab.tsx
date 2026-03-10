"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ProposalFullDetail, ProposalAttachmentItem, getDirectUploadUrls, saveAttachmentsMetadata, deleteProposalAttachment, getAttachmentDownloadUrl, unlockProposalEdit } from "@/app/actions/commercial-proposals"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Paperclip, Trash2, Save, UploadCloud, Loader2, Download, Lock, Unlock, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { FileUploadModal, getFileIcon, formatBytes } from "@/components/shared/file-upload-modal"
import JSZip from "jszip"

export type AttachmentItem = {
    id: string
    fileObj: File
    fileName: string
    fileSize: number
    tipoDocumento: string
    observacao: string
}

const TIPOS_DOCUMENTO = [
    "CNH", "RG", "CPF", "Comprovante de Residência", "Certidão de Nascimento",
    "Certidão de Casamento", "Cartão CNPJ", "Contrato Social", "Procuração",
    "Comprovante de Renda", "Ficha de Cadastro", "Outro"
]

interface Props {
  proposal: ProposalFullDetail
  attachments: ProposalAttachmentItem[]
  setAttachments: React.Dispatch<React.SetStateAction<ProposalAttachmentItem[]>>
}

export function ProposalAttachmentsTab({ proposal, attachments, setAttachments }: Props) {
    const router = useRouter()
    const [isPendingTrans, startTransition] = useTransition()
    
    const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([])
    
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: string, type: 'pending' | 'existing', url?: string } | null>(null)
    
    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
    const [isUnlocked, setIsUnlocked] = useState(proposal.status !== 'APROVADO' && !isFormalizing)
    const [isUnlocking, setIsUnlocking] = useState(false)

    const handleUnlock = async () => {
        setIsUnlocking(true)
        const res = await unlockProposalEdit(proposal.id, "Edição de Anexos")
        setIsUnlocking(false)

        if (res.success) {
            toast.success(res.message)
            setIsUnlocked(true)
            startTransition(() => {
                router.refresh()
            })
        } else {
            toast.error(res.message)
        }
    }

    const handleAddFiles = (files: File[]) => {
        const newAttachments: AttachmentItem[] = files.map(file => ({
            id: crypto.randomUUID(),
            fileObj: file,
            fileName: file.name,
            fileSize: file.size,
            tipoDocumento: "",
            observacao: ""
        }))
        setPendingAttachments([...pendingAttachments, ...newAttachments])
        toast.success(`${files.length} arquivo(s) adicionado(s) à lista.`)
    }

    const updatePendingAttachment = (id: string, field: keyof AttachmentItem, value: string) => {
        if (!isUnlocked) return
        setPendingAttachments(pendingAttachments.map(a => a.id === id ? ({ ...a, [field]: value } as AttachmentItem) : a))
    }

    const confirmRemoveAttachment = async () => {
        if (!attachmentToDelete || !isUnlocked) return

        if (attachmentToDelete.type === 'pending') {
            setPendingAttachments(pendingAttachments.filter(a => a.id !== attachmentToDelete.id))
            setAttachmentToDelete(null)
            return
        }

        if (attachmentToDelete.type === 'existing' && attachmentToDelete.url) {
            setIsDeleting(true)
            const res = await deleteProposalAttachment(attachmentToDelete.id, attachmentToDelete.url)
            setIsDeleting(false)

            if (res.success) {
                toast.success(res.message)
                setAttachments(attachments.filter(a => a.id !== attachmentToDelete.id))
            } else {
                toast.error(res.message)
            }
            setAttachmentToDelete(null)
        }
    }

    const handleSave = async () => {
        const unclassified = pendingAttachments.filter(a => !a.tipoDocumento)
        if (unclassified.length > 0) {
            toast.error("Por favor, classifique o Tipo de Documento para todos os novos anexos.")
            return
        }

        setIsSaving(true)
        const toastId = toast.loading("Iniciando upload direto para a nuvem...")

        try {
            const fileNames = pendingAttachments.map(a => a.fileName)
            const sasRes = await getDirectUploadUrls(proposal.id, fileNames)

            if (!sasRes.success || !sasRes.data) {
                throw new Error("Não foi possível conectar ao servidor de arquivos.")
            }

            toast.loading("Enviando arquivos... Por favor aguarde.", { id: toastId })

            const uploadPromises = pendingAttachments.map(async (att) => {
                const sasData = sasRes.data.find(d => d.fileName === att.fileName)
                if (!sasData) throw new Error(`Link não encontrado para ${att.fileName}`)

                const res = await fetch(sasData.uploadUrl, {
                    method: 'PUT',
                    body: att.fileObj,
                    headers: {
                        'x-ms-blob-type': 'BlockBlob',
                        'Content-Type': att.fileObj.type || 'application/octet-stream'
                    }
                })

                if (!res.ok) throw new Error(`Falha no upload do arquivo ${att.fileName}`)

                return {
                    fileName: att.fileName,
                    classificacao: att.tipoDocumento,
                    observacao: att.observacao,
                    relativePath: sasData.relativePath
                }
            })

            const metadataToSave = await Promise.all(uploadPromises)

            toast.loading("Registrando arquivos na proposta...", { id: toastId })
            
            const dbRes = await saveAttachmentsMetadata(proposal.id, metadataToSave)

            if (dbRes.success && dbRes.data) {
                toast.success(dbRes.message, { id: toastId })
                setAttachments([...attachments, ...dbRes.data])
                setPendingAttachments([]) 
            } else {
                toast.error(dbRes.message, { id: toastId })
            }

        } catch (error) {
            console.error(error)
            const errorMessage = error instanceof Error ? error.message : "Erro durante o envio dos arquivos."
            toast.error(errorMessage, { id: toastId })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDownloadAll = async () => {
        if (attachments.length === 0) return;
        
        const toastId = toast.loading("Baixando e compactando arquivos... Por favor, aguarde.");
        
        try {
            const zip = new JSZip();
            
            for (const att of attachments) {
                const res = await getAttachmentDownloadUrl(att.urlArquivo, att.nomeArquivo);
                if (res.success && res.url) {
                    const blob = await fetch(res.url).then(r => r.blob());
                    zip.file(att.nomeArquivo, blob);
                }
            }
            
            const zipContent = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(zipContent);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `Anexos_Proposta_${proposal.id}.zip`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success("Arquivo ZIP gerado com sucesso!", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Ocorreu um erro ao gerar o arquivo ZIP.", { id: toastId });
        }
    }

    const handleDownloadSingle = async (url: string | undefined, fileName: string) => {
        if (!url) return;
        
        const toastId = toast.loading(`Iniciando download de ${fileName}...`)
        
        const res = await getAttachmentDownloadUrl(url, fileName)
        
        if (res.success && res.url) {
            toast.success("Download iniciado!", { id: toastId })
            
            const link = document.createElement('a')
            link.href = res.url
            document.body.appendChild(link)
            link.click()
            link.remove()
        } else {
            toast.error("Erro ao conectar com o servidor.", { id: toastId })
        }
    }

    const existingNames = [
        ...attachments.map(a => a.nomeArquivo),
        ...pendingAttachments.map(a => a.fileName)
    ]

    const hasNoFiles = attachments.length === 0 && pendingAttachments.length === 0

    return (
        <div className="space-y-4">
            
            <FileUploadModal 
                isOpen={isUploadModalOpen} 
                onClose={() => setIsUploadModalOpen(false)} 
                onConfirm={handleAddFiles}
                existingFileNames={existingNames}
            />

            <AlertDialog open={!!attachmentToDelete} onOpenChange={(open) => !open && setAttachmentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover anexo</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover este documento da proposta?
                            {attachmentToDelete?.type === 'existing' && " Esta ação excluirá o arquivo permanentemente da nuvem."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemoveAttachment} variant="destructive" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Sim, remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ALERTAS DE BLOQUEIO */}
            {isFormalizing ? (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-3">
                        <div className="p-2 bg-destructive/20 rounded-full h-fit text-destructive">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-destructive text-sm">Edição Bloqueada</h4>
                            <p className="text-sm text-destructive/80 mt-0.5">
                                A proposta está em fase de formalização/assinatura. Nenhuma edição pode ser feita.
                            </p>
                        </div>
                    </div>
                </div>
            ) : proposal.status === 'APROVADO' && !isUnlocked && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-3">
                        <div className="p-2 bg-warning/20 rounded-full h-fit text-warning">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-warning text-sm">Proposta Aprovada</h4>
                            <p className="text-sm text-warning/80 mt-0.5">
                                Os dados estão bloqueados. Edições alterarão o status de volta para &quot;Em Análise&quot;.
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" className="bg-background border-warning/50 text-warning hover:bg-warning/20" onClick={handleUnlock} disabled={isUnlocking}>
                        {isUnlocking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />} 
                        {isUnlocking ? "Desbloqueando..." : "Habilitar Edição"}
                    </Button>
                </div>
            )}

            {/* HEADER DE AÇÕES */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Paperclip className="w-5 h-5 text-primary" /> Anexos e Documentos
                    </h2>
                    <p className="text-sm text-muted-foreground">Adicione e classifique os documentos comprobatórios das partes.</p>
                </div>
                
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-background" disabled={attachments.length === 0} onClick={handleDownloadAll}>
                        <Download className="w-4 h-4 mr-2" /> Baixar Todos
                    </Button>
                    <Button disabled={!isUnlocked} onClick={() => setIsUploadModalOpen(true)}>
                        <UploadCloud className="w-4 h-4 mr-2" /> Adicionar Arquivos
                    </Button>
                </div>
            </div>

            {/* EMPTY STATE */}
            {hasNoFiles ? (
                <Card className="border-dashed border-2 shadow-none bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                            <Paperclip className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Nenhum arquivo anexado</h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
                            Você precisa anexar os documentos dos compradores e intermediadores para seguir com a análise de crédito.
                        </p>
                        <Button onClick={() => setIsUploadModalOpen(true)} disabled={!isUnlocked}>
                            <UploadCloud className="w-4 h-4 mr-2" /> Adicionar Arquivos
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3 mt-4">
                    
                    {/* ARQUIVOS JÁ SALVOS NO BANCO/AZURE */}
                    {attachments.map((attachment: ProposalAttachmentItem) => (
                        <Card key={attachment.id} className={cn("shadow-sm border-border overflow-visible bg-slate-50/50", !isUnlocked && "opacity-80 grayscale-[0.2]")}>
                            <CardContent className="p-4 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                
                                <div className="flex items-center gap-4 flex-1 min-w-[250px] overflow-hidden">
                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 border border-border">
                                        {getFileIcon(attachment.nomeArquivo)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-foreground truncate" title={attachment.nomeArquivo}>
                                                {attachment.nomeArquivo}
                                            </p>
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger><CheckCircle2 className="w-4 h-4 text-success" /></TooltipTrigger>
                                                    <TooltipContent>Arquivo salvo na nuvem</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <p className="text-xs font-medium text-muted-foreground mt-0.5">
                                            Enviado e salvo
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap md:flex-nowrap items-center gap-4 flex-1 w-full opacity-80 pointer-events-none">
                                    <div className="grid gap-1.5 w-full md:w-[220px]">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Classificação</Label>
                                        <Input className="bg-transparent border-transparent px-0 font-medium" value={attachment.classificacao} readOnly />
                                    </div>

                                    <div className="grid gap-1.5 flex-1 w-full min-w-[200px]">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Observação</Label>
                                        <Input className="bg-transparent border-transparent px-0 text-muted-foreground" value={attachment.descricao || '-'} readOnly />
                                    </div>
                                </div>

                                <div className="ml-auto pl-2 shrink-0 flex gap-2">
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleDownloadSingle(attachment.urlArquivo, attachment.nomeArquivo)}>
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Baixar Arquivo</TooltipContent>
                                        </Tooltip>

                                        {isUnlocked && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setAttachmentToDelete({ id: attachment.id, type: 'existing', url: attachment.urlArquivo })}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Excluir da Nuvem</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TooltipProvider>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* ARQUIVOS PENDENTES DE UPLOAD */}
                    {pendingAttachments.map((attachment: AttachmentItem) => (
                        <Card key={attachment.id} className={cn("shadow-sm border-primary/30 bg-primary/5 overflow-visible", !isUnlocked && "opacity-80 grayscale-[0.2]")}>
                            <CardContent className="p-4 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                
                                <div className="flex items-center gap-4 flex-1 min-w-[250px] overflow-hidden">
                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 border border-primary/20">
                                        {getFileIcon(attachment.fileName)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-foreground truncate" title={attachment.fileName}>
                                            {attachment.fileName}
                                        </p>
                                        <p className="text-xs font-medium text-muted-foreground mt-0.5">
                                            {formatBytes(attachment.fileSize)} • <span className="text-warning">Pendente</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap md:flex-nowrap items-center gap-4 flex-1 w-full">
                                    <div className="grid gap-1.5 w-full md:w-[220px]">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Classificação <span className="text-destructive">*</span></Label>
                                        <Select 
                                            value={attachment.tipoDocumento} 
                                            onValueChange={(v) => updatePendingAttachment(attachment.id, 'tipoDocumento', v)}
                                            disabled={!isUnlocked || isSaving}
                                        >
                                            <SelectTrigger className={!attachment.tipoDocumento && isUnlocked ? "border-warning bg-warning/10" : "bg-white"}>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TIPOS_DOCUMENTO.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-1.5 flex-1 w-full min-w-[200px]">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Observação</Label>
                                        <Input 
                                            className="bg-white placeholder:text-muted-foreground/50"
                                            placeholder="Ex: CNH do Cônjuge..."
                                            value={attachment.observacao}
                                            onChange={e => updatePendingAttachment(attachment.id, 'observacao', e.target.value)}
                                            disabled={!isUnlocked || isSaving}
                                        />
                                    </div>
                                </div>

                                <div className="ml-auto pl-2 shrink-0 flex gap-2">
                                    <TooltipProvider delayDuration={300}>
                                        {isUnlocked && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setAttachmentToDelete({ id: attachment.id, type: 'pending' })} disabled={isSaving}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Remover da Fila</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TooltipProvider>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    
                    {/* RODAPÉ */}
                    {isUnlocked && pendingAttachments.length > 0 && (
                        <div className="flex justify-between items-center pt-4">
                            <div className="text-sm text-muted-foreground font-medium">
                                <span className="text-primary font-bold">{pendingAttachments.length}</span> arquivo(s) pendente(s) de envio.
                            </div>
                            <Button size="lg" className="min-w-[200px]" onClick={handleSave} disabled={isSaving || isPendingTrans}>
                                {isSaving || isPendingTrans ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                {isSaving || isPendingTrans ? "Enviando..." : "Salvar e Enviar Arquivos"}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}