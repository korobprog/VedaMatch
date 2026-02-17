'use client';

import { motion } from 'framer-motion';
import { Mail, Globe, Github } from 'lucide-react';
import Image from 'next/image';

const team = [
    {
        name: 'Его Божественная Милость А.Ч. Бхактиведанта Свами Прабхупада',
        role: 'Основатель-ачарья ИСККОН',
        bio: 'Выдающийся ученый и философ, который принес ведическую мудрость всему миру. Его наставления вдохновляют технологическое развитие для служения преданным.',
        image: '/vaishnava_portrait.png', // Используем существующие в проекте ресурсы
        accent: '#FB923C'
    },
    {
        name: 'Артем Мамушев',
        role: 'Ведущий архитектор проекта',
        bio: 'Визионер и разработчик, ответственный за техническую стратегию и инновации в экосистеме VedaMatch. Стремится объединить технологичность и духовные ценности.',
        image: '/krishnaAssistant.png',
        accent: '#6366F1'
    },
    {
        name: 'Команда Поддержки',
        role: 'Работа с сообществом',
        bio: 'Наши менеджеры всегда на связи, чтобы помочь каждому пользователю найти свой путь в приложении и ответить на любые вопросы.',
        image: '/vaishnava_group.png',
        accent: '#EF4444'
    }
];

export function TeamSection() {
    return (
        <section className="py-24 bg-[#faf9f6]">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-20"
                >
                    <h2 className="text-4xl md:text-5xl font-serif text-[#2c1810] mb-6">
                        Наша <span className="italic">Команда</span>
                    </h2>
                    <div className="w-24 h-1 bg-gradient-to-r from-orange-400 to-red-500 mx-auto rounded-full mb-8" />
                    <p className="text-xl text-[#5c4d47] leading-relaxed">
                        Мы объединили усилия, чтобы создать инструменты, которые помогают преданным расти и служить еще эффективнее.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {team.map((member, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            whileHover={{ y: -10 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white rounded-3xl p-8 shadow-2xl shadow-[#2c1810]/5 border border-[#e7e5e4] flex flex-col h-full group"
                        >
                            <div className="relative w-full aspect-square mb-8 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500 border-2 border-[#faf9f6]">
                                <Image
                                    src={member.image}
                                    alt={member.name}
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810]/40 to-transparent" />
                            </div>

                            <div className="flex-grow">
                                <h3 className="text-2xl font-serif text-[#2c1810] mb-2 leading-tight">
                                    {member.name}
                                </h3>
                                <p className="text-sm font-bold uppercase tracking-widest text-[#5c4d47] mb-4 opacity-70">
                                    {member.role}
                                </p>
                                <p className="text-[#5c4d47] leading-relaxed italic">
                                    "{member.bio}"
                                </p>
                            </div>

                            <div className="mt-8 pt-6 border-t border-[#e7e5e4] flex items-center gap-4 text-[#2c1810]/40">
                                <Mail className="w-5 h-5 cursor-pointer hover:text-orange-400 transition-colors" />
                                <Globe className="w-5 h-5 cursor-pointer hover:text-orange-400 transition-colors" />
                                <Github className="w-5 h-5 cursor-pointer hover:text-orange-400 transition-colors" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
