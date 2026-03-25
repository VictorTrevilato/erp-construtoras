import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

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

      {/* CONTEÚDO DA ABA (SIMULANDO OS 4 CARDS DO FORMULÁRIO DE PJ) */}
      <div className="space-y-8">

        {/* CARD 1: IDENTIFICAÇÃO EMPRESARIAL */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-6 w-64" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="md:col-span-4 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-10 w-full" /></div>
              <div className="md:col-span-2 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
              <div className="md:col-span-2 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: CONTATOS */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-6 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: ENDEREÇO COMERCIAL */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-6 w-48" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="col-span-1 space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
              <div className="md:col-span-3 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="col-span-1 space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
              <div className="md:col-span-3 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2 space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
              <div className="col-span-1 space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
              <div className="col-span-1 space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: VÍNCULOS E PERFIL */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-6 w-64" />
            </div>
            <Skeleton className="h-px w-full mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-[74px] w-full rounded-md" />
              <Skeleton className="h-[74px] w-full rounded-md" />
              <Skeleton className="h-[74px] w-full rounded-md" />
            </div>
          </CardContent>
        </Card>

        {/* RODAPÉ DE AÇÃO */}
        <div className="flex items-center justify-end gap-3 p-4 rounded-lg border border-border shadow-sm sticky bottom-4 z-10 bg-card">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[200px]" />
        </div>

      </div>
    </div>
  )
}