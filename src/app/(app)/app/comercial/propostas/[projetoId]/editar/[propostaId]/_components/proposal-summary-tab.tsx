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
      case 'APROVADO': return "bg-success/20 text-success border-success/30"
      case 'FORMALIZADA': return "bg-primary/20 text-primary border-primary/30"
      case 'EM_ASSINATURA': return "bg-primary/20 text-primary border-primary/30"
      case 'ASSINADO': return "bg-success text-success-foreground border-success/30"
      case 'REPROVADO': return "bg-destructive/20 text-destructive border-destructive/30"
      case 'CANCELADO': return "bg-muted text-muted-foreground border-border"
      case 'EM_ANALISE': return "bg-info/20 text-info border-info/30"
      case 'RASCUNHO': return "bg-muted/50 text-muted-foreground border-border"
      default: return "bg-muted text-muted-foreground"
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* --- COLUNA ESQUERDA: NEGOCIAÇÃO --- */}
      <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="shadow-sm border-primary/20 h-full">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Negociação
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-background">
                    #{proposal.id.padStart(5, '0')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
                
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Status Atual</span>
                    <Badge variant="outline" className={getStatusBadge(proposal.status)}>
                        {proposal.status.replace("_", " ")}
                    </Badge>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 flex flex-col gap-1 items-center justify-center text-center">
                        <span className="text-xs font-bold text-primary/70 uppercase tracking-tight">Valor da Proposta</span>
                        <span className="text-3xl font-black text-primary tracking-tight">{fmtCurrency(proposal.valorProposta)}</span>
                    </div>

                    {/* BOTÃO DE SUBMETER */}
                    {proposal.status === 'RASCUNHO' && (
                        <Button 
                            className="w-full font-bold h-11"
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
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <TableProperties className="w-3.5 h-3.5" /> Tabela Base
                        </span>
                        <p className="text-sm font-medium text-foreground">
                            <span className="font-bold">{proposal.tabela.codigo}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> Data Proposta
                            </span>
                            <p className="text-sm font-medium text-foreground">{fmtDate(proposal.dataProposta)}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Validade
                            </span>
                            <p className="text-sm font-medium text-foreground">{fmtDate(proposal.validade)}</p>
                        </div>
                    </div>
                </div>

                {proposal.dataDecisao && (
                    <div className="mt-6 p-4 bg-muted rounded-lg border space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                            {proposal.status === 'APROVADO' ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                            Decisão da Diretoria
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-muted-foreground block">Data:</span>
                                <strong className="text-foreground">{fmtDate(proposal.dataDecisao)}</strong>
                            </div>
                            <div>
                                <span className="text-muted-foreground block">Responsável:</span>
                                <strong className="text-foreground">{proposal.usuarioDecisaoNome || "Sistema"}</strong>
                            </div>
                        </div>
                        {proposal.motivoRejeicao && (
                            <div className="text-xs">
                                <span className="text-muted-foreground block">Motivo:</span>
                                <strong className="text-destructive uppercase">
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
                            <div className="text-xs bg-background p-2 border rounded italic text-muted-foreground">
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
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                 <Building2 className="w-5 h-5 text-muted-foreground" /> Unidade
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
                
                <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg border">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Número</span>
                        <span className="text-2xl font-black text-foreground">{proposal.unidade.numero}</span>
                    </div>
                    <div className="flex flex-col border-l pl-4">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Bloco / Torre</span>
                        <span className="text-lg font-bold text-foreground uppercase">{proposal.unidade.bloco}</span>
                    </div>
                    <div className="flex flex-col border-l pl-4">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Andar</span>
                        <span className="text-lg font-bold text-foreground">{proposal.unidade.andar}º</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <span className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <Maximize className="w-3.5 h-3.5" /> Composições e Metragens
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="border rounded-md p-3">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Privativa</span>
                            <span className="text-sm font-semibold text-foreground">{proposal.unidade.areaPrivativaTotal || "0,00"} m²</span>
                        </div>
                        <div className="border rounded-md p-3">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Uso Comum</span>
                            <span className="text-sm font-semibold text-foreground">{proposal.unidade.areaUsoComum || "0,00"} m²</span>
                        </div>
                        <div className="bg-muted/30 border rounded-md p-3">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Real Total</span>
                            <span className="text-base font-bold text-foreground">{proposal.unidade.areaRealTotal || "0,00"} m²</span>
                        </div>
                        <div className="border rounded-md p-3">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Fração Ideal</span>
                            <span className="text-sm font-semibold text-foreground">{proposal.unidade.fracaoIdeal || "-"}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-muted/30 p-3 rounded border">
                        <div className="p-2 bg-background rounded shadow-sm"><CarFront className="w-4 h-4 text-muted-foreground" /></div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Garagem ({proposal.unidade.qtdeVagas} Vagas)</span>
                            <span className="text-sm font-semibold text-foreground">{proposal.unidade.tipoVaga || "Não Informado"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/30 p-3 rounded border">
                        <div className="p-2 bg-background rounded shadow-sm"><Box className="w-4 h-4 text-muted-foreground" /></div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Depósito ({proposal.unidade.areaDeposito || 0} m²)</span>
                            <span className="text-sm font-semibold text-foreground">{proposal.unidade.tipoDeposito && proposal.unidade.tipoDeposito !== "NENHUM" ? proposal.unidade.tipoDeposito : "Nenhum"}</span>
                        </div>
                    </div>
                </div>

            </CardContent>
          </Card>

          {/* CLIENTE E INTERMEDIAÇÃO */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                 <User className="w-5 h-5 text-muted-foreground" /> Cliente & Intermediação
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Coluna Cliente */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                                {proposal.lead.nome.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-base font-bold text-foreground leading-none">{proposal.lead.nome}</p>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold flex items-center gap-1">
                                <Info className="w-3 h-3" /> Lead Original
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                <Phone className="w-4 h-4 text-muted-foreground/70" />
                                <span className="font-medium">{proposal.lead.telefone || "Não informado"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                <Mail className="w-4 h-4 text-muted-foreground/70" />
                                <span className="truncate">{proposal.lead.email || "Não informado"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                <Megaphone className="w-4 h-4 text-muted-foreground/70" />
                                <span>Origem: {proposal.lead.origem || "Não informada"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Coluna Intermediação */}
                    <div className="space-y-4 border-l pl-8">
                        <span className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" /> Corretor Responsável
                        </span>
                        <div className="flex items-center gap-3 bg-muted/30 border p-3 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-muted border flex items-center justify-center text-muted-foreground font-bold">
                                {proposal.corretorNome.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-base font-semibold text-foreground">{proposal.corretorNome}</span>
                        </div>
                    </div>
                </div>

            </CardContent>
          </Card>

      </div>
    </div>
  )
}