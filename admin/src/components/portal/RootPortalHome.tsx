'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Heart, LockKeyhole, Sparkles, Users } from 'lucide-react';
import { buildVedamatchUrl } from '@/lib/vedamatch-hosts';
import { resolveDefaultLandingLanguage, type LandingLanguage } from '@/lib/landing-copy';

type PortalCopy = {
  badge: string;
  title: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
  registerCta: string;
  servicesTitle: string;
  servicesHint: string;
  authTitle: string;
  authGuest: string;
  authLoggedIn: string;
  authGuestState: string;
  authLoggedInState: string;
  authGuestHint: string;
  authLoggedInHint: string;
  portalAdmin: string;
  services: {
    union: {
      title: string;
      eyebrow: string;
      description: string;
      badge: string;
      cta: string;
    };
    social: {
      title: string;
      eyebrow: string;
      description: string;
      guestBadge: string;
      readyBadge: string;
      guestCta: string;
      readyCta: string;
    };
    motivation: {
      title: string;
      eyebrow: string;
      description: string;
      badge: string;
      cta: string;
    };
    vedabase: {
      title: string;
      eyebrow: string;
      description: string;
      badge: string;
      cta: string;
    };
  };
};

const COPY: Record<LandingLanguage, PortalCopy> = {
  ru: {
    badge: 'VEDAMATCH PORTAL',
    title: 'Единый портал сервисов VedaMatch',
    body: 'Открывайте Union, Social web, Motivation и Vedabase с одного главного экрана. Если уже вошли на этом портале, основной web-кабинет доступен сразу.',
    primaryCta: 'Открыть Social web',
    secondaryCta: 'Войти',
    registerCta: 'Регистрация',
    servicesTitle: 'Сервисы портала',
    servicesHint: 'Одна точка входа для основных web-направлений',
    authTitle: 'Единая авторизация на портале',
    authGuest: 'Сначала войдите на этом домене, после чего основной web-кабинет откроется без лишних шагов.',
    authLoggedIn: 'Сессия уже активна на этом портале — можно сразу переходить в основной web-кабинет.',
    authGuestState: 'Гостевой режим',
    authLoggedInState: 'Вы уже вошли',
    authGuestHint: 'Сначала откроется форма входа',
    authLoggedInHint: 'Social web доступен сразу',
    portalAdmin: 'Панель управления',
    services: {
      union: {
        title: 'Union',
        eyebrow: 'Знакомства и совместимость',
        description: 'Отдельный сервис осознанных знакомств, профилей совместимости и заявок для поиска близких по ценностям людей.',
        badge: 'Знакомства',
        cta: 'Открыть',
      },
      social: {
        title: 'Social web',
        eyebrow: 'Общение и сервисы',
        description: 'Контакты, чаты, библиотека, личные разделы и другие browser-native сценарии VedaMatch на одном портале.',
        guestBadge: 'Нужен вход',
        readyBadge: 'Доступ открыт',
        guestCta: 'Войти',
        readyCta: 'Открыть',
      },
      motivation: {
        title: 'Motivation',
        eyebrow: 'Ежедневное вдохновение',
        description: 'Лента вдохновляющих публикаций и коротких материалов для регулярного возврата к практике.',
        badge: 'Публично',
        cta: 'Перейти',
      },
      vedabase: {
        title: 'Vedabase',
        eyebrow: 'Библиотека и знания',
        description: 'Отдельная поверхность для чтения, изучения текстов и доступа к духовной базе знаний.',
        badge: 'Каталог',
        cta: 'Открыть',
      },
    },
  },
  en: {
    badge: 'VEDAMATCH PORTAL',
    title: 'One VedaMatch portal for key web services',
    body: 'Open Union, Social web, Motivation, and Vedabase from one homepage. If you are already signed in on this portal, the main web cabinet is available immediately.',
    primaryCta: 'Open Social web',
    secondaryCta: 'Sign in',
    registerCta: 'Register',
    servicesTitle: 'Portal services',
    servicesHint: 'One entrypoint for the main web surfaces',
    authTitle: 'Unified sign-in on this portal',
    authGuest: 'Sign in on this domain first, then the main web cabinet opens without extra steps.',
    authLoggedIn: 'Your session is already active on this portal, so you can open the main web cabinet right away.',
    authGuestState: 'Guest mode',
    authLoggedInState: 'You are signed in',
    authGuestHint: 'Login opens first',
    authLoggedInHint: 'Social web opens immediately',
    portalAdmin: 'Admin panel',
    services: {
      union: {
        title: 'Union',
        eyebrow: 'Dating and compatibility',
        description: 'A dedicated conscious dating surface with compatibility profiles, discovery, and relationship requests.',
        badge: 'Dating',
        cta: 'Open',
      },
      social: {
        title: 'Social web',
        eyebrow: 'Communication and services',
        description: 'Contacts, chats, library, personal flows, and the core browser-native VedaMatch experience in one portal.',
        guestBadge: 'Auth required',
        readyBadge: 'Ready',
        guestCta: 'Sign in',
        readyCta: 'Open',
      },
      motivation: {
        title: 'Motivation',
        eyebrow: 'Daily inspiration',
        description: 'A public stream of uplifting materials and short reflections for a steady return to practice.',
        badge: 'Public',
        cta: 'Visit',
      },
      vedabase: {
        title: 'Vedabase',
        eyebrow: 'Library and knowledge',
        description: 'A dedicated reading and study surface for scriptures and the broader spiritual knowledge base.',
        badge: 'Library',
        cta: 'Open',
      },
    },
  },
  hi: {
    badge: 'VEDAMATCH PORTAL',
    title: 'VedaMatch के मुख्य web services के लिए एक portal',
    body: 'एक ही मुख्य पृष्ठ से Union, Social web, Motivation और Vedabase खोलिए। यदि आप इस portal पर पहले से sign in हैं, तो मुख्य web cabinet तुरंत उपलब्ध है।',
    primaryCta: 'Social web खोलें',
    secondaryCta: 'Sign in करें',
    registerCta: 'Register',
    servicesTitle: 'Portal services',
    servicesHint: 'मुख्य web surfaces के लिए एक entrypoint',
    authTitle: 'इसी portal पर unified sign-in',
    authGuest: 'पहले इसी domain पर sign in करें, फिर मुख्य web cabinet बिना अतिरिक्त steps के खुल जाएगा।',
    authLoggedIn: 'आपकी session इस portal पर पहले से active है, इसलिए आप मुख्य web cabinet तुरंत खोल सकते हैं।',
    authGuestState: 'Guest mode',
    authLoggedInState: 'आप sign in हैं',
    authGuestHint: 'पहले login खुलेगा',
    authLoggedInHint: 'Social web तुरंत खुलेगा',
    portalAdmin: 'Admin panel',
    services: {
      union: {
        title: 'Union',
        eyebrow: 'Dating and compatibility',
        description: 'Compatibility profiles, discovery और meaningful relationship requests के लिए अलग conscious dating surface।',
        badge: 'Dating',
        cta: 'Open',
      },
      social: {
        title: 'Social web',
        eyebrow: 'Communication and services',
        description: 'Contacts, chats, library, personal flows और मुख्य browser-native VedaMatch अनुभव एक ही portal में।',
        guestBadge: 'Login required',
        readyBadge: 'Ready',
        guestCta: 'Sign in',
        readyCta: 'Open',
      },
      motivation: {
        title: 'Motivation',
        eyebrow: 'Daily inspiration',
        description: 'प्रेरणादायक posts और छोटे reflections की public stream जो daily practice में सहायक हो।',
        badge: 'Public',
        cta: 'Visit',
      },
      vedabase: {
        title: 'Vedabase',
        eyebrow: 'Library and knowledge',
        description: 'शास्त्र पढ़ने, अध्ययन करने और spiritual knowledge base तक पहुँचने के लिए अलग surface।',
        badge: 'Library',
        cta: 'Open',
      },
    },
  },
};

