import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      {/* HEADER: Título e Botão Novo */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" /> {/* Título */}
          <Skeleton className="h-4 w-96" /> {/* Descrição */}
        </div>
        <Skeleton className="h-10 w-32" />  {/* Botão Novo Usuário */}
      </div>

      {/* CARD DA TABELA */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Usuário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Escopos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Gera 5 linhas de esqueleto */}
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {/* Coluna Usuário (Avatar + Textos) */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" /> {/* Avatar */}
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-32" /> {/* Nome */}
                        <Skeleton className="h-3 w-48" /> {/* Email */}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Coluna Cargo */}
                  <TableCell>
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </TableCell>

                  {/* Coluna Status */}
                  <TableCell>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </TableCell>

                  {/* Coluna Escopos */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </TableCell>

                  {/* Coluna Ações */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" /> {/* Botão Editar */}
                      <Skeleton className="h-8 w-8 rounded-md" /> {/* Botão Excluir */}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}