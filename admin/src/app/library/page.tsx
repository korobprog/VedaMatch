'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Book,
    Search,
    Grid,
    ChevronLeft,
    Download,
    CloudOff,
    Loader2,
    Bookmark
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { libraryService, ScriptureBook } from '@/lib/libraryService';
import { offlineBookService, SavedBookInfo } from '@/lib/offlineBookService';
import { bookmarkService } from '@/lib/bookmarkService';
import { BookCard } from '@/components/library/BookCard';
import { LanguageSelectionModal } from '@/components/library/LanguageSelectionModal';

export default function LibraryPage() {
    const [books, setBooks] = useState<ScriptureBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [savedBooks, setSavedBooks] = useState<string[]>([]);
    const [bookSizes, setBookSizes] = useState<{ [code: string]: number }>({});
    const [savingBook, setSavingBook] = useState<string | null>(null);
    const [saveProgress, setSaveProgress] = useState<number>(0);
    const [saveStatus, setSaveStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'all' | 'bookmarks'>('all');
    const [bookmarks, setBookmarks] = useState<any[]>([]);

    useEffect(() => {
        loadData();
        loadBookmarks();
    }, []);

    const loadBookmarks = () => {
        setBookmarks(bookmarkService.getBookmarks());
    };

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [allBooks, savedInfo] = await Promise.all([
                libraryService.getBooks().catch(e => {
                    console.error('Online books failed, using offline index', e);
                    return [] as ScriptureBook[];
                }),
                offlineBookService.getSavedBooks()
            ]);

            // Combine/Filter: If offline, we might only have saved books
            const savedCodes = savedInfo.map(b => b.code);
            setSavedBooks(savedCodes);

            const sizes: { [code: string]: number } = {};
            for (const b of savedInfo) sizes[b.code] = b.sizeBytes;
            setBookSizes(sizes);

            if (allBooks.length === 0 && savedInfo.length > 0) {
                // Construct basic book info from saved metadata
                const mockBooks = savedInfo.map(s => ({
                    id: 0,
                    code: s.code,
                    name_ru: s.name_ru,
                    name_en: s.name_en,
                    description_ru: s.description_ru || '',
                    description_en: s.description_en || '',
                    created_at: '',
                    updated_at: ''
                })) as ScriptureBook[];
                setBooks(mockBooks);
            } else {
                setBooks(allBooks);
            }

        } catch (e) {
            setError('Не удалось загрузить библиотеку');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const [selectedBookForLang, setSelectedBookForLang] = useState<ScriptureBook | null>(null);

    const handleSaveBook = (book: ScriptureBook) => {
        setSelectedBookForLang(book);
    };

    const confirmSaveBook = async (languages: string[]) => {
        const book = selectedBookForLang;
        if (!book || savingBook) return;

        setSelectedBookForLang(null);
        setSavingBook(book.code);
        setSaveProgress(0);
        setSaveStatus('Загрузка...');

        const success = await offlineBookService.saveBookOffline(book, languages, (progress, status) => {
            setSaveProgress(progress);
            setSaveStatus(status);
        });

        if (success) {
            const updatedSaved = await offlineBookService.getSavedBooks();
            setSavedBooks(updatedSaved.map(b => b.code));
            const sizes: { [code: string]: number } = {};
            for (const b of updatedSaved) sizes[b.code] = b.sizeBytes;
            setBookSizes(sizes);
        }

        setSavingBook(null);
        setSaveProgress(0);
        setSaveStatus('');
    };

    const handleRemoveBook = async (book: ScriptureBook) => {
        if (confirm(`Удалить книгу "${book.name_ru || book.name_en}" из памяти устройства?`)) {
            await offlineBookService.removeBook(book.code);
            setSavedBooks(prev => prev.filter(c => c !== book.code));
        }
    };

    const filteredBooks = books.filter(b =>
        (b.name_ru || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.name_en || '').toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase())
    );

    const filteredBookmarks = bookmarks.filter(b =>
        (b.bookName || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.verse || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white relative flex flex-col">
            {/* Background Ornaments */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto w-full px-6 pt-12 pb-24">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                    <div className="flex items-center gap-6">
                        <Link href="/user/dashboard" className="p-4 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-white/50 hover:text-white cursor-pointer">
                            <ChevronLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <Book className="w-5 h-5 text-green-400" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tight">Библиотека</h1>
                            </div>
                            <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em]">Ведические Писания</p>
                        </div>
                    </div>

                    <div className="relative flex-grow max-w-md">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-green-500/20 transition-all text-white placeholder:text-white/20"
                        />
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-4 mb-12">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all cursor-pointer
                            ${activeTab === 'all' ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                    >
                        Все книги
                    </button>
                    <Link
                        href="/library/bookmarks"
                        className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all cursor-pointer flex items-center gap-3 bg-white/5 text-white/50 hover:bg-white/10`}
                    >
                        Закладки
                        {bookmarks.length > 0 && (
                            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-lg text-[10px]">
                                {bookmarks.length}
                            </span>
                        )}
                    </Link>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 opacity-50">
                        <Loader2 className="w-12 h-12 animate-spin text-green-400 mb-4" />
                        <p className="text-lg font-bold">Загрузка знаний...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <CloudOff className="w-16 h-16 text-white/20 mb-6" />
                        <h2 className="text-2xl font-black mb-2">{error}</h2>
                        <button onClick={loadData} className="text-green-400 font-bold hover:underline cursor-pointer">Попробовать снова</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        <AnimatePresence mode="popLayout">
                            {filteredBooks.map((book) => (
                                <BookCard
                                    key={book.code}
                                    book={book}
                                    isSaved={savedBooks.includes(book.code)}
                                    isSaving={savingBook === book.code}
                                    saveProgress={saveProgress}
                                    saveStatus={saveStatus}
                                    bookSize={bookSizes[book.code]}
                                    onPress={(b) => router.push(`/library/reader?code=${b.code}`)}
                                    onSave={handleSaveBook}
                                    onRemove={handleRemoveBook}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <LanguageSelectionModal
                isOpen={!!selectedBookForLang}
                onClose={() => setSelectedBookForLang(null)}
                onConfirm={confirmSaveBook}
                bookTitle={selectedBookForLang?.name_ru || selectedBookForLang?.name_en || ''}
            />
        </div>
    );
}
