import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardHeader, CardContent } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </div>

      {/* Banner Hero */}
      <Skeleton className="h-[300px] w-full rounded-2xl" />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Projects */}
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-6 w-[200px]" />
          <div className="grid grid-cols-3 gap-4">
             <Skeleton className="h-48 rounded-xl" />
             <Skeleton className="h-48 rounded-xl" />
             <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>

        {/* Wall */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[150px]" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}