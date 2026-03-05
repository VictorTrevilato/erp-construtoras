import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function LoadingProposalEditor() {
  return (
    <div className="space-y-6 pb-10">
      
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-md shrink-0" />
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <Skeleton className="h-4 w-96 max-w-[80vw]" />
            </div>
        </div>
      </div>

      {/* Wrapper Principal (Simulando a Wrapper + Aba de Resumo) */}
      <div className="space-y-6">
        
        {/* Tabs Menu Skeleton */}
        <div className="w-full border-b pb-px overflow-x-auto">
            <div className="flex gap-2 min-w-max">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-28 rounded-t-lg rounded-b-none" />
                ))}
            </div>
        </div>

        {/* --- CONTEÚDO DA ABA RESUMO (ProposalSummaryTab) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          
          {/* COLUNA ESQUERDA: NEGOCIAÇÃO */}
          <div className="lg:col-span-4 flex flex-col gap-6">
              <Card className="shadow-sm border-primary/20 h-full">
                  <CardHeader className="pb-3 border-b bg-muted/30">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <Skeleton className="w-5 h-5 rounded-md" />
                              <Skeleton className="h-5 w-24" />
                          </div>
                          <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-6">
                      <div className="flex justify-between items-center">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-6 w-24 rounded-full" />
                      </div>

                      <div className="flex flex-col gap-3">
                          <div className="p-4 rounded-lg border border-border bg-muted/20 flex flex-col gap-2 items-center justify-center h-28">
                              <Skeleton className="h-3 w-32" />
                              <Skeleton className="h-8 w-48" />
                          </div>
                          <Skeleton className="h-11 w-full rounded-md" />
                      </div>

                      <div className="space-y-4">
                          <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                  <Skeleton className="w-3.5 h-3.5 rounded-sm" />
                                  <Skeleton className="h-3 w-24" />
                              </div>
                              <Skeleton className="h-5 w-32" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <div className="flex items-center gap-1">
                                      <Skeleton className="w-3.5 h-3.5 rounded-sm" />
                                      <Skeleton className="h-3 w-24" />
                                  </div>
                                  <Skeleton className="h-5 w-full" />
                              </div>
                              <div className="space-y-2">
                                  <div className="flex items-center gap-1">
                                      <Skeleton className="w-3.5 h-3.5 rounded-sm" />
                                      <Skeleton className="h-3 w-20" />
                                  </div>
                                  <Skeleton className="h-5 w-full" />
                              </div>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          </div>

          {/* COLUNA DIREITA: EMPILHADOS */}
          <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* DETALHES DA UNIDADE */}
              <Card className="shadow-sm border-border">
                  <CardHeader className="pb-3 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                          <Skeleton className="w-5 h-5 rounded-md" />
                          <Skeleton className="h-5 w-32" />
                      </div>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-6">
                      <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border bg-muted/10 h-24">
                          <div className="flex flex-col gap-2 justify-center">
                              <Skeleton className="h-3 w-16" />
                              <Skeleton className="h-8 w-12" />
                          </div>
                          <div className="flex flex-col gap-2 border-l pl-4 justify-center">
                              <Skeleton className="h-3 w-20" />
                              <Skeleton className="h-6 w-16" />
                          </div>
                          <div className="flex flex-col gap-2 border-l pl-4 justify-center">
                              <Skeleton className="h-3 w-12" />
                              <Skeleton className="h-6 w-10" />
                          </div>
                      </div>

                      <div className="space-y-3">
                          <div className="flex items-center gap-1">
                              <Skeleton className="w-3.5 h-3.5 rounded-sm" />
                              <Skeleton className="h-3 w-48" />
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {Array.from({ length: 4 }).map((_, i) => (
                                  <div key={i} className="border rounded-md p-3 space-y-2 h-[72px]">
                                      <Skeleton className="h-3 w-16" />
                                      <Skeleton className="h-5 w-20" />
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 p-3 rounded border bg-muted/10">
                              <Skeleton className="w-8 h-8 rounded shrink-0" />
                              <div className="space-y-2 w-full">
                                  <Skeleton className="h-3 w-32" />
                                  <Skeleton className="h-4 w-24" />
                              </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded border bg-muted/10">
                              <Skeleton className="w-8 h-8 rounded shrink-0" />
                              <div className="space-y-2 w-full">
                                  <Skeleton className="h-3 w-24" />
                                  <Skeleton className="h-4 w-20" />
                              </div>
                          </div>
                      </div>
                  </CardContent>
              </Card>

              {/* CLIENTE E INTERMEDIAÇÃO */}
              <Card className="shadow-sm border-border">
                  <CardHeader className="pb-3 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                          <Skeleton className="w-5 h-5 rounded-md" />
                          <Skeleton className="h-5 w-48" />
                      </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                  <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                                  <div className="space-y-2">
                                      <Skeleton className="h-5 w-48" />
                                      <Skeleton className="h-3 w-24" />
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  <Skeleton className="h-9 w-full rounded" />
                                  <Skeleton className="h-9 w-full rounded" />
                                  <Skeleton className="h-9 w-full rounded" />
                              </div>
                          </div>

                          <div className="space-y-4 md:border-l md:pl-8">
                              <div className="flex items-center gap-1">
                                  <Skeleton className="w-3.5 h-3.5 rounded-sm" />
                                  <Skeleton className="h-3 w-40" />
                              </div>
                              <div className="flex items-center gap-3 border p-3 rounded-lg bg-muted/10">
                                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                                  <Skeleton className="h-5 w-32" />
                              </div>
                          </div>
                      </div>
                  </CardContent>
              </Card>

          </div>
        </div>

      </div>
    </div>
  )
}