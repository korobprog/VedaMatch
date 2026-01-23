'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { ScrollSection } from './ScrollSection';
import { LogOut, User as UserIcon, Grid } from 'lucide-react';

export default function LandingPage() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const data = localStorage.getItem('admin_data');
        if (data) {
            setUser(JSON.parse(data));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('admin_data');
        setUser(null);
        router.refresh();
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    return (
        <div className="min-h-screen bg-[#faf9f6]">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#faf9f6]/80 backdrop-blur-md border-b border-[#e7e5e4]">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-orange-400 to-red-500 rounded-lg flex items-center justify-center text-white font-bold">
                            V
                        </div>
                        <span className="text-xl font-bold text-[#2c1810]">VedaMatch</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-6">
                                <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                    <div className="w-8 h-8 bg-[#2c1810]/5 rounded-full flex items-center justify-center border border-[#e7e5e4]">
                                        <UserIcon className="w-4 h-4 text-[#2c1810]" />
                                    </div>
                                    <span className="text-[#2c1810] font-medium hidden sm:inline">
                                        {user.spiritualName || user.email}
                                    </span>
                                </Link>
                                <Link
                                    href="/user/dashboard"
                                    className="px-4 py-2 bg-[#2c1810]/5 hover:bg-[#2c1810]/10 rounded-lg text-sm font-bold text-[#2c1810] transition-all flex items-center gap-2"
                                >
                                    <Grid className="w-4 h-4" />
                                    Портал
                                </Link>
                                {isAdmin && (
                                    <Link
                                        href="/dashboard"
                                        className="bg-[#2c1810] text-[#faf9f6] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4a2c20] transition-colors"
                                    >
                                        Админ Панель
                                    </Link>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-[#5c4d47] hover:text-[#2c1810] transition-colors"
                                    title="Выйти"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link href="/login" className="text-[#5c4d47] hover:text-[#2c1810] font-medium transition-colors">
                                    Вход
                                </Link>
                                <Link
                                    href="/register"
                                    className="bg-[#2c1810] text-[#faf9f6] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4a2c20] transition-colors"
                                >
                                    Регистрация
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main>
                <HeroSection />
                <FeaturesSection />
                <ScrollSection />
            </main>

            {/* Footer */}
            <footer className="bg-[#2c1810] text-[#faf9f6] py-12">
                <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-xl font-bold mb-4">VedaMatch</h3>
                        <p className="text-white/60">
                            Современные технологии на службе вечных ценностей.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Разделы</h4>
                        <ul className="space-y-2 text-white/60">
                            <li><Link href="/" className="hover:text-white transition-colors">Главная</Link></li>
                            <li><Link href="/login" className="hover:text-white transition-colors">Авторизация</Link></li>
                            <li><Link href="/admin-login" className="hover:text-white transition-colors">Панель управления</Link></li>
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
                    © 2025 VedaMatch Agent. All rights reserved. Hare Krishna.
                </div>
            </footer>
        </div>
    );
}