type ServiceCardProps = {
  title: string;
  eyebrow: string;
  description: string;
  badge: string;
  cta: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  external?: boolean;
};

function ServiceCard({ title, eyebrow, description, badge, cta, href, icon: Icon, accent, external = false }: ServiceCardProps) {
  const content = (
    <div className="group flex h-full flex-col rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-[0_24px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_30px_90px_-32px_rgba(249,115,22,0.35)] dark:bg-white/5">
      <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
        <Icon className="h-6 w-6" />
      </div>
      <span className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">{eyebrow}</span>
      <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          {badge}
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition group-hover:gap-3 dark:text-orange-300">
          {cta}
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={href} rel="noreferrer" className="h-full">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="h-full">
      {content}
    </Link>
  );
}

function resolvePortalLinkHostname(hostname: string, language: LandingLanguage) {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return hostname;
  }

  return language === 'ru' ? 'vedamatch.ru' : 'vedamatch.com';
}

export default function RootPortalHome() {
  const [language, setLanguage] = useState<LandingLanguage>('ru');
  const [hostname, setHostname] = useState('vedamatch.ru');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const nextHost = typeof window !== 'undefined' ? window.location.hostname : 'vedamatch.ru';
    const storedLanguage = typeof window !== 'undefined' ? (window.localStorage.getItem('landing_language') as LandingLanguage | null) : null;
    const nextLanguage = storedLanguage && COPY[storedLanguage] ? storedLanguage : resolveDefaultLandingLanguage(nextHost);
    const authData = typeof window !== 'undefined' ? window.localStorage.getItem('admin_data') : null;

    setHostname(nextHost);
    setLanguage(nextLanguage);
    setIsLoggedIn(Boolean(authData));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('landing_language', language);
      document.documentElement.lang = language;
    }
  }, [language]);

  const copy = COPY[language];
  const socialHref = isLoggedIn ? '/user/dashboard' : '/login';
  const portalLinkHostname = useMemo(() => resolvePortalLinkHostname(hostname, language), [hostname, language]);
  const unionHref = useMemo(() => buildVedamatchUrl(portalLinkHostname, 'union', '/'), [portalLinkHostname]);
  const motivationHref = useMemo(() => buildVedamatchUrl(portalLinkHostname, 'motivation', '/'), [portalLinkHostname]);
  const vedabaseHref = useMemo(() => buildVedamatchUrl(portalLinkHostname, 'vedabase', '/'), [portalLinkHostname]);
  const adminHref = useMemo(() => buildVedamatchUrl(portalLinkHostname, 'panel', '/admin-login'), [portalLinkHostname]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_32%),linear-gradient(180deg,_#fffdf8_0%,_#fff7ed_52%,_#f8fafc_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_50%,_#111827_100%)] dark:text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/20 bg-white/70 px-5 py-4 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-lg font-black text-white shadow-lg">
              V
            </div>
            <div>
              <div className="text-lg font-semibold">VedaMatch</div>
              <div className="text-sm text-slate-500 dark:text-slate-300">{copy.badge}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(['en', 'hi', 'ru'] as LandingLanguage[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLanguage(option)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] transition ${
                  language === option
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                    : 'bg-white/80 text-slate-600 hover:bg-orange-50 hover:text-slate-950 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
            <Link
              href={isLoggedIn ? '/user/dashboard' : '/login'}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              {isLoggedIn ? copy.primaryCta : copy.secondaryCta}
            </Link>
            <a
              href={adminHref}
              className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:text-orange-300"
            >
              {copy.portalAdmin}
            </a>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <div>
            <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-200">
              {copy.badge}
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              {copy.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={socialHref}
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600"
              >
                {isLoggedIn ? copy.services.social.readyCta : copy.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!isLoggedIn ? (
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:text-orange-300"
                >
                  {copy.registerCta}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/20 bg-white/75 p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">{copy.authTitle}</div>
                <div className="mt-3 text-2xl font-semibold">{isLoggedIn ? copy.authLoggedInState : copy.authGuestState}</div>
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {isLoggedIn ? copy.authLoggedIn : copy.authGuest}
                </p>
                <div className="mt-5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  {isLoggedIn ? copy.authLoggedInHint : copy.authGuestHint}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-10">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold">{copy.servicesTitle}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{copy.servicesHint}</p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ServiceCard
              title={copy.services.union.title}
              eyebrow={copy.services.union.eyebrow}
              description={copy.services.union.description}
              badge={copy.services.union.badge}
              cta={copy.services.union.cta}
              href={unionHref}
              icon={Heart}
              accent="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"
              external
            />
            <ServiceCard
              title={copy.services.social.title}
              eyebrow={copy.services.social.eyebrow}
              description={copy.services.social.description}
              badge={isLoggedIn ? copy.services.social.readyBadge : copy.services.social.guestBadge}
              cta={isLoggedIn ? copy.services.social.readyCta : copy.services.social.guestCta}
              href={socialHref}
              icon={Users}
              accent="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
            />
            <ServiceCard
              title={copy.services.motivation.title}
              eyebrow={copy.services.motivation.eyebrow}
              description={copy.services.motivation.description}
              badge={copy.services.motivation.badge}
              cta={copy.services.motivation.cta}
              href={motivationHref}
              icon={Sparkles}
              accent="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
              external
            />
            <ServiceCard
              title={copy.services.vedabase.title}
              eyebrow={copy.services.vedabase.eyebrow}
              description={copy.services.vedabase.description}
              badge={copy.services.vedabase.badge}
              cta={copy.services.vedabase.cta}
              href={vedabaseHref}
              icon={BookOpen}
              accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
              external
            />
          </div>
        </section>
      </div>
    </main>
  );
}
