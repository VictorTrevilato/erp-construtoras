'use client'

import { NegotiationUnit } from "@/app/actions/commercial-negotiation"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Building2, CheckCircle2, AlertCircle, Ban, LockKeyhole, Layers, RefreshCw } from "lucide-react"
import { useNegotiation } from "./negotiation-context"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

// --- HELPERS ---

const getUnitSuffix = (unitName: string, maxUnitValue: number) => {
  const nums = unitName.replace(/\D/g, '')
  if (!nums) return 999
  const digitsToTake = maxUnitValue < 100 ? 1 : 2
  return parseInt(nums.slice(-digitsToTake))
}

export function SalesMirror({ units }: { units: NegotiationUnit[] }) {
  const { setSelectedUnitId, setActiveTab } = useNegotiation()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // 1. Filtragem Global
  const floorUnits = units.filter(u => u.andar !== null)
  const specialUnits = units.filter(u => u.andar === null)

  // 2. Estatísticas Globais
  const stats = {
      total: units.length,
      disponivel: units.filter(u => u.status === 'DISPONIVEL').length,
      reservado: units.filter(u => u.status === 'RESERVADO').length,
      vendido: units.filter(u => u.status === 'VENDIDO').length,
      bloqueado: units.filter(u => ['BLOQUEADO', 'PERMUTA'].includes(u.status)).length
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
        return 'bg-emerald-50 ring-1 ring-emerald-200 text-emerald-900 hover:bg-emerald-100 hover:ring-emerald-400 hover:shadow-md'
      case 'RESERVADO': 
        return 'bg-amber-50 ring-1 ring-amber-200 text-amber-800 cursor-not-allowed opacity-90'
      case 'VENDIDO': 
        return 'bg-rose-50 ring-1 ring-rose-200 text-rose-800 cursor-not-allowed opacity-60 grayscale-[0.5]'
      case 'BLOQUEADO': 
      case 'PERMUTA':
        return 'bg-slate-50 ring-1 ring-slate-200 text-slate-500 cursor-not-allowed'
      default: 
        return 'bg-gray-50 text-gray-400'
    }
  }

  const handleUnitClick = (unit: NegotiationUnit) => {
    if (unit.status !== 'DISPONIVEL') return
    setSelectedUnitId(unit.id)
    setActiveTab("negociacao")
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Função de Refresh
  const handleRefresh = () => {
    startTransition(() => {
        router.refresh()
        toast.success("Espelho atualizado com sucesso!")
    })
  }

  return (
    <div className="space-y-6">
        
        {/* --- SEÇÃO 1: KPIs GLOBAIS --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-3 flex items-center gap-3 border-l-4 border-l-slate-500 shadow-sm">
                <div className="p-2 bg-slate-100 rounded-full"><Building2 className="w-4 h-4 text-slate-600"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500">Total</p>
                    <p className="text-xl font-bold text-slate-700">{stats.total}</p>
                </div>
            </Card>
            <Card className="p-3 flex items-center gap-3 border-l-4 border-l-emerald-500 shadow-sm">
                <div className="p-2 bg-emerald-100 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-600"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Disponíveis</p>
                    <p className="text-xl font-bold text-emerald-700">{stats.disponivel}</p>
                </div>
            </Card>
            <Card className="p-3 flex items-center gap-3 border-l-4 border-l-amber-500 shadow-sm">
                <div className="p-2 bg-amber-100 rounded-full"><AlertCircle className="w-4 h-4 text-amber-600"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-amber-600">Reservadas</p>
                    <p className="text-xl font-bold text-amber-700">{stats.reservado}</p>
                </div>
            </Card>
            <Card className="p-3 flex items-center gap-3 border-l-4 border-l-rose-500 shadow-sm">
                <div className="p-2 bg-rose-100 rounded-full"><Ban className="w-4 h-4 text-rose-600"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-rose-600">Vendidas</p>
                    <p className="text-xl font-bold text-rose-700">{stats.vendido}</p>
                </div>
            </Card>
            <Card className="p-3 flex items-center gap-3 border-l-4 border-l-gray-400 shadow-sm">
                <div className="p-2 bg-gray-100 rounded-full"><LockKeyhole className="w-4 h-4 text-gray-500"/></div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Bloqueadas</p>
                    <p className="text-xl font-bold text-gray-700">{stats.bloqueado}</p>
                </div>
            </Card>
        </div>

        {/* --- SEÇÃO 2: GRID DE ESPELHOS POR BLOCO --- */}
        <div className="space-y-12 pt-4">
            {sortedBlockNames.map((blockName, index) => {
                const blockUnits = blocksMap[blockName]
                
                const maxUnitNumber = Math.max(...blockUnits.map(u => parseInt(u.unidade.replace(/\D/g, '') || '0')))
                const floors = Array.from(new Set(blockUnits.map(u => u.andar))).sort((a, b) => (b as number) - (a as number))
                const allSuffixes = Array.from(new Set(blockUnits.map(u => getUnitSuffix(u.unidade, maxUnitNumber)))).sort((a, b) => a - b)

                return (
                    <div key={blockName} className="space-y-4">
                        {/* Header do Bloco com Botão na Direita */}
                        <div className="flex items-center justify-between border-b border-dashed pb-2">
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-800">{blockName}</h3>
                                <Badge variant="secondary" className="text-xs">{blockUnits.length} unidades</Badge>
                            </div>

                            {/* [NOVO] Botão de Refresh apenas no primeiro bloco para limpar o layout */}
                            {index === 0 && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleRefresh} 
                                    disabled={isPending}
                                    className="text-muted-foreground hover:text-foreground h-8"
                                >
                                    <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isPending && "animate-spin")} />
                                    {isPending ? "Atualizando..." : "Atualizar Status"}
                                </Button>
                            )}
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
                                                    return <div key={`${floor}-${suffix}`} className="w-28 h-20 bg-transparent border border-dashed border-slate-200 rounded-lg opacity-30" />
                                                }

                                                return (
                                                    <TooltipProvider key={unit.id}>
                                                        <Tooltip delayDuration={200}>
                                                            <TooltipTrigger asChild>
                                                                <div 
                                                                    onClick={() => handleUnitClick(unit)}
                                                                    className={cn(
                                                                        "w-28 h-20 flex flex-col items-center justify-center rounded-lg transition-all select-none relative",
                                                                        getStatusStyle(unit.status),
                                                                        unit.status === 'DISPONIVEL' ? 'cursor-pointer' : ''
                                                                    )}
                                                                >
                                                                    <span className="font-bold text-xl tracking-tight leading-none mb-1">
                                                                        {unit.unidade}
                                                                    </span>
                                                                    <span className="text-xs font-medium opacity-80">
                                                                        {unit.areaPrivativa} m²
                                                                    </span>
                                                                    
                                                                    {unit.status !== 'DISPONIVEL' && (
                                                                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-current opacity-50" />
                                                                    )}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-xs bg-slate-900 text-white border-none">
                                                                <p className="font-bold mb-1">Unidade {unit.unidade}</p>
                                                                <p>Valor: {unit.valorTabela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                                <p>Situação: {unit.status}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}

                                <div className="flex gap-4 items-center mt-2 pt-2 border-t border-dashed">
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
            <div className="mt-12 bg-slate-50 p-6 rounded-xl border border-dashed">
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
                                getStatusStyle(unit.status)
                            )}
                        >
                            <span className="font-bold text-lg">{unit.unidade}</span>
                            <span className="text-xs mt-1">{unit.areaPrivativa} m²</span>
                            <Badge variant="secondary" className="mt-2 text-[10px] h-5 bg-white/50">{unit.status}</Badge>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  )
}