import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingProjectMesa() {
  return (
    <div className="space-y-6 pb-20">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-4">
             <Skeleton className="w-10 h-10 rounded-md" /> {/* Botão Voltar */}
             <div className="space-y-2">
                 <Skeleton className="h-8 w-64" /> {/* Título */}
                 <Skeleton className="h-4 w-96" /> {/* Subtítulo + Badge */}
             </div>
          </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-6">
          <div className="flex gap-4 border-b">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
          </div>

          {/* Conteúdo Simulado (Espelho Grid) */}
          <div className="space-y-4 mt-6">
             <div className="flex gap-2 items-center">
                 <Skeleton className="w-12 h-16 rounded-md" />
                 <div className="flex gap-2">
                     <Skeleton className="w-24 h-16 rounded-md" />
                     <Skeleton className="w-24 h-16 rounded-md" />
                     <Skeleton className="w-24 h-16 rounded-md" />
                     <Skeleton className="w-24 h-16 rounded-md" />
                 </div>
             </div>
             <div className="flex gap-2 items-center">
                 <Skeleton className="w-12 h-16 rounded-md" />
                 <div className="flex gap-2">
                     <Skeleton className="w-24 h-16 rounded-md" />
                     <Skeleton className="w-24 h-16 rounded-md" />
                     <Skeleton className="w-24 h-16 rounded-md" />
                 </div>
             </div>
          </div>
      </div>
    </div>
  )
}