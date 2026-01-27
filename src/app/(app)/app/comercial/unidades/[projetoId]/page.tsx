import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProjectById } from "@/app/actions/projects"
import { getUnitsByProject, getBlocksByProject } from "@/app/actions/commercial-units"
import { Building2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UnitsTableClient } from "./_components/units-table-client"

interface Props {
  params: Promise<{ projetoId: string }>
}

export default async function ProjectStockPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  
  const { projetoId } = await params

  // 1. Buscas Paralelas (Performance otimizada)
  const [project, units, blocks] = await Promise.all([
    getProjectById(projetoId),
    getUnitsByProject(projetoId),
    getBlocksByProject(projetoId)
  ])

  if (!project) {
    return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
            <h1 className="text-xl font-bold">Projeto não encontrado</h1>
            <Link href="/app/comercial/unidades"><Button>Voltar</Button></Link>
        </div>
    )
  }

  // 2. Cálculos de Resumo (Stats)
  const totalUnits = units.length
  const availableUnits = units.filter(u => u.status === 'DISPONIVEL').length
  const soldUnits = units.filter(u => u.status === 'VENDIDO').length

  return (
    <div className="space-y-6">
      
      {/* Header e Navegação */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
           <Link href="/app/comercial/unidades">
              <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
           </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Building2 className="h-8 w-8 text-gray-700" />
                    {project.nome}
                </h1>
                <p className="text-muted-foreground">
                    Gerenciamento detalhado de estoque.
                </p>
            </div>

            {/* Cards de Resumo Rápido */}
            <div className="flex gap-4">
                <Card className="p-4 flex flex-col items-center justify-center min-w-[100px]">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Total</span>
                    <span className="text-2xl font-bold">{totalUnits}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-green-50 border-green-200">
                    <span className="text-[10px] text-green-700 uppercase font-bold">Livres</span>
                    <span className="text-2xl font-bold text-green-700">{availableUnits}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] bg-red-50 border-red-200">
                    <span className="text-[10px] text-red-700 uppercase font-bold">Vendidas</span>
                    <span className="text-2xl font-bold text-red-700">{soldUnits}</span>
                </Card>
            </div>
        </div>
      </div>

      {/* Componente Cliente (Tabela e Modais) */}
      <UnitsTableClient 
        units={units} 
        blocks={blocks} 
        projetoId={projetoId} 
      />
      
    </div>
  )
}