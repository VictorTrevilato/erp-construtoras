import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PersonsPhysicalLoading() {
  return (
    <div className="w-full space-y-6">
      {/* TÍTULO E SUBTÍTULO */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* BARRA DE FERRAMENTAS (SEARCH + BOTÕES) */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        <Skeleton className="h-10 flex-1 w-full" />
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* TABELA SKELETON */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]"><div className="flex justify-center"><Skeleton className="h-4 w-10" /></div></TableHead>
              <TableHead><Skeleton className="h-4 w-32" /></TableHead>
              <TableHead><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead><Skeleton className="h-4 w-28" /></TableHead>
              <TableHead className="text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableHead>
              <TableHead className="w-[80px] text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {/* Cód / Nº */}
                <TableCell>
                   <Skeleton className="h-4 w-10 mx-auto" />
                </TableCell>
                
                {/* Nome + Avatar */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </TableCell>

                {/* Contato (Telefone em cima, email embaixo) */}
                <TableCell>
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </TableCell>

                {/* Localização */}
                <TableCell>
                   <Skeleton className="h-4 w-36" />
                </TableCell>

                {/* Vínculos (Bolinhas) */}
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </TableCell>

                {/* Ações */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* PAGINAÇÃO SKELETON */}
        <div className="flex items-center justify-between py-4 px-2 border-t">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-64" />
        </div>
      </div>
    </div>
  )
}