import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-context";

export const metadata: Metadata = {
  title: "VedaMatch Web",
  description: "Full web foundation for VedaMatch user portal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
