export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // [CORREÇÃO] Removemos o import 'ThemeWrapper' não usado.
    // [MELHORIA] Removemos classes de padding/bg para deixar a page.tsx controlar 100% da tela.
    <>
      {children}
    </>
  )
}