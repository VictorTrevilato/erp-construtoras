import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Info Básica */}
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Grid de Permissões */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="h-64">
             <CardHeader className="border-b bg-gray-50/50">
               <Skeleton className="h-5 w-32" />
             </CardHeader>
             <CardContent className="pt-4 space-y-3">
               <Skeleton className="h-4 w-full" />
               <Skeleton className="h-4 w-3/4" />
               <Skeleton className="h-4 w-5/6" />
             </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}