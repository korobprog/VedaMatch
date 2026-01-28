'use client';

import { useState, useEffect, useRef, use, useMemo } from 'react';
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
    ArrowUp,
    Menu,
    X,
    Type,
    Sun,
    Moon,
    Coffee,
    Navigation // Added for more semantic icon if needed, or stick to Menu
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { libraryService, ScriptureVerse, ChapterInfo, ScriptureBook } from '@/lib/libraryService';
import { offlineBookService } from '@/lib/offlineBookService';
import { bookmarkService } from '@/lib/bookmarkService';
import { ReaderNavigator } from '@/components/library/ReaderNavigator';

export default function ReaderPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookCode = searchParams.get('code')?.trim();

    const [book, setBook] = useState<ScriptureBook | null>(null);
    const [chapters, setChapters] = useState<ChapterInfo[]>([]);
    const [chaptersLoading, setChaptersLoading] = useState(true);
    const [currentChapter, setCurrentChapter] = useState<number>(1);
    const [currentCanto, setCurrentCanto] = useState<number>(0);
    const [verses, setVerses] = useState<ScriptureVerse[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeVerseIndex, setActiveVerseIndex] = useState(0);
    const [bookmarkedVerses, setBookmarkedVerses] = useState<string[]>([]);
    const [notification, setNotification] = useState<string | null>(null);

    // Reader Settings
    const [showSettings, setShowSettings] = useState(false);
    const [showSanskrit, setShowSanskrit] = useState(true);
    const [showTranslation, setShowTranslation] = useState(true);
    const [showTransliteration, setShowTransliteration] = useState(true);
    const [showPurport, setShowPurport] = useState(true);
    const [fontSize, setFontSize] = useState(18);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const lastScrollY = useRef(0);
    const isManualControl = useRef(false);
    const [readerTheme, setReaderTheme] = useState<'paper' | 'sepia' | 'dark'>('paper');
    const [language, setLanguage] = useState<'ru' | 'en'>('ru');
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    const toggleHeaderManual = (show: boolean) => {
        setIsHeaderVisible(show);
        if (show) {
            isManualControl.current = true;
            setTimeout(() => {
                isManualControl.current = false;
            }, 5000); // 5 seconds of manual override
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            if (isManualControl.current) return;

            const currentScrollY = window.scrollY;
            setShowBackToTop(currentScrollY > 500);

            // Always show header at the very top
            if (currentScrollY < 50) {
                setIsHeaderVisible(true);
            } else {
                // Hide on scroll down, show on scroll up
                if (currentScrollY > lastScrollY.current + 30) {
                    setIsHeaderVisible(false);
                } else if (currentScrollY < lastScrollY.current - 40) {
                    setIsHeaderVisible(true);
                }
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!bookCode) {
            router.push('/library');
            return;
        }
        loadBaseData();
        refreshBookmarks();
    }, [bookCode]);

    useEffect(() => {
        if (currentChapter !== undefined && bookCode) {
            loadVerses(currentChapter, currentCanto);
        }
    }, [currentChapter, currentCanto, language, bookCode]);

    const refreshBookmarks = () => {
        if (!bookCode) return;
        const bookmarks = bookmarkService.getBookmarks();
        setBookmarkedVerses(bookmarks.filter(b => b.bookCode === bookCode).map(b => `${b.chapter}-${b.verse}`));
    };

    const handleToggleBookmark = (verse: ScriptureVerse) => {
        if (!bookCode) return;
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

    useEffect(() => {
        if (activeVerseIndex !== -1) {
            const el = document.getElementById(`verse-nav-${activeVerseIndex}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeVerseIndex]);

    const loadBaseData = async () => {
        if (!bookCode) return;
        setChaptersLoading(true);
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

            if (chapterList && chapterList.length > 0) {
                console.log(`Loaded ${chapterList.length} chapters for ${bookCode}`);
                setChapters(chapterList);

                const chapterParam = searchParams.get('chapter');
                if (chapterParam) {
                    const chapterNum = parseInt(chapterParam);
                    setCurrentChapter(chapterNum);
                    const cantoParam = searchParams.get('canto');
                    if (cantoParam) {
                        setCurrentCanto(parseInt(cantoParam));
                    } else {
                        // Find canto for this chapter if missing in URL
                        const found = chapterList.find(c => c.chapter === chapterNum);
                        if (found) setCurrentCanto(found.canto || 0);
                    }
                } else {
                    setCurrentChapter(chapterList[0].chapter);
                    setCurrentCanto(chapterList[0].canto || 0);
                }
            }
        } catch (e) {
            console.error('Failed to load base data', e);
        } finally {
            setChaptersLoading(false);
        }
    };

    const loadVerses = async (chapter: number, canto: number = 0) => {
        if (!bookCode) return;
        setLoading(true);
        try {
            let data = await libraryService.getVerses(bookCode, chapter, canto || undefined, language).catch(async () => {
                return await offlineBookService.getOfflineVerses(bookCode, chapter, canto, language);
            });
            setVerses(data);
            setCurrentChapter(chapter);
            setCurrentCanto(canto);
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

    const [showNavigator, setShowNavigator] = useState(false);

    const currentChapterData = useMemo(() => {
        return chapters.find(c => c.chapter === currentChapter && (c.canto || 0) === currentCanto);
    }, [chapters, currentChapter, currentCanto]);

    return (
        <div className={`min-h-screen w-full overflow-x-hidden relative flex flex-col ${themes[readerTheme]} transition-colors duration-300`}>

            {/* Fixed Header Container */}
            <motion.div
                animate={{
                    y: isHeaderVisible ? 0 : -150,
                    opacity: isHeaderVisible ? 1 : 0,
                    pointerEvents: isHeaderVisible ? 'auto' : 'none'
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 150 }}
                className="fixed top-0 left-0 right-0 z-50 w-full"
            >
                {/* Header */}
                <header className={`backdrop-blur-md border-b flex items-center justify-between px-6 h-20 w-full
                    ${readerTheme === 'dark' ? 'bg-[#1a1a1a]/80 border-white/5' : 'bg-white/50 border-black/5'}`}>
                    <div className="flex items-center gap-4">
                        <Link href="/library" className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
                            <ChevronLeft />
                        </Link>
                        <div>
                            <h1 className="font-black text-lg line-clamp-1">{book?.name_ru || book?.name_en || 'Загрузка...'}</h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                                {currentCanto > 0 ? (
                                    bookCode === 'cc' ? (
                                        currentCanto === 1 ? 'Ади-лила, ' :
                                            currentCanto === 2 ? 'Мадхья-лила, ' :
                                                currentCanto === 3 ? 'Антья-лила, ' : `Раздел ${currentCanto}, `
                                    ) : `Песнь ${currentCanto}, `
                                ) : ''}Глава {currentChapter}
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

                {/* Chapter Navigation (Compact with Titles) */}
                <nav className={`border-b px-6 py-3 flex items-center justify-center transition-all duration-300 w-full
                    ${readerTheme === 'dark' ? 'bg-[#222]/90 border-white/5' : 'bg-white/90 border-black/5'}`}>

                    <button
                        onClick={() => setShowNavigator(true)}
                        className={`w-full max-w-2xl px-6 py-2.5 rounded-2xl border flex flex-col items-center gap-0.5 transition-all cursor-pointer hover:bg-orange-500/5 group
                            ${readerTheme === 'dark' ? 'border-white/10' : 'border-black/5'}`}
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:text-orange-500 group-hover:opacity-100 transition-colors">Выбрать главу</span>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm truncate max-w-[250px] md:max-w-[500px]">
                                {bookCode === 'cc' ? (
                                    currentCanto === 1 ? 'Ади-лила, ' :
                                        currentCanto === 2 ? 'Мадхья-лила, ' :
                                            currentCanto === 3 ? 'Антья-лила, ' : ''
                                ) : (currentCanto > 0 ? `Песнь ${currentCanto}, ` : '')}
                                {currentChapterData?.chapter_title ? `${currentChapter}. ${currentChapterData.chapter_title}` : `Глава ${currentChapter}`}
                            </span>
                            <ChevronRight className="w-3 h-3 opacity-20 group-hover:opacity-100" />
                        </div>
                    </button>
                </nav>

                {!loading && verses.length > 0 && (
                    <div className={`border-b relative h-16 flex items-center overflow-hidden transition-colors ${readerTheme === 'dark' ? 'bg-[#1a1a1a] border-white/5' : 'bg-white border-black/5'}`}>
                        {/* Center Indicator */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-orange-500 rounded-full shadow-lg shadow-orange-500/30 pointer-events-none z-0" />

                        {/* Gradient Masks */}
                        <div className={`absolute left-0 top-0 bottom-0 w-24 z-20 pointer-events-none ${readerTheme === 'dark' ? 'bg-gradient-to-r from-[#1a1a1a] to-transparent' : 'bg-gradient-to-r from-white to-transparent'}`} />
                        <div className={`absolute right-0 top-0 bottom-0 w-24 z-20 pointer-events-none ${readerTheme === 'dark' ? 'bg-gradient-to-l from-[#1a1a1a] to-transparent' : 'bg-gradient-to-l from-white to-transparent'}`} />

                        <div className="flex overflow-x-auto gap-8 no-scrollbar scroll-smooth w-full z-10 snap-x snap-mandatory">
                            {/* Spacers for centering */}
                            <div className="shrink-0 w-[calc(50%-24px)]" />

                            {verses.map((v, index) => (
                                <button
                                    id={`verse-nav-${index}`}
                                    key={v.id}
                                    onClick={() => scrollToVerse(index)}
                                    className={`w-12 h-12 shrink-0 rounded-full text-xs font-black transition-all duration-300 flex items-center justify-center cursor-pointer snap-center
                                        ${activeVerseIndex === index
                                            ? 'text-white scale-125 z-10'
                                            : 'text-current opacity-20 hover:opacity-100 hover:scale-110'}`}
                                >
                                    {v.verse}
                                </button>
                            ))}

                            <div className="shrink-0 w-[calc(50%-24px)]" />
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Top spacing for fixed header */}
            <div className="h-48 md:h-52" />

            <ReaderNavigator
                isOpen={showNavigator}
                onClose={() => setShowNavigator(false)}
                chapters={chapters}
                isLoading={chaptersLoading}
                currentChapter={currentChapter}
                currentCanto={currentCanto}
                onSelect={(ch, cn) => {
                    setCurrentChapter(ch);
                    setCurrentCanto(cn);
                }}
                bookTitle={book?.name_ru || book?.name_en || ''}
                bookCode={bookCode || ''}
            />

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
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleBookmark(v)}
                                            className={`p-3 rounded-2xl transition-all cursor-pointer ${bookmarkedVerses.includes(`${v.chapter}-${v.verse}`) ? 'text-orange-500' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-50 hover:opacity-100'}`}
                                        >
                                            <Bookmark className={`w-6 h-6 ${bookmarkedVerses.includes(`${v.chapter}-${v.verse}`) ? 'fill-current' : ''}`} />
                                        </button>
                                        <button
                                            className="p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all opacity-50 hover:opacity-100 cursor-pointer"
                                            title="Поделиться"
                                        >
                                            <Share2 className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-12 leading-relaxed">
                                    {showSanskrit && v.devanagari && (
                                        <div className="text-center">
                                            <p className="text-2xl font-serif text-orange-800/80 dark:text-orange-200/80 italic leading-loose whitespace-pre-line">
                                                {v.devanagari}
                                            </p>
                                        </div>
                                    )}

                                    {showTransliteration && v.transliteration && (
                                        <div className="text-center opacity-70 italic font-medium">
                                            <p className="text-lg leading-relaxed">{v.transliteration}</p>
                                        </div>
                                    )}

                                    {showTranslation && v.translation && (
                                        <div className="relative">
                                            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-orange-500/20 rounded-full" />
                                            <p className="text-xl font-bold leading-relaxed pl-6">{v.translation}</p>
                                        </div>
                                    )}

                                    {showPurport && v.purport && (
                                        <div className="prose prose-lg dark:prose-invert max-w-none">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-6 flex items-center gap-4">
                                                <span>Комментарий</span>
                                                <div className="h-px flex-grow bg-current opacity-10" />
                                            </h4>
                                            <div
                                                className="leading-[1.8] opacity-90 font-medium"
                                                style={{ fontSize: `${fontSize}px` }}
                                                dangerouslySetInnerHTML={{ __html: v.purport }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </motion.article>
                        ))}

                        {/* Pagination Refinement */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-24 border-t border-current/10">
                            <button
                                disabled={chapters.findIndex(c => c.chapter === currentChapter && (c.canto || 0) === currentCanto) <= 0}
                                onClick={() => {
                                    const idx = chapters.findIndex(c => c.chapter === currentChapter && (c.canto || 0) === currentCanto);
                                    if (idx > 0) {
                                        setCurrentChapter(chapters[idx - 1].chapter);
                                        setCurrentCanto(chapters[idx - 1].canto || 0);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                                className="w-full md:w-auto flex items-center justify-center gap-4 px-8 py-5 rounded-[24px] border border-current/20 font-black uppercase tracking-widest text-xs disabled:opacity-20 hover:bg-black/5 dark:hover:bg-white/5 transition-all group cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                Назад
                            </button>

                            <div className="flex flex-col items-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">
                                    {bookCode === 'cc' ? (
                                        currentCanto === 1 ? 'Ади-лила' :
                                            currentCanto === 2 ? 'Мадхья-лила' :
                                                currentCanto === 3 ? 'Антья-лила' : 'Глава'
                                    ) : (currentCanto > 0 ? `Песнь ${currentCanto}` : 'Глава')}
                                </p>
                                <p className="text-2xl font-black">{currentChapter}</p>
                            </div>

                            <button
                                onClick={() => {
                                    const idx = chapters.findIndex(c => c.chapter === currentChapter && (c.canto || 0) === currentCanto);
                                    if (idx !== -1 && idx < chapters.length - 1) {
                                        setCurrentChapter(chapters[idx + 1].chapter);
                                        setCurrentCanto(chapters[idx + 1].canto || 0);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    } else {
                                        router.push('/library');
                                    }
                                }}
                                className="w-full md:w-auto flex items-center justify-center gap-4 px-10 py-5 rounded-[24px] bg-orange-600 text-white shadow-xl shadow-orange-600/20 font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all group cursor-pointer"
                            >
                                Вперед
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Floating Triggers - Permanent overlay for absolute reliability */}
            <div className="fixed inset-0 pointer-events-none z-[100]">
                {/* Scroll Progress Bar at the Top */}
                <motion.div
                    className="absolute top-0 left-0 h-1 bg-orange-500 z-[120]"
                    style={{
                        width: '100%',
                        scaleX: 0,
                        transformOrigin: '0%',
                    }}
                    animate={{ scaleX: typeof window !== 'undefined' ? (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) : 0 }}
                />

                {/* Quick Menu Button (Always available top right when hidden) */}
                <AnimatePresence>
                    {!isHeaderVisible && (
                        <motion.button
                            key="nav-fab"
                            initial={{ scale: 0, opacity: 0, x: 20 }}
                            animate={{ scale: 1, opacity: 1, x: 0 }}
                            exit={{ scale: 0, opacity: 0, x: 20 }}
                            onClick={() => toggleHeaderManual(true)}
                            className="absolute top-6 right-6 pointer-events-auto bg-orange-600 text-white w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center cursor-pointer hover:bg-orange-700 hover:scale-110 active:scale-90 transition-all border border-white/20"
                            title="Открыть меню"
                        >
                            <Menu className="w-7 h-7" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Fast Navigation - Bottom Left (matches user image) */}
                <div className="absolute bottom-10 left-10 pointer-events-auto">
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={() => toggleHeaderManual(true)}
                        className="w-14 h-14 bg-black/80 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl"
                    >
                        <span className="text-white font-black text-xl">N</span>
                    </motion.button>
                </div>

                {/* Back to Top - Bottom Right */}
                <AnimatePresence>
                    {showBackToTop && (
                        <motion.button
                            key="top-fab"
                            initial={{ scale: 0, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0, opacity: 0, y: 20 }}
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                toggleHeaderManual(true);
                            }}
                            className="absolute bottom-10 right-10 pointer-events-auto bg-white text-orange-600 w-16 h-16 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.2)] border-2 border-orange-500/5 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-90 transition-transform group"
                        >
                            <ArrowUp className="w-8 h-8 group-hover:-translate-y-1 transition-transform" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

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
                                    <Toggle label="Транслитерация" checked={showTransliteration} onChange={setShowTransliteration} />
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
