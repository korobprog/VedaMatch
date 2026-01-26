'use client';

import { useState, useEffect, useRef, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Settings,
    Bookmark,
    Share2,
    Star,
    Loader2,
    ArrowLeft,
    ArrowRight,
    X,
    Type,
    Sun,
    Moon,
    Coffee
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { libraryService, ScriptureVerse, ChapterInfo, ScriptureBook } from '@/lib/libraryService';
import { offlineBookService } from '@/lib/offlineBookService';
import { bookmarkService } from '@/lib/bookmarkService';

export default function ReaderPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookCode = searchParams.get('code');

    const [book, setBook] = useState<ScriptureBook | null>(null);
    const [chapters, setChapters] = useState<ChapterInfo[]>([]);
    const [currentChapter, setCurrentChapter] = useState<number>(1);
    const [verses, setVerses] = useState<ScriptureVerse[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeVerseIndex, setActiveVerseIndex] = useState(0);
    const [bookmarkedVerses, setBookmarkedVerses] = useState<string[]>([]);
    const [notification, setNotification] = useState<string | null>(null);

    // Reader Settings
    const [showSettings, setShowSettings] = useState(false);
    const [showSanskrit, setShowSanskrit] = useState(true);
    const [showTranslation, setShowTranslation] = useState(true);
    const [showPurport, setShowPurport] = useState(true);
    const [fontSize, setFontSize] = useState(18);
    const [readerTheme, setReaderTheme] = useState<'paper' | 'sepia' | 'dark'>('paper');
    const [language, setLanguage] = useState<'ru' | 'en'>('ru');

    const mainScrollRef = useRef<HTMLDivElement>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        loadBaseData();
        refreshBookmarks();
    }, [bookCode]);

    useEffect(() => {
        if (currentChapter) {
            loadVerses(currentChapter);
        }
    }, [currentChapter, language, bookCode]);

    const refreshBookmarks = () => {
        const bookmarks = bookmarkService.getBookmarks();
        setBookmarkedVerses(bookmarks.filter(b => b.bookCode === bookCode).map(b => `${b.chapter}-${b.verse}`));
    };

    const handleToggleBookmark = (verse: ScriptureVerse) => {
        const isAdded = bookmarkService.toggleBookmark({
            bookCode,
            chapter: verse.chapter,
            verse: verse.verse,
            bookName: book?.name_ru || book?.name_en || bookCode,
            language,
            addedAt: new Date().toISOString()
        });

        refreshBookmarks();
        showNotification(isAdded ? 'Добавлено в закладки' : 'Удалено из закладок');
    };

    const showNotification = (text: string) => {
        setNotification(text);
        setTimeout(() => setNotification(null), 2000);
    };

    // Track active verse on scroll
    useEffect(() => {
        if (loading || verses.length === 0) return;

        observer.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('data-verse-id');
                    const index = verses.findIndex(v => v.id.toString() === id);
                    if (index !== -1) setActiveVerseIndex(index);
                }
            });
        }, {
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        });

        verses.forEach(v => {
            const el = document.getElementById(`verse-${v.id}`);
            if (el) observer.current?.observe(el);
        });

        return () => observer.current?.disconnect();
    }, [verses, loading]);

    const loadBaseData = async () => {
        try {
            const [bookInfo, chapterList] = await Promise.all([
                libraryService.getBookDetails(bookCode).catch(async () => {
                    const offline = await offlineBookService.getBookData(bookCode);
                    return offline?.book || null;
                }),
                libraryService.getChapters(bookCode).catch(async () => {
                    return await offlineBookService.getOfflineChapters(bookCode);
                })
            ]);

            if (bookInfo) setBook(bookInfo);
            if (chapterList) setChapters(chapterList);

            if (chapterList && chapterList.length > 0) {
                const chapterParam = searchParams.get('chapter');
                if (chapterParam) {
                    setCurrentChapter(parseInt(chapterParam));
                } else {
                    setCurrentChapter(chapterList[0].chapter);
                }
            }
        } catch (e) {
            console.error('Failed to load base data', e);
        }
    };

    const loadVerses = async (chapter: number) => {
        setLoading(true);
        try {
            let data = await libraryService.getVerses(bookCode, chapter, undefined, language).catch(async () => {
                return await offlineBookService.getOfflineVerses(bookCode, chapter, language);
            });
            setVerses(data);
            setActiveVerseIndex(0);

            // Check for verse in URL search params
            const verseToScroll = searchParams.get('verse');

            if (verseToScroll && data) {
                // Wait for render
                setTimeout(() => {
                    const index = data.findIndex(v => v.verse === verseToScroll);
                    if (index !== -1) scrollToVerse(index, data);
                }, 800);
            } else {
                if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        } catch (e) {
            console.error('Failed to load verses', e);
        } finally {
            setLoading(false);
        }
    };

    const scrollToVerse = (index: number, data?: ScriptureVerse[]) => {
        const verseList = data || verses || [];
        const verse = verseList[index];
        if (!verse || !verse.id) return;

        const el = document.getElementById(`verse-${verse.id}`);
        if (el) {
            const headerOffset = 180;
            const elementPosition = el.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setActiveVerseIndex(index);
        }
    };

    const themes = {
        paper: 'bg-[#fcf8e8] text-[#2c3e50]',
        sepia: 'bg-[#f4ecd8] text-[#5d4037]',
        dark: 'bg-[#1a1a1a] text-[#cccccc]'
    };

    const verseHeaderColor = {
        paper: 'text-orange-600',
        sepia: 'text-[#bf360c]',
        dark: 'text-orange-400'
    };

    return (
        <div className={`min-h-screen flex flex-col ${themes[readerTheme]} transition-colors duration-300`}>
            {/* Sticky Header Container */}
            <div className="sticky top-0 z-50">
                {/* Header */}
                <header className={`backdrop-blur-md border-b flex items-center justify-between px-6 h-20 
                    ${readerTheme === 'dark' ? 'bg-[#1a1a1a]/80 border-white/5' : 'bg-white/50 border-black/5'}`}>
                    <div className="flex items-center gap-4">
                        <Link href="/library" className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
                            <ChevronLeft />
                        </Link>
                        <div>
                            <h1 className="font-black text-lg line-clamp-1">{book?.name_ru || book?.name_en || 'Загрузка...'}</h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                                Глава {currentChapter}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setLanguage(l => l === 'ru' ? 'en' : 'ru')}
                            className="px-3 py-1.5 rounded-lg border border-current text-xs font-black uppercase hover:bg-current hover:text-white transition-all mr-2 cursor-pointer"
                        >
                            {language}
                        </button>
                        <Link
                            href="/library/bookmarks"
                            className="p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all cursor-pointer text-orange-500"
                            title="Мои закладки"
                        >
                            <Bookmark className="w-6 h-6 fill-current" />
                        </Link>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all cursor-pointer"
                        >
                            <Settings className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                {/* Chapter Navigation */}
                <nav className={`border-b px-6 py-3 flex items-center justify-between ${readerTheme === 'dark' ? 'bg-[#222]/90 border-white/5' : 'bg-white/90 border-black/5'}`}>
                    <button
                        disabled={!chapters || chapters.length === 0 || chapters.findIndex(c => c.chapter === currentChapter) <= 0}
                        onClick={() => {
                            const idx = chapters.findIndex(c => c.chapter === currentChapter);
                            if (idx > 0) setCurrentChapter(chapters[idx - 1].chapter);
                        }}
                        className="p-2 disabled:opacity-20 hover:scale-110 transition-transform cursor-pointer"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex overflow-x-auto gap-2 px-4 no-scrollbar max-w-[70%]">
                        {chapters.map((ch) => (
                            <button
                                key={ch.chapter}
                                onClick={() => setCurrentChapter(ch.chapter)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer
                                    ${currentChapter === ch.chapter
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-50'}`}
                            >
                                {ch.chapter}
                            </button>
                        ))}
                    </div>

                    <button
                        disabled={!chapters || chapters.length === 0 || chapters.findIndex(c => c.chapter === currentChapter) >= chapters.length - 1}
                        onClick={() => {
                            const idx = chapters.findIndex(c => c.chapter === currentChapter);
                            if (idx !== -1 && idx < chapters.length - 1) {
                                setCurrentChapter(chapters[idx + 1].chapter);
                            }
                        }}
                        className="p-2 disabled:opacity-20 hover:scale-110 transition-transform cursor-pointer"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </nav>

                {/* Verse (Page) Navigation */}
                {!loading && verses.length > 0 && (
                    <div className={`border-b px-6 py-2 flex items-center ${readerTheme === 'dark' ? 'bg-[#2a2a2a]/90 border-white/5' : 'bg-[#fafafa]/90 border-black/5'}`}>
                        <div className="flex overflow-x-auto gap-2 no-scrollbar py-1">
                            {verses.map((v, index) => (
                                <button
                                    key={v.id}
                                    onClick={() => scrollToVerse(index)}
                                    className={`w-9 h-9 shrink-0 rounded-full text-xs font-black transition-all flex items-center justify-center cursor-pointer
                                        ${activeVerseIndex === index
                                            ? 'bg-orange-500 text-white shadow-md'
                                            : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-40'}`}
                                >
                                    {v.verse}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Reader Content */}
            <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-12">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 opacity-50">
                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                        <p className="font-bold">Настройка сознания...</p>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {verses.map((v, index) => (
                            <motion.article
                                key={v.id}
                                id={`verse-${v.id}`}
                                data-verse-id={v.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative scroll-mt-48"
                            >
                                <div className={`flex items-center justify-between mb-8 pb-4 border-b border-current opacity-40`}>
                                    <span className={`text-xl font-black ${verseHeaderColor[readerTheme]}`}>
                                        Текст {v.verse}
                                    </span>
                                    <div className="flex gap-4 opacity-100">
                                        <button
                                            onClick={() => handleToggleBookmark(v)}
                                            className={`cursor-pointer hover:scale-110 transition-transform ${bookmarkedVerses.includes(`${v.chapter}-${v.verse}`) ? 'text-orange-500 opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                        >
                                            <Bookmark className="w-6 h-6" fill={bookmarkedVerses.includes(`${v.chapter}-${v.verse}`) ? 'currentColor' : 'none'} strokeWidth={2.5} />
                                        </button>
                                        <button className="cursor-pointer hover:scale-110 transition-transform opacity-60 hover:opacity-100"><Share2 className="w-6 h-6" strokeWidth={2.5} /></button>
                                    </div>
                                </div>

                                {showSanskrit && v.devanagari && (
                                    <div className="mb-8 text-center leading-relaxed">
                                        <p className="text-2xl md:text-3xl font-medium mb-4">{v.devanagari}</p>
                                        <p className="italic opacity-70 text-lg">{v.transliteration}</p>
                                    </div>
                                )}

                                {showTranslation && (
                                    <div className="mb-12">
                                        <p className="text-xl md:text-2xl font-bold leading-relaxed">
                                            {v.translation}
                                        </p>
                                    </div>
                                )}

                                {showPurport && v.purport && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 opacity-30">
                                            <div className="h-[1px] flex-grow bg-current" />
                                            <span className="text-xs font-black uppercase tracking-widest">Комментарий</span>
                                            <div className="h-[1px] flex-grow bg-current" />
                                        </div>
                                        <div
                                            className="leading-loose whitespace-pre-line opacity-90"
                                            style={{ fontSize: `${fontSize}px` }}
                                        >
                                            {v.purport}
                                        </div>
                                    </div>
                                )}
                            </motion.article>
                        ))}

                        {/* Footer navigation inside content */}
                        <div className="pt-24 pb-12 flex justify-between gap-6">
                            <button
                                disabled={chapters.findIndex(c => c.chapter === currentChapter) <= 0}
                                onClick={() => setCurrentChapter(chapters[chapters.findIndex(c => c.chapter === currentChapter) - 1].chapter)}
                                className="flex-1 p-6 rounded-[32px] border border-current border-opacity-10 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-4 disabled:opacity-10"
                            >
                                <ArrowLeft /> Назад
                            </button>
                            <button
                                onClick={() => {
                                    if (chapters.findIndex(c => c.chapter === currentChapter) < chapters.length - 1) {
                                        setCurrentChapter(chapters[chapters.findIndex(c => c.chapter === currentChapter) + 1].chapter);
                                    } else {
                                        router.push('/library');
                                    }
                                }}
                                className="flex-1 p-6 rounded-[32px] bg-orange-500 text-white shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                            >
                                Дальше <ArrowRight />
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-orange-500 text-white font-black rounded-2xl shadow-2xl shadow-orange-500/40"
                    >
                        {notification}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filter/Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center"
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`${readerTheme === 'dark' ? 'bg-[#222] text-white' : 'bg-white text-slate-900'} 
                                w-full max-w-2xl rounded-t-[40px] p-10 pb-16 outline-none`}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-2xl font-black">Настройки чтения</h2>
                                <button onClick={() => setShowSettings(false)} className="p-2 opacity-50 hover:opacity-100">
                                    <X className="w-8 h-8" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4">Отображение</h3>
                                    <Toggle label="Санскрит" checked={showSanskrit} onChange={setShowSanskrit} />
                                    <Toggle label="Перевод" checked={showTranslation} onChange={setShowTranslation} />
                                    <Toggle label="Комментарий" checked={showPurport} onChange={setShowPurport} />
                                </div>

                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4">Тема</h3>
                                        <div className="flex gap-4">
                                            <ThemeTab active={readerTheme === 'paper'} icon={<Sun />} label="Бумага" onClick={() => setReaderTheme('paper')} />
                                            <ThemeTab active={readerTheme === 'sepia'} icon={<Coffee />} label="Сепия" onClick={() => setReaderTheme('sepia')} />
                                            <ThemeTab active={readerTheme === 'dark'} icon={<Moon />} label="Ночь" onClick={() => setReaderTheme('dark')} />
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4">Размер шрифта</h3>
                                        <div className="flex items-center gap-6">
                                            <button onClick={() => setFontSize(s => Math.max(12, s - 2))} className="p-3 bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 transition-colors">
                                                <Type className="w-4 h-4" />
                                            </button>
                                            <span className="text-lg font-black min-w-[3ch] text-center">{fontSize}</span>
                                            <button onClick={() => setFontSize(s => Math.min(32, s + 2))} className="p-3 bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 transition-colors">
                                                <Type className="w-7 h-7" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Toggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-center justify-between cursor-pointer group">
            <span className="font-bold">{label}</span>
            <div
                onClick={() => onChange(!checked)}
                className={`w-14 h-8 rounded-full relative cursor-pointer transition-colors duration-300 ${checked ? 'bg-orange-500' : 'bg-black/10 dark:bg-white/10'}`}
            >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${checked ? 'translate-x-6' : ''}`} />
            </div>
        </label>
    );
}

function ThemeTab({ active, icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all
                ${active ? 'border-orange-500 bg-orange-500/5 text-orange-500' : 'border-transparent bg-black/5 dark:bg-white/5 opacity-50 hover:opacity-100'}`}
        >
            {icon}
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
}
