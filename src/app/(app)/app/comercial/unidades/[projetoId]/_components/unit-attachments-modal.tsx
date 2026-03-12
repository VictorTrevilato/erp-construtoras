"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Paperclip, Trash2, Save, UploadCloud, Loader2, Download, Pencil, X, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { FileUploadModal, getFileIcon, formatBytes } from "@/components/shared/file-upload-modal"
import { 
    getUnitAttachments, getUnitUploadUrls, saveUnitAttachmentsMetadata, 
    deleteUnitAttachment, getUnitAttachmentDownloadUrl, toggleUnitAttachmentVisibility, UnitAttachmentItem 
} from "@/app/actions/commercial-units"

type AttachmentItem = {
    id: string
    fileObj: File
    fileName: string
    fileSize: number
    tipoDocumento: string
    isPublico: boolean
}

const TIPOS_DOCUMENTO = [
    { nome: "Planta Baixa", allowed: [".pdf", ".png", ".jpeg", ".jpg"] },
    { nome: "Espelho de Vendas", allowed: [".pdf"] },
    { nome: "Contrato Assinado", allowed: [".pdf"] },
    { nome: "Termo de Vistoria", allowed: [".pdf", ".doc", ".docx"] },
    { nome: "Imagens/Renders", allowed: [".png", ".jpeg", ".jpg"] },
    { nome: "Outro", allowed: [] }
]

interface Props {
    isOpen: boolean
    onClose: () => void
    unitId: string | null
    unitName: string
}

