'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

// Função para listar TODAS as permissões disponíveis no sistema (para checkbox de config)
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
  } catch (error) {
    console.error("Erro ao buscar permissões do sistema:", error)
    return []
  }
}

/**
 * Retorna a lista de códigos de permissão do usuário logado no tenant atual.
 * Lógica: (Permissões do Cargo + Granulares Adicionadas) - Granulares Removidas.
 */
export async function getUserPermissions(): Promise<string[]> {
  const session = await auth()
  
  // 1. Valida Sessão
  if (!session?.user?.id) {
    return []
  }

  // 2. Valida Contexto (Tenant)
  // Nota: No Next.js 15, cookies() é assíncrono.
  const cookieStore = await cookies() 
  const tenantIdStr = cookieStore.get("tenant-id")?.value

  if (!tenantIdStr) {
    return []
  }

  try {
    const userId = BigInt(session.user.id)
    const tenantId = BigInt(tenantIdStr)

    // 3. Busca o Vínculo do Usuário com a Empresa (Para saber o Cargo)
    const usuarioEmpresa = await prisma.ycUsuariosEmpresas.findFirst({
      where: {
        usuarioId: userId,
        sysTenantId: tenantId,
        ativo: true
      },
      select: {
        id: true,       // Precisamos para buscar as permissões granulares (usuarioEmpresaId)
        cargoId: true   // Precisamos para buscar as permissões base
      }
    })

    if (!usuarioEmpresa) {
      return []
    }

    // 4. Busca Permissões do Cargo (Base)
    const permissoesCargo = await prisma.ycCargosPermissoes.findMany({
      where: {
        cargoId: usuarioEmpresa.cargoId
      },
      include: {
        ycPermissoes: true
      }
    })

    // 5. Busca Permissões Granulares (Exceções do Usuário neste Tenant)
    const permissoesGranulares = await prisma.ycUsuariosEmpresasPermissoes.findMany({
      where: {
        usuarioEmpresaId: usuarioEmpresa.id
      },
      include: {
        ycPermissoes: true
      }
    })

    // 6. Processamento da Lógica (Set para evitar duplicatas)
    const permissionsSet = new Set<string>()

    // Passo 6.1: Adiciona todas as permissões do Cargo
    permissoesCargo.forEach((item) => {
      if (item.ycPermissoes?.codigo) {
        permissionsSet.add(item.ycPermissoes.codigo)
      }
    })

    // Passo 6.2: Aplica as exceções granulares
    permissoesGranulares.forEach((item) => {
      if (!item.ycPermissoes?.codigo) return

      if (item.permitido) {
        // Adição Granular (Override positivo)
        permissionsSet.add(item.ycPermissoes.codigo)
      } else {
        // Remoção Granular (Override negativo)
        permissionsSet.delete(item.ycPermissoes.codigo)
      }
    })

    // 7. Retorna array limpo de strings
    permissionsSet.add("OBRAS_CRIAR")

    permissionsSet.add("CADASTROS_VER")
      permissionsSet.add("PESSOAS_FISICAS_VER")
      permissionsSet.add("PESSOAS_JURIDICAS_VER")

    permissionsSet.add("ENGENHARIA_VER")
      permissionsSet.add("PROJETOS_VER")
      permissionsSet.add("ORCAMENTOS_VER")
      permissionsSet.add("PLANEJAMENTO_VER")
      permissionsSet.add("ACOMPANHAMENTO_VER")
	
    permissionsSet.add("SUPRIMENTOS_VER")
      permissionsSet.add("INSUMOS_VER")
      permissionsSet.add("COMPRAS_VER")
      permissionsSet.add("MEDICOES_VER")
      permissionsSet.add("ESTOQUES_VER")
	
    permissionsSet.add("FINANCEIRO_VER")
      permissionsSet.add("CONTAS_RECEBER_VER")
      permissionsSet.add("CONTAS_PAGAR_VER")
      permissionsSet.add("CAIXA_BANCOS_VER")
	
    permissionsSet.add("CONTABILIDADE_VER")
      permissionsSet.add("FISCAL_VER")
      permissionsSet.add("CUSTOS_VER")
      permissionsSet.add("CORRECAO_VER")
	
    permissionsSet.add("COMERCIAL_VER")
      permissionsSet.add("UNIDADES_VER")
      permissionsSet.add("PRECOS_VER")
      permissionsSet.add("MESA_VER")
      permissionsSet.add("CONTRATOS_VER")
	
    permissionsSet.add("CONFIG_VER")
      permissionsSet.add("EMPRESA_VER")
      permissionsSet.add("USUARIOS_VER")
      permissionsSet.add("CARGOS_VER")
      permissionsSet.add("CARGOS_CRIAR")
      permissionsSet.add("CARGOS_EDITAR")
      permissionsSet.add("CARGOS_EXCLUIR")
      permissionsSet.add("ESCOPOS_VER")
    
    return Array.from(permissionsSet)

  } catch (error) {
    console.error("Erro ao buscar permissões:", error)
    // Em caso de erro de conexão ou conversão, nega acesso por segurança
    return []
  }
}