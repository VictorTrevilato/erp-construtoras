"use client"

import { useState, useTransition, useMemo, useRef, useEffect } from "react"
import { useApproval } from "./approval-context"
import { approveProposal, rejectProposal } from "@/app/actions/commercial-approvals"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, XCircle, User, FileText, History, AlertTriangle, Building2, Briefcase, Ruler, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
// Importação do componente de cálculo
import { ProposalAnalysis } from "./proposal-analysis"

// --- HELPERS VISUAIS ---
const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const mapPeriodicity = (p: number) => {
    const map: Record<number, string> = { 1: "MENSAL", 2: "BIMESTRAL", 3: "TRIMESTRAL", 6: "SEMESTRAL", 12: "ANUAL", 0: "ATO" }
    return map[p] || "MENSAL"
}

// Mapa de Status para Histórico
const formatHistoryAction = (action: string) => {
    const map: Record<string, string> = {
        'CRIOU': 'Criou Proposta',
        'APROVOU': 'Aprovou',
        'REJEITOU': 'Rejeitou',
        'SUBMETEU': 'Enviou para Análise'
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

export function ApprovalDetail() {
  const { selectedProposal } = useApproval()
  const [isPending, startTransition] = useTransition()
  
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectObs, setRejectObs] = useState("")
  const [approveObs, setApproveObs] = useState("")
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
    }
  }, [selectedProposal?.id])

  // --- ADAPTER DE DADOS & CÁLCULOS ---
  const analysisData = useMemo(() => {
    if (!selectedProposal) return null

    // 1. Prepara Fluxo Padrão (Reconstrução Monetária Precisa)
    const preparedStandardFlow = selectedProposal.fluxoTabela.map(flow => {
        const valorTotal = selectedProposal.valorTabelaOriginal * (flow.percentual / 100)
        const valorParcela = valorTotal / flow.qtdeParcelas
        
        return {
            tipo: flow.tipo,
            periodicidade: mapPeriodicity(flow.periodicidade),
            qtdeParcelas: flow.qtdeParcelas,
            percentual: flow.percentual,
            primeiroVencimento: flow.primeiroVencimento,
            valorParcela: valorParcela,
            valorTotal: valorTotal
        }
    })

    // 2. Prepara Condições da Proposta (Fix Date Bug com split)
    const preparedConditions = selectedProposal.condicoes.map(cond => ({
        ...cond,
        vencimento: new Date(cond.vencimento).toISOString().split('T')[0]
    }))

    return { standard: preparedStandardFlow, conditions: preparedConditions }
  }, [selectedProposal])

  // --- TOTAIS PARA RODAPÉS ---
  const totalProposalQtd = selectedProposal?.condicoes.reduce((acc, c) => acc + c.qtdeParcelas, 0) || 0
  const totalProposalVal = selectedProposal?.condicoes.reduce((acc, c) => acc + (c.valorParcela * c.qtdeParcelas), 0) || 0

  const totalStandardQtd = analysisData?.standard.reduce((acc, c) => acc + c.qtdeParcelas, 0) || 0
  const totalStandardVal = analysisData?.standard.reduce((acc, c) => acc + c.valorTotal, 0) || 0

  if (!selectedProposal) {
    return (
        <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed">
            <div className="text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Selecione uma proposta para analisar</p>
            </div>
        </div>
    )
  }

  // Actions
  const handleApprove = () => {
    startTransition(async () => {
        const formData = new FormData()
        formData.append("id", selectedProposal.id)
        formData.append("observacao", approveObs || "")
        
        const res = await approveProposal(formData)
        if (res.success) {
            toast.success("Proposta aprovada!")
            setApproveObs("")
        } else {
            toast.error(res.message)
        }
    })
  }

  const handleReject = () => {
    if (!rejectReason) return toast.error("Selecione um motivo de rejeição")
    
    startTransition(async () => {
        const formData = new FormData()
        formData.append("id", selectedProposal.id)
        formData.append("motivo", rejectReason)
        if(rejectObs) formData.append("observacao", rejectObs)

        const res = await rejectProposal(formData)
        if (res.success) {
            toast.success("Proposta reprovada.")
            setRejectOpen(false)
            setRejectReason("")
            setRejectObs("")
        } else {
            toast.error(res.message)
        }
    })
  }

  return (
    <div ref={scrollRef} className="space-y-6 h-full overflow-y-auto pr-2 pb-2">
      
      {/* 1. CABEÇALHO COMPACTO */}
      <div className="bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
        
        {/* Linha Superior: Unidade e Preço */}
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
                <Badge className="text-lg px-3 py-1 bg-blue-600 hover:bg-blue-700 shadow-sm rounded-md">
                    {selectedProposal.unidade.nome}
                </Badge>
                <div className="flex items-center gap-2 text-slate-500">
                    <span className="text-sm font-bold uppercase flex items-center gap-1">
                        <Building2 className="w-4 h-4" /> {selectedProposal.unidade.bloco}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Ruler className="w-3 h-3" /> {selectedProposal.unidade.area} m²
                    </span>
                    <span className="text-slate-300">|</span>
                    <Badge variant="outline" className="text-xs font-normal text-slate-500 border-slate-200">
                        {selectedProposal.lead.origem}
                    </Badge>
                </div>
            </div>

            <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Valor Final</p>
                <p className="text-2xl font-bold text-blue-700 tracking-tight leading-none">
                    {fmtCurrency(selectedProposal.valorProposta)}
                </p>
            </div>
        </div>

        <Separator className="my-3" />

        {/* Linha Inferior: Pessoas */}
        <div className="flex flex-col md:flex-row gap-6 md:items-center">
            {/* Lead */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-full text-slate-500">
                    <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Comprador</span>
                    <span className="text-sm font-semibold text-slate-800">{selectedProposal.lead.nome}</span>
                </div>
            </div>

            {/* Corretor */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-full text-slate-500">
                    <Briefcase className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Corretor</span>
                    <span className="text-sm font-semibold text-slate-800">{selectedProposal.corretor.nome}</span>
                </div>
            </div>
        </div>

        {/* Barra de Ações */}
        <div className="flex gap-4 mt-5 pt-4 border-t border-dashed items-end">
            <div className="flex-1">
                <Label htmlFor="obs-approve" className="text-xs mb-1 block font-bold text-slate-600">
                    Observações de Aprovação (Opcional)
                </Label>
                <div className="relative">
                    <Textarea 
                        id="obs-approve" 
                        className="h-9 min-h-0 resize-none py-1.5 text-xs bg-slate-50 focus:bg-white transition-colors pr-2" 
                        placeholder="Adicione uma nota..."
                        value={approveObs}
                        onChange={(e) => setApproveObs(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 h-9" onClick={() => setRejectOpen(true)} disabled={isPending}>
                    <XCircle className="w-4 h-4 mr-2" /> Reprovar
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-6 shadow-sm hover:shadow" onClick={handleApprove} disabled={isPending}>
                    {isPending ? "Processando..." : (
                        <>
                           <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar Proposta
                        </>
                    )}
                </Button>
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200 shadow-sm shrink-0" asChild>
                                <a href={`/app/comercial/propostas/${selectedProposal.projetoId}/editar/${selectedProposal.id}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver detalhes</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
      </div>

      {/* 2. ANÁLISE VPL */}
      {analysisData && (
          <ProposalAnalysis 
             standardFlow={analysisData.standard}
             proposalConditions={analysisData.conditions}
             unitArea={selectedProposal.unidade.area}
          />
      )}

      {/* 3. CONDIÇÕES DA PROPOSTA */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* A. Condições da Proposta */}
        <Card className="border-blue-200 shadow-sm overflow-hidden">
            <CardHeader className="py-3 border-b bg-blue-50/50">
                <CardTitle className="text-sm uppercase text-blue-800 font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Detalhe das Condições da Proposta
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                            <th className="px-4 py-3 text-center font-semibold">Vencimento</th>
                            <th className="px-4 py-3 text-center font-semibold">Qtd</th>
                            <th className="px-4 py-3 text-right font-semibold">Valor Parcela</th>
                            <th className="px-4 py-3 text-right font-semibold">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {selectedProposal.condicoes.map((cond) => {
                            const standardMatch = analysisData?.standard.find(s => s.tipo === cond.tipo)
                            let colorClass = "text-slate-600"
                            
                            if (standardMatch) {
                                const diff = cond.valorParcela - standardMatch.valorParcela
                                if (Math.abs(diff) < 0.01) {
                                    colorClass = "text-slate-600"
                                } else if (diff > 0) {
                                    colorClass = "text-emerald-600 font-bold"
                                } else {
                                    colorClass = "text-red-600 font-bold"
                                }
                            }
                            
                            return (
                                <tr key={cond.id} className="bg-white hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2.5 font-medium text-slate-700 text-xs">{cond.tipo}</td>
                                    <td className="px-4 py-2.5 text-center text-slate-600 text-xs">
                                        {new Date(cond.vencimento).toISOString().split('T')[0].split('-').reverse().join('/')}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-slate-600 text-xs">{cond.qtdeParcelas}x</td>
                                    <td className={cn("px-4 py-2.5 text-right text-xs", colorClass)}>
                                        {fmtCurrency(cond.valorParcela)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-slate-800 text-xs">
                                        {fmtCurrency(cond.valorParcela * cond.qtdeParcelas)}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t font-bold text-xs">
                        <tr>
                            <td colSpan={2} className="px-4 py-3 text-right text-slate-500 uppercase">Totais</td>
                            <td className="px-4 py-3 text-center text-slate-800">{totalProposalQtd}</td>
                            <td className="px-4 py-3 text-right text-slate-500">-</td>
                            <td className="px-4 py-3 text-right text-blue-700">{fmtCurrency(totalProposalVal)}</td>
                        </tr>
                    </tfoot>
                </table>
            </CardContent>
        </Card>

        {/* B. Condição Padrão da Tabela */}
        {analysisData?.standard && analysisData.standard.length > 0 && (
            <div className="opacity-80 hover:opacity-100 transition-opacity">
                 <div className="flex items-center gap-2 mb-2 px-1">
                    <History className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Comparativo: Fluxo da Tabela Original</h4>
                 </div>
                 <Card className="border-slate-200 shadow-none bg-slate-50">
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 text-xs text-slate-400 uppercase border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                                    <th className="px-4 py-2 text-center font-semibold">Vencimento</th>
                                    <th className="px-4 py-2 text-center font-semibold">Qtd</th>
                                    <th className="px-4 py-2 text-right font-semibold">Valor Parcela</th>
                                    <th className="px-4 py-2 text-right font-semibold">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y border-b border-slate-200">
                                {analysisData.standard.map((flow, idx) => (
                                    <tr key={idx} className="text-slate-500">
                                        <td className="px-4 py-2 text-xs">{flow.tipo}</td>
                                        <td className="px-4 py-2 text-center text-xs">
                                            {new Date(flow.primeiroVencimento).toISOString().split('T')[0].split('-').reverse().join('/')}
                                        </td>
                                        <td className="px-4 py-2 text-center text-xs">{flow.qtdeParcelas}x</td>
                                        <td className="px-4 py-2 text-right text-xs">{fmtCurrency(flow.valorParcela)}</td>
                                        <td className="px-4 py-2 text-right text-xs">{fmtCurrency(flow.valorTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-100 font-bold text-xs text-slate-500">
                                <tr>
                                    <td colSpan={2} className="px-4 py-2 text-right uppercase">Totais</td>
                                    <td className="px-4 py-2 text-center">{totalStandardQtd}</td>
                                    <td className="px-4 py-2 text-right">-</td>
                                    <td className="px-4 py-2 text-right">{fmtCurrency(totalStandardVal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </CardContent>
                </Card>
            </div>
        )}
      </div>

      {/* 4. HISTÓRICO */}
      <Card>
        <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm uppercase text-slate-500 font-bold flex items-center gap-2">
                <History className="w-4 h-4" /> Histórico da Proposta
            </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
            {selectedProposal.historico.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <History className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm">Nenhum histórico registrado até o momento.</p>
                </div>
            ) : (
                <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
                    {selectedProposal.historico.map((hist, idx) => {
                        const isReject = hist.acao === 'REJEITOU'
                        const isApprove = hist.acao === 'APROVOU'
                        
                        return (
                            <div key={idx} className="relative pl-6">
                                <span className={cn(
                                    "absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ring-1",
                                    isReject ? "bg-red-500 ring-red-100" : isApprove ? "bg-emerald-500 ring-emerald-100" : "bg-slate-300 ring-slate-100"
                                )}></span>
                                
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className={cn(
                                            "font-bold px-2 py-0.5",
                                            isReject ? "border-red-200 text-red-700 bg-red-50" : 
                                            isApprove ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "text-slate-600"
                                        )}>
                                            {formatHistoryAction(hist.acao)}
                                        </Badge>
                                        <span className="text-xs text-slate-400">
                                            {new Date(hist.data).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    
                                    <span className="text-xs text-slate-600">
                                        Responsável: <strong>{hist.usuarioNome}</strong>
                                    </span>

                                    {hist.obs && (
                                        <div className="mt-1 text-sm text-slate-600">
                                            {hist.obs.includes(" - ") ? (
                                                <div className="flex flex-col gap-1">
                                                    <strong className={cn("text-xs uppercase", isReject ? "text-red-600" : "text-slate-500")}>
                                                        {formatHistoryLabel(hist.obs.split(" - ")[0])}
                                                    </strong>
                                                    <span className="bg-slate-50 p-2 rounded border border-slate-100">
                                                        &quot;{hist.obs.split(" - ")[1]}&quot;
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className="bg-slate-50 p-2 rounded border border-slate-100">
                                                    &quot;{hist.obs}&quot;
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </CardContent>
      </Card>

      {/* DIALOG DE REJEIÇÃO */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" /> Reprovar Proposta
                </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                    Esta ação irá rejeitar a proposta e <strong>liberar a unidade</strong> para venda imediatamente.
                </p>
                <div className="space-y-2">
                    <Label>Motivo Principal *</Label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                    >
                        <option value="">Selecione...</option>
                        <option value="MARGEM_BAIXA">Margem Abaixo do Permitido</option>
                        <option value="FLUXO_RUIM">Fluxo Financeiro Inadequado</option>
                        <option value="DOCUMENTACAO">Problemas Documentais</option>
                        <option value="OUTRO">Outro Motivo</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label>Observação Complementar</Label>
                    <Textarea 
                        placeholder="Descreva o motivo..." 
                        value={rejectObs}
                        onChange={(e) => setRejectObs(e.target.value)}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleReject} disabled={isPending}>
                    Confirmar Reprovação
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}