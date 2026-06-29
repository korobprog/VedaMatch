"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen, LockKeyhole, Sparkles, Users } from "lucide-react";
import { buildVedamatchUrl } from "@vedamatch/api-client";
import type { Language } from "@vedamatch/domain-types";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useSession } from "@/components/session-context";
import { ThemeSwitcher } from "@/components/theme-switcher";

type PortalPublicHomeProps = {
  host: string;
  language: Language;
};

type PortalService = {
  id: string;
  title: string;
  description: string;
  eyebrow: string;
  href: string;
  badge: string;
  tone: "violet" | "orange" | "green";
  icon: LucideIcon;
  external?: boolean;
  cta: string;
};

const COPY = {
  ru: {
    badge: "VEDAMATCH PORTAL",
    title: "Единый портал сервисов VedaMatch",
    body: "Открывай Social web, Motivation и Vedabase из одной главной страницы. Если уже вошёл, social-раздел откроется сразу без лишних шагов.",
    primaryCta: "Открыть Social web",
    secondaryCta: "Войти в аккаунт",
    servicesTitle: "Сервисы портала",
    servicesAction: "Единая точка входа",
    authTitle: "Единая авторизация",
    authBodyLoggedIn: "Сессия уже активна на этом web-портале. Можно сразу переходить в social-раздел и работать дальше.",
    authBodyGuest: "Войди один раз, чтобы открыть защищённые web-разделы без повторного входа внутри этого портала.",
    authStateLoggedIn: "Вы уже вошли",
    authStateGuest: "Гостевой режим",
    authHintLoggedIn: "Social web доступен сразу",
    authHintGuest: "Сначала откроется форма входа",
    services: {
      social: {
        title: "Social web",
        description: "Контакты, чаты, сервисы, библиотека, поддержка и другие browser-native сценарии VedaMatch.",
        eyebrow: "Общение и сервисы",
        badgeLoggedIn: "Доступ открыт",
        badgeGuest: "Нужен вход",
        ctaLoggedIn: "Открыть",
        ctaGuest: "Войти",
      },
      motivation: {
        title: "Motivation",
        description: "Лента вдохновляющих материалов и коротких публикаций для ежедневного возвращения к практике.",
        eyebrow: "Ежедневное вдохновение",
        badge: "Публично",
        cta: "Перейти",
      },
      vedabase: {
        title: "Vedabase",
        description: "Переход в библиотечную поверхность с текстами, чтением и духовной базой знаний.",
        eyebrow: "Библиотека и знания",
        badge: "Каталог",
        cta: "Открыть",
      },
    },
  },
  en: {
    badge: "VEDAMATCH PORTAL",
    title: "A single VedaMatch portal for key web services",
    body: "Open Social web, Motivation, and Vedabase from one polished homepage. If you are already signed in, the social area opens right away.",
    primaryCta: "Open Social web",
    secondaryCta: "Sign in",
    servicesTitle: "Portal services",
    servicesAction: "One entrypoint",
    authTitle: "Unified sign-in",
    authBodyLoggedIn: "Your session is already active on this web portal. You can jump straight into the social area and continue working.",
    authBodyGuest: "Sign in once to unlock protected web sections without repeating the flow inside this portal.",
    authStateLoggedIn: "You are signed in",
    authStateGuest: "Guest mode",
    authHintLoggedIn: "Social web opens immediately",
    authHintGuest: "Login opens first",
    services: {
      social: {
        title: "Social web",
        description: "Contacts, chats, services, library, support, and other browser-native VedaMatch flows in one place.",
        eyebrow: "Communication and services",
        badgeLoggedIn: "Ready",
        badgeGuest: "Auth required",
        ctaLoggedIn: "Open",
        ctaGuest: "Sign in",
      },
      motivation: {
        title: "Motivation",
        description: "A stream of uplifting posts and short reflections for a daily return to practice.",
        eyebrow: "Daily inspiration",
        badge: "Public",
        cta: "Visit",
      },
      vedabase: {
        title: "Vedabase",
        description: "Open the library-oriented surface for reading, studying, and accessing the spiritual knowledge base.",
        eyebrow: "Library and knowledge",
        badge: "Library",
        cta: "Open",
      },
    },
  },
  hi: {
    badge: "VEDAMATCH PORTAL",
    title: "VedaMatch के मुख्य web services के लिए एक ही portal",
    body: "एक ही सुंदर homepage से Social web, Motivation और Vedabase खोलिए। अगर आप पहले से sign in हैं, तो social area तुरंत खुल जाएगा।",
    primaryCta: "Social web खोलें",
    secondaryCta: "Sign in करें",
    servicesTitle: "Portal services",
    servicesAction: "एक ही entrypoint",
    authTitle: "Unified sign-in",
    authBodyLoggedIn: "इस web portal पर आपकी session पहले से active है। आप सीधे social area में जा सकते हैं।",
    authBodyGuest: "Protected web sections खोलने के लिए एक बार sign in करें, फिर portal के अंदर बार-बार login नहीं करना पड़ेगा।",
    authStateLoggedIn: "आप sign in हैं",
    authStateGuest: "Guest mode",
    authHintLoggedIn: "Social web तुरंत खुलेगा",
    authHintGuest: "पहले login खुलेगा",
    services: {
      social: {
        title: "Social web",
        description: "Contacts, chats, services, library, support और दूसरे browser-native VedaMatch flows एक ही जगह।",
        eyebrow: "Communication and services",
        badgeLoggedIn: "Ready",
        badgeGuest: "Login required",
        ctaLoggedIn: "Open",
        ctaGuest: "Sign in",
      },
      motivation: {
        title: "Motivation",
        description: "Daily practice के लिए प्रेरक posts और छोटे reflection cards की stream।",
        eyebrow: "Daily inspiration",
        badge: "Public",
        cta: "Visit",
      },
      vedabase: {
        title: "Vedabase",
        description: "Reading, study और spiritual knowledge base के लिए library surface खोलें।",
        eyebrow: "Library and knowledge",
        badge: "Library",
        cta: "Open",
      },
    },
  },
} satisfies Record<Language, any>;

