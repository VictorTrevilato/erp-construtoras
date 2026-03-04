import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Redefinir Senha | YouCenter",
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}