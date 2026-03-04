import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Início | YouCenter",
  },
  description: "YouCenter - ERP para Construtoras",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [
      { rel: "icon", url: "/android-chrome-192x192.png", sizes: "192x192" },
      { rel: "icon", url: "/android-chrome-512x512.png", sizes: "512x512" },
    ],
  },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full overflow-y-auto bg-background font-sans antialiased">
      {children}
    </div>
  );
}