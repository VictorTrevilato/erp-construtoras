"use client"

import { useState, useRef, DragEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileText, FileSpreadsheet, File as FileIcon, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FileUploadModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (files: File[]) => void
    existingFileNames: string[] 
}

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv']
const MAX_FILE_SIZE_MB = 10

export const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-500" />
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
    return <FileIcon className="w-5 h-5 text-blue-600" />
}

export function FileUploadModal({ isOpen, onClose, onConfirm, existingFileNames }: FileUploadModalProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleAddFiles = (newFiles: FileList | File[]) => {
        const validFiles: File[] = []
        const currentNames = selectedFiles.map(f => f.name.toLowerCase())
        const existingNamesLower = existingFileNames.map(n => n.toLowerCase())

        Array.from(newFiles).forEach(file => {
            const fileName = file.name.toLowerCase()
            const ext = `.${fileName.split('.').pop()}`

            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                toast.error(`Arquivo ignorado: ${file.name} (Formato inválido)`)
                return
            }
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                toast.error(`Arquivo ignorado: ${file.name} (Maior que ${MAX_FILE_SIZE_MB}MB)`)
                return
            }
            if (currentNames.includes(fileName)) {
                toast.warning(`Arquivo já selecionado: ${file.name}`)
                return
            }
            if (existingNamesLower.includes(fileName)) {
                toast.warning(`Este arquivo já está anexado na proposta: ${file.name}`)
                return
            }

            validFiles.push(file)
        })

        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles])
        }
    }

    const onDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleAddFiles(e.dataTransfer.files)
        }
    }

    const removeFile = (nameToRemove: string) => {
        setSelectedFiles(selectedFiles.filter(f => f.name !== nameToRemove))
    }

    const handleConfirm = () => {
        onConfirm(selectedFiles)
        setSelectedFiles([])
        onClose()
    }

    const handleClose = () => {
        setSelectedFiles([])
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            {/* Modal principal com altura travada e overflow escondido para não gerar scroll externo */}
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
                
                <DialogHeader className="p-6 pb-4 border-b shrink-0">
                    <DialogTitle>Selecionar Documentos</DialogTitle>
                    <DialogDescription>
                        Arraste os arquivos ou clique para buscar no seu computador.
                    </DialogDescription>
                </DialogHeader>

                {/* Corpo do modal: Flex-1 para ocupar o meio, min-h-0 para o scroll interno funcionar corretamente */}
                <div className="flex-1 flex flex-col min-h-0 p-6 space-y-4">
                    
                    {/* DROPZONE - Bem achatada, margens e ícones reduzidos, shrink-0 para não amassar */}
                    <div 
                        className={cn(
                            "shrink-0 border-2 border-dashed rounded-xl py-4 px-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
                            isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:bg-slate-50 bg-slate-50/50"
                        )}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            multiple 
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                            onChange={(e) => e.target.files && handleAddFiles(e.target.files)}
                        />
                        <div className="w-12 h-12 bg-white border shadow-sm rounded-full flex items-center justify-center mb-2 text-blue-600">
                            <UploadCloud className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-slate-700 text-base">Clique ou arraste os arquivos aqui</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                            Formatos suportados: PDF, DOC, DOCX, XLS, XLSX e CSV. Tamanho máximo: {MAX_FILE_SIZE_MB}MB.
                        </p>
                    </div>

                    {/* LISTA PREVIEW - Flex-1 e min-h-0 garantem que apenas ela crie barra de rolagem */}
                    {selectedFiles.length > 0 && (
                        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-white min-h-0">
                            <div className="bg-slate-50 px-4 py-2 border-b text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between shrink-0">
                                <span>{selectedFiles.length} Arquivo(s) Selecionado(s)</span>
                            </div>
                            
                            {/* É AQUI que a rolagem mágica acontece! */}
                            <ul className="flex-1 overflow-y-auto divide-y">
                                {selectedFiles.map((file, idx) => (
                                    <li key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="shrink-0">{getFileIcon(file.name)}</div>
                                            <div className="truncate">
                                                <p className="text-sm font-bold text-slate-700 truncate" title={file.name}>{file.name}</p>
                                                <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 shrink-0" onClick={() => removeFile(file.name)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 bg-slate-50 border-t shrink-0">
                    <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={selectedFiles.length === 0} className="bg-blue-600 hover:bg-blue-700">
                        Confirmar Envio
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    )
}