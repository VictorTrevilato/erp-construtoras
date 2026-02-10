'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function getUserPermissions(): Promise<string[]> {
  const session = await auth()
  
  if (!session?.user?.id) return []

  const cookieStore = await cookies() 
  let tenantIdStr = cookieStore.get("tenant-id")?.value
  const userId = BigInt(session.user.id)

  // 1. FALLBACK OBRIGATÓRIO (Já que o cookie não é setado no login para evitar crash)
  if (!tenantIdStr) {
    try {
        const userCompanies = await prisma.ycUsuariosEmpresas.findMany({
            where: {
                usuarioId: userId,
                ativo: true,
                ycEmpresas: { ativo: true }
            },
            take: 2,
            select: { sysTenantId: true }
        })

        if (userCompanies.length === 1) {
            tenantIdStr = userCompanies[0].sysTenantId.toString()
        } else {
            // Se tiver múltiplas empresas e sem cookie, retorna vazio (sidebar limpa)
            return []
        }
    } catch {
        return []
    }
  }

  if (!tenantIdStr) return []

  try {
    const tenantId = BigInt(tenantIdStr)
    const usuarioEmpresa = await prisma.ycUsuariosEmpresas.findFirst({
      where: { usuarioId: userId, sysTenantId: tenantId, ativo: true },
      select: { id: true, cargoId: true }
    })

    if (!usuarioEmpresa) return []

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

    permissoesCargo.forEach(item => {
      if (item.ycPermissoes?.codigo) permissionsSet.add(item.ycPermissoes.codigo)
    })

    permissoesGranulares.forEach(item => {
      if (!item.ycPermissoes?.codigo) return
      if (item.permitido) permissionsSet.add(item.ycPermissoes.codigo)
      else permissionsSet.delete(item.ycPermissoes.codigo)
    })
    
    return Array.from(permissionsSet)

  } catch (error) {
    console.error("Erro ao buscar permissões:", error)
    return []
  }
}

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