import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function LoadingApprovalOutlook() {
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
      {/* Header Fixo Skeleton */}
      <div className="flex items-center justify-between border-b pb-4 shrink-0">
          <div className="flex items-center gap-4">
             <Skeleton className="w-10 h-10 rounded-md" /> {/* Botão Voltar */}
             <div className="space-y-2">
                 <Skeleton className="h-8 w-64" /> {/* Título */}
                 <Skeleton className="h-4 w-96" /> {/* Subtítulo */}
             </div>
          </div>
      </div>

      {/* Conteúdo Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0">
          {/* Esquerda: Lista Skeleton */}
          <div className="lg:col-span-4 border-r pr-6 hidden lg:block h-full">
              <div className="mb-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 rounded-xl border p-4 space-y-3">
                          <div className="flex justify-between">
                              <Skeleton className="h-5 w-20 rounded-full" />
                              <Skeleton className="h-3 w-16" />
                          </div>
                          <Skeleton className="h-4 w-48" />
                          <div className="pt-3 border-t flex justify-between">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-20" />
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Direita: Detalhe Skeleton */}
          <div className="lg:col-span-8 h-full space-y-6">
              {/* Card Header Info */}
              <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                  <div className="flex justify-between">
                      <div className="space-y-2">
                          <Skeleton className="h-8 w-48" />
                          <Skeleton className="h-4 w-64" />
                      </div>
                      <div className="space-y-2 flex flex-col items-end">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-10 w-40" />
                      </div>
                  </div>
                  <div className="border-t pt-4 flex gap-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-10 w-32" />
                  </div>
              </div>

              {/* Card VPL Skeleton */}
              <Card>
                  <CardContent className="p-6">
                      <div className="space-y-4">
                          <Skeleton className="h-6 w-48" />
                          <Skeleton className="h-32 w-full rounded-lg" />
                      </div>
                  </CardContent>
              </Card>
          </div>
      </div>
    </div>
  )
}