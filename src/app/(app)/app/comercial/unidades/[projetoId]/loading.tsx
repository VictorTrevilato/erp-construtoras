import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LoadingProjectStock() {
  return (
    <div className="space-y-6">
      
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-24" /> {/* Botão Voltar */}
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
                <Skeleton className="h-8 w-96" /> {/* Título */}
                <Skeleton className="h-4 w-64" /> {/* Subtítulo */}
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-20 w-24" /> {/* Card 1 */}
                <Skeleton className="h-20 w-24" /> {/* Card 2 */}
                <Skeleton className="h-20 w-24" /> {/* Card 3 */}
            </div>
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex justify-between items-center">
         <Skeleton className="h-9 w-40" />
         <Skeleton className="h-9 w-32" />
      </div>

      {/* Tabela Skeleton */}
      <Card>
        <div className="p-4 border-b flex gap-4">
           <Skeleton className="h-9 w-full max-w-sm" />
           <Skeleton className="h-9 w-32" />
           <Skeleton className="h-9 w-32" />
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[150px]">Bloco & Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Áreas...</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="space-y-2">
                       <Skeleton className="h-3 w-12" />
                       <Skeleton className="h-5 w-16" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <Skeleton className="h-8 w-8" />
                       <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}