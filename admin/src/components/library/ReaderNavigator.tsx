'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronRight, BookOpen, Layers, Loader2 } from 'lucide-react';
import { ChapterInfo } from '@/lib/libraryService';

interface ReaderNavigatorProps {
    isOpen: boolean;
    onClose: () => void;
    chapters: ChapterInfo[];
    isLoading?: boolean;
    currentChapter: number;
    currentCanto: number;
    onSelect: (chapter: number, canto: number) => void;
    bookTitle: string;
    bookCode?: string;
}

export function ReaderNavigator({
    isOpen,
    onClose,
    chapters,
    isLoading,
    currentChapter,
    currentCanto,
    onSelect,
    bookTitle,
    bookCode
}: ReaderNavigatorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCanto, setSelectedCanto] = useState<number>(currentCanto);

    // Sync selected canto when it changes in parent or navigator opens
    useEffect(() => {
        if (isOpen) {
            setSelectedCanto(currentCanto);
        }
    }, [isOpen, currentCanto]);

    // Group chapters by canto
    const cantoMap = useMemo(() => {
        const map: { [key: number]: { title: string, chapters: ChapterInfo[] } } = {};
        if (!chapters || chapters.length === 0) return map;

        chapters.forEach(ch => {
            const cantoNum = ch.canto || 0;
            if (!map[cantoNum]) {
                let title = ch.canto_title || (cantoNum === 0 ? 'Главы' : `Песнь ${cantoNum}`);

                // Special handling for Chaitanya-caritamrta (case-insensitive)
                const code = bookCode?.toLowerCase();
                if (code === 'cc' || code === 'chaitanya_caritamrta') {
                    if (cantoNum === 1) title = 'Ади-лила';
                    else if (cantoNum === 2) title = 'Мадхья-лила';
                    else if (cantoNum === 3) title = 'Антья-лила';
                }

                map[cantoNum] = { title, chapters: [] };
            }
            map[cantoNum].chapters.push(ch);
        });
        return map;
    }, [chapters, bookCode]);

    const cantos = useMemo(() => Object.keys(cantoMap).map(Number).sort((a, b) => a - b), [cantoMap]);

    // Determine which canto should be displayed
    const activeCanto = useMemo(() => {
        if (cantos.length === 0) return 0;

        // 1. Try currently selected canto in navigator
        if (cantoMap[selectedCanto]) return selectedCanto;

        // 2. Try current canto from the reader page
        if (cantoMap[currentCanto]) return currentCanto;

        // 3. Fallback to first available
        return cantos[0];
    }, [cantos, selectedCanto, currentCanto, cantoMap]);

    const filteredChapters = useMemo(() => {
        const currentCantoChapters = cantoMap[activeCanto]?.chapters || [];
        if (!searchQuery) return currentCantoChapters;

        return currentCantoChapters.filter(ch =>
            ch.chapter_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ch.chapter.toString().includes(searchQuery)
        );
    }, [cantoMap, activeCanto, searchQuery]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-[#0a0a0c]/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
                >
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="bg-[#121214] border-t border-white/10 w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-[48px] overflow-hidden flex flex-col shadow-2xl relative"
                    >
                        {/* Header */}
                        <div className="p-6 md:p-10 flex items-center justify-between pb-4">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-white/90 leading-tight">{bookTitle}</h2>
                                <p className="text-orange-500/80 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                                    Оглавление • Всего глав: {chapters?.length || 0}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all cursor-pointer group border border-white/5"
                            >
                                <X className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-6 md:px-10 pb-6">
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Поиск по названию или номеру..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-14 pr-6 outline-none focus:bg-white/[0.06] focus:border-orange-500/30 transition-all font-bold text-white placeholder:text-white/20 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                            {cantos.length > 1 && (
                                <div className="w-full md:w-[220px] border-b md:border-b-0 md:border-r border-white/5 overflow-x-auto md:overflow-y-auto no-scrollbar py-4 bg-black/10">
                                    <div className="px-6 md:px-6 flex flex-row md:flex-col gap-3 md:gap-3 items-center md:items-stretch">
                                        <p className="hidden md:block px-4 mb-4 text-[9px] font-black uppercase tracking-widest text-white/20">Разделы</p>
                                        {cantos.map(cantoNum => (
                                            <button
                                                key={cantoNum}
                                                onClick={() => setSelectedCanto(cantoNum)}
                                                className={`whitespace-nowrap shrink-0 text-left p-4 md:p-4 rounded-2xl transition-all flex flex-row items-center gap-3 md:gap-4 group cursor-pointer relative overflow-hidden
                                                    ${activeCanto === cantoNum
                                                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                                                        : 'hover:bg-white/5 text-white/40'}`}
                                            >
                                                <Layers className={`w-4 h-4 shrink-0 ${activeCanto === cantoNum ? 'text-white' : 'text-orange-500/40 group-hover:text-orange-500'} transition-colors`} />
                                                <span className="font-black text-[10px] md:text-xs uppercase tracking-tight leading-tight">
                                                    {cantoMap[cantoNum].title}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Chapters Grid/List */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-black/5">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-40 py-20">
                                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                        <p className="font-bold">Загрузка оглавления...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                        <AnimatePresence mode="popLayout">
                                            {filteredChapters.map((ch) => (
                                                <motion.button
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    key={`${ch.canto}-${ch.chapter}`}
                                                    onClick={() => {
                                                        onSelect(ch.chapter, ch.canto || 0);
                                                        onClose();
                                                    }}
                                                    className={`flex items-center gap-4 p-4 rounded-[28px] border transition-all text-left cursor-pointer group relative overflow-hidden min-h-[90px] md:min-h-0
                                                    ${currentChapter === ch.chapter && (ch.canto || 0) === currentCanto
                                                            ? 'bg-orange-600/10 border-orange-500/40'
                                                            : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08] hover:border-white/10'}`}
                                                >
                                                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-[20px] md:rounded-[24px] flex items-center justify-center font-black text-lg md:text-2xl shrink-0 transition-all duration-500
                                                    ${currentChapter === ch.chapter && (ch.canto || 0) === currentCanto
                                                            ? 'bg-orange-600 text-white shadow-[0_8px_25px_rgba(234,88,12,0.4)]'
                                                            : 'bg-white/10 text-white/20 group-hover:bg-white/20 group-hover:text-white/60'}`}>
                                                        {ch.chapter}
                                                    </div>
                                                    <div className="flex-grow min-w-0 pr-4">
                                                        <h4 className={`font-black text-xs md:text-sm mb-1 line-clamp-2 md:line-clamp-none tracking-tight transition-colors ${currentChapter === ch.chapter && (ch.canto || 0) === currentCanto ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                                                            {ch.chapter_title || `Глава ${ch.chapter}`}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-white/20 group-hover:text-orange-500/50 transition-colors uppercase font-black text-[8px] tracking-widest">
                                                            <span>Читать</span>
                                                            <ChevronRight className="w-2.5 h-2.5" />
                                                        </div>
                                                    </div>
                                                    {currentChapter === ch.chapter && (ch.canto || 0) === currentCanto && (
                                                        <div className="absolute top-3 right-3">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_12px_#f97316]" />
                                                        </div>
                                                    )}
                                                </motion.button>
                                            ))}
                                        </AnimatePresence>

                                        {filteredChapters.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 opacity-20 col-span-full">
                                                <Search className="w-12 h-12 mb-4" />
                                                <p className="font-bold">Главы не найдены</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
