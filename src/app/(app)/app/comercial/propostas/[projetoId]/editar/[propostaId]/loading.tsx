import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function LoadingProposalEditor() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-24" /> 
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
                <Skeleton className="h-8 w-96" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
      </div>

      {/* Tabs Menu Skeleton */}
      <div className="w-full border-b pb-px">
        <div className="flex gap-2">
           {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-t-lg rounded-b-none" />
           ))}
        </div>
      </div>

      {/* 3 Blocos da Aba Resumo Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-4">
         {Array.from({ length: 3 }).map((_, i) => (
             <Card key={i} className="shadow-sm">
                 <CardHeader className="pb-4 border-b">
                     <Skeleton className="h-5 w-40" />
                 </CardHeader>
                 <CardContent className="pt-6 space-y-4">
                     <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-full" /></div>
                     <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-full" /></div>
                     <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-full" /></div>
                     <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-full" /></div>
                 </CardContent>
             </Card>
         ))}
      </div>
    </div>
  )
}