'use client';

import React from 'react';
import { Book, Download, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScriptureBook } from '@/lib/libraryService';
import { formatBytes } from '@/lib/offlineBookService';

interface BookCardProps {
    book: ScriptureBook;
    isSaved: boolean;
    isSaving: boolean;
    saveProgress: number;
    saveStatus: string;
    bookSize?: number;
    onPress: (book: ScriptureBook) => void;
    onSave: (book: ScriptureBook) => void;
    onRemove: (book: ScriptureBook) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
    book,
    isSaved,
    isSaving,
    saveProgress,
    saveStatus,
    bookSize,
    onPress,
    onSave,
    onRemove
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 hover:bg-white/10 transition-all cursor-pointer flex flex-col"
            onClick={() => onPress(book)}
        >
            {/* Status Badges */}
            <div className="absolute top-4 right-4 flex gap-2">
                {isSaved && (
                    <div className="p-1.5 bg-green-500/20 rounded-full text-green-400 border border-green-500/30">
                        <CheckCircle className="w-4 h-4" />
                    </div>
                )}
            </div>

            {/* Book Icon */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${isSaved ? 'bg-green-600/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                <Book className="w-8 h-8" />
            </div>

            {/* Book Info */}
            <h3 className="text-xl font-black text-white mb-2 line-clamp-1">{book.name_ru || book.name_en}</h3>
            <p className="text-white/50 text-sm mb-6 line-clamp-2 flex-grow">
                {book.description_ru || book.description_en || 'Священное писание'}
            </p>

            {/* Footer / Actions */}
            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                    {bookSize && isSaved && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                            {formatBytes(bookSize)}
                        </span>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D67D3E]">
                        {book.code}
                    </span>
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {isSaving ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{saveProgress}%</span>
                        </div>
                    ) : isSaved ? (
                        <button
                            onClick={() => onRemove(book)}
                            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl cursor-pointer transition-colors"
                            title="Удалить из памяти"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={() => onSave(book)}
                            className="p-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl cursor-pointer transition-colors"
                            title="Скачать для офлайн чтения"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar for saving */}
            {isSaving && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-[32px] overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${saveProgress}%` }}
                        className="h-full bg-orange-500"
                    />
                </div>
            )}
        </motion.div>
    );
};
