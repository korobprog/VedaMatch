'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Users, ArrowRight, Sparkles, Briefcase, UserPlus, HandHelping } from 'lucide-react';
import api from '@/lib/api';
import type { LandingCopy, LandingTabId } from '@/lib/landing-copy';

interface ProfileInfo {
  avatarUrl: string;
  skills: string;
}

interface ModeData {
  profiles: ProfileInfo[];
  totalCount: number;
  totalMale?: number;
  totalFemale?: number;
}

interface PresentationData {
  family: ModeData;
  business: ModeData;
  friendship: ModeData;
  seva: ModeData;
}

const tabs = [
  { id: 'family' as const, icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
  { id: 'business' as const, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'friendship' as const, icon: UserPlus, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'seva' as const, icon: HandHelping, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
];

export function UnionPresentationSection({ copy }: { copy: LandingCopy }) {
  const [data, setData] = useState<PresentationData | null>(null);
  const [activeTab, setActiveTab] = useState<LandingTabId>('family');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dating/presentation')
      .then((res) => setData(res.data))
      .catch((err) => console.error('Failed to load dating stats', err))
      .finally(() => setLoading(false));
  }, []);

  const getApiOrigin = (): string => String(api.defaults.baseURL || '').replace(/\/api(?:\/.*)?$/, '');

  const resolveMediaUrl = (rawUrl?: string | null): string => {
    if (!rawUrl) return '';
    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl) return '';
    if (trimmedUrl.startsWith('http')) return trimmedUrl;
    const origin = getApiOrigin();
    const normalizedPath = trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`;
    if (/^\/[^/]+\.(?:jpg|jpeg|png|webp|gif|heic|heif)$/i.test(normalizedPath)) {
      return `${origin}/uploads/avatars${normalizedPath}`;
    }
    return `${origin}${normalizedPath}`;
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
          <Sparkles className="w-8 h-8 text-pink-500" />
        </motion.div>
      </div>
    );
  }

  const currentModeData = data?.[activeTab];
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab)!;
  const activeTabCopy = copy.union.tabs[activeTab];

  return (
    <section className="py-24 bg-gradient-to-b from-[#fffbeb] to-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider mb-8"
            >
              <Sparkles className="w-4 h-4" />
              {copy.union.badge}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-serif text-[#2c1810] mb-12 leading-tight"
            >
              {copy.union.titlePrefix} <br />
              <span className={`${activeTabConfig.color} italic transition-colors duration-500`}>{activeTabCopy.label}</span>
            </motion.h2>

            <div className="flex flex-wrap justify-center gap-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all duration-300 border ${
                      isActive
                        ? `${tab.bg} ${tab.border} ${tab.color} shadow-lg scale-105`
                        : 'bg-white border-[#e7e5e4] text-[#5c4d47] hover:border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                    {copy.union.tabs[tab.id].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-lg text-[#5c4d47] mb-10 leading-relaxed font-light">{activeTabCopy.description}</p>

                  <div className="flex flex-wrap gap-6 mb-12">
                    {activeTab === 'family' ? (
                      <>
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-[#e7e5e4] flex items-center gap-4 flex-1 min-w-[140px]">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-[#2c1810]">{currentModeData?.totalMale || 0}</p>
                            <p className="text-xs text-[#5c4d47] uppercase font-bold tracking-wider">{copy.union.maleLabel}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-[#e7e5e4] flex items-center gap-4 flex-1 min-w-[140px]">
                          <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-[#2c1810]">{currentModeData?.totalFemale || 0}</p>
                            <p className="text-xs text-[#5c4d47] uppercase font-bold tracking-wider">{copy.union.femaleLabel}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 bg-white rounded-3xl shadow-sm border border-[#e7e5e4] flex items-center gap-6 flex-1">
                        <div className={`w-14 h-14 ${activeTabConfig.bg} ${activeTabConfig.color} rounded-2xl flex items-center justify-center`}>
                          <Users className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-[#2c1810]">{currentModeData?.totalCount || 0}</p>
                          <p className="text-sm text-[#5c4d47] uppercase font-black tracking-widest opacity-60">{activeTabCopy.totalLabel}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button className="group relative inline-flex items-center gap-3 bg-[#2c1810] text-white px-8 py-4 rounded-2xl font-bold transition-all hover:bg-orange-600 hover:shadow-xl active:scale-95">
                    {activeTabCopy.join}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="order-1 lg:order-2 relative">
              <div className="grid grid-cols-5 gap-3">
                <AnimatePresence mode="popLayout">
                  {currentModeData?.profiles?.map((profile, i) => (
                    <motion.div
                      key={`${activeTab}-${i}`}
                      layout
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: -20 }}
                      transition={{ delay: i * 0.03, duration: 0.4 }}
                      className={`relative aspect-[4/5] rounded-2xl overflow-hidden border-2 border-white shadow-lg group/card ${i % 2 === 0 ? 'mt-8' : ''}`}
                    >
                      <img src={resolveMediaUrl(profile.avatarUrl)} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" />
                      {profile.skills && (
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810]/90 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
                          <p className="text-[10px] text-white font-medium line-clamp-2 leading-tight">{profile.skills}</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-200/30 rounded-full blur-3xl" />
              </div>

              <div className="mt-12 text-center text-[10px] font-black text-[#5c4d47]/30 uppercase tracking-[0.4em]">{copy.union.footer}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
