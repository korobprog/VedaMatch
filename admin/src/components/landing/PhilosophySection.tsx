'use client';

import { motion } from 'framer-motion';
import { Compass, Zap, Users2, Library } from 'lucide-react';

const pillars = [
    {
        icon: Compass,
        title: 'Традиция',
        text: 'Мы опираемся на неизменные наставления ачарьев и священных писаний, адаптируя форму, но сохраняя суть.'
    },
    {
        icon: Zap,
        title: 'Инновации',
        text: 'Использование AI и передовых архитектур для ускорения проповеди и упрощения повседневной духовной практики.'
    },
    {
        icon: Users2,
        title: 'Община',
        text: 'Создание безопасной и вдохновляющей цифровой среды для сангхи, где каждый может найти поддержку и служение.'
    },
    {
        icon: Library,
        title: 'Образование',
        text: 'Доступ к знаниям в интерактивном формате, помогающий систематизировать изучение шастр в любом месте.'
    }
];

export function PhilosophySection() {
    return (
        <section className="py-24 bg-[#2c1810] text-[#faf9f6] relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[100px] -mr-48 -mt-48" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px] -ml-48 -mb-48" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col lg:flex-row gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="lg:w-1/2"
                    >
                        <h2 className="text-4xl md:text-5xl font-serif mb-8 leading-tight">
                            Философия <br />
                            <span className="text-orange-400 italic">VedaMatch Agent</span>
                        </h2>
                        <p className="text-xl text-white/70 mb-10 leading-relaxed font-light">
                            Век Кали диктует свои правила, но преданность остается неизменной. Мы верим, что технологии — это лишь инструменты, которые должны служить высшей цели: соединению сердец с Божественным и друг другом.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {pillars.map((pillar, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex flex-col gap-4"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center text-orange-400">
                                        <pillar.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold">{pillar.title}</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">{pillar.text}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="lg:w-1/2 relative"
                    >
                        <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl border border-white/10">
                            <img
                                src="/krishna_bg.png"
                                alt="Mission Illustration"
                                className="w-full h-auto object-cover opacity-80"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810] via-transparent to-[#2c1810]/40" />

                            {/* Floating Quote */}
                            <div className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20">
                                <p className="text-white italic text-lg leading-relaxed">
                                    "Используйте все ради Кришны. Это и есть истинное отречение и совершенство жизни в современном мире."
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
