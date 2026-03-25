import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getPersonsLegal } from "@/app/actions/legal-persons"
import { PersonLegalClient } from "./_components/person-legal-client"

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    search?: string
    sortBy?: string
    sortDir?: string
    isCliente?: string
    isImobiliaria?: string
    isFornecedor?: string
  }>
}

export default async function PersonsLegalPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const params = await searchParams
  
  const { data, total } = await getPersonsLegal({
    page: Number(params.page) || 1,
    pageSize: Number(params.pageSize) || 10,
    search: params.search || "",
    sortBy: params.sortBy || "id",
    sortDir: (params.sortDir as "asc" | "desc") || "desc",
    isCliente: params.isCliente === "true" ? true : undefined,
    isImobiliaria: params.isImobiliaria === "true" ? true : undefined,
    isFornecedor: params.isFornecedor === "true" ? true : undefined,
  })

  // A key força a re-renderização do componente Client quando os filtros mudam
  const key = `${params.page || 1}-${params.pageSize || 10}-${params.sortBy || "id"}-${params.sortDir || "desc"}-${params.isCliente}-${params.isImobiliaria}-${params.isFornecedor}`

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Pessoas Jurídicas</h2>
        <p className="text-muted-foreground">
          Gerencie o cadastro de clientes corporativos, imobiliárias parceiras e fornecedores.
        </p>
      </div>

      <PersonLegalClient 
        key={key} 
        initialData={data} 
        totalItems={total} 
      />
    </div>
  )
}