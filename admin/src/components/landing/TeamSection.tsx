'use client';

import { motion } from 'framer-motion';
import { Mail, Globe, Github, Quote } from 'lucide-react';
import Image from 'next/image';

const team = [
    {
        name: 'Шрила Прабхупада',
        role: 'Духовный Наставник',
        bio: 'Основатель-ачарья ИСККОН, чья мудрость и наставления являются фундаментом нашего проекта. Мы стремимся использовать современные технологии для распространения знания, которое он дал миру.',
        image: '/vaishnava_portrait.png',
        specialty: 'Философское видение',
        color: '#F97316' // Orange
    },
    {
        name: 'Артем Мамушев',
        role: 'Основатель и Архитектор',
        bio: 'Разработчик с глубоким пониманием как технологических процессов, так и ведической философии. Создает мосты между древней мудростью и будущим цифрового мира через VedaMatch.',
        image: '/krishnaAssistant.png',
        specialty: 'Системная архитектура',
        color: '#6366F1' // Indigo
    },
    {
        name: 'Алексей Иванов',
        role: 'Lead AI Engineer',
        bio: 'Специалист по машинному обучению, занимающийся адаптацией языковых моделей для корректной интерпретации священных текстов и помощи в духовной практике.',
        image: '/vaishnava_group.png',
        specialty: 'Нейронные сети',
        color: '#EC4899' // Pink
    },
    {
        name: 'Мария Сарасвати',
        role: 'UX/UI & Community',
        bio: 'Дизайнер и менеджер сообщества, которая заботится о том, чтобы интерфейс был не только удобным, но и эстетически соответствовал вайшнавской культуре.',
        image: '/krishna_bg.png',
        specialty: 'Дизайн и Культура',
        color: '#10B981' // Emerald
    }
];

export function TeamSection() {
    return (
        <section className="py-32 bg-[#faf9f6] relative overflow-hidden" id="team">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100/30 rounded-full blur-[120px] -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-100/30 rounded-full blur-[120px] -ml-64 -mb-64" />

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-20"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-block px-4 py-1.5 mb-6 rounded-full bg-orange-100/50 border border-orange-200 text-orange-800 text-sm font-bold tracking-widest uppercase"
                    >
                        Создатели Проекта
                    </motion.div>
                    <h2 className="text-5xl md:text-6xl font-serif text-[#2c1810] mb-8 leading-tight">
                        Команда <span className="text-orange-600">Единомышленников</span>
                    </h2>
                    <div className="w-32 h-1.5 bg-gradient-to-r from-orange-400 to-red-500 mx-auto rounded-full mb-10" />
                    <p className="text-xl text-[#5c4d47] leading-relaxed font-light">
                        Мы объединили современную инженерную мысль и преданность ведическим стандартам, чтобы создать инструменты для новой эпохи духовного развития.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {team.map((member, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -12 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                            className="bg-white/70 backdrop-blur-md rounded-[2.5rem] p-1 border border-[#e7e5e4] shadow-xl hover:shadow-2xl transition-all duration-500 group"
                        >
                            <div className="p-7 flex flex-col h-full">
                                {/* Image Container */}
                                <div className="relative w-full aspect-[4/5] mb-8 rounded-[2rem] overflow-hidden shadow-inner group-hover:scale-[1.02] transition-transform duration-500">
                                    <Image
                                        src={member.image}
                                        alt={member.name}
                                        fill
                                        className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810]/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                                    {/* Specialty Badge */}
                                    <div className="absolute bottom-4 left-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl px-3 py-2 text-[10px] font-bold text-white uppercase tracking-tighter text-center">
                                        {member.specialty}
                                    </div>
                                </div>

                                <div className="flex-grow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-2xl font-serif text-[#2c1810] leading-tight">
                                                {member.name}
                                            </h3>
                                            <p className="text-sm font-medium text-orange-600 mt-1 uppercase tracking-wider">
                                                {member.role}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <Quote className="absolute -left-2 -top-2 w-4 h-4 text-orange-200" />
                                        <p className="text-[#5c4d47] text-sm leading-relaxed pl-3 border-l-2 border-orange-100 italic">
                                            {member.bio}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-[#e7e5e4] flex items-center justify-center gap-6 text-[#2c1810]/30">
                                    <Mail className="w-5 h-5 cursor-pointer hover:text-orange-500 transition-colors" />
                                    <Globe className="w-5 h-5 cursor-pointer hover:text-orange-500 transition-colors" />
                                    <Github className="w-5 h-5 cursor-pointer hover:text-orange-500 transition-colors" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
