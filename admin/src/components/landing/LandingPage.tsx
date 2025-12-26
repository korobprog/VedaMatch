'use client';

import Link from 'next/link';
import { HeroSection } from './HeroSection';
import { ScrollSection } from './ScrollSection';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#faf9f6]">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#faf9f6]/80 backdrop-blur-md border-b border-[#e7e5e4]">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-orange-400 to-red-500 rounded-lg flex items-center justify-center text-white font-bold">
                            V
                        </div>
                        <span className="text-xl font-bold text-[#2c1810]">Vedic AI</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {process.env.NEXT_PUBLIC_APP_ENV !== 'production' && (
                            <>
                                <Link href="/login" className="text-[#5c4d47] hover:text-[#2c1810] font-medium transition-colors">
                                    Вход
                                </Link>
                                <Link
                                    href="/login"
                                    className="bg-[#2c1810] text-[#faf9f6] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4a2c20] transition-colors"
                                >
                                    Админ Панель
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main>
                <HeroSection />
                <ScrollSection />
            </main>

            {/* Footer */}
            <footer className="bg-[#2c1810] text-[#faf9f6] py-12">
                <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-xl font-bold mb-4">Vedic AI</h3>
                        <p className="text-white/60">
                            Современные технологии на службе вечных ценностей.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Разделы</h4>
                        <ul className="space-y-2 text-white/60">
                            <li>Главная</li>
                            <li>О проекте</li>
                            <li>Контакты</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Ресурсы</h4>
                        <ul className="space-y-2 text-white/60">
                            <li>Документация</li>
                            <li>Блог</li>
                            <li>Сообщество</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Свяжитесь с нами</h4>
                        <p className="text-white/60">iskcon.dev@gmail.com</p>
                    </div>
                </div>
                <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/10 text-center text-white/40 text-sm">
                    © 2025 Vedic AI Agent. All rights reserved. Hare Krishna.
                </div>
            </footer>
        </div>
    );
}
