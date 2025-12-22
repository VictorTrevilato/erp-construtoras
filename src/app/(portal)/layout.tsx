import { Sidebar } from "@/components/Sidebar"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar title="Área do Cliente" color="bg-green-600" profile="portal" />
      <main className="flex-1 ml-64 p-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  )
}