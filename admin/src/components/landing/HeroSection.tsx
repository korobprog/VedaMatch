'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Monitor, Sparkles, Wand2 } from 'lucide-react';
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
        <section className="relative min-h-[90vh] flex flex-col items-center overflow-hidden bg-[#faf9f6] pt-32 pb-20">
            {/* Animated Background Elements */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                    opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-orange-200/40 to-transparent rounded-full blur-[100px] pointer-events-none"
            />
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    rotate: [0, -45, 0],
                    opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-gradient-to-tl from-indigo-200/30 to-transparent rounded-full blur-[120px] pointer-events-none"
            />

            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2v-4h4v-2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
            />

            {/* Content */}
            <div className="z-10 container mx-auto px-4 text-center max-w-5xl mb-16 relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold tracking-[0.2em] uppercase"
                >
                    <Sparkles className="w-4 h-4" />
                    Evolution of Sanatana Dharma
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="text-6xl md:text-8xl font-serif text-[#2c1810] mb-8 tracking-tight leading-[0.95]"
                >
                    Духовные Технологии
                    <br />
                    <span className="text-orange-600 italic font-medium">Нового Времени</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                    className="text-2xl text-[#5c4d47] mb-12 max-w-3xl mx-auto leading-relaxed font-light"
                >
                    Слияние <span className="font-semibold text-[#2c1810]">Ведической Мудрости</span> и <span className="font-semibold text-[#2c1810]">Искусственного Интеллекта</span> для глубокого служения и общения в цифровую эпоху.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                    className="flex flex-wrap items-center justify-center gap-5"
                >
                    <Link href="/register" className="flex items-center gap-3 bg-[#2c1810] text-[#faf9f6] px-8 py-4 rounded-2xl hover:bg-[#4a2c20] transition-all hover:scale-105 active:scale-95 shadow-xl group">
                        <span className="font-bold text-lg">Присоединиться</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link href="#features" className="flex items-center gap-3 bg-white text-[#2c1810] px-8 py-4 rounded-2xl hover:bg-[#faf9f6] transition-all hover:border-orange-200 border border-[#e7e5e4] shadow-md group">
                        <Wand2 className="w-5 h-5 text-orange-500" />
                        <span className="font-bold text-lg">Узнать больше</span>
                    </Link>
                </motion.div>
            </div>

            {/* Curved Portrait Cards Row */}
            <div className="relative w-full h-[350px] md:h-[450px] mt-12 overflow-visible">
                <div className="absolute inset-0 flex items-center justify-center">
                    {portraitCards.map((card, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 150, scale: 0.8 }}
                            animate={{
                                opacity: 1,
                                y: card.y,
                                x: card.x,
                                scale: card.scale,
                                rotate: card.rotate,
                            }}
                            whileHover={{
                                scale: card.scale * 1.1,
                                y: card.y - 20,
                                zIndex: 10,
                                transition: { duration: 0.3 }
                            }}
                            transition={{ duration: 0.8, delay: 0.3 + idx * 0.1, type: 'spring', stiffness: 80 }}
                            style={{ zIndex: card.z }}
                            className="absolute w-[140px] h-[200px] md:w-[190px] md:h-[280px] rounded-[2rem] overflow-hidden shadow-2xl border-[6px] border-white bg-[#e8e0d5] cursor-pointer"
                        >
                            <Image
                                src={card.src}
                                alt={`Portrait ${idx + 1}`}
                                fill
                                className="object-cover hover:scale-110 transition-transform duration-700"
                            />
                        </motion.div>
                    ))}
                </div>

                {/* Mask for smooth transition */}
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#faf9f6] via-[#faf9f6]/80 to-transparent z-10 pointer-events-none" />
            </div>
        </section>
    );
}
