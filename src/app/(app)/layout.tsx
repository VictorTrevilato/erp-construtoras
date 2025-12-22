import { Sidebar } from "@/components/Sidebar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar title="YouCon ERP" color="bg-blue-700" profile="erp" />
      
      <main className="flex-1 ml-64 p-8">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}