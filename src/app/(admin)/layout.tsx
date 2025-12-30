import { Sidebar } from "@/components/sidebar-temp"
import { ThemeWrapper } from "@/components/theme-wrapper"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeWrapper theme="theme-admin">
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar title="VHF System" color="bg-purple-700" profile="admin" showTenantSwitch={false} />
        <main className="flex-1 ml-64 p-8">
          <div className="min-h-screen w-full">
            {children}
          </div>
        </main>
      </div>
    </ThemeWrapper>
  )
}