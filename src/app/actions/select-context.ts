"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function selectContextAction(tenantId: string, url: string) {
  const cookieStore = await cookies()
  cookieStore.set("tenant-id", tenantId.toString(), { 
    path: "/", 
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  })

  redirect(url)
}