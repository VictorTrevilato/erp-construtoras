'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentTenantId } from "@/lib/get-current-tenant"

export async function getUserPermissions(): Promise<string[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const tenantIdStr = await getCurrentTenantId()
  if (!tenantIdStr) return []

  const userId = BigInt(session.user.id)

  try {
    const tenantId = BigInt(tenantIdStr)

    // Verifica se o vínculo do usuário com esta empresa ainda está ativo
    const usuarioEmpresa = await prisma.ycUsuariosEmpresas.findFirst({
      where: { usuarioId: userId, sysTenantId: tenantId, ativo: true },
      select: { id: true, cargoId: true }
    })

    if (!usuarioEmpresa) return []

    // Busca Permissões (Cargo + Granulares) em paralelo
    const [permissoesCargo, permissoesGranulares] = await Promise.all([
        prisma.ycCargosPermissoes.findMany({
            where: { cargoId: usuarioEmpresa.cargoId },
            include: { ycPermissoes: true }
        }),
        prisma.ycUsuariosEmpresasPermissoes.findMany({
            where: { usuarioEmpresaId: usuarioEmpresa.id },
            include: { ycPermissoes: true }
        })
    ])

    const permissionsSet = new Set<string>()

    // 1. Adiciona permissões do Cargo
    permissoesCargo.forEach(item => {
      if (item.ycPermissoes?.codigo) permissionsSet.add(item.ycPermissoes.codigo)
    })

    // 2. Aplica permissões Granulares (Adiciona ou Remove)
    permissoesGranulares.forEach(item => {
      if (!item.ycPermissoes?.codigo) return
      
      if (item.permitido) {
        permissionsSet.add(item.ycPermissoes.codigo)
      } else {
        // Se a granular diz "negado", remove mesmo que o cargo tenha
        permissionsSet.delete(item.ycPermissoes.codigo)
      }
    })
    
    return Array.from(permissionsSet)

  } catch (error) {
    console.error("Erro ao buscar permissões:", error)
    return []
  }
}

// Mantida para uso nas telas de administração de cargos
export async function getAllSystemPermissions() {
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