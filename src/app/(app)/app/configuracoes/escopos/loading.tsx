import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 max-w-[80vw]" />
      </div>

      {/* Card da Árvore */}
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Skeleton className="h-9 w-36" />
            </div>

            <div className="space-y-1">
              {[
                { level: 1 },
                { level: 2 },
                { level: 3 },
                { level: 2 },
                { level: 1 },
              ].map((item, i) => {
                const indent = (item.level - 1) * 32
                return (
                  <div 
                    key={i} 
                    className="flex items-center p-2"
                    style={{ marginLeft: `${indent}px` }}
                  >
                    <div className="mr-3 shrink-0">
                      <Skeleton className="h-9 w-9 rounded-md" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-48" />
                    </div>

                    <div className="flex items-center gap-1 opacity-50">
                       <Skeleton className="h-8 w-8 rounded-md" />
                       <Skeleton className="h-8 w-8 rounded-md" />
                       <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}