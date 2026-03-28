import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { SessionProvider } from "@/components/session-context";
import { getThemeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "VedaMatch Web",
  description: "Full web foundation for VedaMatch user portal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="vm-theme-init" strategy="beforeInteractive">
          {getThemeInitScript()}
        </Script>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
