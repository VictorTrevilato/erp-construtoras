"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"
import { cookies } from "next/headers"

// Action temporária para criar o primeiro usuário (Seed Manual)
export async function registerFirstUser() {
  const email = "admin@construtora.com"
  const password = "admin"
  const nome = "Administrador Sistema"

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const exists = await prisma.ycUsuarios.findUnique({ where: { email } })
    if (exists) return { success: false, message: "Usuário já existe. Delete-o no banco se quiser recriar." }

    await prisma.ycUsuarios.create({
      data: {
        nome,
        email,
        passwordHash: hashedPassword,
        ativo: true,
        isSuperAdmin: true,
        sysCreatedAt: new Date()
      }
    })

    return { success: true, message: "Usuário Admin criado com sucesso!" }
  } catch (error) {
    console.error("Erro ao registrar:", error)
    return { success: false, message: "Erro ao criar usuário." }
  }
}

// Action de Login (Corrigida e Tipada)
export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    // 1. Extrair dados do formulário
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // 2. Verificação Manual no Banco (Antes do SignIn)
    // Isso nos permite decidir o cookie e o destino ANTES de criar a sessão
    const user = await prisma.ycUsuarios.findUnique({
      where: { email },
      include: {
        // [CORREÇÃO] O nome da relação no schema.prisma (linha 47) é 'usuariosEmpresas'
        usuariosEmpresas: {
          where: { 
            ativo: true, 
            ycEmpresas: { ativo: true } 
          },
          select: { sysTenantId: true }
        }
      }
    })

    // Validação Manual de Senha
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return "Credenciais inválidas."
    }

    // 3. Lógica de Destino e Cookie
    // [CORREÇÃO] Acessando a propriedade correta 'usuariosEmpresas'
    const activeTenants = user.usuariosEmpresas
    let destinationUrl = "/select-org" // Padrão

    if (activeTenants.length === 1) {
      // Cenário: Usuário tem apenas 1 empresa -> Vai direto pro Dashboard
      const tenantId = activeTenants[0].sysTenantId.toString()
      
      const cookieStore = await cookies()
      cookieStore.set("tenant-id", tenantId)
      
      destinationUrl = "/app/dashboard"
    }

    // 4. Executa o SignIn Oficial do NextAuth
    // Passamos 'redirectTo' nas opções para garantir o redirecionamento correto
    await signIn("credentials", formData, { redirectTo: destinationUrl })

  } catch (error) {
    // Tratamento de Erros do NextAuth
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Credenciais inválidas."
        default:
          return "Algo deu errado."
      }
    }
    // O 'signIn' lança um erro do tipo NEXT_REDIRECT quando tem sucesso.
    // Precisamos relançar esse erro para o redirecionamento funcionar.
    throw error
  }
}

// Action de Logout
export async function serverSignOut() {
  await signOut({ redirectTo: "/login" })
}