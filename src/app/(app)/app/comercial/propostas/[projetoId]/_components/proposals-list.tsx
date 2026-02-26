"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Edit2, EyeOff, Eye, Trash2, AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteProposal } from "@/app/actions/commercial-proposals"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export interface ProposalListSummary {
  id: string
  unidade: string
  bloco: string
  status: string
  compradorNome: string
  tabelaCodigo: string
  dataProposta: Date
  validade: Date
  valorProposta: number
}

interface Props {
  proposals: ProposalListSummary[]
  projetoId: string
}

export function ProposalsList({ proposals, projetoId }: Props) {
  const router = useRouter()
  
  // Filtros
  const [filterText, setFilterText] = useState("")
  const [filterBlock, setFilterBlock] = useState("ALL")
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [filterDateStart, setFilterDateStart] = useState("")
  const [filterDateEnd, setFilterDateEnd] = useState("")

  // Modais
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Extrai Blocos Únicos para o Filtro Select
  const uniqueBlocks = Array.from(new Set(proposals.map(p => p.bloco))).sort()

  const filteredProposals = proposals.filter(p => {
    const searchString = `${p.compradorNome} ${p.unidade} ${p.bloco} ${p.tabelaCodigo}`.toLowerCase()
    const matchesText = searchString.includes(filterText.toLowerCase())
    
    const matchesBlock = filterBlock === "ALL" || p.bloco === filterBlock
    const matchesStatus = filterStatus === "ALL" || p.status === filterStatus

    let matchesDate = true
    if (filterDateStart) matchesDate = matchesDate && new Date(p.dataProposta) >= new Date(filterDateStart)
    if (filterDateEnd) {
        const endDate = new Date(filterDateEnd)
        endDate.setUTCHours(23,59,59,999)
        matchesDate = matchesDate && new Date(p.dataProposta) <= endDate
    }
    
    return matchesText && matchesBlock && matchesStatus && matchesDate
  })

  // Estilização de Status Específica
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

  const formatStatusLabel = (status: string) => status.replace(/_/g, ' ')

  const handleDelete = async () => {
      if (!deleteId) return
      const res = await deleteProposal(deleteId)
      if (res.success) {
          toast.success(res.message)
          router.refresh()
      } else {
          toast.error(res.message)
      }
      setDeleteId(null)
  }

  const fmtCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const fmtDate = (d: Date) => {
      return new Date(d).toLocaleString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
      })
  }

  const renderValidade = (dataValidade: Date) => {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      
      const validade = new Date(dataValidade)
      validade.setHours(0, 0, 0, 0)

      const formattedDate = fmtDate(dataValidade)

      if (validade < hoje) {
          return (
              <div className="flex items-center gap-1.5 text-slate-600" title="Proposta Vencida">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  <span>{formattedDate}</span>
              </div>
          )
      }
      if (validade.getTime() === hoje.getTime()) {
          return (
              <div className="flex items-center gap-1.5 text-slate-600" title="Vence Hoje">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{formattedDate}</span>
              </div>
          )
      }
      return (
          <div className="flex items-center gap-1.5 text-slate-600" title="No Prazo">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{formattedDate}</span>
          </div>
      )
  }

  return (
    <TooltipProvider>
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col xl:flex-row gap-4 p-4 border-b bg-gray-50/50 xl:items-end">
            {/* Texto */}
            <div className="flex-1 relative min-w-[250px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por cliente, unidade ou tabela..." 
                className="pl-8 bg-white"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            
            {/* Seletores */}
            <div className="flex gap-2 w-full xl:w-auto">
                <Select value={filterBlock} onValueChange={setFilterBlock}>
                  <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="Bloco" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos Blocos</SelectItem>
                    {uniqueBlocks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px] bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos Status</SelectItem>
                    <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                    <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                    <SelectItem value="APROVADO">Aprovado</SelectItem>
                    <SelectItem value="FORMALIZADA">Formalizada</SelectItem>
                    <SelectItem value="EM_ASSINATURA">Em Assinatura</SelectItem>
                    <SelectItem value="ASSINADO">Assinado</SelectItem>
                    <SelectItem value="REPROVADO">Reprovado</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
            </div>

            {/* Datas */}
            <div className="flex gap-2 w-full xl:w-auto">
                <div className="grid gap-1 flex-1 xl:w-[130px]">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">De</span>
                    <Input type="date" className="bg-white" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} />
                </div>
                <div className="grid gap-1 flex-1 xl:w-[130px]">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Até</span>
                    <Input type="date" className="bg-white" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} />
                </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Data da Proposta</TableHead>
                <TableHead>Data de Validade</TableHead>
                <TableHead className="text-right">Valor Final</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProposals.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma proposta encontrada.</TableCell></TableRow>
              ) : (
                filteredProposals.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50">
                    
                    {/* Estilo Bloco/Unidade (Idêntico a Gestão de Unidades) */}
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground uppercase">{p.bloco}</span>
                          <span className="font-bold text-base text-gray-800">{p.unidade}</span>
                       </div>
                    </TableCell>
                    
                    <TableCell>
                        <Badge variant="outline" className={getStatusBadge(p.status)}>
                            {formatStatusLabel(p.status)}
                        </Badge>
                    </TableCell>
                    
                    <TableCell>
                        {/* REGRA LGPD: Swap de ícone sem layout shift e Blur */}
                        <div className="flex items-center gap-2 group cursor-default w-fit">
                            <EyeOff className="w-4 h-4 text-slate-400 group-hover:hidden" />
                            <Eye className="w-4 h-4 text-slate-400 hidden group-hover:block" />
                            <span className="font-medium text-slate-800 blur-sm group-hover:blur-none transition-all duration-300">
                                {p.compradorNome}
                            </span>
                        </div>
                    </TableCell>
                    
                    <TableCell className="text-slate-600 text-sm">{fmtDate(p.dataProposta)}</TableCell>
                    <TableCell className="text-sm">{renderValidade(p.validade)}</TableCell>
                    
                    <TableCell className="text-right font-bold text-green-700 text-sm">
                        {fmtCurrency(p.valorProposta)}
                    </TableCell>
                    
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-1">
                           {/* Botão de Editar */}
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" asChild>
                                 <Link href={`/app/comercial/propostas/${projetoId}/editar/${p.id}`}>
                                    <Edit2 className="h-4 w-4 text-blue-600" />
                                 </Link>
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Abrir Proposta</TooltipContent>
                           </Tooltip>

                           {/* Botão de Excluir (Desabilitado se não for Rascunho) */}
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <span tabIndex={0}> {/* O span garante que o Tooltip funcione mesmo com botão disabled */}
                                 <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setDeleteId(p.id)}
                                    disabled={p.status !== 'RASCUNHO'}
                                 >
                                    <Trash2 className={p.status === 'RASCUNHO' ? "h-4 w-4 text-red-500" : "h-4 w-4 text-slate-300"} />
                                 </Button>
                               </span>
                             </TooltipTrigger>
                             <TooltipContent>
                                {p.status === 'RASCUNHO' ? "Excluir Proposta" : "Apenas rascunhos podem ser excluídos"}
                             </TooltipContent>
                           </Tooltip>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta em rascunho? Todos os fluxos e dados vinculados serão apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </TooltipProvider>
  )
}