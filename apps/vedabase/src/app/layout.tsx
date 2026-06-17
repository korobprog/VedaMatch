import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { SessionProvider } from "@/components/session-context";
import { getRequestSurface } from "@/lib/request-surface";
import { getThemeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Vedabase — Ведическая библиотека",
  description: "Читайте ведические книги онлайн и офлайн. Единый аккаунт VedaMatch.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/icon-512.png",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { language } = await getRequestSurface();

  return (
    <html lang={language} suppressHydrationWarning>
      <body>
        <Script id="vm-theme-init" strategy="beforeInteractive">
          {getThemeInitScript()}
        </Script>
        <SessionProvider initialLanguage={language}>{children}</SessionProvider>
      </body>
    </html>
  );
}
