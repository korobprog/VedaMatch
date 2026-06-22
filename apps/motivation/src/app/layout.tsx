import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motivation — VedaMatch",
  description: "Daily AI-crafted motivational posts in the world's top languages.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
