"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function selectContextAction(tenantId: string, url: string) {
  const session = await auth()
  
  // 1. Verifica se o usuário está logado
  if (!session?.user?.id) {
    redirect("/login")
  }

  const targetTenantId = BigInt(tenantId)
  const userId = BigInt(session.user.id)

  // 2. BLINDAGEM MULTI-TENANT: Verifica se o usuário realmente tem vínculo ativo com a empresa solicitada
  const vinculoEmpresa = await prisma.ycUsuariosEmpresas.findFirst({
    where: {
      usuarioId: userId,
      sysTenantId: targetTenantId,
      ativo: true
    }
  })

  // Se ele tentar acessar um Tenant (Empresa) que não lhe pertence, o sistema barra!
  if (!vinculoEmpresa) {
    throw new Error("Acesso negado: Você não possui permissão para acessar o ambiente desta empresa.")
  }

  // 3. Se passou pela segurança, atualiza o cookie de contexto
  const cookieStore = await cookies()
  cookieStore.set("tenant-id", tenantId.toString(), { 
    path: "/", 
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  })

  redirect(url)
}