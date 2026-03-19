import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="w-full space-y-6 pb-10"> {/* <-- Adicionado o pb-10 aqui também */}
      
      {/* CABEÇALHO DA PÁGINA */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-[450px] max-w-[80vw]" />
      </div>

      {/* 1. INFORMAÇÕES DA EMPRESA */}
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-56" />
          </div>
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20 invisible" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="w-10 h-10 shrink-0" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-2">
                <Skeleton className="w-10 h-10 shrink-0" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* 2. LOGOTIPOS E ÍCONES */}
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-96 max-w-full" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-32 w-full border-2 border-dashed border-border rounded-lg bg-muted/20" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-32 w-32 border-2 border-dashed border-border rounded-lg bg-muted/20" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-20 w-20 border-2 border-dashed border-border rounded-lg bg-muted/20" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. ENDEREÇO FÍSICO */}
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2 col-span-1"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2 col-span-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2 col-span-1"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2 col-span-1"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2 col-span-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2 col-span-1"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2 col-span-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
          </div>
        </CardContent>
      </Card>

      {/* 4. INFORMAÇÕES ADICIONAIS */}
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-full" /></div>
          </div>
        </CardContent>
      </Card>

      {/* 5. PERSONALIZAÇÃO AVANÇADA */}
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-60" />
          </div>
          <Skeleton className="h-4 w-96 max-w-full" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3 shadow-sm bg-background">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 flex justify-end p-4 border-t border-border">
          <Skeleton className="h-10 w-48" />
        </CardFooter>
      </Card>

    </div>
  )
}