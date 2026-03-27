import { SocialDashboardHome, type DashboardShortcut } from "@/components/social-dashboard-home";
import { getRequestSurface } from "@/lib/request-surface";

const defaultCards = [
  {
    title: "Shared contracts first",
    body: "The web app consumes platform-neutral packages instead of importing React Native runtime code.",
  },
  {
    title: "Core product V1",
    body: "Auth, profile, contacts, chats, library, news, services, travel, support, and wallet routing are already mapped as browser-native flows.",
  },
  {
    title: "Realtime later",
    body: "Calls, browser notifications, and media-heavy surfaces stay outside the critical path until the social web loop is stable.",
  },
];

function buildDashboardCopy(language: string) {
  if (language === "ru") {
    return {
      brandSubtitle: "SOCIAL DASHBOARD",
      badge: "LIVE COMMUNITY",
      title: "Социальная web-версия VedaMatch",
      body: "Открывай контакты, чаты, библиотеку, новости и сервисы из единой браузерной панели. Дизайн взят из portal dashboard и адаптирован под social surface.",
      primaryAction: { href: "/app", label: "Открыть social", variant: "primary" as const },
      secondaryAction: { href: "/login", label: "Войти", variant: "ghost" as const },
      timeLabel: "MAYAPUR TIME",
      shortcutsTitle: "Сервисы портала",
      shortcutsActionLabel: "ЯРЛЫКИ",
      shortcuts: [
        { href: "/app/contacts", label: "Контакты", hint: "Люди", monogram: "CT", tone: "blue" },
        { href: "/app/chats", label: "Чат", hint: "Диалоги", monogram: "CH", tone: "stone" },
        { href: "/app/support", label: "Поддержка", hint: "Help", monogram: "SP", tone: "green" },
        { href: "/app/services", label: "Сервисы", hint: "Услуги", monogram: "SV", tone: "pink" },
        { href: "/app/library", label: "Библиотека", hint: "Reader", monogram: "LB", tone: "copper" },
        { href: "/app/news", label: "Новости", hint: "Feed", monogram: "NW", tone: "orange" },
        { href: "/app/travel", label: "Путешествия", hint: "Yatra", monogram: "TR", tone: "violet" },
        { href: "/app/wallet", label: "Кошелек", hint: "LKM", monogram: "WL", tone: "indigo" },
      ] satisfies DashboardShortcut[],
    };
  }

  return {
    brandSubtitle: "SOCIAL DASHBOARD",
    badge: "LIVE COMMUNITY",
    title: "VedaMatch social web dashboard",
    body: "Open contacts, chats, library, news, and services from a single browser dashboard. The visual language is adapted from the portal dashboard for the social surface.",
    primaryAction: { href: "/app", label: "Open social", variant: "primary" as const },
    secondaryAction: { href: "/login", label: "Sign in", variant: "ghost" as const },
    timeLabel: "MAYAPUR TIME",
    shortcutsTitle: "Portal services",
    shortcutsActionLabel: "SHORTCUTS",
    shortcuts: [
      { href: "/app/contacts", label: "Contacts", hint: "People", monogram: "CT", tone: "blue" },
      { href: "/app/chats", label: "Chats", hint: "Inbox", monogram: "CH", tone: "stone" },
      { href: "/app/support", label: "Support", hint: "Help", monogram: "SP", tone: "green" },
      { href: "/app/services", label: "Services", hint: "Catalog", monogram: "SV", tone: "pink" },
      { href: "/app/library", label: "Library", hint: "Reader", monogram: "LB", tone: "copper" },
      { href: "/app/news", label: "News", hint: "Feed", monogram: "NW", tone: "orange" },
      { href: "/app/travel", label: "Travel", hint: "Yatra", monogram: "TR", tone: "violet" },
      { href: "/app/wallet", label: "Wallet", hint: "LKM", monogram: "WL", tone: "indigo" },
    ] satisfies DashboardShortcut[],
  };
}

export default async function HomePage() {
  const { host, isSocial, language } = await getRequestSurface();
  const mayapurNow = new Date();
  const timeValue = new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(mayapurNow);
  const dayLabel = new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  }).format(mayapurNow);
  const dateLabel = new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(mayapurNow);

  if (isSocial) {
    const copy = buildDashboardCopy(language);

    return (
      <main className="shell shell--dashboard">
        <div className="container">
          <SocialDashboardHome
            badge={copy.badge}
            body={copy.body}
            brandSubtitle={copy.brandSubtitle}
            brandTitle="VedaMatch"
            dateLabel={dateLabel}
            dayLabel={dayLabel}
            primaryAction={copy.primaryAction}
            secondaryAction={copy.secondaryAction}
            shortcuts={copy.shortcuts}
            shortcutsActionLabel={copy.shortcutsActionLabel}
            shortcutsTitle={copy.shortcutsTitle}
            timeLabel={copy.timeLabel}
            timeValue={timeValue}
            title={copy.title}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="container grid-3">
          {defaultCards.map((card) => (
            <div className="panel page-card" key={card.title}>
              <h2>{card.title}</h2>
              <p className="muted">{card.body}</p>
            </div>
          ))}
          <div className="panel page-card">
            <h2>Current host</h2>
            <p className="muted">{host}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
