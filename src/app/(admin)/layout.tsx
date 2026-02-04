import { Sidebar } from "@/components/sidebar"
import { ThemeWrapper } from "@/components/theme-wrapper"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeWrapper theme="theme-admin">
      <div className="flex h-screen bg-gray-50">
        <Sidebar title="VHF System" color="bg-purple-700" profile="admin" showTenantSwitch={false} />
        <main className="flex-1 ml-72 p-8 overflow-y-auto">
          <div className="min-h-screen w-full">
            {children}
          </div>
        </main>
      </div>
    </ThemeWrapper>
  )
}