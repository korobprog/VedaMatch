'use client';

import { motion } from 'framer-motion';
import {
    ShoppingBag,
    Heart,
    MessageCircle,
    BookOpen,
    Newspaper,
    Sparkles,
    ShieldCheck,
    Coffee,
    HandHelping,
    GraduationCap,
    MapPin,
    Compass,
    Megaphone
} from 'lucide-react';

const features = [
    {
        icon: ShoppingBag,
        title: 'Sattva Market',
        description: 'Маркетплейс для благостной жизни. Находите продукты, одежду и атрибутику от проверенных вайшнавских магазинов. Безопасные сделки и удобная доставка.',
        color: 'from-orange-400 to-red-500',
        delay: 0
    },
    {
        icon: Heart,
        title: 'VedaMatch',
        description: 'Осознанные знакомства. Ищите спутника жизни, деловых партнеров или друзей по интересам. Умные фильтры по ашраму, целям и служению.',
        color: 'from-pink-400 to-rose-500',
        delay: 0.1
    },
    {
        icon: MessageCircle,
        title: 'Sanga Общение',
        description: 'Оставайтесь на связи с общиной. P2P звонки, чаты и поиск преданных рядом с вами для совместного служения и киртанов.',
        color: 'from-blue-400 to-indigo-500',
        delay: 0.2
    },
    {
        icon: Coffee,
        title: 'Sattva Cafe',
        description: 'Найдите ближайшее вегетарианское кафе или закажите доставку прасада. Каталог проверенных заведений с отзывами преданных.',
        color: 'from-amber-500 to-orange-600',
        delay: 0.3
    },
    {
        icon: BookOpen,
        title: 'Библиотека Мудрости',
        description: 'Образовательная платформа. Изучайте шастры, проходите курсы (Бхакти Шастры) и проверяйте знания в тренажерах.',
        color: 'from-amber-400 to-yellow-500',
        delay: 0.4
    },
    {
        icon: GraduationCap,
        title: 'Образование',
        description: 'Курсы по философии, музыке, кулинарии и другим ведическим искусствам. Обучение от мастеров своего дела.',
        color: 'from-cyan-400 to-blue-500',
        delay: 0.5
    },
    {
        icon: HandHelping,
        title: 'Seva Hub',
        description: 'Раздел для тех, кто хочет служить. Поиск волонтеров для храмовых проектов, фестивалей и добрых дел.',
        color: 'from-emerald-500 to-teal-600',
        delay: 0.6
    },
    {
        icon: Newspaper,
        title: 'Лента Новостей',
        description: 'Агрегатор чистого контента. Новости с фильтром по матхам и организациям, очищенные от негатива.',
        color: 'from-emerald-400 to-green-500',
        delay: 0.7
    },
    {
        icon: Compass,
        title: 'Священные Путешествия',
        description: 'Паломничества в святые места (Дхамы), йога-туры и поездки на фестивали. Организация жилья и трансферов.',
        color: 'from-red-400 to-orange-500',
        delay: 0.8
    },
    {
        icon: MapPin,
        title: 'Экосистема Карт',
        description: 'Все вайшнавские центры, храмы и культурные объекты на одной карте. Будьте в курсе событий в вашем регионе.',
        color: 'from-lime-400 to-emerald-500',
        delay: 0.9
    },
    {
        icon: Megaphone,
        title: 'Объявления',
        description: 'Доска объявлений для своих. Покупайте, продавайте, дарите и находите нужные услуги внутри сообщества.',
        color: 'from-orange-300 to-amber-500',
        delay: 1.0
    },
    {
        icon: Sparkles,
        title: 'AI Ассистент',
        description: 'Ваш личный гид. Задавайте вопросы по философии и практике — искусственный интеллект найдет ответы.',
        color: 'from-purple-400 to-violet-500',
        delay: 1.1
    }
];


export function FeaturesSection() {
    return (
        <section className="py-32 bg-[#fffbeb] relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46-43c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm20-27c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm58 48c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-46 40c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-54-53c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm56-55c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-48 6c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm54 96c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM72 20c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z' fill='%23000' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")` }}
            />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/50 border border-orange-200 text-orange-700 text-[10px] font-bold tracking-widest uppercase mb-6"
                    >
                        <ShieldCheck className="w-3 h-3" />
                        Built for Devotees
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-serif text-[#2c1810] mb-6 leading-tight"
                    >
                        Всё необходимое в <br /><span className="text-orange-600 italic">Одном Месте</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-[#5c4d47] max-w-2xl mx-auto font-light leading-relaxed"
                    >
                        Мы собрали лучшие инструменты для духовной практики, общения и жизни в гуне благости.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, idx) => {
                        const Icon = feature.icon;
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: feature.delay }}
                                className="bg-white/40 backdrop-blur-md p-10 rounded-[2.5rem] hover:bg-white hover:shadow-[0_20px_50px_-10px_rgba(44,24,16,0.1)] transition-all duration-500 border border-[#e7e5e4] group"
                            >
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-[#2c1810]/5`}>
                                    <Icon size={32} strokeWidth={1.5} />
                                </div>
                                <h3 className="text-2xl font-bold text-[#2c1810] mb-4 group-hover:text-orange-600 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-[#5c4d47] leading-relaxed text-sm opacity-80">
                                    {feature.description}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
