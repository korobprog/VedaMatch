'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Globe } from 'lucide-react';

interface LanguageSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (languages: string[]) => void;
    bookTitle: string;
}

export const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    bookTitle
}) => {
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['ru']);

    const toggleLanguage = (lang: string) => {
        if (selectedLanguages.includes(lang)) {
            if (selectedLanguages.length > 1) {
                setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
            }
        } else {
            setSelectedLanguages([...selectedLanguages, lang]);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-md bg-[#161618] border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white mb-1">Скачать книгу</h2>
                                <p className="text-white/40 text-sm font-medium">{bookTitle}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-white/60 text-sm mb-6">
                            Выберите языки для офлайн чтения. Выбор только одного языка ускорит загрузку и сэкономит место.
                        </p>

                        <div className="space-y-3 mb-8">
                            <LanguageOption
                                label="Русский язык"
                                code="ru"
                                selected={selectedLanguages.includes('ru')}
                                onToggle={() => toggleLanguage('ru')}
                            />
                            <LanguageOption
                                label="English Language"
                                code="en"
                                selected={selectedLanguages.includes('en')}
                                onToggle={() => toggleLanguage('en')}
                            />
                        </div>

                        <button
                            onClick={() => onConfirm(selectedLanguages)}
                            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 cursor-pointer active:scale-[0.98]"
                        >
                            Начать загрузку
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const LanguageOption = ({ label, code, selected, onToggle }: { label: string, code: string, selected: boolean, onToggle: () => void }) => (
    <div
        onClick={onToggle}
        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${selected
                ? 'bg-orange-500/10 border-orange-500/50 text-white'
                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
            }`}
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${selected ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/20'}`}>
                <Globe className="w-4 h-4" />
            </div>
            <span className="font-bold">{label}</span>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selected ? 'bg-orange-500 border-orange-500 text-white' : 'border-white/10'
            }`}>
            {selected && <Check className="w-4 h-4" />}
        </div>
    </div>
);
