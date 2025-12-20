import { auth, signOut } from "@/auth"

export default async function Dashboard() {
  const session = await auth()

  return (
    <div className="p-10 font-sans">
      <h1 className="text-2xl font-bold text-green-700">Login Realizado com Sucesso! 🔓</h1>
      
      <div className="mt-6 p-4 bg-white shadow rounded border">
        <h2 className="font-bold text-lg mb-2">Dados da Sessão (Auth.js + Prisma):</h2>
        <ul className="space-y-1 text-gray-700">
          <li><strong>Nome:</strong> {session?.user?.name}</li>
          <li><strong>Email:</strong> {session?.user?.email}</li>
          <li><strong>ID (Banco):</strong> {session?.user?.id}</li>
        </ul>
      </div>

      <form
        action={async () => {
          "use server"
          await signOut({ redirectTo: "/login" })
        }}
      >
        <button className="mt-6 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition">
          Sair do Sistema
        </button>
      </form>
    </div>
  )
}