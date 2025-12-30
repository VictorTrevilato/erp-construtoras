import { getTenants } from '@/app/actions/admin'
import { TenantClient } from './_components/tenant-client'

// Tipo esperado pelo Componente (Client)
type Tenant = {
  id: string
  nome: string
  cnpj: string
  sysCreatedAt: Date | string
  ativo: boolean
  corPrimaria: string | null
  corSecundaria: string | null
}

// Tipo retornado pelo Banco (Prisma)
type DatabaseTenant = {
  id: bigint
  nome: string
  cnpj: string
  sysCreatedAt: Date
  ativo: boolean
  corPrimaria: string | null
  corSecundaria: string | null
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function TenantsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  
  // Extrair params com valores padrão
  const page = Number(searchParams.page) || 1
  const pageSize = Number(searchParams.pageSize) || 10 
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  
  // Params de Ordenação
  const sortBy = typeof searchParams.sortBy === 'string' ? searchParams.sortBy : 'sysCreatedAt'
  const sortDir = (searchParams.sortDir === 'asc' ? 'asc' : 'desc')

  const { data: tenants, meta } = await getTenants(page, pageSize, search, sortBy, sortDir)

  // [CORREÇÃO] Conversão e Tipagem Explícita
  const formattedTenants = (tenants as DatabaseTenant[])?.map((t) => ({
    ...t,
    id: t.id.toString(),
  })) as Tenant[]

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      {/* Agora passamos os dados formatados sem 'any' */}
      <TenantClient 
        initialData={formattedTenants || []} 
        meta={meta} 
      />
    </div>
  )
}