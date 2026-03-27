"use client";

import { SocialDashboardHome, type DashboardShortcut } from "@/components/social-dashboard-home";
import { useSession } from "@/components/session-context";

export default function AppHomePage() {
  const { language } = useSession();
  const now = new Date();
  const timeValue = new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const dayLabel = new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  }).format(now);
  const dateLabel = new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const shortcuts: DashboardShortcut[] = language === "ru"
    ? [
      { href: "/app/contacts", label: "Контакты", hint: "Люди", monogram: "CT", tone: "blue" },
      { href: "/app/chats", label: "Чат", hint: "Диалоги", monogram: "CH", tone: "stone" },
      { href: "/app/support", label: "Поддержка", hint: "Help", monogram: "SP", tone: "green" },
      { href: "/app/services", label: "Сервисы", hint: "Услуги", monogram: "SV", tone: "pink" },
      { href: "/app/library", label: "Библиотека", hint: "Reader", monogram: "LB", tone: "copper" },
      { href: "/app/news", label: "Новости", hint: "Feed", monogram: "NW", tone: "orange" },
      { href: "/app/travel", label: "Путешествия", hint: "Yatra", monogram: "TR", tone: "violet" },
      { href: "/app/wallet", label: "Кошелек", hint: "LKM", monogram: "WL", tone: "indigo" },
    ]
    : [
      { href: "/app/contacts", label: "Contacts", hint: "People", monogram: "CT", tone: "blue" },
      { href: "/app/chats", label: "Chats", hint: "Inbox", monogram: "CH", tone: "stone" },
      { href: "/app/support", label: "Support", hint: "Help", monogram: "SP", tone: "green" },
      { href: "/app/services", label: "Services", hint: "Catalog", monogram: "SV", tone: "pink" },
      { href: "/app/library", label: "Library", hint: "Reader", monogram: "LB", tone: "copper" },
      { href: "/app/news", label: "News", hint: "Feed", monogram: "NW", tone: "orange" },
      { href: "/app/travel", label: "Travel", hint: "Yatra", monogram: "TR", tone: "violet" },
      { href: "/app/wallet", label: "Wallet", hint: "LKM", monogram: "WL", tone: "indigo" },
    ];

  return (
    <SocialDashboardHome
      badge={language === "ru" ? "LIVE COMMUNITY" : "LIVE COMMUNITY"}
      body={language === "ru"
        ? "Это новая browser-native social панель. Отсюда можно сразу заходить в контакты, чаты, поддержку, библиотеку, новости и сервисы."
        : "This is the new browser-native social dashboard. Use it to jump directly into contacts, chats, support, library, news, and services."}
      brandSubtitle={language === "ru" ? "SOCIAL DASHBOARD" : "SOCIAL DASHBOARD"}
      brandTitle="VedaMatch"
      dateLabel={dateLabel}
      dayLabel={dayLabel}
      primaryAction={{ href: "/app/chats", label: language === "ru" ? "Открыть чаты" : "Open chats" }}
      secondaryAction={{ href: "/app/profile", label: language === "ru" ? "Профиль" : "Profile", variant: "ghost" }}
      shortcuts={shortcuts}
      shortcutsActionLabel={language === "ru" ? "ЯРЛЫКИ" : "SHORTCUTS"}
      shortcutsTitle={language === "ru" ? "Сервисы портала" : "Portal services"}
      timeLabel="MAYAPUR TIME"
      timeValue={timeValue}
      title={language === "ru" ? "Совместная джапа и social core" : "Shared japa and social core"}
    />
  );
}
