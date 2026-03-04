"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, ArrowRight, Layers, DoorOpen, MapPin, CheckCircle2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { ApprovalProjectSummary } from "@/app/actions/commercial-approvals"

export function ApprovalsProjectList({ projects }: { projects: ApprovalProjectSummary[] }) {

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      LANCAMENTO: "bg-primary/10 text-primary border-primary/20",
      PLANTA: "bg-info/10 text-info border-info/20",
      OBRAS: "bg-warning/10 text-warning border-warning/20",
      ENTREGUE: "bg-success/10 text-success border-success/20",
    }
    return styles[status] || "bg-muted text-muted-foreground border-border"
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Empreendimento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Blocos</TableHead>
              <TableHead className="text-center">Unidades</TableHead>
              <TableHead className="text-center">Pendências</TableHead>
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
                <TableRow key={project.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-base flex items-center gap-2 text-foreground">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
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
                    {project.totalPendentes > 0 ? (
                        <div className="flex items-center justify-center gap-1 text-warning font-bold bg-warning/20 py-1 px-3 rounded-full w-fit mx-auto border border-warning/30">
                           <AlertTriangle className="w-4 h-4" />
                           <span>{project.totalPendentes}</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-1 text-success font-bold bg-success/20 py-1 px-3 rounded-full w-fit mx-auto border border-success/30">
                           <CheckCircle2 className="w-4 h-4" />
                           <span>0</span>
                        </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="default" className="gap-2">
                      <Link href={`/app/comercial/aprovacoes/${project.id}`}>
                        Gerenciar Propostas <ArrowRight className="w-4 h-4" />
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