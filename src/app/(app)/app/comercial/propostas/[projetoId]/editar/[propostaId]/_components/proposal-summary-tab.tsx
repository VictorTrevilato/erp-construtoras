"use client"

import { useState, useTransition } from "react"
import { ProposalFullDetail, submitProposalForAnalysis } from "@/app/actions/commercial-proposals"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { 
  FileText, Calendar, Building2, Maximize, User, Phone, 
  Mail, Briefcase, CarFront, Box, TableProperties, AlertCircle, 
  CheckCircle2, XCircle, Info, Megaphone, Send, Loader2
} from "lucide-react"

interface Props {
  proposal: ProposalFullDetail
}

export function ProposalSummaryTab({ proposal }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtDate = (d: Date | null) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADO': return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case 'FORMALIZADA': return "bg-indigo-100 text-indigo-800 border-indigo-200"
      case 'EM_ASSINATURA': return "bg-purple-100 text-purple-800 border-purple-200"
      case 'ASSINADO': return "bg-emerald-600 text-white border-emerald-700"
      case 'REPROVADO': return "bg-red-100 text-red-800 border-red-200"
      case 'CANCELADO': return "bg-slate-800 text-white border-slate-900"
      case 'EM_ANALISE': return "bg-blue-100 text-blue-800 border-blue-200"
      case 'RASCUNHO': return "bg-slate-100 text-slate-600 border-slate-200"
      default: return "bg-slate-100 text-slate-800"
    }
  }

  const handleSubmitForAnalysis = async () => {
    setIsSubmitting(true)
    const res = await submitProposalForAnalysis(proposal.id)
    if (res.success) {
        toast.success(res.message)
        startTransition(() => {
            router.refresh()
        })
    } else {
        toast.error(res.message)
    }
    setIsSubmitting(false)
  }

  return (
    // Layout 2 Colunas: Esquerda (4) e Direita (8)
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* --- COLUNA ESQUERDA: NEGOCIAÇÃO --- */}
      <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="shadow-sm border-blue-100 h-full">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" /> Negociação
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-white">
                    #{proposal.id.padStart(5, '0')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
                
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Status Atual</span>
                    <Badge variant="outline" className={getStatusBadge(proposal.status)}>
                        {proposal.status.replace("_", " ")}
                    </Badge>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 flex flex-col gap-1 items-center justify-center text-center">
                        <span className="text-xs font-bold text-blue-800/70 uppercase tracking-tight">Valor da Proposta</span>
                        <span className="text-3xl font-black text-blue-700 tracking-tight">{fmtCurrency(proposal.valorProposta)}</span>
                    </div>

                    {/* BOTÃO DE SUBMETER */}
                    {proposal.status === 'RASCUNHO' && (
                        <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
                            onClick={handleSubmitForAnalysis}
                            disabled={isSubmitting || isPending}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                            {isSubmitting ? "Enviando..." : "Enviar para Análise"}
                        </Button>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <TableProperties className="w-3.5 h-3.5" /> Tabela Base
                        </span>
                        <p className="text-sm font-medium text-slate-800">
                            <span className="font-bold">{proposal.tabela.codigo}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> Data Proposta
                            </span>
                            <p className="text-sm font-medium text-slate-800">{fmtDate(proposal.dataProposta)}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Validade
                            </span>
                            <p className="text-sm font-medium text-slate-800">{fmtDate(proposal.validade)}</p>
                        </div>
                    </div>
                </div>

                {proposal.dataDecisao && (
                    <div className="mt-6 p-4 bg-slate-100 rounded-lg border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            {proposal.status === 'APROVADO' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                            Decisão da Diretoria
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-slate-500 block">Data:</span>
                                <strong className="text-slate-800">{fmtDate(proposal.dataDecisao)}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 block">Responsável:</span>
                                <strong className="text-slate-800">{proposal.usuarioDecisaoNome || "Sistema"}</strong>
                            </div>
                        </div>
                        {proposal.motivoRejeicao && (
                            <div className="text-xs">
                                <span className="text-slate-500 block">Motivo:</span>
                                <strong className="text-red-700 uppercase">
                                    {{
                                        'MARGEM_BAIXA': 'Margem Abaixo do Permitido',
                                        'FLUXO_RUIM': 'Fluxo Financeiro Inadequado',
                                        'DOCUMENTACAO': 'Problemas Documentais',
                                        'OUTRO': 'Outros Motivos'
                                    }[proposal.motivoRejeicao] || proposal.motivoRejeicao.replace("_", " ")}
                                </strong>
                            </div>
                        )}
                        {proposal.observacaoDecisao && (
                            <div className="text-xs bg-white p-2 border border-slate-200 rounded italic text-slate-600">
                                &quot;{proposal.observacaoDecisao}&quot;
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
          </Card>
      </div>

      {/* --- COLUNA DIREITA: EMPILHADOS --- */}
      <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* DETALHES DA UNIDADE */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                 <Building2 className="w-5 h-5 text-slate-500" /> Unidade
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
                
                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Número</span>
                        <span className="text-2xl font-black text-slate-800">{proposal.unidade.numero}</span>
                    </div>
                    <div className="flex flex-col border-l pl-4 border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Bloco / Torre</span>
                        <span className="text-lg font-bold text-slate-700 uppercase">{proposal.unidade.bloco}</span>
                    </div>
                    <div className="flex flex-col border-l pl-4 border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Andar</span>
                        <span className="text-lg font-bold text-slate-700">{proposal.unidade.andar}º</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1">
                        <Maximize className="w-3.5 h-3.5" /> Composições e Metragens
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="border border-slate-100 rounded-md p-3">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Privativa</span>
                            <span className="text-sm font-semibold text-slate-800">{proposal.unidade.areaPrivativaTotal || "0,00"} m²</span>
                        </div>
                        <div className="border border-slate-100 rounded-md p-3">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Uso Comum</span>
                            <span className="text-sm font-semibold text-slate-800">{proposal.unidade.areaUsoComum || "0,00"} m²</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Real Total</span>
                            <span className="text-base font-bold text-slate-900">{proposal.unidade.areaRealTotal || "0,00"} m²</span>
                        </div>
                        <div className="border border-slate-100 rounded-md p-3">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Fração Ideal</span>
                            <span className="text-sm font-semibold text-slate-800">{proposal.unidade.fracaoIdeal || "-"}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded border border-slate-100">
                        <div className="p-2 bg-white rounded shadow-sm"><CarFront className="w-4 h-4 text-slate-500" /></div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Garagem ({proposal.unidade.qtdeVagas} Vagas)</span>
                            <span className="text-sm font-semibold text-slate-700">{proposal.unidade.tipoVaga || "Não Informado"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded border border-slate-100">
                        <div className="p-2 bg-white rounded shadow-sm"><Box className="w-4 h-4 text-slate-500" /></div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Depósito ({proposal.unidade.areaDeposito || 0} m²)</span>
                            <span className="text-sm font-semibold text-slate-700">{proposal.unidade.tipoDeposito && proposal.unidade.tipoDeposito !== "NENHUM" ? proposal.unidade.tipoDeposito : "Nenhum"}</span>
                        </div>
                    </div>
                </div>

            </CardContent>
          </Card>

          {/* CLIENTE E INTERMEDIAÇÃO */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                 <User className="w-5 h-5 text-slate-500" /> Cliente & Intermediação
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Coluna Cliente */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg">
                                {proposal.lead.nome.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-base font-bold text-slate-800 leading-none">{proposal.lead.nome}</p>
                                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold flex items-center gap-1">
                                <Info className="w-3 h-3" /> Lead Original
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <span className="font-medium">{proposal.lead.telefone || "Não informado"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="truncate">{proposal.lead.email || "Não informado"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                <Megaphone className="w-4 h-4 text-slate-400" />
                                <span>Origem: {proposal.lead.origem || "Não informada"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Coluna Intermediação */}
                    <div className="space-y-4 border-l border-slate-100 pl-8">
                        <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" /> Corretor Responsável
                        </span>
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold">
                                {proposal.corretorNome.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-base font-semibold text-slate-800">{proposal.corretorNome}</span>
                        </div>
                    </div>
                </div>

            </CardContent>
          </Card>

      </div>
    </div>
  )
}