import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. Header Simples e Pessoal */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* 2. Banner de Marketing */}
      <Skeleton className="h-[250px] md:h-[280px] w-full rounded-2xl" />

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3">
        {/* Lado Esquerdo (Maior): Projetos */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Project Spotlight */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-5 w-16" />
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-border">
                  <div className="h-32 w-full bg-muted relative">
                    <div className="absolute top-3 right-3">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                  
                  <CardHeader className="p-4 pb-2">
                    <Skeleton className="h-5 w-3/4" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0">
                     <Skeleton className="h-8 w-full rounded-md" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Seção Extra: Links Rápidos Genéricos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Lado Direito (Menor): Mural de Avisos */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-6 w-36" />
              </div>
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <Skeleton className="mt-1 h-9 w-9 shrink-0 rounded-lg" />
                    <div className="space-y-2 w-full">
                      <Skeleton className="h-4 w-3/4" />
                      <div className="space-y-1">
                         <Skeleton className="h-3 w-full" />
                         <Skeleton className="h-3 w-5/6" />
                      </div>
                      <Skeleton className="h-2 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}