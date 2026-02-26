"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, ArrowRight, MapPin, Layers, DoorOpen, FileText } from "lucide-react"
import Link from "next/link"

// [CORREÇÃO] Tipagem declarada explicitamente para evitar conflitos com a Action
export interface ProposalProjectSummary {
  id: string
  nome: string
  tipo: string
  status: string
  cidade: string
  uf: string
  totalBlocos: number
  totalUnidades: number
  totalPropostas: number
  img?: string | null
}

export function ProposalsProjectList({ projects }: { projects: ProposalProjectSummary[] }) {
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      LANCAMENTO: "bg-blue-100 text-blue-800 border-blue-200",
      PLANTA: "bg-indigo-100 text-indigo-800 border-indigo-200",
      OBRAS: "bg-orange-100 text-orange-800 border-orange-200",
      ENTREGUE: "bg-green-100 text-green-800 border-green-200",
    }
    return styles[status] || "bg-slate-100 text-slate-800"
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Empreendimento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Blocos</TableHead>
              <TableHead className="text-center">Unidades</TableHead>
              <TableHead className="text-center">Propostas</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Nenhum projeto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-base flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        {project.nome}
                      </span>
                      {(project.cidade || project.uf) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1 ml-6">
                           <MapPin className="w-3 h-3" /> {project.cidade} / {project.uf}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline">{project.tipo}</Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className={getStatusBadge(project.status)}>
                      {project.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                       <Layers className="w-4 h-4" />
                       <span className="font-medium text-foreground">{project.totalBlocos}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                       <DoorOpen className="w-4 h-4" />
                       <span className="font-medium text-foreground">{project.totalUnidades}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                       <FileText className="w-4 h-4" />
                       <span className="font-medium text-foreground">{project.totalPropostas}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="default" className="gap-2">
                      <Link href={`/app/comercial/propostas/${project.id}`}>
                        Acessar Propostas <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}