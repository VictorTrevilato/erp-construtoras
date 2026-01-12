import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Botão de Adicionar Raiz (Skeleton no lugar dele) */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Card da Árvore */}
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Simulando a árvore hierárquica */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className="flex items-center gap-3"
              style={{ marginLeft: `${(i % 3) * 32}px` }} // Simula indentação variada
            >
              <Skeleton className="h-9 w-9 rounded-md" /> {/* Ícone */}
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-2 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}