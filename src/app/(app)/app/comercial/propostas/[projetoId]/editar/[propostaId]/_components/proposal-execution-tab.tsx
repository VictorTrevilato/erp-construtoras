"use client"

import { useState } from "react"
import { ProposalFullDetail, lockProposalForSignature } from "@/app/actions/commercial-proposals"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { FileSignature, FileText, Lock, CheckCircle2, Printer, UploadCloud, Loader2, Eye, Trash2, Download } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

import { FileUploadModal, getFileIcon, formatBytes } from "@/components/shared/file-upload-modal"

interface Props {
  proposal: ProposalFullDetail
}

export function ProposalExecutionTab({ proposal }: Props) {
    const router = useRouter()
    
    const [isGeneratingTermo, setIsGeneratingTermo] = useState(false)
    const [isGeneratingContrato, setIsGeneratingContrato] = useState(false)
    
    // Estados para Controle de Uploads
    const [uploadTarget, setUploadTarget] = useState<'termo' | 'contrato' | null>(null)
    const [termoFile, setTermoFile] = useState<File | null>(null)
    const [contratoFile, setContratoFile] = useState<File | null>(null)
    
    // Estado para Exclusão
    const [fileToDelete, setFileToDelete] = useState<'termo' | 'contrato' | null>(null)

    // Controle de Status e Máquina de Estados
    const isApproved = proposal.status === 'APROVADO'
    const isFormalizing = ['EM_ASSINATURA', 'ASSINADO', 'FORMALIZADA'].includes(proposal.status)
    const isBlocked = !isApproved && !isFormalizing

    const isTermoGenerated = proposal.status === 'FORMALIZADA' 
    const isContratoGenerated = ['EM_ASSINATURA', 'ASSINADO'].includes(proposal.status)
    const isTermoLocked = isContratoGenerated 

    // --- FUNÇÕES DE GERAÇÃO (PDF) ---
    const handleGenerateTermo = async () => {
        setIsGeneratingTermo(true)
        toast.info("Processando...")
        const res = await lockProposalForSignature(proposal.id, "Termo de Intenção", "FORMALIZADA")
        if (res.success) {
            toast.success("Termo gerado! Proposta Formalizada.")
            router.refresh() 
        } else {
            toast.error(res.message)
        }
        setIsGeneratingTermo(false)
    }

    const handleGenerateContrato = async () => {
        setIsGeneratingContrato(true)
        toast.info("Processando...")
        const res = await lockProposalForSignature(proposal.id, "Contrato de Compra e Venda", "EM_ASSINATURA")
        if (res.success) {
            toast.success("Contrato gerado! Proposta enviada para assinatura.")
            router.refresh() 
        } else {
            toast.error(res.message)
        }
        setIsGeneratingContrato(false)
    }

    // --- FUNÇÕES DE ANEXO (UPLOAD) ---
    const handleAddFile = (files: File[]) => {
        if (files.length === 0) return
        const file = files[0]

        if (uploadTarget === 'termo') {
            setTermoFile(file)
            toast.success("Via assinada do Termo anexada com sucesso!")
        } else if (uploadTarget === 'contrato') {
            setContratoFile(file)
            toast.success("Via assinada do Contrato anexada com sucesso!")
        }
    }

    // --- FUNÇÕES DE AÇÃO DOS ANEXOS ---
    const confirmDeleteFile = () => {
        if (fileToDelete === 'termo') setTermoFile(null)
        if (fileToDelete === 'contrato') setContratoFile(null)
        setFileToDelete(null)
    }

    const handleDownloadSingle = (fileName: string) => {
        toast.info(`Baixando o arquivo: ${fileName} (Simulação)`)
    }

    // --- RENDERIZAÇÃO UNIFICADA ---
    return (
        <div className="space-y-6">
            
            <FileUploadModal 
                isOpen={!!uploadTarget} 
                onClose={() => setUploadTarget(null)} 
                onConfirm={handleAddFile}
                existingFileNames={[termoFile?.name, contratoFile?.name].filter(Boolean) as string[]}
            />

            <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover documento assinado</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover esta via assinada? Você precisará anexar novamente para concluir a venda.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteFile} className="bg-red-600 hover:bg-red-700">Sim, remover</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* HEADER - SEMPRE VISÍVEL INDEPENDENTE DO STATUS */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileSignature className="w-5 h-5 text-blue-600" /> Efetivação e Contratos
                    </h2>
                    <p className="text-sm text-muted-foreground">Emita os documentos formais e conclua a venda da unidade.</p>
                </div>
            </div>

            {/* CONTEÚDO CONDICIONAL DA ABA */}
            {isBlocked ? (
                <Card className="border-dashed border-2 shadow-none bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-1">Efetivação Bloqueada</h3>
                        <p className="text-sm text-slate-500 mb-6 max-w-md text-center">
                            A geração de contratos e termos só é permitida após a proposta ser aprovada pela diretoria. 
                            Status atual: <strong className="uppercase text-slate-700">{proposal.status.replace(/_/g, ' ')}</strong>.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Alerta caso esteja formalizando */}
                    {isFormalizing && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex gap-3">
                                <div className="p-2 bg-red-100 rounded-full h-fit text-red-600">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-red-800 text-sm">Edição Bloqueada</h4>
                                    <p className="text-sm text-red-700 mt-0.5">
                                        A proposta está em fase de formalização/assinatura. Nenhuma edição pode ser feita.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* CARD 1: Termo de Intenção */}
                        <Card className={cn("border-2 transition-all flex flex-col", isTermoGenerated ? "border-slate-200 bg-slate-50" : "border-blue-200 shadow-sm")}>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-slate-800">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    Termo de Intenção de Compra
                                </CardTitle>
                                <CardDescription>Documento simplificado para reserva da unidade e aceite de condições.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                                <ul className="text-sm text-slate-600 space-y-2 mb-6">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Congela o preço e a disponibilidade</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Qualificação básica do comprador principal</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Resumo do fluxo de pagamento aprovado</li>
                                </ul>
                                
                                {isTermoGenerated ? (
                                    <div className="flex flex-col gap-3 mt-auto w-full">
                                        <div className="flex gap-2 w-full">
                                            <Button variant="outline" className="flex-1 bg-white" onClick={() => toast.info("Abrindo PDF do Termo...")} disabled={!!termoFile}>
                                                <Eye className="w-4 h-4 mr-2" /> Visualizar
                                            </Button>
                                            <Button 
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                                                onClick={() => setUploadTarget('termo')}
                                                disabled={!!termoFile}
                                            >
                                                <UploadCloud className="w-4 h-4 mr-2" /> Anexar Assinado
                                            </Button>
                                        </div>

                                        {termoFile && (
                                            <div className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-white shadow-sm">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center shrink-0 border border-slate-200">
                                                        {getFileIcon(termoFile.name)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-700 text-xs truncate" title={termoFile.name}>{termoFile.name}</p>
                                                        <p className="text-[10px] font-medium text-slate-400">{formatBytes(termoFile.size)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0 ml-2">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleDownloadSingle(termoFile.name)}>
                                                                    <Download className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Baixar Arquivo</TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setFileToDelete('termo')}>
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Remover Anexo</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Button 
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-auto" 
                                        disabled={isTermoLocked || isGeneratingTermo}
                                        onClick={handleGenerateTermo}
                                    >
                                        {isGeneratingTermo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                                        {isTermoLocked ? "Bloqueado pelo Contrato" : (isGeneratingTermo ? "Gerando..." : "Gerar PDF do Termo")}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* CARD 2: Contrato Oficial (CCV) */}
                        <Card className={cn("border-2 transition-all flex flex-col", isContratoGenerated ? "border-slate-200 bg-slate-50" : "border-emerald-200 shadow-sm")}>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-slate-800">
                                    <FileSignature className="w-5 h-5 text-emerald-600" />
                                    Contrato de Compra e Venda
                                </CardTitle>
                                <CardDescription>Documento jurídico completo e definitivo para assinatura das partes.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                                <ul className="text-sm text-slate-600 space-y-2 mb-6">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Qualificação completa (Cônjuges, Avalistas)</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cláusulas contratuais e multas padronizadas</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Rateio de comissões e intermediação</li>
                                </ul>

                                {isContratoGenerated ? (
                                    <div className="flex flex-col gap-3 mt-auto w-full">
                                        <div className="flex gap-2 w-full">
                                            <Button variant="outline" className="flex-1 bg-white" onClick={() => toast.info("Abrindo PDF do Contrato...")} disabled={!!contratoFile}>
                                                <Eye className="w-4 h-4 mr-2" /> Visualizar
                                            </Button>
                                            <Button 
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" 
                                                onClick={() => setUploadTarget('contrato')}
                                                disabled={!!contratoFile} 
                                            >
                                                <UploadCloud className="w-4 h-4 mr-2" /> Anexar Assinado
                                            </Button>
                                        </div>

                                        {contratoFile && (
                                            <div className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-white shadow-sm">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center shrink-0 border border-slate-200">
                                                        {getFileIcon(contratoFile.name)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-700 text-xs truncate" title={contratoFile.name}>{contratoFile.name}</p>
                                                        <p className="text-[10px] font-medium text-slate-400">{formatBytes(contratoFile.size)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0 ml-2">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleDownloadSingle(contratoFile.name)}>
                                                                    <Download className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Baixar Arquivo</TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setFileToDelete('contrato')}>
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Remover Anexo</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Button 
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-auto" 
                                        disabled={isGeneratingContrato}
                                        onClick={handleGenerateContrato}
                                    >
                                        {isGeneratingContrato ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                                        {isGeneratingContrato ? "Gerando..." : "Gerar PDF do Contrato"}
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