'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        // Initial check
        if (!navigator.onLine) {
            setIsOffline(true);
        }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
                >
                    <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-red-400/20">
                        <WifiOff className="w-4 h-4" />
                        <span className="text-sm font-medium tracking-wide font-sans">
                            Офлайн версия
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
