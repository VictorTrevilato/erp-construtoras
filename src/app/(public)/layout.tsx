export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // Layout específico de public (ex: fundo cinza, centralizado)
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      {children}
    </div>
  )
}