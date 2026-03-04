export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full overflow-y-auto bg-background font-sans antialiased">
      {children}
    </div>
  )
}