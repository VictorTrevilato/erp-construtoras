import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function LoadingProjectEdit() {
  return (
    <div className="w-full pb-10">
      
      {/* HEADER SKELETON */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" /> {/* Título: Editar Projeto */}
          <Skeleton className="h-4 w-80" /> {/* Subtítulo */}
        </div>
        
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" /> {/* Botão Voltar */}
          <Skeleton className="h-10 w-32" /> {/* Botão Salvar */}
        </div>
      </div>

      {/* CARDS CONTAINER */}
      <div className="space-y-6">
        
        {/* CARD 1: IDENTIFICAÇÃO */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Tipo, Status, Área */}
              <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
            </div>

            <div className="space-y-2">
               <Skeleton className="h-4 w-20" />
               <Skeleton className="h-24 w-full" /> {/* Textarea */}
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: LOCALIZAÇÃO */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-6 w-32" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="col-span-1 space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
                <div className="col-span-3 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="col-span-1 space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                <div className="col-span-1 space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                <div className="col-span-2 space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
             </div>
          </CardContent>
        </Card>
        
        {/* CARD 3: LEGAL */}
        <Card>
           <CardHeader>
            <div className="flex items-center gap-2">
               <Skeleton className="h-5 w-5 rounded-full" />
               <Skeleton className="h-6 w-40" />
            </div>
           </CardHeader>
           <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                 <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                 <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                 <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              </div>
           </CardContent>
        </Card>

      </div>
    </div>
  )
}