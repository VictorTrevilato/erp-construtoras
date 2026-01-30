import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LoadingTableEdit() {
  return (
    <div className="space-y-6 pb-20">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-4">
             <Skeleton className="w-10 h-10 rounded-md" /> {/* Botão Voltar */}
             <div className="space-y-2">
                 <Skeleton className="h-8 w-64" />
                 <Skeleton className="h-4 w-96" />
             </div>
          </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-6">
          <div className="flex gap-4 border-b">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
          </div>

          <Card>
             <div className="p-4 border-b">
                 <Skeleton className="h-12 w-full" />
             </div>
             <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-24" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-24" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
             </Table>
          </Card>
      </div>
    </div>
  )
}