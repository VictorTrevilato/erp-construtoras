import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function LoadingProjectMesa() {
  return (
    <div className="space-y-6 pb-10">
      {/* HEADER SKELETON */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-md shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-24 rounded border" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>

      {/* TABS SKELETON (Wrapper) */}
      <div className="flex gap-4 border-b">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="space-y-6 mt-6">
        {/* HEADER COM BOTÕES DO ESPELHO */}
        <div className="flex justify-end items-center gap-3">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>

        {/* SEÇÃO 1: KPIs GLOBAIS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-3 flex items-center gap-3 shadow-sm border-l-4">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1.5 w-full">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-10" />
              </div>
            </Card>
          ))}
        </div>

        {/* SEÇÃO 2: GRID DE ESPELHOS POR BLOCO */}
        <div className="space-y-12 pt-4">
          <div className="space-y-4">
            {/* Header do Bloco */}
            <div className="flex items-center justify-between border-b border-dashed border-border pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>

            {/* Grid Area */}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[800px] flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, rowIdx) => (
                  <div key={rowIdx} className="flex gap-4 items-center mt-2">
                    <div className="w-10 flex justify-end">
                      <Skeleton className="h-4 w-6" />
                    </div>
                    <div className="flex-1 flex gap-3">
                      {Array.from({ length: 6 }).map((_, colIdx) => (
                        <Skeleton key={colIdx} className="w-28 h-20 rounded-lg shrink-0" />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Footer do Grid (Sufixos) */}
                <div className="flex gap-4 items-center mt-2 pt-2 border-t border-dashed border-border">
                  <div className="w-10"></div>
                  <div className="flex-1 flex gap-3">
                    {Array.from({ length: 6 }).map((_, colIdx) => (
                      <div key={colIdx} className="w-28 flex justify-center">
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 3: OUTRAS UNIDADES (Lojas/Comercial) */}
        <div className="mt-12 bg-muted/30 p-6 rounded-xl border border-dashed border-border">
          <Skeleton className="h-5 w-56 mb-4" />
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-36 h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}