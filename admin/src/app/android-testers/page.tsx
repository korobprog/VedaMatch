import type { Metadata } from 'next';
import AndroidTestersPageClient from '@/components/android/AndroidTestersPageClient';

export const metadata: Metadata = {
    title: 'Android Testers | VedaMatch',
    description: 'Публичная страница для Android-тестировщиков VedaMatch: APK, инструкция по установке и форма обратной связи.',
    alternates: {
        canonical: 'https://vedamatch.ru/android-testers',
    },
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default function AndroidTestersPage() {
    return <AndroidTestersPageClient />;
}
