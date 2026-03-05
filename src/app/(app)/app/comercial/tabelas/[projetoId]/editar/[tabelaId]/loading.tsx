import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"

export default function LoadingTableEdit() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-md shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-28 rounded border" />
            </div>
            <Skeleton className="h-4 w-[450px] max-w-full" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full">
        <div className="flex w-full justify-start border-b p-0 h-auto gap-2">
          <div className="pb-3 px-6 border-b-2 border-primary">
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="pb-3 px-6 border-b-2 border-transparent">
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="pb-3 px-6 border-b-2 border-transparent">
            <Skeleton className="h-5 w-36" />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {/* Sticky Action Bar */}
          <Card className="bg-muted/50 border-border shadow-md">
            <CardContent className="p-4 flex items-end gap-4 overflow-x-auto">
              <div className="grid gap-1.5 w-36 shrink-0">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="grid gap-1.5 w-28 shrink-0">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="grid gap-1.5 w-28 shrink-0">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="grid gap-1.5 w-28 shrink-0">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
              <Skeleton className="h-10 min-w-[140px] mb-0.5 shrink-0" />
              <div className="flex-1 flex justify-end">
                <Skeleton className="h-10 w-40" />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <div className="border rounded-md bg-background shadow-sm overflow-x-auto">
            <Table className="whitespace-nowrap">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <Skeleton className="h-4 w-4 mx-auto rounded-sm" />
                  </TableHead>
                  <TableHead className="w-20"><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead className="w-24"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="w-32"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
                  <TableHead className="w-32"><Skeleton className="h-4 w-24 ml-auto" /></TableHead>
                  <TableHead className="w-32"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
                  <TableHead className="w-32"><Skeleton className="h-4 w-24 ml-auto" /></TableHead>
                  <TableHead className="w-36"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
                  <TableHead className="w-36"><Skeleton className="h-4 w-24 ml-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center">
                      <Skeleton className="h-4 w-4 mx-auto rounded-sm" />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell className="p-2"><Skeleton className="h-9 w-full" /></TableCell>
                    <TableCell className="p-2"><Skeleton className="h-9 w-full" /></TableCell>
                    <TableCell className="p-2"><Skeleton className="h-9 w-full" /></TableCell>
                    <TableCell className="p-2"><Skeleton className="h-9 w-full" /></TableCell>
                    <TableCell className="text-right bg-muted/30">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right bg-success/5">
                      <Skeleton className="h-4 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-muted border-t-2 border-border">
                <TableRow>
                  <TableCell colSpan={2}><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-28 ml-auto" /></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Footer Status Bar */}
          <div className="flex justify-between items-center text-sm">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
    </div>
  )
}