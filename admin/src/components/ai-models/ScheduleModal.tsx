import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, X, Loader2 } from 'lucide-react';
import React from 'react';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    scheduleInterval: number;
    setScheduleInterval: (val: number) => void;
    isSchedulerEnabled: boolean;
    setIsSchedulerEnabled: (val: boolean) => void;
    onSave: () => void;
    isSaving: boolean;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
    isOpen,
    onClose,
    scheduleInterval,
    setScheduleInterval,
    isSchedulerEnabled,
    setIsSchedulerEnabled,
    onSave,
    isSaving,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[var(--card)] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <CalendarClock className="w-5 h-5 text-indigo-500" />
                                Планировщик
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-[var(--secondary)] rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Интервал (минуты)</label>
                                <input
                                    type="number"
                                    value={scheduleInterval}
                                    onChange={(e) => setScheduleInterval(Number(e.target.value))}
                                    className="w-full bg-[var(--secondary)] rounded-xl px-4 py-2 border border-[var(--border)]"
                                    min="1"
                                />
                                <div className="flex gap-2 mt-2">
                                    {[60, 300, 1440].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setScheduleInterval(m)}
                                            className="text-xs bg-[var(--secondary)] px-2 py-1 rounded-lg hover:bg-[var(--border)] transition-colors"
                                        >
                                            {m === 60 ? '1ч' : m === 300 ? '5ч' : '24ч'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-[var(--secondary)] rounded-xl">
                                <span className="font-medium">Авто-проверка</span>
                                <button
                                    onClick={() => setIsSchedulerEnabled(!isSchedulerEnabled)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${isSchedulerEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSchedulerEnabled ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>

                            <p className="text-xs text-[var(--muted-foreground)]">
                                Планировщик будет автоматически запускать тест моделей и оптимизацию маршрутизации каждые {scheduleInterval} минут.
                            </p>

                            <button
                                onClick={onSave}
                                disabled={isSaving}
                                className="w-full bg-indigo-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-2"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Сохранить и запустить
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </ AnimatePresence>
    );
};
