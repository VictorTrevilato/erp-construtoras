"use client"

import { useState } from "react"
import { ProposalFullDetail } from "@/app/actions/commercial-proposals"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Paperclip, Trash2, Save, UploadCloud, Loader2, Download, Lock, Unlock, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { FileUploadModal, getFileIcon, formatBytes } from "@/components/shared/file-upload-modal"

export type AttachmentItem = {
    id: string
    fileObj: File
    fileName: string
    fileSize: number
    tipoDocumento: string
    observacao: string
}

const TIPOS_DOCUMENTO = [
    "CNH",
    "RG",
    "CPF",
    "Comprovante de Residência",
    "Certidão de Nascimento",
    "Certidão de Casamento",
    "Cartão CNPJ",
    "Contrato Social",
    "Procuração",
    "Comprovante de Renda",
    "Ficha de Cadastro",
    "Outro"
]

interface Props {
  proposal: ProposalFullDetail
}

export function ProposalAttachmentsTab({ proposal }: Props) {
    const [attachments, setAttachments] = useState<AttachmentItem[]>([])
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null)
    
    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
    const [isUnlocked, setIsUnlocked] = useState(proposal.status !== 'APROVADO' && !isFormalizing)

    const handleAddFiles = (files: File[]) => {
        const newAttachments: AttachmentItem[] = files.map(file => ({
            id: crypto.randomUUID(),
            fileObj: file,
            fileName: file.name,
            fileSize: file.size,
            tipoDocumento: "",
            observacao: ""
        }))
        setAttachments([...attachments, ...newAttachments])
        toast.success(`${files.length} arquivo(s) adicionado(s) à lista.`)
    }

    const updateAttachment = (id: string, field: keyof AttachmentItem, value: string) => {
        if (!isUnlocked) return
        setAttachments(attachments.map(a => a.id === id ? ({ ...a, [field]: value } as AttachmentItem) : a))
    }

    const confirmRemoveAttachment = () => {
        if (!attachmentToDelete || !isUnlocked) return
        setAttachments(attachments.filter(a => a.id !== attachmentToDelete))
        setAttachmentToDelete(null)
    }

    const handleSave = async () => {
        const unclassified = attachments.filter(a => !a.tipoDocumento)
        if (unclassified.length > 0) {
            toast.error("Por favor, classifique o Tipo de Documento para todos os anexos.")
            return
        }

        setIsPending(true)
        await new Promise(resolve => setTimeout(resolve, 1500)) 
        toast.success("Documentos anexados com sucesso! (Simulação)")
        setIsPending(false)
    }

    const handleDownloadAll = () => {
        toast.info("Iniciando download do pacote .zip com todos os arquivos... (Simulação)")
    }

    const handleDownloadSingle = (fileName: string) => {
        toast.info(`Baixando o arquivo: ${fileName} (Simulação)`)
    }

    const existingNames = attachments.map(a => a.fileName)

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
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemoveAttachment} variant="destructive">Sim, remover</AlertDialogAction>
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
                    <Button variant="outline" className="bg-background border-warning/50 text-warning hover:bg-warning/20" onClick={() => setIsUnlocked(true)}>
                        <Unlock className="w-4 h-4 mr-2" /> Habilitar Edição
                    </Button>
                </div>
            )}

            {isUnlocked && proposal.status === 'APROVADO' && (
                <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-sm text-info flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Atenção: Ao salvar as alterações, o status retornará para &quot;Em Análise&quot; automaticamente.
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
            {attachments.length === 0 ? (
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
                    {attachments.map((attachment) => (
                        <Card key={attachment.id} className={cn("shadow-sm border-border overflow-visible", !isUnlocked && "opacity-80 grayscale-[0.2]")}>
                            <CardContent className="p-4 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                
                                {/* Info do Arquivo */}
                                <div className="flex items-center gap-4 flex-1 min-w-[250px] overflow-hidden">
                                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0 border border-border">
                                        {getFileIcon(attachment.fileName)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-foreground truncate" title={attachment.fileName}>
                                            {attachment.fileName}
                                        </p>
                                        <p className="text-xs font-medium text-muted-foreground mt-0.5">
                                            {formatBytes(attachment.fileSize)}
                                        </p>
                                    </div>
                                </div>

                                {/* Classificação e Observação */}
                                <div className="flex flex-wrap md:flex-nowrap items-center gap-4 flex-1 w-full">
                                    <div className="grid gap-1.5 w-full md:w-[220px]">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Classificação <span className="text-destructive">*</span></Label>
                                        <Select 
                                            value={attachment.tipoDocumento} 
                                            onValueChange={(v) => updateAttachment(attachment.id, 'tipoDocumento', v)}
                                            disabled={!isUnlocked}
                                        >
                                            <SelectTrigger className={!attachment.tipoDocumento && isUnlocked ? "border-warning bg-warning/10" : "bg-background"}>
                                                <SelectValue placeholder="Selecione o Tipo..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TIPOS_DOCUMENTO.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-1.5 flex-1 w-full min-w-[200px]">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Observação / Descrição</Label>
                                        <Input 
                                            className="bg-background placeholder:text-muted-foreground/50"
                                            placeholder="Ex: CNH do Cônjuge, Atualizado 2024..."
                                            value={attachment.observacao}
                                            onChange={e => updateAttachment(attachment.id, 'observacao', e.target.value)}
                                            disabled={!isUnlocked}
                                        />
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="ml-auto pl-2 shrink-0 flex gap-2">
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleDownloadSingle(attachment.fileName)}>
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Baixar Arquivo</TooltipContent>
                                        </Tooltip>

                                        {isUnlocked && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setAttachmentToDelete(attachment.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Remover Anexo</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TooltipProvider>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    
                    {/* RODAPÉ */}
                    {isUnlocked && (
                        <div className="flex justify-between items-center pt-4">
                            <div className="text-sm text-muted-foreground font-medium">
                                <span className="text-foreground">{attachments.length}</span> documento(s) listado(s).
                            </div>
                            <Button size="lg" className="min-w-[200px]" onClick={handleSave} disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                {isPending ? "Processando..." : "Salvar e Enviar Arquivos"}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}