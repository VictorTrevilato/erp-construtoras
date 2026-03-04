"use client"

import { ProposalFullDetail, ProposalHistoryItem } from "@/app/actions/commercial-proposals"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, CheckCircle2, XCircle, FileEdit, FilePlus, ArrowRight, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  proposal: ProposalFullDetail
  initialHistory: ProposalHistoryItem[]
}

const formatHistoryAction = (action: string) => {
    const map: Record<string, string> = {
        'CRIOU': 'Criou a Proposta',
        'APROVOU': 'Aprovou',
        'REJEITOU': 'Reprovou',
        'SUBMETEU': 'Enviou para Análise',
        'REVISAO': 'Editou / Alterou'
    }
    return map[action] || action
}

const formatHistoryLabel = (text: string | null) => {
    if(!text) return ""
    const map: Record<string, string> = {
        'MARGEM_BAIXA': 'Margem Abaixo do Permitido',
        'FLUXO_RUIM': 'Fluxo Financeiro Inadequado',
        'DOCUMENTACAO': 'Problemas Documentais',
        'OUTRO': 'Outros Motivos'
    }
    return map[text] || text
}

const formatStatus = (status: string | null) => {
    return status ? status.replace(/_/g, ' ') : ""
}

const getActionConfig = (action: string) => {
    switch(action) {
        case 'CRIOU': return { icon: FilePlus, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' }
        case 'APROVOU': return { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/20', border: 'border-success/30' }
        case 'REJEITOU': return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/20', border: 'border-destructive/30' }
        case 'REVISAO': return { icon: FileEdit, color: 'text-warning', bg: 'bg-warning/20', border: 'border-warning/30' }
        default: return { icon: History, color: 'text-primary', bg: 'bg-primary/20', border: 'border-primary/30' } 
    }
}

export function ProposalHistoryTab({ initialHistory }: Props) {
    return (
        <div className="space-y-6">
            
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        Histórico e Auditoria
                    </h2>
                    <p className="text-sm text-muted-foreground">Linha do tempo com todas as interações, aprovações e revisões desta proposta.</p>
                </div>
            </div>

            {initialHistory.length === 0 ? (
                <Card className="border-dashed border-2 shadow-none bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                            <History className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Nenhum evento registrado</h3>
                        <p className="text-sm text-muted-foreground">O histórico começará a ser gerado assim que houver interações com a proposta.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="relative pl-4 md:pl-8 py-4">
                    {/* Linha vertical da Timeline */}
                    <div className="absolute left-8 md:left-12 top-8 bottom-8 w-0.5 bg-border"></div>

                    <div className="space-y-8 relative">
                        {initialHistory.map((hist) => {
                            const config = getActionConfig(hist.acao)
                            const Icon = config.icon
                            
                            return (
                                <div key={hist.id} className="relative flex items-start gap-6 group">
                                    
                                    {/* Ícone flutuante na linha do tempo */}
                                    <div className={cn(
                                        "relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-background shadow-sm ring-1 ring-border transition-transform group-hover:scale-110 bg-background",
                                        config.color
                                    )}>
                                        {/* Camada de cor com opacidade */}
                                        <div className={cn("absolute inset-0 rounded-full", config.bg)} />
                                        
                                        {/* Ícone */}
                                        <Icon className="w-4 h-4 relative z-10" />
                                    </div>

                                    {/* Card do Evento */}
                                    <Card className="flex-1 shadow-sm hover:shadow-md transition-shadow border-border">
                                        <CardContent className="p-5">
                                            
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <Badge className={cn("px-3 py-1 font-bold shadow-none", config.bg, config.color, config.border, "border hover:bg-opacity-80")}>
                                                        {formatHistoryAction(hist.acao)}
                                                    </Badge>
                                                    <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                                                        <User className="w-3.5 h-3.5 text-muted-foreground/70" />
                                                        {hist.usuarioNome}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 px-3 py-1.5 rounded-md border border-border">
                                                    {new Date(hist.data).toLocaleString('pt-BR', {
                                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>

                                            {/* Transição de Status (se houver) */}
                                            {hist.statusAnterior && hist.statusAnterior !== hist.statusNovo && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3 bg-muted/50 w-fit px-3 py-1.5 rounded-full border border-border">
                                                    <span>De: <strong className="text-foreground">{formatStatus(hist.statusAnterior)}</strong></span>
                                                    <ArrowRight className="w-3 h-3 text-muted-foreground/70" />
                                                    <span>Para: <strong className="text-foreground">{formatStatus(hist.statusNovo)}</strong></span>
                                                </div>
                                            )}

                                            {/* Observação / Detalhe */}
                                            {hist.observacao && (
                                                <div className="text-sm text-foreground bg-muted/30 p-4 rounded-lg border border-border mt-2">
                                                    {hist.observacao.includes(" - ") ? (
                                                        <div className="flex flex-col gap-1.5">
                                                            <strong className={cn("text-xs uppercase tracking-wide", hist.acao === 'REJEITOU' ? "text-destructive" : "text-muted-foreground")}>
                                                                Motivo: {formatHistoryLabel(hist.observacao.split(" - ")[0])}
                                                            </strong>
                                                            <p className="text-foreground leading-relaxed italic">
                                                                &quot;{hist.observacao.split(" - ")[1]}&quot;
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-foreground leading-relaxed">
                                                            {hist.observacao}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}