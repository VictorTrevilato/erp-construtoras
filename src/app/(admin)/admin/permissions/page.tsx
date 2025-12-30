import { getPermissions } from '@/app/actions/admin'
import { PermissionClient } from './_components/permission-client'

// Tipo que o componente Front-end espera
type Permission = {
  id: string
  codigo: string
  descricao: string
  categoria: string
  sysCreatedAt: Date | string
}

// Tipo que vem do Banco de Dados (Prisma)
type DatabasePermission = {
  id: bigint
  codigo: string
  descricao: string
  categoria: string
  sysCreatedAt: Date
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function PermissionsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  
  const page = Number(searchParams.page) || 1
  const pageSize = Number(searchParams.pageSize) || 10
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const sortBy = typeof searchParams.sortBy === 'string' ? searchParams.sortBy : 'categoria'
  const sortDir = (searchParams.sortDir === 'desc' ? 'desc' : 'asc')

  const { data: permissions, meta } = await getPermissions(page, pageSize, search, sortBy, sortDir)

  // [CORREÇÃO] Usamos explicitamente o "as Permission[]" no final.
  // Isso satisfaz o linter (que reclamava que Permission não era usado) 
  // e satisfaz o TypeScript (que garante a conversão de tipos).
  const formattedPermissions = (permissions as DatabasePermission[])?.map((p) => ({
    ...p,
    id: p.id.toString(),
  })) as Permission[]

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <PermissionClient initialData={formattedPermissions || []} meta={meta} />
    </div>
  )
}