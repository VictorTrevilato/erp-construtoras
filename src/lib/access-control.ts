import { prisma } from "@/lib/prisma";

/**
 * Interface que define o Perfil de Acesso consolidado do usuário.
 */
export interface UserAccessProfile {
  usuarioEmpresaId: bigint;
  cargoId: bigint;
  isInterno: boolean;
  permissoes: string[]; // Ex: ['PROJETOS_VER', 'PROJETOS_EDITAR']
  escoposPermitidos: bigint[]; // IDs dos escopos originais + todos os filhos (Materialized Path)
}

/**
 * Constrói o perfil de acesso completo do usuário para o Tenant atual.
 * @param sysUserId ID do usuário logado
 * @param sysTenantId ID da empresa (Tenant) atual
 * @returns UserAccessProfile com permissões, escopos (Materialized Path) e flag interna
 */
export async function getUserAccessProfile(
  sysUserId: bigint,
  sysTenantId: bigint
): Promise<UserAccessProfile | null> {
  
  // 1. Busca o vínculo do usuário com a empresa e o cargo
  const usuarioEmpresa = await prisma.ycUsuariosEmpresas.findFirst({
    where: {
      usuarioId: sysUserId,
      sysTenantId: sysTenantId,
      ativo: true,
    },
    include: {
      ycCargos: true, 
    },
  });

  if (!usuarioEmpresa) return null;

  // 2. Busca as permissões base do Cargo
  const permissoesCargo = await prisma.ycCargosPermissoes.findMany({
    where: {
      cargoId: usuarioEmpresa.cargoId,
      sysTenantId: sysTenantId,
    },
    include: {
      ycPermissoes: true,
    },
  });

  // 3. Busca as permissões específicas do Usuário (Exceções/Overrides)
  const permissoesUsuario = await prisma.ycUsuariosEmpresasPermissoes.findMany({
    where: {
      usuarioEmpresaId: usuarioEmpresa.id,
      sysTenantId: sysTenantId,
    },
    include: {
      ycPermissoes: true,
    },
  });

  // 4. Lógica de Sobreposição (Override) de Permissões
  const permissoesFinais = new Map<bigint, string>();
  
  for (const pc of permissoesCargo) {
    permissoesFinais.set(pc.permissaoId, pc.ycPermissoes.codigo);
  }

  for (const pu of permissoesUsuario) {
    if (pu.permitido) {
      permissoesFinais.set(pu.permissaoId, pu.ycPermissoes.codigo);
    } else {
      permissoesFinais.delete(pu.permissaoId);
    }
  }

  // =====================================================================
  // 5. Busca os Escopos Diretos e seus "Caminhos"
  // =====================================================================
  const escoposDiretos = await prisma.ycUsuariosEmpresasEscopos.findMany({
    where: {
      usuarioEmpresaId: usuarioEmpresa.id,
      sysTenantId: sysTenantId,
    },
    include: {
      ycEscopos: {
        select: {
          caminho: true, // Pegamos a rota física daquele escopo no banco
        }
      }
    },
  });

  // Extrai apenas a lista de caminhos (Ex: ['/1/', '/2/5/'])
  const caminhosPermitidos = escoposDiretos.map((e) => e.ycEscopos.caminho);

  // =====================================================================
  // 6. Materialized Path: Expande o acesso para os Escopos Filhos
  // =====================================================================
  let escoposPermitidosFinais: bigint[] = [];

  if (caminhosPermitidos.length > 0) {
    const escoposCompletos = await prisma.ycEscopos.findMany({
      where: {
        sysTenantId: sysTenantId,
        ativo: true, // Garante que não vamos liberar acesso a escopos inativos
        OR: caminhosPermitidos.map((caminho) => ({
          caminho: {
            startsWith: caminho, // Mágica: Tudo que "começar com" o caminho pai
          },
        })),
      },
      select: {
        id: true,
      },
    });

    escoposPermitidosFinais = escoposCompletos.map((e) => e.id);
  }

  // Retorna o objeto consolidado com a árvore de escopos completa
  return {
    usuarioEmpresaId: usuarioEmpresa.id,
    cargoId: usuarioEmpresa.cargoId,
    isInterno: usuarioEmpresa.ycCargos.interno,
    permissoes: Array.from(permissoesFinais.values()),
    escoposPermitidos: escoposPermitidosFinais,
  };
}