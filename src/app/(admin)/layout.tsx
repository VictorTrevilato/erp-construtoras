import { Sidebar } from "@/components/Sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Passamos apenas a string 'admin' */}
      <Sidebar title="VHF System" color="bg-purple-700" profile="admin" />

      {/* Ajustamos a margem esquerda (ml-64) para compensar a sidebar fixa */}
      <main className="flex-1 ml-64 p-8">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}