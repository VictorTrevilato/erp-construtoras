import { getUsers } from '@/app/actions/admin'
import { UserClient } from './_components/user-client'

// 1. Tipo esperado pelo Componente Client (ID string)
type UserData = {
  id: string
  nome: string
  email: string
  ativo: boolean
  isSuperAdmin: boolean
  ultimoLogin: Date | string | null
  sysCreatedAt: Date | string
}

// 2. Tipo vindo do Banco via Prisma (ID bigint)
type DatabaseUser = {
  id: bigint
  nome: string
  email: string
  ativo: boolean
  isSuperAdmin: boolean
  ultimoLogin: Date | null
  sysCreatedAt: Date
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function UsersPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  
  const page = Number(searchParams.page) || 1
  const pageSize = Number(searchParams.pageSize) || 10
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const sortBy = typeof searchParams.sortBy === 'string' ? searchParams.sortBy : 'sysCreatedAt'
  const sortDir = (searchParams.sortDir === 'asc' ? 'asc' : 'desc')

  const { data: users, meta } = await getUsers(page, pageSize, search, sortBy, sortDir)

  // [CORREÇÃO] Tipagem explícita e conversão de BigInt para String
  const formattedUsers = (users as DatabaseUser[])?.map((user) => ({
    ...user,
    id: user.id.toString(),
  })) as UserData[]

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
      {/* Agora passamos os dados formatados sem 'any' */}
      <UserClient initialData={formattedUsers || []} meta={meta} />
    </div>
  )
}