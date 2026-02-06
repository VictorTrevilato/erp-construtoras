import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LoadingProjectStock() {
  return (
    <div className="space-y-6">
      
      {/* 1. Header e KPIs */}
      <div className="flex flex-col gap-4">
        {/* Botão Voltar */}
        <Skeleton className="h-9 w-24 rounded-md" /> 
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Título do Projeto */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" /> 
                    <Skeleton className="h-9 w-64" /> 
                </div>
                <Skeleton className="h-4 w-48" /> 
            </div>

            {/* Cards de KPIs */}
            <div className="flex gap-4">
                <Skeleton className="h-24 w-28 rounded-xl" />
                <Skeleton className="h-24 w-28 rounded-xl" />
                <Skeleton className="h-24 w-28 rounded-xl" />
            </div>
        </div>
      </div>

      {/* 2. Barra de Ações Superiores */}
      <div className="flex justify-between items-center mb-4">
         <Skeleton className="h-9 w-40" /> 
         <Skeleton className="h-9 w-36" /> 
      </div>

      {/* 3. Card da Tabela */}
      <Card>
        <CardContent className="p-0">
          
          {/* Barra de Filtros */}
          <div className="flex flex-col md:flex-row gap-4 p-4 border-b">
             <Skeleton className="h-10 flex-1" /> 
             <Skeleton className="h-10 w-[180px]" /> 
             <Skeleton className="h-10 w-[180px]" /> 
          </div>

          {/* Tabela */}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">Bloco & Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Andar</TableHead>
                <TableHead className="text-right">Vagas</TableHead>
                <TableHead className="text-right">Área Priv.</TableHead>
                <TableHead className="text-right">Área Comum</TableHead>
                <TableHead className="text-right">Fração Ideal</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {/* Bloco e Unidade */}
                  <TableCell>
                    <div className="space-y-1">
                       <Skeleton className="h-3 w-12" /> 
                       <Skeleton className="h-5 w-16" /> 
                    </div>
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  
                  {/* Tipo */}
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  
                  {/* Numéricos (Sem comentários entre as células para evitar erro de hidratação) */}
                  <TableCell><div className="flex justify-end"><Skeleton className="h-4 w-8" /></div></TableCell>
                  <TableCell><div className="flex justify-end"><Skeleton className="h-4 w-8" /></div></TableCell>
                  <TableCell><div className="flex justify-end"><Skeleton className="h-4 w-12" /></div></TableCell>
                  <TableCell><div className="flex justify-end"><Skeleton className="h-4 w-12" /></div></TableCell>
                  <TableCell><div className="flex justify-end"><Skeleton className="h-4 w-16" /></div></TableCell>

                  {/* Ações */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                       <Skeleton className="h-8 w-8 rounded-md" />
                       <Skeleton className="h-8 w-8 rounded-md" />
                       <Skeleton className="h-8 w-8 rounded-md" />
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