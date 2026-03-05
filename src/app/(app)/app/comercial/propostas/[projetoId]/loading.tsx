import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LoadingProjectProposals() {
  return (
    <div className="space-y-6">
      
      {/* Header e Navegação */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
           <Skeleton className="h-9 w-24 rounded-md" /> {/* Botão Voltar */}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                    <Skeleton className="h-9 w-64" />
                </div>
                <Skeleton className="h-5 w-72" />
            </div>
            
            {/* Cards de Status (KPIs) */}
            <div className="flex gap-4">
                <Skeleton className="h-24 w-[100px] rounded-xl shrink-0" />
                <Skeleton className="h-24 w-[100px] rounded-xl shrink-0" />
                <Skeleton className="h-24 w-[100px] rounded-xl shrink-0" />
            </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Barra de Filtros */}
          <div className="flex flex-col xl:flex-row gap-4 p-4 border-b bg-muted/30 xl:items-end">
            <Skeleton className="h-10 flex-1 min-w-[250px]" />
            
            <div className="flex gap-2 w-full xl:w-auto">
                <Skeleton className="h-10 w-[140px]" />
                <Skeleton className="h-10 w-[160px]" />
            </div>

            <div className="flex gap-2 w-full xl:w-auto">
                <div className="grid gap-1 flex-1 xl:w-[130px]">
                    <Skeleton className="h-3 w-8" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid gap-1 flex-1 xl:w-[130px]">
                    <Skeleton className="h-3 w-8" />
                    <Skeleton className="h-10 w-full" />
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
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                      <div className="flex flex-col gap-1">
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className="h-5 w-16" />
                      </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48 max-w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                       <Skeleton className="h-3.5 w-3.5 rounded-full" />
                       <Skeleton className="h-5 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><div className="flex justify-end"><Skeleton className="h-5 w-28" /></div></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                       <Skeleton className="h-9 w-9 rounded-md" />
                       <Skeleton className="h-9 w-9 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}