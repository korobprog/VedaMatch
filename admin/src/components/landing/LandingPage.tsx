'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { landingCopy, resolveDefaultLandingLanguage, type LandingLanguage } from '@/lib/landing-copy';
import { buildVedamatchUrl } from '@/lib/vedamatch-hosts';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { ScrollSection } from './ScrollSection';
import { PhilosophySection } from './PhilosophySection';
import { TeamSection } from './TeamSection';
import { UnionPresentationSection } from './UnionPresentationSection';
import { motion } from 'framer-motion';
import { LogOut, User as UserIcon, Grid, ArrowRight, MessageCircle, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);
  const [language, setLanguage] = useState<LandingLanguage>('ru');
  const [hostname, setHostname] = useState('');
  const router = useRouter();

  useEffect(() => {
    const data = localStorage.getItem('admin_data');
    if (data) {
      setUser(JSON.parse(data));
    }

    const storedLanguage = localStorage.getItem('landing_language') as LandingLanguage | null;
    const defaultLanguage = resolveDefaultLandingLanguage(window.location.hostname);
    const nextLanguage = storedLanguage && landingCopy[storedLanguage] ? storedLanguage : defaultLanguage;
    setHostname(window.location.hostname);
    setLanguage(nextLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('landing_language', language);
  }, [language]);

  const handleLogout = () => {
    localStorage.removeItem('admin_data');
    setUser(null);
    router.refresh();
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const copy = landingCopy[language];
  const languages: LandingLanguage[] = ['en', 'hi', 'ru'];
  const socialLoginUrl = hostname ? buildVedamatchUrl(hostname, 'social', '/login', '') : '/login';
  const socialRegisterUrl = hostname ? buildVedamatchUrl(hostname, 'social', '/register', '') : '/register';
  const panelLoginUrl = hostname ? buildVedamatchUrl(hostname, 'panel', '/admin-login', '') : '/admin-login';
  const panelDashboardUrl = hostname ? buildVedamatchUrl(hostname, 'panel', '/dashboard', '') : '/dashboard';
  const userDashboardUrl = hostname ? buildVedamatchUrl(hostname, 'admin', '/user/dashboard', '') : '/user/dashboard';

  return (
    <div className="min-h-screen bg-[#faf9f6] selection:bg-orange-200">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#faf9f6]/80 backdrop-blur-xl border-b border-[#e7e5e4]">
        <div className="container mx-auto px-4 min-h-20 py-3 flex flex-col gap-3 md:h-20 md:flex-row md:items-center md:justify-between md:py-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-orange-400 to-red-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg transform rotate-3">
              V
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-[#2c1810] leading-none">VedaMatch</span>
              <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mt-1">{copy.nav.product}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-6">
            <div className="flex items-center gap-1 rounded-full border border-[#e7e5e4] bg-white/80 p-1 shadow-sm">
              {languages.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLanguage(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] transition-all ${
                    language === option
                      ? 'bg-[#2c1810] text-white'
                      : 'text-[#5c4d47] hover:bg-orange-50 hover:text-[#2c1810]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {user ? (
              <div className="flex flex-wrap items-center gap-3 md:gap-6">
                <Link href="/profile" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-[#e7e5e4] shadow-sm group-hover:border-orange-300 transition-colors overflow-hidden relative">
                    <UserIcon className="w-5 h-5 text-[#2c1810]" />
                  </div>
                  <span className="text-[#2c1810] font-semibold hidden sm:inline group-hover:text-orange-600 transition-colors">
                    {user.spiritualName || user.email}
                  </span>
                </Link>
                <Link
                  href={userDashboardUrl}
                  className="px-5 py-2.5 bg-[#2c1810] hover:bg-[#4a2c20] rounded-xl text-sm font-bold text-white shadow-lg transition-all flex items-center gap-2"
                >
                  <Grid className="w-4 h-4" />
                  {copy.nav.portal}
                </Link>
                {isAdmin && (
                  <Link
                    href={panelDashboardUrl}
                    className="bg-white text-[#2c1810] border border-[#e7e5e4] px-5 py-2.5 rounded-xl text-sm font-bold hover:border-orange-200 hover:bg-orange-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    {copy.nav.admin}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-10 h-10 flex items-center justify-center text-[#5c4d47] hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 rounded-xl transition-all"
                  title={copy.nav.logoutTitle}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4 md:gap-5">
                <Link href="/feed-posts" className="text-[#5c4d47] hover:text-[#2c1810] font-bold transition-colors">
                  {copy.nav.feed}
                </Link>
                <Link href={socialLoginUrl} className="text-[#5c4d47] hover:text-[#2c1810] font-bold transition-colors">
                  {copy.nav.login}
                </Link>
                <Link
                  href={socialRegisterUrl}
                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  {copy.nav.register}
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main>
        <HeroSection copy={copy} />
        <div id="features" className="scroll-mt-20">
          <FeaturesSection copy={copy} />
        </div>
        <PhilosophySection copy={copy} />
        <UnionPresentationSection copy={copy} />
        <TeamSection copy={copy} />

        <section className="py-32 bg-[#faf9f6] relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="max-w-5xl mx-auto bg-gradient-to-br from-[#2c1810] to-[#1a0f0a] rounded-[4rem] p-12 md:p-20 text-center text-[#faf9f6] shadow-[0_40px_100px_-20px_rgba(44,24,16,0.5)] relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] -mr-64 -mt-64 group-hover:opacity-20 transition-opacity" />
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[100px] -ml-64 -mb-64 group-hover:opacity-20 transition-opacity" />

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-white/10 backdrop-blur-xl shadow-2xl"
                >
                  <MessageCircle className="w-12 h-12 text-orange-400" />
                </motion.div>

                <h2 className="text-5xl md:text-7xl font-serif mb-8 leading-tight">
                  {copy.community.titlePrefix} <span className="text-orange-400 italic">{copy.community.titleAccent}</span>
                </h2>

                <p className="text-2xl text-[#faf9f6]/60 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
                  {copy.community.description}
                </p>

                <a
                  href="https://t.me/vedamatch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-4 bg-orange-500 text-white px-12 py-6 rounded-[2rem] font-black text-xl hover:bg-orange-600 transition-all hover:scale-105 active:scale-95 shadow-[0_15px_30px_-5px_rgba(249,115,22,0.4)]"
                >
                  {copy.community.cta}
                  <ArrowRight className="w-6 h-6" />
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        <ScrollSection copy={copy} />
      </main>

      <footer className="bg-[#2c1810] text-[#faf9f6] py-12">
        <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">VedaMatch</h3>
            <p className="text-white/60">{copy.footer.tagline}</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">{copy.footer.sectionsTitle}</h4>
            <ul className="space-y-2 text-white/60">
              <li><Link href="/" className="hover:text-white transition-colors">{copy.footer.home}</Link></li>
              <li><Link href="/feed-posts" className="hover:text-white transition-colors">{copy.footer.feed}</Link></li>
              <li><Link href={socialLoginUrl} className="hover:text-white transition-colors">{copy.footer.auth}</Link></li>
              <li><Link href={panelLoginUrl} className="hover:text-white transition-colors">{copy.footer.admin}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">{copy.footer.resourcesTitle}</h4>
            <ul className="space-y-2 text-white/60">
              <li>{copy.footer.docs}</li>
              <li>{copy.footer.blog}</li>
              <li>{copy.footer.community}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">{copy.footer.contactTitle}</h4>
            <p className="text-white/60">iskcon.dev@gmail.com</p>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/10 text-center text-white/40 text-sm">
          {copy.footer.copyright}
        </div>
      </footer>
    </div>
  );
}
