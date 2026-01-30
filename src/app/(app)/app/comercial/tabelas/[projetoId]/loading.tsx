import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LoadingCampaigns() {
  return (
    <div className="space-y-6">
      
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-24" /> 
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
                <Skeleton className="h-8 w-96" />
                <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex justify-end">
         <Skeleton className="h-9 w-32" />
      </div>

      <Card>
        <div className="p-4 border-b flex gap-4">
           <Skeleton className="h-9 w-full" />
           <Skeleton className="h-9 w-40" />
           <Skeleton className="h-9 w-40" />
        </div>
        <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <Skeleton className="h-8 w-8" />
                       <Skeleton className="h-8 w-8" />
                       <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </Card>
    </div>
  )
}