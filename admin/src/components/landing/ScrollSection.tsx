'use client';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';

const galleryImages = [
    // Top Left
    { src: '/vaishnava_group.png', alt: 'Kirtan', style: { top: '5%', left: '5%' }, rotate: -6 },
    // Top Right
    { src: '/krishna_bg.png', alt: 'Temple', style: { top: '10%', right: '5%' }, rotate: 5 },
    // Center Left
    { src: '/vaishnava_portrait.png', alt: 'Study', style: { top: '40%', left: '2%' }, rotate: 3 },
    // Center Right
    { src: '/krishnaAssistant.png', alt: 'Meditation', style: { top: '45%', right: '2%' }, rotate: -4 },
    // Bottom Left
    { src: '/vaishnava_group.png', alt: 'Service', style: { bottom: '5%', left: '10%' }, rotate: -5 },
    // Bottom Right
    { src: '/vaishnava_portrait.png', alt: 'Devotion', style: { bottom: '10%', right: '8%' }, rotate: 6 },
];

export function ScrollSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start end', 'end start'],
    });

    const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
    const y = useSpring(useTransform(scrollYProgress, [0, 1], [50, -50]), springConfig);
    const yReverse = useSpring(useTransform(scrollYProgress, [0, 1], [-50, 50]), springConfig);

    return (
        <section ref={containerRef} className="py-32 bg-[#fffbeb] overflow-hidden min-h-screen flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />

            <div className="container mx-auto px-4 relative z-30 text-center pointer-events-none">
                <div className="bg-[#fffbeb]/80 backdrop-blur-md p-8 md:p-12 rounded-[2rem] inline-block shadow-sm pointer-events-auto border border-white/20">
                    <motion.h2
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-serif text-[#2c1810] mb-6"
                    >
                        Вдохновение в каждом моменте
                    </motion.h2>
                    <p className="text-[#5c4d47] max-w-xl mx-auto text-lg leading-relaxed">
                        Погрузитесь в атмосферу преданности и служения. Наша платформа помогает сохранять и приумножать эти ценности.
                    </p>
                </div>
            </div>

            <div className="absolute inset-0 pointer-events-none z-0">
                {/* Animated floating images */}
                {galleryImages.map((img, idx) => {
                    const isEven = idx % 2 === 0;
                    const yMove = isEven ? y : yReverse;

                    return (
                        <motion.div
                            key={idx}
                            style={{
                                y: yMove,
                                rotate: img.rotate,
                                ...img.style
                            }}
                            className="absolute w-40 h-52 md:w-64 md:h-80 shadow-2xl rounded-lg overflow-hidden border-4 border-white hidden md:block"
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, delay: idx * 0.1 }}
                        >
                            <Image
                                src={img.src}
                                alt={img.alt}
                                fill
                                className="object-cover hover:scale-110 transition-transform duration-700"
                            />
                        </motion.div>
                    )
                })}

                {/* Mobile version (static grid) */}
                <div className="md:hidden grid grid-cols-2 gap-4 px-4 w-full">
                    {galleryImages.slice(0, 4).map((img, idx) => (
                        <div key={idx} className="aspect-[3/4] relative rounded-xl overflow-hidden shadow-lg border-2 border-white">
                            <Image src={img.src} alt={img.alt} fill className="object-cover" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
