import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function getCurrentTenantId(): Promise<string | null> {
  const session = await auth()
  
  // 1. Sem usuário, sem tenant
  if (!session?.user?.id) return null

  // 2. Tenta pegar do Cookie (Caminho Feliz)
  const cookieStore = await cookies()
  const tenantIdCookie = cookieStore.get("tenant-id")?.value
  
  if (tenantIdCookie) return tenantIdCookie

  // 3. Fallback Inteligente (Salva o dia quando o cookie some)
  try {
    const userId = BigInt(session.user.id)
    
    // Busca as empresas ativas do usuário
    const userCompanies = await prisma.ycUsuariosEmpresas.findMany({
      where: {
        usuarioId: userId,
        ativo: true,
        ycEmpresas: { ativo: true }
      },
      take: 2, // Só precisamos saber se tem 1 ou mais
      select: { sysTenantId: true }
    })

    // Se tiver EXATAMENTE UMA empresa, assumimos ela automaticamente
    if (userCompanies.length === 1) {
      const dbTenantId = userCompanies[0].sysTenantId.toString()
      
      // Opcional: Tentar restaurar o cookie aqui (em Server Actions é possível)
      // Mas o importante é retornar o ID para a query funcionar
      return dbTenantId
    }
    
    // Se tiver 0 ou >1, o usuário precisa selecionar manualmente (/select-org)
    return null

  } catch (error) {
    console.error("Erro ao recuperar Tenant ID:", error)
    return null
  }
}