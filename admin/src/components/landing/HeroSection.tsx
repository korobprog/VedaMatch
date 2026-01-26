'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Monitor } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Portrait cards data with positioning for the arc/curve effect
const portraitCards = [
    { src: '/portrait_meditation.png', rotate: -15, x: -420, y: 60, scale: 0.7, z: 1 },
    { src: '/portrait_altar.png', rotate: -10, x: -280, y: 30, scale: 0.85, z: 2 },
    { src: '/krishnaAssistant.png', rotate: -5, x: -140, y: 10, scale: 0.95, z: 3 },
    { src: '/vaishnava_portrait.png', rotate: 0, x: 0, y: 0, scale: 1, z: 4 }, // Center
    { src: '/vaishnava_group.png', rotate: 5, x: 140, y: 10, scale: 0.95, z: 3 },
    { src: '/krishna_bg.png', rotate: 10, x: 280, y: 30, scale: 0.85, z: 2 },
    { src: '/portrait_gathering.png', rotate: 15, x: 420, y: 60, scale: 0.7, z: 1 },
];

export function HeroSection() {
    return (
        <section className="relative min-h-screen flex flex-col items-center overflow-hidden bg-[#faf9f6] pt-24 pb-20">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#fffbeb] via-[#faf9f6] to-[#f5f0e8] z-0 pointer-events-none" />

            {/* Text Content */}
            <div className="z-10 container mx-auto px-4 text-center max-w-4xl mb-12">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="text-5xl md:text-7xl font-serif text-[#2c1810] mb-6 tracking-tight"
                >
                    Духовные Технологии,
                    <br />
                    <span className="font-bold">Ведическая Мудрость</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                    className="text-xl text-[#5c4d47] mb-10 max-w-2xl mx-auto leading-relaxed"
                >
                    Единая платформа для управления знаниями, общения и служения — быстрее и эффективнее.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                    className="flex flex-wrap items-center justify-center gap-4"
                >
                    {/* App Store */}
                    <button className="flex items-center gap-3 bg-[#1e1e1e] text-white px-5 py-2.5 rounded-full hover:bg-[#2c2c2c] transition-all hover:scale-105 active:scale-95 border border-white/10 shadow-lg group">
                        <div className="w-7 h-7 flex items-center justify-center text-white fill-current">
                            <svg viewBox="0 0 384 512" className="w-5 h-5 fill-current">
                                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
                            </svg>
                        </div>
                        <div className="text-left">
                            <div className="text-[9px] opacity-70 leading-tight">Download on the</div>
                            <div className="text-sm font-semibold leading-tight">App Store</div>
                        </div>
                    </button>

                    {/* Google Play */}
                    <button className="flex items-center gap-3 bg-[#1e1e1e] text-white px-5 py-2.5 rounded-full hover:bg-[#2c2c2c] transition-all hover:scale-105 active:scale-95 border border-white/10 shadow-lg group">
                        <div className="w-7 h-7 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-6 h-6">
                                <path fill="#EA4335" d="M3.61 1.46c-.3.3-.46.75-.46 1.32v18.44c0 .57.17 1.02.47 1.32l.07.07 10.33-10.33v-.24L3.68 1.39l-.07.07z" />
                                <path fill="#FBBC04" d="M17.46 15.72l-3.44-3.44v-.24l3.44-3.44.08.04 4.08 2.32c1.16.66 1.16 1.74 0 2.4l-4.08 2.32-.08.04z" />
                                <path fill="#4285F4" d="M17.54 15.68L14.02 12.16 3.61 22.54c.39.41.98.45 1.74.03l12.19-6.89" />
                                <path fill="#34A853" d="M17.54 8.64L5.35 1.75c-.76-.42-1.35-.38-1.74.03l10.41 10.38 3.52-3.52z" />
                            </svg>
                        </div>
                        <div className="text-left">
                            <div className="text-[9px] opacity-70 leading-tight">GET IT ON</div>
                            <div className="text-sm font-semibold leading-tight">Google Play</div>
                        </div>
                    </button>

                    {/* RuStore */}
                    <button className="flex items-center gap-3 bg-[#1e1e1e] text-white px-5 py-2.5 rounded-full hover:bg-[#2c2c2c] transition-all hover:scale-105 active:scale-95 border border-white/10 shadow-lg group">
                        <div className="w-7 h-7 flex items-center justify-center bg-white rounded-md">
                            <span className="text-black font-extrabold text-base leading-none">R</span>
                        </div>
                        <div className="text-left">
                            <div className="text-[9px] opacity-70 leading-tight">Скачать в</div>
                            <div className="text-sm font-semibold leading-tight">RuStore</div>
                        </div>
                    </button>

                    {/* PWA (Web App) */}
                    <Link href="/register" className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-red-600 text-white px-5 py-2.5 rounded-full hover:from-orange-600 hover:to-red-700 transition-all hover:scale-105 active:scale-95 border border-white/10 shadow-lg group">
                        <div className="w-7 h-7 flex items-center justify-center">
                            <Monitor className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="text-[9px] opacity-70 leading-tight">USE AS</div>
                            <div className="text-sm font-semibold leading-tight">Web PWA</div>
                        </div>
                    </Link>
                </motion.div>
            </div>

            {/* Curved Portrait Cards Row */}
            <div className="relative w-full h-[400px] md:h-[500px] mt-8 overflow-visible">
                <div className="absolute inset-0 flex items-center justify-center">
                    {portraitCards.map((card, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 100, scale: 0.8 }}
                            animate={{
                                opacity: 1,
                                y: card.y,
                                x: card.x,
                                scale: card.scale,
                                rotate: card.rotate,
                            }}
                            transition={{ duration: 0.8, delay: 0.3 + idx * 0.1, type: 'spring', stiffness: 100 }}
                            style={{ zIndex: card.z }}
                            className="absolute w-[140px] h-[200px] md:w-[180px] md:h-[260px] rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-[#e8e0d5]"
                        >
                            <Image
                                src={card.src}
                                alt={`Portrait ${idx + 1}`}
                                fill
                                className="object-cover"
                            />
                        </motion.div>
                    ))}
                </div>

                {/* Curved bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#faf9f6] to-transparent z-10 pointer-events-none" />
            </div>
        </section>
    );
}