export function UnitAttachmentsModal({ isOpen, onClose, unitId, unitName }: Props) {
    const [attachments, setAttachments] = useState<UnitAttachmentItem[]>([])
    const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([])
    
    const [isLoadingInitial, setIsLoadingInitial] = useState(false)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    
    // Estados de Exclusão e Alerta de Fechamento
    const [isDeleting, setIsDeleting] = useState(false)
    const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: string, type: 'pending' | 'existing', url?: string } | null>(null)
    const [isCloseWarningOpen, setIsCloseWarningOpen] = useState(false) // <-- NOVO: Alerta de Fechamento Customizado
    
    const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null)
    const [editIsPublico, setEditIsPublico] = useState(false)
    const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)

    useEffect(() => {
        if (isOpen && unitId) {
            setIsLoadingInitial(true)
            setPendingAttachments([])
            getUnitAttachments(unitId).then(data => {
                setAttachments(data)
                setIsLoadingInitial(false)
            })
        }
    }, [isOpen, unitId])

    const handleAddFiles = (files: File[]) => {
        const newAttachments: AttachmentItem[] = files.map(file => ({
            id: crypto.randomUUID(),
            fileObj: file,
            fileName: file.name,
            fileSize: file.size,
            tipoDocumento: "",
            isPublico: false 
        }))
        setPendingAttachments([...pendingAttachments, ...newAttachments])
        toast.success(`${files.length} arquivo(s) adicionado(s) à fila.`)
    }

    const updatePendingAttachment = (id: string, field: keyof AttachmentItem, value: string | boolean) => {
        if (field === 'tipoDocumento' && typeof value === 'string') {
            const attachment = pendingAttachments.find(a => a.id === id)
            if (attachment) {
                const docType = TIPOS_DOCUMENTO.find(t => t.nome === value)
                if (docType && docType.allowed.length > 0) {
                    const ext = "." + (attachment.fileName.split('.').pop()?.toLowerCase() || "")
                    if (!docType.allowed.includes(ext)) {
                        toast.error(`Formato inválido! "${value}" aceita apenas: ${docType.allowed.join(', ')}. O seu arquivo é ${ext}.`)
                        return 
                    }
                }
            }
        }
        setPendingAttachments(pendingAttachments.map(a => a.id === id ? ({ ...a, [field]: value } as AttachmentItem) : a))
    }

    const confirmRemoveAttachment = async () => {
        if (!attachmentToDelete) return

        if (attachmentToDelete.type === 'pending') {
            setPendingAttachments(pendingAttachments.filter(a => a.id !== attachmentToDelete.id))
            setAttachmentToDelete(null)
            return
        }

        if (attachmentToDelete.type === 'existing' && attachmentToDelete.url) {
            setIsDeleting(true)
            const res = await deleteUnitAttachment(attachmentToDelete.id, attachmentToDelete.url)
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

    const handleSaveVisibility = async (id: string) => {
        setIsUpdatingVisibility(true)
        const res = await toggleUnitAttachmentVisibility(id, editIsPublico)
        
        if (res.success) {
            toast.success(res.message)
            setAttachments(attachments.map(a => a.id === id ? { ...a, isPublico: editIsPublico } : a))
            setEditingAttachmentId(null)
        } else {
            toast.error(res.message)
        }
        setIsUpdatingVisibility(false)
    }

    const handleSave = async () => {
        if (!unitId) return toast.error("Unidade inválida.")

        const unclassified = pendingAttachments.filter(a => !a.tipoDocumento)
        if (unclassified.length > 0) {
            return toast.error("Classifique o Tipo de Documento para todos os novos anexos antes de salvar.")
        }

        setIsSaving(true)
        const toastId = toast.loading("Iniciando upload para a nuvem...")

        try {
            const fileNames = pendingAttachments.map(a => a.fileName)
            const sasRes = await getUnitUploadUrls(unitId, fileNames)

            if (!sasRes.success || !sasRes.data) throw new Error("Não foi possível conectar ao servidor de arquivos.")

            toast.loading("Enviando arquivos... Por favor aguarde.", { id: toastId })

            const uploadPromises = pendingAttachments.map(async (att) => {
                const sasData = sasRes.data.find(d => d.fileName === att.fileName)
                if (!sasData) throw new Error(`Link não encontrado para ${att.fileName}`)

                const res = await fetch(sasData.uploadUrl, {
                    method: 'PUT',
                    body: att.fileObj,
                    headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': att.fileObj.type || 'application/octet-stream' }
                })

                if (!res.ok) throw new Error(`Falha no upload do arquivo ${att.fileName}`)

                return {
                    fileName: att.fileName,
                    classificacao: att.tipoDocumento,
                    isPublico: att.isPublico,
                    relativePath: sasData.relativePath
                }
            })

            const metadataToSave = await Promise.all(uploadPromises)
            toast.loading("Registrando arquivos na unidade...", { id: toastId })
            
            const dbRes = await saveUnitAttachmentsMetadata(unitId, metadataToSave)

            if (dbRes.success && dbRes.data) {
                toast.success(dbRes.message, { id: toastId })
                setAttachments([...attachments, ...dbRes.data])
                setPendingAttachments([]) 
            } else {
                toast.error(dbRes.message, { id: toastId })
            }

        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : "Erro durante o envio.", { id: toastId })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDownloadSingle = async (url: string | undefined, fileName: string) => {
        if (!url) return;
        const toastId = toast.loading(`Iniciando download de ${fileName}...`)
        const res = await getUnitAttachmentDownloadUrl(url, fileName)
        
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

    // --- LÓGICA DO NOVO ALERTA DE FECHAMENTO ---
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            if (pendingAttachments.length > 0) {
                setIsCloseWarningOpen(true); // Se tem pendente, barra e abre o alerta
            } else {
                onClose(); // Se não tem pendente, fecha normal
            }
        }
    }

    const confirmForceClose = () => {
        setIsCloseWarningOpen(false);
        setPendingAttachments([]); // Limpa a fila ao forçar o fechamento
        onClose();
    }

    const existingNames = [...attachments.map(a => a.nomeArquivo), ...pendingAttachments.map(a => a.fileName)]

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="flex items-center gap-2">
                            <Paperclip className="w-5 h-5 text-primary" />
                            Anexos da Unidade {unitName}
                        </DialogTitle>
                        <DialogDescription>
                            Gerencie plantas baixas, espelhos de vendas e documentos específicos desta unidade.
                        </DialogDescription>
                    </DialogHeader>

                    <FileUploadModal 
                        isOpen={isUploadModalOpen} 
                        onClose={() => setIsUploadModalOpen(false)} 
                        onConfirm={handleAddFiles}
                        existingFileNames={existingNames}
                    />

                    {/* ALERTA DE EXCLUSÃO DE ARQUIVO */}
                    <AlertDialog open={!!attachmentToDelete} onOpenChange={(open) => !open && setAttachmentToDelete(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Remover arquivo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tem certeza que deseja remover este documento?
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

                    {isLoadingInitial ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p>Carregando arquivos...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <Button onClick={() => setIsUploadModalOpen(true)}>
                                    <UploadCloud className="w-4 h-4 mr-2" /> Adicionar Arquivos
                                </Button>
                            </div>

                            {attachments.length === 0 && pendingAttachments.length === 0 ? (
                                <Card className="border-dashed border-2 shadow-none bg-muted/30">
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                                            <Paperclip className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground mb-1">Nenhum anexo encontrado</h3>
                                        <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
                                            Anexe documentos restritos à unidade {unitName}.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    
                                    {/* ARQUIVOS SALVOS */}
                                    {attachments.map((attachment) => (
                                        <Card key={attachment.id} className={cn("shadow-sm border-border overflow-visible bg-slate-50/50 transition-colors", attachment.isPublico ? "border-l-4 border-l-info" : "")}>
                                            <CardContent className="p-3 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                                
                                                <div className="flex items-center gap-3 flex-1 min-w-[200px] overflow-hidden">
                                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-border">
                                                        {getFileIcon(attachment.nomeArquivo)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <TooltipProvider delayDuration={300}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <p className="font-bold text-sm text-foreground truncate cursor-help">
                                                                            {attachment.nomeArquivo}
                                                                        </p>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top" className="bg-white text-slate-700 border border-slate-200 shadow-md font-medium px-3 py-1.5">
                                                                        {attachment.nomeArquivo}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                        <div className="text-[11px] font-medium mt-0.5 flex items-center gap-2">
                                                            <span className="text-muted-foreground">Salvo</span>
                                                            <span className="text-border">|</span>
                                                            
                                                            {editingAttachmentId === attachment.id ? (
                                                                <div className="flex items-center gap-2 bg-background border px-2 rounded-md">
                                                                    <Switch checked={editIsPublico} onCheckedChange={setEditIsPublico} disabled={isUpdatingVisibility} className="scale-50 origin-left" />
                                                                    <span className={cn("text-[9px] font-bold uppercase", editIsPublico ? "text-info" : "text-muted-foreground")}>
                                                                        {editIsPublico ? 'Público' : 'Interno'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                attachment.isPublico ? (
                                                                    <Badge variant="outline" className="bg-info/10 text-info border-info/20 px-1.5 h-4 text-[9px] rounded-sm">Público</Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border px-1.5 h-4 text-[9px] rounded-sm">Interno</Badge>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center w-full md:w-auto shrink-0 opacity-80 pointer-events-none">
                                                    <div className="grid gap-1 w-full md:w-[200px]">
                                                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Classificação</Label>
                                                        <Input className="bg-transparent border-transparent px-0 font-medium text-sm h-7 truncate" value={attachment.classificacao} readOnly title={attachment.classificacao} />
                                                    </div>
                                                </div>

                                                <div className="ml-auto pl-2 shrink-0 flex justify-end gap-1 w-[100px]">
                                                    <TooltipProvider delayDuration={300}>
                                                        {editingAttachmentId === attachment.id ? (
                                                            <>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success hover:bg-success/10" onClick={() => handleSaveVisibility(attachment.id)} disabled={isUpdatingVisibility}>
                                                                    {isUpdatingVisibility ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={() => setEditingAttachmentId(null)} disabled={isUpdatingVisibility}>
                                                                    <X className="w-3 h-3" />
                                                            </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleDownloadSingle(attachment.urlArquivo, attachment.nomeArquivo)}>
                                                                    <Download className="w-3 h-3" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => { setEditingAttachmentId(attachment.id); setEditIsPublico(attachment.isPublico); }}>
                                                                    <Pencil className="w-3 h-3" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setAttachmentToDelete({ id: attachment.id, type: 'existing', url: attachment.urlArquivo })}>
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </TooltipProvider>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    {/* ARQUIVOS PENDENTES */}
                                    {pendingAttachments.map((attachment: AttachmentItem) => (
                                        <Card key={attachment.id} className="shadow-sm border-primary/30 bg-primary/5 overflow-visible">
                                            <CardContent className="p-3 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                                
                                                <div className="flex items-center gap-3 flex-1 min-w-[200px] overflow-hidden">
                                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-primary/20">
                                                        {getFileIcon(attachment.fileName)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <TooltipProvider delayDuration={300}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <p className="font-bold text-sm text-foreground truncate cursor-help">
                                                                        {attachment.fileName}
                                                                    </p>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="bg-white text-slate-700 border border-slate-200 shadow-md font-medium px-3 py-1.5">
                                                                    {attachment.fileName}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        
                                                        <div className="text-[11px] font-medium mt-0.5 flex items-center gap-2">
                                                            <span className="text-muted-foreground">{formatBytes(attachment.fileSize)}</span>
                                                            <span className="text-muted-foreground">•</span>
                                                            <span className="text-warning">Pendente</span>
                                                            <span className="text-border">|</span>
                                                            
                                                            <div className="flex items-center gap-2 bg-background border px-2 rounded-md">
                                                                <Switch 
                                                                    checked={attachment.isPublico}
                                                                    onCheckedChange={c => updatePendingAttachment(attachment.id, 'isPublico', !!c)}
                                                                    disabled={isSaving}
                                                                    className="scale-50 origin-left"
                                                                />
                                                                <span className={cn("text-[9px] font-bold uppercase", attachment.isPublico ? "text-info" : "text-muted-foreground")}>
                                                                    {attachment.isPublico ? 'Público' : 'Interno'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center w-full md:w-auto shrink-0">
                                                    <div className="grid gap-1 w-full md:w-[200px]">
                                                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Classificação <span className="text-destructive">*</span></Label>
                                                        <Select value={attachment.tipoDocumento} onValueChange={(v) => updatePendingAttachment(attachment.id, 'tipoDocumento', v)} disabled={isSaving}>
                                                            <SelectTrigger className={cn("h-8 text-sm", !attachment.tipoDocumento ? "border-warning bg-warning/10" : "bg-white")}>
                                                                <SelectValue placeholder="Selecione..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {TIPOS_DOCUMENTO.map(opt => <SelectItem key={opt.nome} value={opt.nome}>{opt.nome}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="ml-auto pl-2 shrink-0 flex justify-end gap-1 w-[100px]">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setAttachmentToDelete({ id: attachment.id, type: 'pending' })} disabled={isSaving}>
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Remover da Fila</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    
                                    {/* RODAPÉ DE ENVIO */}
                                    {pendingAttachments.length > 0 && (
                                        <div className="flex justify-between items-center pt-4 mt-4 border-t">
                                            <div className="text-sm text-muted-foreground font-medium">
                                                <span className="text-primary font-bold">{pendingAttachments.length}</span> arquivo(s) pendente(s).
                                            </div>
                                            <Button size="default" onClick={handleSave} disabled={isSaving}>
                                                {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                                {isSaving ? "Enviando..." : "Salvar Arquivos"}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* NOVO: ALERTA DE FECHAMENTO COM ARQUIVOS PENDENTES */}
            <AlertDialog open={isCloseWarningOpen} onOpenChange={setIsCloseWarningOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Descartar arquivos pendentes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você adicionou arquivos na fila, mas ainda não clicou em &quot;Salvar Arquivos&quot;. Se você fechar agora, este upload será cancelado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar e Salvar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmForceClose} variant="destructive">
                            Descartar e Fechar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}