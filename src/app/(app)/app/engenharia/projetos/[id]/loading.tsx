import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="w-full pb-10">
      
      {/* CABEÇALHO GLOBAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 max-w-[80vw]" />
        </div>
        
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* NAVEGAÇÃO DAS ABAS */}
      <div className="border-b mb-6 flex gap-6 px-1">
        <Skeleton className="h-10 w-40 rounded-none rounded-t-md" />
        <Skeleton className="h-10 w-48 rounded-none rounded-t-md" />
      </div>

      {/* CONTEÚDO DA ABA (SIMULANDO O FORMULÁRIO) */}
      <div className="space-y-6">
        
        {/* CARD 1: IDENTIFICAÇÃO E VÍNCULO */}
        <Card className="shadow-sm border-border">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-4 w-96 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Logo + Escopo + Nome */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-[120px] w-full rounded-lg" />
              </div>
              <div className="col-span-1 md:col-span-3 flex flex-col gap-4 justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
               <Skeleton className="h-4 w-48" />
               <Skeleton className="h-10 w-full" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            <div className="space-y-2">
               <Skeleton className="h-4 w-48" />
               <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: DADOS LEGAIS E COMERCIAIS */}
        <Card className="shadow-sm border-border">
           <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-6 w-48" />
            </div>
           </CardHeader>
           <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                 <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                 <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-10 w-full" /></div>
                 <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                 <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                 <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                 <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              </div>
              <div className="space-y-2">
                 <Skeleton className="h-4 w-64" />
                 <Skeleton className="h-10 w-full" />
              </div>
           </CardContent>
        </Card>

        {/* CARD 3: LOCALIZAÇÃO */}
        <Card className="shadow-sm border-border">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-6 w-32" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="col-span-1 space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
                <div className="col-span-3 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="col-span-1 space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                <div className="col-span-1 space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                <div className="col-span-2 space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="col-span-1 space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                <div className="col-span-3 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
             </div>
          </CardContent>
        </Card>
        
        {/* RODAPÉ DE AÇÃO */}
        <div className="flex justify-end pt-2">
            <Skeleton className="h-11 w-[200px]" />
        </div>

      </div>
    </div>
  )
}