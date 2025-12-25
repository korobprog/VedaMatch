import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AdminLayout from '@/components/AdminLayout';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'VedicAI Admin Panel',
  description: 'Control center for VedicAI Backend & Frontend',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AdminLayout>{children}</AdminLayout>
      </body>
    </html>
  );
}
