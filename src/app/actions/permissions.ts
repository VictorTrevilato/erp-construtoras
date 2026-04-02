'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentTenantId } from "@/lib/get-current-tenant"
// 1. IMPORTAÇÃO DO MOTOR DE ACESSO CENTRALIZADO
import { getUserAccessProfile } from "@/lib/access-control"

// Função consumida pelo Provider no Front-end para montar a UI (Menus, Botões)
export async function getUserPermissions(): Promise<string[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const userId = BigInt(session.user.id)
  const tenantId = BigInt(tenantIdStr)

  try {
    // REFACTORING BRILHANTE: 
    // Substituímos 40 linhas de código pela chamada direta ao nosso motor de acesso.
    // Assim, a inteligência fica num lugar só!
    const cracha = await getUserAccessProfile(userId, tenantId)
    
    return cracha ? cracha.permissoes : []

  } catch (error) {
    console.error("Erro ao buscar permissões:", error)
    return []
  }
}

// Mantida para uso nas telas de administração de cargos e perfis granulares
export async function getAllSystemPermissions() {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const userId = BigInt(session.user.id)
  const tenantId = BigInt(tenantIdStr)

  // BLINDAGEM: Apenas quem tem acesso à tela de Cargos ou Usuários precisa ver a matriz
  const cracha = await getUserAccessProfile(userId, tenantId)
  if (!cracha) return []

  const canViewRoles = cracha.permissoes.includes('CARGOS_VER')
  const canViewUsers = cracha.permissoes.includes('USUARIOS_VER')

  if (!canViewRoles && !canViewUsers) {
    return [] // Se for um utilizador comum tentando fuçar, devolve vazio.
  }

  try {
    const permissions = await prisma.ycPermissoes.findMany({
      orderBy: [{ categoria: 'asc' }, { descricao: 'asc' }]
    })
    return permissions.map(p => ({
      id: p.id.toString(),
      codigo: p.codigo,
      descricao: p.descricao,
      categoria: p.categoria
    }))
  } catch {
    return []
  }
}