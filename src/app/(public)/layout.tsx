export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    // [CORREÇÃO] h-screen + overflow-y-auto:
    // Isso cria uma "janela de rolagem" independente para a área pública,
    // ignorando o 'overflow: hidden' que o layout raiz usa para o Dashboard.
    <div className="h-screen w-full overflow-y-auto bg-white font-sans antialiased">
      {children}
    </div>
  )
}