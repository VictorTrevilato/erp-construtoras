"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function selectContextAction(tenantId: string, url: string) {
  // Define o cookie do tenant para as próximas requisições (dura 1 dia)
  // Obs: Converta para string se o ID for BigInt ou number
  (await cookies()).set("tenantId", tenantId.toString(), { path: "/", maxAge: 86400 })

  // Redireciona para o destino (ERP ou Portal)
  redirect(url)
}