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

// Formatador para remover underlines do status
const formatStatus = (status: string | null) => {
    return status ? status.replace(/_/g, ' ') : ""
}

// Configuração atualizada de cores baseada na sua nova regra
const getActionConfig = (action: string) => {
    switch(action) {
        case 'CRIOU': return { icon: FilePlus, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' } // Cinza
        case 'APROVOU': return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' } // Verde
        case 'REJEITOU': return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' } // Vermelho
        case 'REVISAO': return { icon: FileEdit, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' } // Roxo real
        default: return { icon: History, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' } // Azul padrão para o resto
    }
}

export function ProposalHistoryTab({ initialHistory }: Props) {
    return (
        <div className="space-y-6">
            
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" /> {/* Ícone azul padrão */}
                        Histórico e Auditoria
                    </h2>
                    <p className="text-sm text-muted-foreground">Linha do tempo com todas as interações, aprovações e revisões desta proposta.</p>
                </div>
            </div>

            {initialHistory.length === 0 ? (
                <Card className="border-dashed border-2 shadow-none bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <History className="w-12 h-12 mb-4 opacity-20" />
                        <h3 className="text-lg font-bold text-slate-700 mb-1">Nenhum evento registrado</h3>
                        <p className="text-sm text-slate-500">O histórico começará a ser gerado assim que houver interações com a proposta.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="relative pl-4 md:pl-8 py-4">
                    {/* Linha vertical da Timeline */}
                    <div className="absolute left-8 md:left-12 top-8 bottom-8 w-0.5 bg-slate-200"></div>

                    <div className="space-y-8 relative">
                        {initialHistory.map((hist) => {
                            const config = getActionConfig(hist.acao)
                            const Icon = config.icon
                            
                            return (
                                <div key={hist.id} className="relative flex items-start gap-6 group">
                                    
                                    {/* Ícone flutuante na linha do tempo */}
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm ring-1 ring-slate-100 transition-transform group-hover:scale-110",
                                        config.bg, config.color
                                    )}>
                                        <Icon className="w-4 h-4" />
                                    </div>

                                    {/* Card do Evento */}
                                    <Card className="flex-1 shadow-sm hover:shadow-md transition-shadow border-slate-200">
                                        <CardContent className="p-5">
                                            
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <Badge className={cn("px-3 py-1 font-bold shadow-none", config.bg, config.color, config.border, "border hover:bg-opacity-80")}>
                                                        {formatHistoryAction(hist.acao)}
                                                    </Badge>
                                                    <span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                                        {hist.usuarioNome}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-md border">
                                                    {new Date(hist.data).toLocaleString('pt-BR', {
                                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>

                                            {/* Transição de Status (se houver) */}
                                            {hist.statusAnterior && hist.statusAnterior !== hist.statusNovo && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-3 bg-slate-50 w-fit px-3 py-1.5 rounded-full border border-slate-100">
                                                    <span>De: <strong className="text-slate-700">{formatStatus(hist.statusAnterior)}</strong></span>
                                                    <ArrowRight className="w-3 h-3 text-slate-400" />
                                                    <span>Para: <strong className="text-slate-800">{formatStatus(hist.statusNovo)}</strong></span>
                                                </div>
                                            )}

                                            {/* Observação / Detalhe */}
                                            {hist.observacao && (
                                                <div className="text-sm text-slate-600 bg-slate-50/50 p-4 rounded-lg border border-slate-100 mt-2">
                                                    {hist.observacao.includes(" - ") ? (
                                                        <div className="flex flex-col gap-1.5">
                                                            <strong className={cn("text-xs uppercase tracking-wide", hist.acao === 'REJEITOU' ? "text-red-600" : "text-slate-500")}>
                                                                Motivo: {formatHistoryLabel(hist.observacao.split(" - ")[0])}
                                                            </strong>
                                                            <p className="text-slate-700 leading-relaxed italic">
                                                                &quot;{hist.observacao.split(" - ")[1]}&quot;
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-slate-700 leading-relaxed">
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