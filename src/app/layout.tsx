import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";
import { getTenantSettings } from "@/app/actions/tenant-settings";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantSettings();

  const defaultTitle = tenant?.nome || "YouCenter";
  const iconPath = tenant?.favicon || tenant?.logoMini;
  
  const baseUrl = process.env.STORAGE_BASE_URL?.replace(/\/$/, '') || '';
  const customIcon = iconPath 
    ? (iconPath.startsWith('http') ? iconPath : `${baseUrl}/${iconPath}`)
    : null;

  return {
    title: {
      template: `%s | ${defaultTitle}`,
      default: defaultTitle,
    },
    description: "YouCenter - ERP para Construtoras",
    icons: customIcon
      ? [
          { rel: "icon", url: customIcon },
          { rel: "apple-touch-icon", url: customIcon },
        ]
      : {
          icon: [
            { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
            { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
          ],
          apple: [{ url: "/apple-touch-icon.png" }],
          other: [
            { rel: "icon", url: "/android-chrome-192x192.png", sizes: "192x192" },
            { rel: "icon", url: "/android-chrome-512x512.png", sizes: "512x512" },
          ],
        },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
        
        <Toaster richColors />
      </body>
    </html>
  );
}