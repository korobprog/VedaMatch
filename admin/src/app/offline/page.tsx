'use client';

import { WifiOff, Home } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black p-6 text-center">
            <div className="mb-8 p-6 rounded-full bg-red-500/10 border border-red-500/20">
                <WifiOff className="w-16 h-16 text-red-500 animate-pulse" />
            </div>

            <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                Вы находитесь в офлайне
            </h1>

            <p className="text-gray-400 max-w-md mb-12 text-lg">
                Похоже, соединение с интернетом прервано. VedaMatch может работать в ограниченном режиме, но для полной функциональности требуется сеть.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                    Обновить страницу
                </button>

                <Link
                    href="/"
                    className="px-8 py-3 bg-transparent border border-gray-800 text-white font-semibold rounded-xl hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                >
                    <Home className="w-4 h-4" />
                    На главную
                </Link>
            </div>

            <div className="mt-16 text-sm text-gray-500">
                <p>VedaMatch • Офлайн-режим</p>
            </div>
        </div>
    );
}