function PortalServiceCard({ service }: { service: PortalService }) {
  const Icon = service.icon;
  const content = (
    <>
      <div className={`portal-service-card__icon portal-service-card__icon--${service.tone}`}>
        <Icon aria-hidden="true" size={26} strokeWidth={2.1} />
      </div>
      <div className="portal-service-card__body">
        <span className="portal-service-card__eyebrow">{service.eyebrow}</span>
        <h2>{service.title}</h2>
        <p>{service.description}</p>
      </div>
      <div className="portal-service-card__footer">
        <span className="portal-service-card__badge">{service.badge}</span>
        <span className="portal-service-card__cta">
          {service.cta}
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2.2} />
        </span>
      </div>
    </>
  );

  if (service.external) {
    return (
      <a className="portal-service-card" href={service.href} rel="noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link className="portal-service-card" href={service.href}>
      {content}
    </Link>
  );
}

export function PortalPublicHome({ host, language }: PortalPublicHomeProps) {
  const { ready, session } = useSession();
  const copy = COPY[language] || COPY.en;
  const isLoggedIn = Boolean(session?.accessToken);

  const services: PortalService[] = [
    {
      id: "social",
      title: copy.services.social.title,
      description: copy.services.social.description,
      eyebrow: copy.services.social.eyebrow,
      href: isLoggedIn ? "/app" : "/login",
      badge: isLoggedIn ? copy.services.social.badgeLoggedIn : copy.services.social.badgeGuest,
      tone: "violet",
      icon: Users,
      cta: isLoggedIn ? copy.services.social.ctaLoggedIn : copy.services.social.ctaGuest,
    },
    {
      id: "motivation",
      title: copy.services.motivation.title,
      description: copy.services.motivation.description,
      eyebrow: copy.services.motivation.eyebrow,
      href: buildVedamatchUrl(host, "motivation", "/"),
      badge: copy.services.motivation.badge,
      tone: "orange",
      icon: Sparkles,
      cta: copy.services.motivation.cta,
      external: true,
    },
    {
      id: "vedabase",
      title: copy.services.vedabase.title,
      description: copy.services.vedabase.description,
      eyebrow: copy.services.vedabase.eyebrow,
      href: buildVedamatchUrl(host, "vedabase", "/"),
      badge: copy.services.vedabase.badge,
      tone: "green",
      icon: BookOpen,
      cta: copy.services.vedabase.cta,
      external: true,
    },
  ];

  return (
    <main className="shell shell--dashboard">
      <div className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <section className="portal-home">
          <div className="portal-home__controls">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>

          <div className="dashboard-grid portal-home__grid">
            <article className="dashboard-card dashboard-card--hero portal-home__hero">
              <span className="dashboard-badge">{copy.badge}</span>
              <div className="dashboard-hero__body">
                <h1>{copy.title}</h1>
                <p>{copy.body}</p>
              </div>
              <div className="dashboard-hero__actions">
                <Link className="dashboard-cta" href={isLoggedIn ? "/app" : "/login"}>
                  {copy.primaryCta}
                </Link>
                {!isLoggedIn ? <Link className="dashboard-inline-link" href="/login">{copy.secondaryCta}</Link> : null}
              </div>
            </article>

            <article className="dashboard-card portal-home__status">
              <div className="portal-home__status-icon">
                <LockKeyhole aria-hidden="true" size={26} strokeWidth={2.2} />
              </div>
              <span className="dashboard-card__eyebrow">{copy.authTitle}</span>
              <strong>{ready ? (isLoggedIn ? copy.authStateLoggedIn : copy.authStateGuest) : copy.authTitle}</strong>
              <p>{isLoggedIn ? copy.authBodyLoggedIn : copy.authBodyGuest}</p>
              <span className="portal-home__status-hint">{ready ? (isLoggedIn ? copy.authHintLoggedIn : copy.authHintGuest) : copy.authHintGuest}</span>
            </article>
          </div>

          <section className="dashboard-shortcuts portal-home__services">
            <div className="dashboard-shortcuts__head">
              <div className="dashboard-shortcuts__title">
                <div className="dashboard-shortcuts__icon">VM</div>
                <h2>{copy.servicesTitle}</h2>
              </div>
              <span className="dashboard-shortcuts__action">{copy.servicesAction}</span>
            </div>

            <div className="portal-services-grid">
              {services.map((service) => (
                <PortalServiceCard key={service.id} service={service} />
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
