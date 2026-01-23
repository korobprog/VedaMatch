'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bookmark,
    ChevronLeft,
    Search,
    Trash2,
    BookOpen,
    Clock,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bookmarkService, Bookmark as BookmarkType } from '@/lib/bookmarkService';

export default function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadBookmarks();
    }, []);

    const loadBookmarks = () => {
        setLoading(true);
        const data = bookmarkService.getBookmarks();
        setBookmarks(data.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()));
        setLoading(false);
    };

    const handleRemove = (e: React.MouseEvent, b: BookmarkType) => {
        e.stopPropagation();
        if (confirm('Удалить закладку?')) {
            bookmarkService.removeBookmark(b.bookCode, b.chapter, b.verse);
            loadBookmarks();
        }
    };

    const filteredBookmarks = bookmarks.filter(b =>
        (b.bookName || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.verse || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.bookCode || '').toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white relative flex flex-col">
            {/* Background Ornaments */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto w-full px-6 pt-12 pb-24">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                    <div className="flex items-center gap-6">
                        <Link href="/library" className="p-4 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-white/50 hover:text-white cursor-pointer">
                            <ChevronLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-orange-500/20 rounded-lg">
                                    <Bookmark className="w-5 h-5 text-orange-400 fill-current" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight">Мои закладки</h1>
                            </div>
                            <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em]">Сохраненные тексты</p>
                        </div>
                    </div>

                    <div className="relative flex-grow max-w-xs ml-auto">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl py-3 pl-12 pr-6 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-white text-sm"
                        />
                    </div>
                </header>

                {/* Content */}
                {loading ? (
                    <div className="py-32 flex justify-center italic opacity-30">Загрузка...</div>
                ) : filteredBookmarks.length > 0 ? (
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {filteredBookmarks.map((b, i) => (
                                <motion.div
                                    key={`${b.bookCode}-${b.chapter}-${b.verse}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all cursor-pointer group flex items-center justify-between gap-6"
                                    onClick={() => router.push(`/library/${b.bookCode}?chapter=${b.chapter}&verse=${b.verse}`)}
                                >
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                                                {b.bookCode}
                                            </span>
                                            <span className="w-1 h-1 bg-white/10 rounded-full" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                                Глава {b.chapter}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-black mb-1 group-hover:text-orange-400 transition-colors flex items-center gap-2">
                                            Текст {b.verse}
                                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            <p className="text-white/40 text-sm font-medium line-clamp-1">{b.bookName}</p>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/20 whitespace-nowrap">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(b.addedAt)}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => handleRemove(e, b)}
                                        className="p-4 bg-white/5 rounded-2xl text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="py-32 text-center">
                        <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mx-auto mb-8 border border-white/5">
                            <Bookmark className="w-10 h-10 text-white/20" />
                        </div>
                        <h2 className="text-2xl font-black mb-3">Закладок пока нет</h2>
                        <p className="text-white/40 max-w-xs mx-auto mb-8 font-medium italic">
                            Отмечайте важные стихи во время чтения, чтобы они всегда были под рукой.
                        </p>
                        <Link href="/library" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                            <BookOpen className="w-5 h-5" /> Перейти к книгам
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
