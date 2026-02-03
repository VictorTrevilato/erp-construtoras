import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LoadingCommercialUnits() {
  return (
    <div className="space-y-6">
      {/* Header (Título e Subtítulo) */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-64" /> {/* Título */}
        <Skeleton className="h-4 w-96" /> {/* Subtítulo */}
      </div>

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
                <TableHead className="text-center">Vagas</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {/* Coluna: Empreendimento + Localização */}
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full" /> {/* Ícone */}
                        <Skeleton className="h-5 w-48" /> {/* Nome */}
                      </div>
                      <div className="flex items-center gap-1 ml-6">
                        <Skeleton className="h-3 w-3" /> 
                        <Skeleton className="h-3 w-24" /> {/* Cidade/UF */}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Coluna: Tipo */}
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>

                  {/* Coluna: Status */}
                  <TableCell>
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </TableCell>

                  {/* Coluna: Blocos */}
                  <TableCell>
                    <div className="flex justify-center items-center gap-1">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-4" />
                    </div>
                  </TableCell>

                  {/* Coluna: Unidades */}
                  <TableCell>
                    <div className="flex justify-center items-center gap-1">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-8" />
                    </div>
                  </TableCell>

                  {/* Coluna: Vagas */}
                  <TableCell>
                    <div className="flex justify-center items-center gap-1">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-8" />
                    </div>
                  </TableCell>

                  {/* Coluna: Ação (Botão) */}
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Skeleton className="h-9 w-40 rounded-md" />
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