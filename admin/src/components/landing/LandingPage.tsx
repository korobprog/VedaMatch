'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { ScrollSection } from './ScrollSection';
import { PhilosophySection } from './PhilosophySection';
import { TeamSection } from './TeamSection';
import { UnionPresentationSection } from './UnionPresentationSection';
import { motion } from 'framer-motion';
import { LogOut, User as UserIcon, Grid, ArrowRight, MessageCircle, Sparkles } from 'lucide-react';

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
        <div className="min-h-screen bg-[#faf9f6] selection:bg-orange-200">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#faf9f6]/80 backdrop-blur-xl border-b border-[#e7e5e4]">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-orange-400 to-red-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg transform rotate-3">
                            V
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-[#2c1810] leading-none">VedaMatch</span>
                            <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mt-1">Ecosystem Agent</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {user ? (
                            <div className="flex items-center gap-6">
                                <Link href="/profile" className="flex items-center gap-3 group">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-[#e7e5e4] shadow-sm group-hover:border-orange-300 transition-colors overflow-hidden relative">
                                        <UserIcon className="w-5 h-5 text-[#2c1810]" />
                                    </div>
                                    <span className="text-[#2c1810] font-semibold hidden sm:inline group-hover:text-orange-600 transition-colors">
                                        {user.spiritualName || user.email}
                                    </span>
                                </Link>
                                <Link
                                    href="/user/dashboard"
                                    className="px-5 py-2.5 bg-[#2c1810] hover:bg-[#4a2c20] rounded-xl text-sm font-bold text-white shadow-lg transition-all flex items-center gap-2"
                                >
                                    <Grid className="w-4 h-4" />
                                    Портал
                                </Link>
                                {isAdmin && (
                                    <Link
                                        href="/dashboard"
                                        className="bg-white text-[#2c1810] border border-[#e7e5e4] px-5 py-2.5 rounded-xl text-sm font-bold hover:border-orange-200 hover:bg-orange-50 transition-all shadow-sm flex items-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4 text-orange-500" />
                                        Админ
                                    </Link>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="w-10 h-10 flex items-center justify-center text-[#5c4d47] hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 rounded-xl transition-all"
                                    title="Выйти"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-5">
                                <Link href="/login" className="text-[#5c4d47] hover:text-[#2c1810] font-bold transition-colors">
                                    Вход
                                </Link>
                                <Link
                                    href="/register"
                                    className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
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
                <div id="features" className="scroll-mt-20">
                    <FeaturesSection />
                </div>
                <PhilosophySection />
                <UnionPresentationSection />
                <TeamSection />

                {/* Community Section */}
                <section className="py-32 bg-[#faf9f6] relative overflow-hidden">
                    <div className="container mx-auto px-4 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="max-w-5xl mx-auto bg-gradient-to-br from-[#2c1810] to-[#1a0f0a] rounded-[4rem] p-12 md:p-20 text-center text-[#faf9f6] shadow-[0_40px_100px_-20px_rgba(44,24,16,0.5)] relative overflow-hidden group"
                        >
                            {/* Decorative background elements */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] -mr-64 -mt-64 group-hover:opacity-20 transition-opacity" />
                            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[100px] -ml-64 -mb-64 group-hover:opacity-20 transition-opacity" />

                            <div className="relative z-10">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    whileInView={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-white/10 backdrop-blur-xl shadow-2xl"
                                >
                                    <MessageCircle className="w-12 h-12 text-orange-400" />
                                </motion.div>

                                <h2 className="text-5xl md:text-7xl font-serif mb-8 leading-tight">Присоединяйтесь к <span className="text-orange-400 italic">Сангхе</span></h2>

                                <p className="text-2xl text-[#faf9f6]/60 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
                                    Обсуждайте развитие экосистемы, предлагайте свои идеи и общайтесь с единомышленниками. Вместе мы создаем технологии будущего в служении преданным.
                                </p>

                                <a
                                    href="https://t.me/vedamatch"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-4 bg-orange-500 text-white px-12 py-6 rounded-[2rem] font-black text-xl hover:bg-orange-600 transition-all hover:scale-105 active:scale-95 shadow-[0_15px_30px_-5px_rgba(249,115,22,0.4)]"
                                >
                                    В наш Телеграм
                                    <ArrowRight className="w-6 h-6" />
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </section>

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
