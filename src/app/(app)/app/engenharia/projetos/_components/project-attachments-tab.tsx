"use client"

import { useState } from "react"
import { 
    getProjectUploadUrls, saveProjectAttachmentsMetadata, deleteProjectAttachment, 
    getProjectAttachmentDownloadUrl, toggleProjectAttachmentVisibility, ProjectAttachmentItem 
} from "@/app/actions/projects"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Paperclip, Trash2, Save, UploadCloud, Loader2, Download, CheckCircle2, Pencil, X, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { FileUploadModal, getFileIcon, formatBytes } from "@/components/shared/file-upload-modal"

type AttachmentItem = {
    id: string
    fileObj: File
    fileName: string
    fileSize: number
    tipoDocumento: string
    isPublico: boolean
}

// TIPAGEM FORTE PARA AS PROPS DO COMPONENTE
interface Props {
    projectId?: string | null
    attachments: ProjectAttachmentItem[]
    setAttachments: React.Dispatch<React.SetStateAction<ProjectAttachmentItem[]>>
    readOnly?: boolean
}

const TIPOS_DOCUMENTO = [
    { nome: "Template de Contrato (CCV)", allowed: [".doc", ".docx"] },
    { nome: "Template de Termo de Intenção", allowed: [".doc", ".docx"] },
    { nome: "Memorial Descritivo", allowed: [".pdf"] },
    { nome: "Alvará", allowed: [".pdf"] },
    { nome: "Matrícula", allowed: [".pdf"] },
    { nome: "Material Comercial", allowed: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpeg", ".jpg"] },
    { nome: "Planta Humanizada", allowed: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpeg", ".jpg"] },
    { nome: "Tabela de Vendas", allowed: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpeg", ".jpg"] },
    { nome: "Imagens/Renders", allowed: [".png", ".jpeg", ".jpg"] },
    { nome: "Outro", allowed: [] }
]

export function ProjectAttachmentsTab({ projectId, attachments, setAttachments, readOnly }: Props) {
    const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([])
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: string, type: 'pending' | 'existing', url?: string } | null>(null)
    
    // --- ESTADOS PARA EDIÇÃO INLINE DA VISIBILIDADE ---
    const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null)
    const [editIsPublico, setEditIsPublico] = useState(false)
    const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)

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

    // Removido o 'any' e definido os tipos válidos para o value (string | boolean)
    const updatePendingAttachment = (id: string, field: keyof AttachmentItem, value: string | boolean) => {
        if (readOnly) return

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
        
        // Asserção de tipo segura
        setPendingAttachments(pendingAttachments.map(a => a.id === id ? ({ ...a, [field]: value } as AttachmentItem) : a))
    }

    const confirmRemoveAttachment = async () => {
        if (!attachmentToDelete || readOnly) return

        if (attachmentToDelete.type === 'pending') {
            setPendingAttachments(pendingAttachments.filter(a => a.id !== attachmentToDelete.id))
            setAttachmentToDelete(null)
            return
        }

        if (attachmentToDelete.type === 'existing' && attachmentToDelete.url) {
            setIsDeleting(true)
            const res = await deleteProjectAttachment(attachmentToDelete.id, attachmentToDelete.url)
            setIsDeleting(false)

            if (res.success) {
                toast.success(res.message)
                // TypeScript já infere o tipo automaticamente por causa da Props
                setAttachments(attachments.filter(a => a.id !== attachmentToDelete.id))
            } else {
                toast.error(res.message)
            }
            setAttachmentToDelete(null)
        }
    }

    // --- FUNÇÃO DE SALVAR A EDIÇÃO INLINE ---
    const handleSaveVisibility = async (id: string) => {
        setIsUpdatingVisibility(true)
        const res = await toggleProjectAttachmentVisibility(id, editIsPublico)
        
        if (res.success) {
            toast.success(res.message)
            // Atualiza a lista em memória silenciosamente
            setAttachments(attachments.map(a => a.id === id ? { ...a, isPublico: editIsPublico } : a))
            setEditingAttachmentId(null)
        } else {
            toast.error(res.message)
        }
        setIsUpdatingVisibility(false)
    }

    const handleSave = async () => {
        if (!projectId) return toast.error("Projeto inválido.")

        const unclassified = pendingAttachments.filter(a => !a.tipoDocumento)
        if (unclassified.length > 0) {
            return toast.error("Classifique o Tipo de Documento para todos os novos anexos antes de salvar.")
        }

        setIsSaving(true)
        const toastId = toast.loading("Iniciando upload para a nuvem...")

        try {
            const fileNames = pendingAttachments.map(a => a.fileName)
            const sasRes = await getProjectUploadUrls(projectId, fileNames)

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
            toast.loading("Registrando arquivos no projeto...", { id: toastId })
            
            const dbRes = await saveProjectAttachmentsMetadata(projectId, metadataToSave)

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
        const res = await getProjectAttachmentDownloadUrl(url, fileName)
        
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

    // Removido o 'any', inferência de tipo direta
    const existingNames = [...attachments.map(a => a.nomeArquivo), ...pendingAttachments.map(a => a.fileName)]

    return (
        <div className="space-y-4 pb-10">
            
            <FileUploadModal 
                isOpen={isUploadModalOpen} 
                onClose={() => setIsUploadModalOpen(false)} 
                onConfirm={handleAddFiles}
                existingFileNames={existingNames}
            />

            <AlertDialog open={!!attachmentToDelete} onOpenChange={(open) => !open && setAttachmentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover arquivo do projeto</AlertDialogTitle>
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

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Paperclip className="w-5 h-5 text-primary" /> Galeria de Arquivos
                    </h2>
                    <p className="text-sm text-muted-foreground">Gerencie templates, plantas e documentos do empreendimento.</p>
                </div>
                
                {!readOnly && (
                    <Button onClick={() => setIsUploadModalOpen(true)}>
                        <UploadCloud className="w-4 h-4 mr-2" /> Adicionar Arquivos
                    </Button>
                )}
            </div>

            {attachments.length === 0 && pendingAttachments.length === 0 ? (
                <Card className="border-dashed border-2 shadow-none bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                            <Paperclip className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Nenhum arquivo no projeto</h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
                            Você pode subir templates de contrato para automação ou materiais comerciais para os corretores.
                        </p>
                        {!readOnly && (
                            <Button onClick={() => setIsUploadModalOpen(true)}>
                                <UploadCloud className="w-4 h-4 mr-2" /> Fazer Upload
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3 mt-4">
                    
                    {/* ARQUIVOS JÁ SALVOS NO BANCO */}
                    {attachments.map((attachment) => (
                        <Card key={attachment.id} className={cn("shadow-sm border-border overflow-visible bg-slate-50/50 transition-colors", attachment.isPublico ? "border-l-4 border-l-info" : "")}>
                            <CardContent className="p-4 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                
                                <div className="flex items-center gap-4 flex-1 min-w-[250px] overflow-hidden">
                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 border border-border">
                                        {getFileIcon(attachment.nomeArquivo)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <p className="font-bold text-foreground truncate cursor-help">
                                                            {attachment.nomeArquivo}
                                                        </p>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="bg-white text-slate-700 border border-slate-200 shadow-md font-medium px-3 py-1.5">
                                                        {attachment.nomeArquivo}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger><CheckCircle2 className="w-4 h-4 text-success" /></TooltipTrigger>
                                                    <TooltipContent>Arquivo salvo na nuvem</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <div className="text-xs font-medium mt-0.5 flex items-center gap-2">
                                            <span className="text-muted-foreground">Enviado e salvo</span>
                                            <span className="text-border">|</span>
                                            
                                            {/* RENDERIZAÇÃO CONDICIONAL DA VISIBILIDADE */}
                                            {editingAttachmentId === attachment.id ? (
                                                <div className="flex items-center gap-2 bg-background border px-2 py-0.5 rounded-md shadow-sm">
                                                    <Switch 
                                                        checked={editIsPublico}
                                                        onCheckedChange={setEditIsPublico}
                                                        disabled={isUpdatingVisibility}
                                                        className="scale-75 origin-left"
                                                    />
                                                    <span className={cn("text-[10px] font-bold uppercase", editIsPublico ? "text-info" : "text-muted-foreground")}>
                                                        {editIsPublico ? 'Público' : 'Interno'}
                                                    </span>
                                                </div>
                                            ) : (
                                                attachment.isPublico ? (
                                                    <Badge variant="outline" className="bg-info/10 text-info border-info/20 px-1.5 h-4 text-[9px] rounded-sm">
                                                        Público
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border px-1.5 h-4 text-[9px] rounded-sm">
                                                        Interno
                                                    </Badge>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center w-full md:w-auto shrink-0 opacity-80 pointer-events-none">
                                    <div className="grid gap-1.5 w-full md:w-[260px]">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Classificação</Label>
                                        <Input className="bg-transparent border-transparent px-0 font-medium truncate" value={attachment.classificacao} readOnly title={attachment.classificacao} />
                                    </div>
                                </div>

                                {/* AÇÕES DO ITEM EXISTENTE */}
                                <div className="ml-auto pl-2 shrink-0 flex gap-2">
                                    <TooltipProvider delayDuration={300}>
                                        {editingAttachmentId === attachment.id ? (
                                            <>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-success hover:text-success hover:bg-success/10" onClick={() => handleSaveVisibility(attachment.id)} disabled={isUpdatingVisibility}>
                                                            {isUpdatingVisibility ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Salvar Alteração</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted" onClick={() => setEditingAttachmentId(null)} disabled={isUpdatingVisibility}>
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Cancelar</TooltipContent>
                                                </Tooltip>
                                            </>
                                        ) : (
                                            <>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleDownloadSingle(attachment.urlArquivo, attachment.nomeArquivo)}>
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Baixar Arquivo</TooltipContent>
                                                </Tooltip>

                                                {!readOnly && (
                                                    <>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => { setEditingAttachmentId(attachment.id); setEditIsPublico(attachment.isPublico); }}>
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Editar Visibilidade</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setAttachmentToDelete({ id: attachment.id, type: 'existing', url: attachment.urlArquivo })}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Excluir da Nuvem</TooltipContent>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </TooltipProvider>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* ARQUIVOS PENDENTES (FILA DE UPLOAD) */}
                    {pendingAttachments.map((attachment: AttachmentItem) => (
                        <Card key={attachment.id} className="shadow-sm border-primary/30 bg-primary/5 overflow-visible">
                            <CardContent className="p-4 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                
                                <div className="flex items-center gap-4 flex-1 min-w-[250px] overflow-hidden">
                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 border border-primary/20">
                                        {getFileIcon(attachment.fileName)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <p className="font-bold text-foreground truncate cursor-help">
                                                        {attachment.fileName}
                                                    </p>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="bg-white text-slate-700 border border-slate-200 shadow-md font-medium px-3 py-1.5">
                                                    {attachment.fileName}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
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
                                            disabled={readOnly || isSaving}
                                        >
                                            <SelectTrigger className={!attachment.tipoDocumento && !readOnly ? "border-warning bg-warning/10" : "bg-white"}>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TIPOS_DOCUMENTO.map(opt => <SelectItem key={opt.nome} value={opt.nome}>{opt.nome}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center justify-center gap-2 flex-1 pt-4 md:pt-0">
                                        <Switch 
                                            id={`pub-${attachment.id}`} 
                                            checked={attachment.isPublico}
                                            onCheckedChange={c => updatePendingAttachment(attachment.id, 'isPublico', !!c)}
                                            disabled={readOnly || isSaving}
                                        />
                                        <Label htmlFor={`pub-${attachment.id}`} className="text-xs font-semibold cursor-pointer">
                                            Tornar Público <br/><span className="text-[9px] text-muted-foreground font-normal">(Visível a Corretores)</span>
                                        </Label>
                                    </div>
                                </div>

                                <div className="ml-auto pl-2 shrink-0 flex gap-2">
                                    <TooltipProvider delayDuration={300}>
                                        {!readOnly && (
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
                    {!readOnly && pendingAttachments.length > 0 && (
                        <div className="flex justify-between items-center pt-4">
                            <div className="text-sm text-muted-foreground font-medium">
                                <span className="text-primary font-bold">{pendingAttachments.length}</span> arquivo(s) pendente(s) de envio.
                            </div>
                            <Button size="lg" className="min-w-[200px]" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                {isSaving ? "Enviando..." : "Salvar e Enviar Arquivos"}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}