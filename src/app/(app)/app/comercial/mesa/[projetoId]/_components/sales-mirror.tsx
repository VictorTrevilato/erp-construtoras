'use client'

import { NegotiationUnit } from "@/app/actions/commercial-negotiation"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Building2, CheckCircle2, AlertCircle, Ban, Layers, RefreshCw, Clock } from "lucide-react"
import { useNegotiation } from "./negotiation-context"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { ExportPdfSalesMirrorButton } from "./export-pdf-sales-mirror"

// --- HELPERS ---

const getUnitSuffix = (unitName: string, maxUnitValue: number) => {
  const nums = unitName.replace(/\D/g, '')
  if (!nums) return 999
  const digitsToTake = maxUnitValue < 100 ? 1 : 2
  return parseInt(nums.slice(-digitsToTake))
}

export function SalesMirror({ units, projetoNome, tabelaCodigo, logoUrl }: { units: NegotiationUnit[], projetoNome?: string, tabelaCodigo?: string | null, logoUrl?: string | null }) {
  const { setSelectedUnitId, setActiveTab } = useNegotiation()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // 1. Filtragem Global
  const floorUnits = units.filter(u => u.andar !== null)
  const specialUnits = units.filter(u => u.andar === null)

  // 2. Estatísticas Globais (Baseadas no Status Comercial)
  const stats = {
      total: units.length,
      disponivel: units.filter(u => u.statusComercial === 'DISPONIVEL').length,
      reservado: units.filter(u => u.statusComercial === 'RESERVADO').length,
      emAnalise: units.filter(u => u.statusComercial === 'EM_ANALISE').length,
      vendido: units.filter(u => u.statusComercial === 'VENDIDO').length
  }

  // 3. Agrupamento por Bloco
  const blocksMap = floorUnits.reduce((acc, unit) => {
      if (!acc[unit.blocoNome]) acc[unit.blocoNome] = []
      acc[unit.blocoNome].push(unit)
      return acc
  }, {} as Record<string, NegotiationUnit[]>)

  const sortedBlockNames = Object.keys(blocksMap).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  )

  // 4. Estilos Visuais
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DISPONIVEL': 
        return 'bg-success text-white ring-2 ring-success/80 shadow-md hover:brightness-110 transition-all cursor-pointer'
  
      case 'RESERVADO': 
        return 'bg-warning text-white ring-2 ring-warning/80 shadow-md cursor-not-allowed'
  
      case 'EM_ANALISE': 
        return 'bg-info text-white ring-2 ring-info/80 shadow-md cursor-not-allowed'
  
      case 'VENDIDO': 
        return 'bg-destructive text-white ring-2 ring-destructive/80 shadow-md cursor-not-allowed'
  
      default: 
        return 'bg-muted text-muted-foreground'
    }
  }

  const formatStatusLabel = (status: string) => {
      const map: Record<string, string> = {
          'DISPONIVEL': 'Disponível',
          'RESERVADO': 'Reservado',
          'VENDIDO': 'Vendido',
          'EM_ANALISE': 'Em Análise'
      }
      return map[status] || status
  }

  const handleUnitClick = (unit: NegotiationUnit) => {
    if (unit.statusComercial !== 'DISPONIVEL') return
    setSelectedUnitId(unit.id)
    setActiveTab("negociacao")
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = () => {
    startTransition(() => {
        router.refresh()
        toast.success("Espelho atualizado com sucesso!")
    })
  }

  return (
    <div className="space-y-6">

        {/* --- HEADER COM BOTÕES --- */}
        <div className="flex justify-end items-center gap-3">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh} 
                disabled={isPending}
                className="bg-background h-9"
            >
                <RefreshCw className={cn("w-4 h-4 mr-2", isPending && "animate-spin")} />
                {isPending ? "Atualizando..." : "Atualizar Status"}
            </Button>

            <ExportPdfSalesMirrorButton units={units} projetoNome={projetoNome} tabelaCodigo={tabelaCodigo} logoUrl={logoUrl} />
        </div>

        {/* --- SEÇÃO 1: KPIs GLOBAIS --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-3 flex items-center gap-3 border-l-4 border-l-muted-foreground shadow-sm">
                <div className="p-2 bg-muted rounded-full"><Building2 className="w-4 h-4 text-muted-foreground"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total</p>
                    <p className="text-xl font-bold text-foreground">{stats.total}</p>
                </div>
            </Card>
            <Card className="p-3 flex items-center gap-3 border-l-4 border-l-success shadow-sm">
                <div className="p-2 bg-success/20 rounded-full"><CheckCircle2 className="w-4 h-4 text-success"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-success">Disponíveis</p>
                    <p className="text-xl font-bold text-success">{stats.disponivel}</p>
                </div>
            </Card>
            <Card className="p-3 flex items-center gap-3 border-l-4 border-l-warning shadow-sm">
                <div className="p-2 bg-warning/20 rounded-full"><AlertCircle className="w-4 h-4 text-warning"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-warning">Reservadas</p>
                    <p className="text-xl font-bold text-warning">{stats.reservado}</p>
                </div>
            </Card>
            <Card className="p-3 flex items-center gap-3 border-l-4 border-l-info shadow-sm">
                <div className="p-2 bg-info/20 rounded-full"><Clock className="w-4 h-4 text-info"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-info">Em Análise</p>
                    <p className="text-xl font-bold text-info">{stats.emAnalise}</p>
                </div>
            </Card>
            <Card className="p-3 flex items-center gap-3 border-l-4 border-l-destructive shadow-sm">
                <div className="p-2 bg-destructive/20 rounded-full"><Ban className="w-4 h-4 text-destructive"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-destructive">Vendidas</p>
                    <p className="text-xl font-bold text-destructive">{stats.vendido}</p>
                </div>
            </Card>
        </div>

        {/* --- SEÇÃO 2: GRID DE ESPELHOS POR BLOCO --- */}
        <div className="space-y-12 pt-4">
            {sortedBlockNames.map((blockName) => {
                const blockUnits = blocksMap[blockName]
                
                const maxUnitNumber = Math.max(...blockUnits.map(u => parseInt(u.unidade.replace(/\D/g, '') || '0')))
                const floors = Array.from(new Set(blockUnits.map(u => u.andar))).sort((a, b) => (b as number) - (a as number))
                const allSuffixes = Array.from(new Set(blockUnits.map(u => getUnitSuffix(u.unidade, maxUnitNumber)))).sort((a, b) => a - b)

                return (
                    <div key={blockName} className="space-y-4">
                        {/* Header do Bloco */}
                        <div className="flex items-center justify-between border-b border-dashed border-border pb-2">
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-bold text-foreground">{blockName}</h3>
                                <Badge className="text-xs">{blockUnits.length} unidades</Badge>
                            </div>
                        </div>

                        <div className="overflow-x-auto pb-2">
                            <div className="min-w-[800px] flex flex-col gap-3">
                                {floors.map((floor, idx) => (
                                    <div key={floor} className={cn("flex gap-4 items-center group", idx === 0 && "mt-2")}>
                                        <div className="w-10 text-right font-medium text-muted-foreground text-sm group-hover:text-foreground transition-colors">
                                            {floor === 0 ? "T" : `${floor}º`}
                                        </div>
                                        
                                        <div className="flex-1 flex gap-3">
                                            {allSuffixes.map((suffix) => {
                                                const unit = blockUnits.find(u => u.andar === floor && getUnitSuffix(u.unidade, maxUnitNumber) === suffix)

                                                if (!unit) {
                                                    return <div key={`${floor}-${suffix}`} className="w-28 h-20 bg-transparent border border-dashed border-border rounded-lg opacity-30" />
                                                }

                                                return (
                                                    <TooltipProvider key={unit.id}>
                                                        <Tooltip delayDuration={200}>
                                                            <TooltipTrigger asChild>
                                                                <div 
                                                                    onClick={() => handleUnitClick(unit)}
                                                                    className={cn(
                                                                        "w-28 h-20 flex flex-col items-center justify-center rounded-lg transition-all select-none relative",
                                                                        getStatusStyle(unit.statusComercial)
                                                                    )}
                                                                >
                                                                    <span className="font-bold text-xl tracking-tight leading-none mb-1">
                                                                        {unit.unidade}
                                                                    </span>
                                                                    <span className="text-xs font-medium opacity-80">
                                                                        {unit.areaPrivativa} m²
                                                                    </span>
                                                                    
                                                                    {unit.statusComercial !== 'DISPONIVEL' && (
                                                                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-current opacity-50" />
                                                                    )}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-xs bg-popover text-popover-foreground border border-border">
                                                                <p className="font-bold mb-1">Unidade {unit.unidade}</p>
                                                                <p>Valor: {unit.valorTabela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                                <p>Situação: {formatStatusLabel(unit.statusComercial)}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}

                                <div className="flex gap-4 items-center mt-2 pt-2 border-t border-dashed border-border">
                                    <div className="w-10"></div>
                                    <div className="flex-1 flex gap-3">
                                        {allSuffixes.map((suffix) => (
                                            <div key={suffix} className="w-28 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Final {suffix}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>

        {/* --- SEÇÃO 3: OUTRAS UNIDADES --- */}
        {specialUnits.length > 0 && (
            <div className="mt-12 bg-muted/30 p-6 rounded-xl border border-dashed border-border">
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4"/> Lojas & Áreas Comerciais
                </h3>
                <div className="flex flex-wrap gap-4">
                    {specialUnits.map(unit => (
                        <div 
                            key={unit.id}
                            onClick={() => handleUnitClick(unit)}
                            className={cn(
                                "w-36 h-24 flex flex-col items-center justify-center rounded-lg transition-all cursor-pointer shadow-sm",
                                getStatusStyle(unit.statusComercial)
                            )}
                        >
                            <span className="font-bold text-lg">{unit.unidade}</span>
                            <span className="text-xs mt-1">{unit.areaPrivativa} m²</span>
                            <Badge className="mt-2 text-[10px] h-5 bg-background/50">{formatStatusLabel(unit.statusComercial)}</Badge>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  )
}