import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function LoadingApprovalOutlook() {
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
      {/* Header Fixo Skeleton */}
      <div className="flex items-center justify-between border-b pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-md shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-24 rounded border" />
            </div>
            <Skeleton className="h-4 w-96 max-w-[60vw]" />
          </div>
        </div>
      </div>

      {/* Conteúdo Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Esquerda: Lista Skeleton */}
        <div className="lg:col-span-4 border-r pr-6 hidden lg:block h-full">
          <div className="flex flex-col gap-3 pr-2 h-full overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-full p-4 rounded-xl border flex flex-col gap-3 relative shadow-sm">
                {/* Header do Item */}
                <div className="flex justify-between items-start w-full">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                </div>
                
                {/* Cliente */}
                <div className="flex items-center gap-2 w-full">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-48 max-w-full" />
                </div>

                {/* Info Secundária (Data e Tabela) */}
                <div className="grid grid-cols-2 gap-2 w-full mt-1 bg-muted/30 p-2 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-3.5 shrink-0" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-3.5 shrink-0" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                </div>

                {/* Finanças / Variação */}
                <div className="w-full flex justify-between items-center bg-muted/50 p-2 rounded-lg border border-border">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>

                {/* Footer do Item (Valor Proposta e VPL) */}
                <div className="w-full flex justify-between items-center pt-1">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Direita: Detalhe Skeleton */}
        <div className="lg:col-span-8 h-full space-y-6 overflow-hidden pb-10">
          
          {/* Card Header Info */}
          <div className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <div className="border-t pt-4 flex flex-wrap gap-3 items-center justify-between">
              <Skeleton className="h-10 w-[200px]" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-36" />
              </div>
            </div>
          </div>

          {/* Analysis Card Skeleton */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-md shrink-0" />
                <Skeleton className="h-5 w-48" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full p-4 space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
                <div className="flex justify-between bg-muted/50 p-2 mt-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}