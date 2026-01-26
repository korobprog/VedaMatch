import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#161618] flex flex-col items-center justify-center p-6 text-white/50">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-orange-500" />
            <p className="font-bold text-lg animate-pulse">Настройка сознания...</p>
        </div>
    );
}
