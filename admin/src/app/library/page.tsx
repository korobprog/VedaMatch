'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
    Book,
    Search,
    Loader2,
    Plus,
    ExternalLink,
    BookOpen
} from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

interface ScriptureBook {
    ID: number;
    code: string;
    name_en: string;
    name_ru: string;
    description_en: string;
    description_ru: string;
}

export default function LibraryPage() {
    const [search, setSearch] = useState('');
    const { data: books, error, isLoading } = useSWR('/library/books', fetcher);

    const filteredBooks = books?.filter((book: ScriptureBook) => 
        book.name_ru?.toLowerCase().includes(search.toLowerCase()) || 
        book.name_en?.toLowerCase().includes(search.toLowerCase()) ||
        book.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Book className="w-6 h-6 text-[var(--primary)]" />
                        Knowledge Base (Library)
                    </h1>
                    <p className="text-[var(--muted-foreground)] text-sm mt-1">Manage scripture books and verses</p>
                </div>
                <button className="bg-[var(--primary)] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all text-sm font-medium">
                    <Plus className="w-4 h-4" />
                    Import Book
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <input
                    type="text"
                    placeholder="Search books by name or code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-24">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            ) : error ? (
                <div className="p-12 text-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100">
                    Failed to load library data.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBooks?.map((book: ScriptureBook) => (
                        <div key={book.ID} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-lg transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-6 h-6 text-[var(--primary)]" />
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-[var(--secondary)] rounded-lg uppercase tracking-wider text-[var(--muted-foreground)]">
                                    {book.code}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg mb-1 group-hover:text-[var(--primary)] transition-colors">
                                {book.name_ru || book.name_en}
                            </h3>
                            <p className="text-xs text-[var(--muted-foreground)] mb-4">{book.name_en}</p>
                            <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 mb-6">
                                {book.description_ru || book.description_en || 'No description available.'}
                            </p>
                            
                            <div className="flex gap-2">
                                <button className="flex-1 bg-[var(--secondary)] hover:bg-[var(--primary)] hover:text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
                                    <ExternalLink className="w-3 h-3" />
                                    View Verses
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
