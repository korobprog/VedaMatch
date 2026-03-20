import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import AdminLayout from '@/components/AdminLayout';
import OfflineIndicator from '@/components/OfflineIndicator';
import YandexMetrika from '@/components/yandex-metrika';
import YandexMetrikaScripts from '@/components/yandex-metrika-scripts';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });
import { ToastProvider } from '@/components/ui/ToastProvider';

export const metadata: Metadata = {
  title: 'VedaMatch Admin Panel',
  description: 'Control center for VedaMatch Backend & Frontend',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VedaMatch',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <YandexMetrikaScripts />
        <Suspense fallback={null}>
          <YandexMetrika />
        </Suspense>
        <OfflineIndicator />
        <ToastProvider>
          <AdminLayout>{children}</AdminLayout>
        </ToastProvider>
      </body>
    </html>
  );
}
