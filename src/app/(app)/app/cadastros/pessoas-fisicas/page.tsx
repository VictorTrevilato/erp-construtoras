import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getPersonsPhysical } from "@/app/actions/persons"
import { PersonPhysicalClient } from "./_components/person-physical-client"

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    search?: string
    sortBy?: string
    sortDir?: string
    isCliente?: string
    isCorretor?: string
    isFuncionario?: string
  }>
}

export default async function PersonsPhysicalPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const params = await searchParams
  
  const { data, total } = await getPersonsPhysical({
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 10,
    search: params.search || "",
    sortBy: params.sortBy || "id",
    sortDir: (params.sortDir as "asc" | "desc") || "desc",
    isCliente: params.isCliente === "true" ? true : undefined,
    isCorretor: params.isCorretor === "true" ? true : undefined,
    isFuncionario: params.isFuncionario === "true" ? true : undefined,
  })

  const key = `${params.page}-${params.pageSize}-${params.search}-${params.sortBy}-${params.sortDir}-${params.isCliente}-${params.isCorretor}-${params.isFuncionario}`

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Pessoas Físicas</h2>
        <p className="text-muted-foreground">
          Gerencie o cadastro de clientes, corretores e colaboradores.
        </p>
      </div>

      <PersonPhysicalClient 
        key={key} 
        initialData={data} 
        totalItems={total} 
      />
    </div>
  )
}