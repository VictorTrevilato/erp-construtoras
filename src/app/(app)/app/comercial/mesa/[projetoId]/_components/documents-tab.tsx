'use client'

import { useEffect, useState } from "react"
import { useNegotiation } from "./negotiation-context"
import { NegotiationUnit, getPublicProjectDocuments, getPublicUnitDocuments, getDocumentViewUrl } from "@/app/actions/commercial-negotiation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ExternalLink, Loader2, FileText, Info } from "lucide-react"
import { toast } from "sonner"
import { getFileIcon } from "@/components/shared/file-upload-modal"

type DocItem = {
    id: string
    nomeArquivo: string
    classificacao: string
    urlArquivo: string
}

export function DocumentsTab({ projetoId, units }: { projetoId: string, units: NegotiationUnit[] }) {
    const { selectedUnitId } = useNegotiation()
    const selectedUnit = units.find(u => u.id === selectedUnitId)

    const [projectDocs, setProjectDocs] = useState<DocItem[]>([])
    const [unitDocs, setUnitDocs] = useState<DocItem[]>([])
    const [isLoadingProject, setIsLoadingProject] = useState(true)
    const [isLoadingUnit, setIsLoadingUnit] = useState(false)
    const [openingDocId, setOpeningDocId] = useState<string | null>(null)

    // Busca documentos do projeto apenas uma vez ao abrir a aba
    useEffect(() => {
        setIsLoadingProject(true)
        getPublicProjectDocuments(projetoId).then(data => {
            setProjectDocs(data)
            setIsLoadingProject(false)
        })
    }, [projetoId])

    // Busca documentos da unidade sempre que a seleção mudar
    useEffect(() => {
        if (!selectedUnitId) {
            setUnitDocs([])
            return
        }
        setIsLoadingUnit(true)
        getPublicUnitDocuments(selectedUnitId).then(data => {
            setUnitDocs(data)
            setIsLoadingUnit(false)
        })
    }, [selectedUnitId])

    const handleOpenDoc = async (id: string, urlArquivo: string, nomeArquivo: string) => {
        setOpeningDocId(id)
        const res = await getDocumentViewUrl(urlArquivo, nomeArquivo)
        setOpeningDocId(null)

        if (res.success && res.url) {
            window.open(res.url, '_blank')
        } else {
            toast.error("Erro ao abrir o documento.")
        }
    }

    const renderDocCard = (doc: DocItem) => (
        <Card key={doc.id} className="shadow-sm border-border overflow-visible bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex items-center gap-4 flex-1 min-w-[250px] overflow-hidden">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 border border-border">
                        {getFileIcon(doc.nomeArquivo)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate" title={doc.nomeArquivo}>
                            {doc.nomeArquivo}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground mt-0.5">
                            Documento Público
                        </p>
                    </div>
                </div>

                <div className="flex items-center w-full md:w-auto shrink-0 opacity-80 pointer-events-none">
                    <div className="grid gap-1.5 w-full md:w-[260px]">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Classificação</Label>
                        <Input className="bg-transparent border-transparent px-0 font-medium truncate" value={doc.classificacao} readOnly />
                    </div>
                </div>

                <div className="ml-auto pl-2 shrink-0 flex justify-end gap-2 w-[130px]">
                    <Button 
                        variant="outline" 
                        className="w-full gap-2 hover:text-primary hover:border-primary/50" 
                        onClick={() => handleOpenDoc(doc.id, doc.urlArquivo, doc.nomeArquivo)}
                        disabled={openingDocId === doc.id}
                    >
                        {openingDocId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        {openingDocId === doc.id ? "Aguarde" : "Abrir"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-8 pb-10">
            {/* BLOCO 1: PROJETO */}
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <FileText className="w-5 h-5 text-primary" /> Documentos do Empreendimento
                    </h3>
                    <p className="text-sm text-muted-foreground">Materiais comerciais, tabelas e arquivos gerais do projeto.</p>
                </div>

                {isLoadingProject ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : projectDocs.length === 0 ? (
                    <Card className="border-dashed shadow-none bg-muted/30">
                        <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                            <Info className="w-4 h-4" /> Nenhum documento público disponível para este empreendimento.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {projectDocs.map(renderDocCard)}
                    </div>
                )}
            </div>

            {/* BLOCO 2: UNIDADE */}
            <div className="space-y-4 pt-4 border-t">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <FileText className="w-5 h-5 text-primary" /> Documentos da Unidade {selectedUnit ? selectedUnit.unidade : ''}
                    </h3>
                    <p className="text-sm text-muted-foreground">Plantas específicas e anexos restritos a esta unidade.</p>
                </div>

                {!selectedUnitId ? (
                    <Card className="border-dashed shadow-none bg-muted/30">
                        <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                            <Info className="w-4 h-4" /> Selecione uma unidade para ver seus documentos específicos.
                        </CardContent>
                    </Card>
                ) : isLoadingUnit ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : unitDocs.length === 0 ? (
                    <Card className="border-dashed shadow-none bg-muted/30">
                        <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                            <Info className="w-4 h-4" /> Nenhum documento público atrelado a esta unidade.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {unitDocs.map(renderDocCard)}
                    </div>
                )}
            </div>
        </div>
    )
}