import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-10 w-[140px]" />
      </div>

      <div className="border rounded-md p-4 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-6 w-[50px]" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center py-2">
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}