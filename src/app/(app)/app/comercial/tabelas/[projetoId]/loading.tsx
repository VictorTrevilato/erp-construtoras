import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LoadingCampaigns() {
  return (
    <div className="space-y-6">
      
      {/* Header com KPIs */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6">
        <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-24 -ml-3" /> 
            
            <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-md" />
                <Skeleton className="h-9 w-96 max-w-[60vw]" />
            </div>
            <Skeleton className="h-5 w-64 mt-1" />
        </div>
        
        {/* Cards de Status */}
        <div className="flex gap-4">
            <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] border-border">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-8 w-8" />
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] border-border">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-8 w-8" />
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center min-w-[100px] border-border">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-8 w-8" />
            </Card>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
         <Skeleton className="h-9 w-40" />
         <Skeleton className="h-9 w-32" />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 p-4 border-b items-end">
           <Skeleton className="h-10 w-full" />
           <div className="flex gap-2 w-full md:w-auto">
              <Skeleton className="h-14 w-32" />
              <Skeleton className="h-14 w-32" />
           </div>
        </div>
        <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Código</TableHead>
                <TableHead>Nome da Tabela</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Taxa Juros (a.m)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-3 rounded-full shrink-0" />
                        <Skeleton className="h-5 w-40" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                       <Skeleton className="h-9 w-9 rounded-md" />
                       <Skeleton className="h-9 w-9 rounded-md" />
                       <Skeleton className="h-9 w-9 rounded-md" />
                       <Skeleton className="h-9 w-9 rounded-md" />
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