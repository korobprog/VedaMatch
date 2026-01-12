'use client';

import { motion } from 'framer-motion';
import {
    ShoppingBag,
    Heart,
    MessageCircle,
    BookOpen,
    Newspaper,
    Sparkles
} from 'lucide-react';

const features = [
    {
        icon: ShoppingBag,
        title: 'Sattva Market',
        description: 'Маркетплейс для благостной жизни. Находите продукты, одежду и атрибутику от проверенных вайшнавских магазинов. Безопасные сделки и удобная доставка.',
        color: 'from-orange-400 to-red-500'
    },
    {
        icon: Heart,
        title: 'VedaMatch',
        description: 'Осознанные знакомства. Ищите спутника жизни, деловых партнеров или друзей по интересам. Умные фильтры по ашраму, целям и служению.',
        color: 'from-pink-400 to-rose-500'
    },
    {
        icon: MessageCircle,
        title: 'Sanga Общение',
        description: 'Оставайтесь на связи с общиной. P2P звонки, чаты и поиск преданных рядом с вами для совместного служения и киртанов.',
        color: 'from-blue-400 to-indigo-500'
    },
    {
        icon: BookOpen,
        title: 'Библиотека Мудрости',
        description: 'Образовательная платформа. Изучайте шастры, проходите курсы (Бхакти Шастры) и проверяйте знания в тренажерах, адаптированных под вашу школу.',
        color: 'from-amber-400 to-yellow-500'
    },
    {
        icon: Newspaper,
        title: 'Лента Новостей',
        description: 'Агрегатор чистого контента. Новости с фильтром по матхам и организациям, очищенные от негатива и адаптированные нашим AI для вашего вдохновения.',
        color: 'from-emerald-400 to-green-500'
    },
    {
        icon: Sparkles,
        title: 'AI Ассистент',
        description: 'Ваш личный гид. Задавайте вопросы по философии и практике — искусственный интеллект найдет ответы в авторитетных источниках.',
        color: 'from-purple-400 to-violet-500'
    }
];

export function FeaturesSection() {
    return (
        <section className="py-24 bg-[#fffbeb]">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl font-serif text-[#2c1810] mb-4"
                    >
                        Всё необходимое в одном приложении
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-[#5c4d47] max-w-2xl mx-auto"
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
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white/50 backdrop-blur-sm p-8 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-[#e7e5e4] group"
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                    <Icon size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-[#2c1810] mb-3 group-hover:text-orange-600 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-[#5c4d47] leading-relaxed text-sm">
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
