"use client"

import { useActionState, useState } from "react" // Atualizado para hook estável se possível, mas useActionState é do React 19
import { authenticate, registerFirstUser } from "@/app/actions/auth-actions"

export default function LoginPage() {
  const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined)
  const [seedMessage, setSeedMessage] = useState("")

  const handleCreateAdmin = async () => {
    setSeedMessage("Criando...")
    const res = await registerFirstUser()
    setSeedMessage(res.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md">
        
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">ERP Construtoras</h2>
          <p className="mt-2 text-sm text-gray-600">Acesso Restrito</p>
        </div>

        <form action={dispatch} className="mt-8 space-y-6">
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <input
                name="email"
                type="email"
                required
                className="relative block w-full rounded-t-md border-0 p-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Email: admin@construtora.com"
              />
            </div>
            <div>
              <input
                name="password"
                type="password"
                required
                className="relative block w-full rounded-b-md border-0 p-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Senha"
              />
            </div>
          </div>

          <div className="text-red-500 text-sm text-center font-medium min-h-[20px]">
            {errorMessage && <p>{errorMessage}</p>}
          </div>

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-300"
            >
              {isPending ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t pt-4 text-center">
          <p className="text-xs text-gray-500 mb-2">Primeiro Acesso (Desenvolvimento)</p>
          <button
            onClick={handleCreateAdmin}
            className="text-xs text-blue-600 hover:underline font-bold"
          >
            Gerar Usuário Admin
          </button>
          {seedMessage && <p className="text-xs text-green-600 mt-2">{seedMessage}</p>}
        </div>
      </div>
    </div>
  )
}