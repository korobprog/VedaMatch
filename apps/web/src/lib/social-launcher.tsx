import type { Language } from "@vedamatch/domain-types";
import { normalizeLanguage } from "@vedamatch/i18n";

export type SocialLauncherStatus = "active" | "soon" | "external";
export type SocialLauncherTone =
  | "blue"
  | "orange"
  | "green"
  | "pink"
  | "violet"
  | "copper"
  | "indigo"
  | "stone";

export type SocialLauncherIcon =
  | "book-open"
  | "bot"
  | "briefcase"
  | "calendar-days"
  | "clapperboard"
  | "coffee"
  | "compass"
  | "flame"
  | "graduation-cap"
  | "handshake"
  | "heart"
  | "history"
  | "landmark"
  | "layout-grid"
  | "life-buoy"
  | "map"
  | "megaphone"
  | "message-circle"
  | "music"
  | "newspaper"
  | "phone"
  | "radio"
  | "settings"
  | "shopping-bag"
  | "sparkles"
  | "sun"
  | "users"
  | "wallet";

export type SocialLauncherItem = {
  id: string;
  label: string;
  hint: string;
  href?: string;
  status: SocialLauncherStatus;
  tone: SocialLauncherTone;
  groupId: string;
  icon: SocialLauncherIcon;
  dock: boolean;
};

export type SocialLauncherGroup = {
  id: string;
  label: string;
  items: SocialLauncherItem[];
};

type LauncherDefinition = {
  id: string;
  groupId: string;
  tone: SocialLauncherTone;
  icon: SocialLauncherIcon;
  href?: string;
  status: SocialLauncherStatus;
  dock?: boolean;
  routeMatch?: string;
};

type ServiceCopy = {
  label: string;
  hint: string;
};

type LauncherCopy = {
  badge: string;
  timeLabel: string;
  brandSubtitle: string;
  shortcutsTitle: string;
  shortcutsActionLabel: string;
  quickAccessTitle: string;
  browseAllServices: string;
  publicTitle: string;
  publicBody: string;
  appTitle: string;
  appBody: string;
  openSocial: string;
  openChats: string;
  signIn: string;
  profile: string;
  publicHome: string;
  current: string;
  activeNow: string;
  comingSoon: string;
  groups: Record<string, string>;
  services: Record<string, ServiceCopy>;
};

export type SocialLauncherModel = {
  language: Language;
  copy: Omit<LauncherCopy, "groups" | "services">;
  allItems: SocialLauncherItem[];
  dockItems: SocialLauncherItem[];
  quickItems: SocialLauncherItem[];
  groups: SocialLauncherGroup[];
};

const GROUP_ORDER = [
  "communication",
  "calendar",
  "practice",
  "content",
  "services",
  "travel",
  "profile",
] as const;

const QUICK_ACCESS_IDS = ["contacts", "calls", "services_catalog"] as const;

const DEFINITIONS: LauncherDefinition[] = [
  { id: "contacts", groupId: "communication", tone: "blue", icon: "users", href: "/app/contacts", status: "active", dock: true, routeMatch: "/app/contacts" },
  { id: "chat", groupId: "communication", tone: "stone", icon: "message-circle", href: "/app/chats", status: "active", dock: true, routeMatch: "/app/chats" },
  { id: "rooms", groupId: "communication", tone: "indigo", icon: "layout-grid", status: "soon" },
  { id: "channels", groupId: "communication", tone: "green", icon: "radio", status: "soon" },
  { id: "connect", groupId: "communication", tone: "copper", icon: "handshake", status: "soon" },
  { id: "history", groupId: "communication", tone: "stone", icon: "history", status: "soon" },
  { id: "calls", groupId: "communication", tone: "green", icon: "phone", status: "soon", dock: true },
  { id: "ekadashi_calendar", groupId: "calendar", tone: "orange", icon: "calendar-days", status: "soon" },
  { id: "path_tracker", groupId: "practice", tone: "green", icon: "sun", status: "soon" },
  { id: "sadhu_sanga", groupId: "practice", tone: "orange", icon: "flame", status: "soon" },
  { id: "seva", groupId: "practice", tone: "pink", icon: "heart", status: "soon" },
  { id: "education", groupId: "practice", tone: "violet", icon: "graduation-cap", status: "soon" },
  { id: "library", groupId: "practice", tone: "green", icon: "book-open", href: "/app/library", status: "active", dock: true, routeMatch: "/app/library" },
  { id: "feed", groupId: "content", tone: "indigo", icon: "layout-grid", status: "soon" },
  { id: "news", groupId: "content", tone: "orange", icon: "newspaper", href: "/app/news", status: "active", dock: true, routeMatch: "/app/news" },
  { id: "multimedia", groupId: "content", tone: "indigo", icon: "music", status: "soon" },
  { id: "video_circles", groupId: "content", tone: "pink", icon: "clapperboard", status: "soon" },
  { id: "services", groupId: "services", tone: "violet", icon: "bot", href: "/app/services", status: "active" },
  { id: "services_catalog", groupId: "services", tone: "pink", icon: "briefcase", href: "/app/services", status: "active", dock: true, routeMatch: "/app/services" },
  { id: "cafe", groupId: "services", tone: "copper", icon: "coffee", status: "soon" },
  { id: "shops", groupId: "services", tone: "stone", icon: "shopping-bag", status: "soon" },
  { id: "ads", groupId: "services", tone: "orange", icon: "megaphone", status: "soon" },
  { id: "dating", groupId: "services", tone: "pink", icon: "sparkles", href: "/app/dating", status: "active", routeMatch: "/app/dating" },
  { id: "travel", groupId: "travel", tone: "violet", icon: "compass", href: "/app/travel", status: "active", dock: true, routeMatch: "/app/travel" },
  { id: "map", groupId: "travel", tone: "indigo", icon: "map", status: "soon" },
  { id: "dhama", groupId: "travel", tone: "copper", icon: "landmark", status: "soon" },
  { id: "support", groupId: "profile", tone: "green", icon: "life-buoy", href: "/app/support", status: "active", dock: true, routeMatch: "/app/support" },
  { id: "settings", groupId: "profile", tone: "stone", icon: "settings", href: "/app/profile", status: "active", dock: true, routeMatch: "/app/profile" },
  { id: "wallet", groupId: "profile", tone: "indigo", icon: "wallet", href: "/app/wallet", status: "active", dock: true, routeMatch: "/app/wallet" },
];

const EN_COPY: LauncherCopy = {
  badge: "LIVE COMMUNITY",
  timeLabel: "MAYAPUR TIME",
  brandSubtitle: "SOCIAL DASHBOARD",
  shortcutsTitle: "Portal services",
  shortcutsActionLabel: "PHONE-STYLE LAUNCHER",
  quickAccessTitle: "Quick access",
  browseAllServices: "All services",
  publicTitle: "VedaMatch social web dashboard",
  publicBody: "Open contacts, chats, library, travel, support, and the wider portal catalog from a single browser launcher styled after the mobile home screen.",
  appTitle: "Social launcher",
  appBody: "This authenticated dashboard keeps the social loop, content, travel, support, and utility services one tap away with the same icon-first pattern as the phone portal.",
  openSocial: "Open social",
  openChats: "Open chats",
  signIn: "Sign in",
  profile: "Profile",
  publicHome: "Social home",
  current: "Current",
  activeNow: "Available now",
  comingSoon: "Soon",
  groups: {
    communication: "Communication",
    calendar: "Calendar",
    practice: "Practice",
    content: "Content",
    services: "Services",
    travel: "Travel",
    profile: "Profile",
  },
  services: {
    path_tracker: { label: "Daily Path", hint: "Routine" },
    contacts: { label: "Contacts", hint: "People" },
    chat: { label: "Chat", hint: "Dialogs" },
    rooms: { label: "Rooms", hint: "Spaces" },
    calls: { label: "Calls", hint: "Voice" },
    dating: { label: "Union", hint: "Match" },
    cafe: { label: "Cafe", hint: "Food" },
    shops: { label: "Shops", hint: "Store" },
    ads: { label: "Ads", hint: "Market" },
    library: { label: "Library", hint: "Reader" },
    education: { label: "Education", hint: "Study" },
    multimedia: { label: "Media", hint: "Audio" },
    video_circles: { label: "Circles", hint: "Video" },
    channels: { label: "Channels", hint: "Broadcast" },
    sadhu_sanga: { label: "Sadhu-Sanga", hint: "Satsang" },
    ekadashi_calendar: { label: "Calendar", hint: "Vedic" },
    feed: { label: "Feed", hint: "Updates" },
    news: { label: "News", hint: "Editorial" },
    map: { label: "Map", hint: "Places" },
    dhama: { label: "Dhama", hint: "Sacred" },
    support: { label: "Support", hint: "Help" },
    history: { label: "History", hint: "Archive" },
    settings: { label: "Profile", hint: "Settings" },
    travel: { label: "Travel", hint: "Yatra" },
    services: { label: "Assistant", hint: "Guide" },
    services_catalog: { label: "Services", hint: "Catalog" },
    connect: { label: "Connect", hint: "Network" },
    seva: { label: "Seva", hint: "Care" },
    wallet: { label: "Wallet", hint: "LKM" },
  },
};

const RU_COPY: LauncherCopy = {
  badge: "LIVE COMMUNITY",
  timeLabel: "ВРЕМЯ МАЯПУРА",
  brandSubtitle: "SOCIAL DASHBOARD",
  shortcutsTitle: "Сервисы портала",
  shortcutsActionLabel: "ЯРЛЫКИ КАК В ТЕЛЕФОНЕ",
  quickAccessTitle: "Быстрый доступ",
  browseAllServices: "Все сервисы",
  publicTitle: "Социальная web-версия VedaMatch",
  publicBody: "Открывай контакты, чаты, библиотеку, путешествия, поддержку и весь каталог портала из единого браузерного launcher-а в стиле мобильной главной.",
  appTitle: "Social launcher",
  appBody: "Авторизованная панель держит social core, контент, путешествия, поддержку и utility-сервисы на расстоянии одного нажатия в том же icon-first паттерне, что и в телефоне.",
  openSocial: "Открыть social",
  openChats: "Открыть чаты",
  signIn: "Войти",
  profile: "Профиль",
  publicHome: "Social home",
  current: "Сейчас",
  activeNow: "Доступно",
  comingSoon: "Скоро",
  groups: {
    communication: "Общение",
    calendar: "Календарь",
    practice: "Практика",
    content: "Контент",
    services: "Сервисы",
    travel: "Путешествия",
    profile: "Профиль",
  },
  services: {
    path_tracker: { label: "Путь дня", hint: "Ритм" },
    contacts: { label: "Контакты", hint: "Люди" },
    chat: { label: "Чат", hint: "Диалоги" },
    rooms: { label: "Комнаты", hint: "Пространства" },
    calls: { label: "Звонки", hint: "Голос" },
    dating: { label: "Союз", hint: "Знакомства" },
    cafe: { label: "Кафе", hint: "Еда" },
    shops: { label: "Магазины", hint: "Покупки" },
    ads: { label: "Объявления", hint: "Маркет" },
    library: { label: "Библиотека", hint: "Чтение" },
    education: { label: "Обучение", hint: "Курсы" },
    multimedia: { label: "Медиа", hint: "Аудио" },
    video_circles: { label: "Круги", hint: "Видео" },
    channels: { label: "Каналы", hint: "Эфир" },
    sadhu_sanga: { label: "Садху-санга", hint: "Сатсанг" },
    ekadashi_calendar: { label: "Календарь", hint: "Ведический" },
    feed: { label: "Лента", hint: "Обновления" },
    news: { label: "Новости", hint: "Редакция" },
    map: { label: "Карта", hint: "Места" },
    dhama: { label: "Дхама", hint: "Святыни" },
    support: { label: "Поддержка", hint: "Помощь" },
    history: { label: "История", hint: "Архив" },
    settings: { label: "Профиль", hint: "Настройки" },
    travel: { label: "Путешествия", hint: "Ятры" },
    services: { label: "Ассистент", hint: "Навигатор" },
    services_catalog: { label: "Сервисы", hint: "Услуги" },
    connect: { label: "Связь", hint: "Сеть" },
    seva: { label: "Сева", hint: "Забота" },
    wallet: { label: "Кошелек", hint: "Кабинет" },
  },
};

function getCopy(language: string): LauncherCopy {
  const normalized = normalizeLanguage(language);
  if (normalized === "ru") {
    return RU_COPY;
  }
  return EN_COPY;
}

function sortDockItems(items: SocialLauncherItem[]): SocialLauncherItem[] {
  const dockOrder: Map<string, number> = new Map();
  QUICK_ACCESS_IDS.forEach((id, index) => dockOrder.set(id, index));
  let offset = QUICK_ACCESS_IDS.length;
  items.forEach((item) => {
    if (!dockOrder.has(item.id)) {
      dockOrder.set(item.id, offset);
      offset += 1;
    }
  });

  return [...items].sort((left, right) => (dockOrder.get(left.id) ?? 999) - (dockOrder.get(right.id) ?? 999));
}

export function getSocialLauncherModel(inputLanguage?: string | null): SocialLauncherModel {
  const language = normalizeLanguage(inputLanguage);
  const copy = getCopy(language);

  const allItems: SocialLauncherItem[] = DEFINITIONS.map((definition) => ({
    id: definition.id,
    groupId: definition.groupId,
    tone: definition.tone,
    icon: definition.icon,
    href: definition.href,
    status: definition.status,
    dock: Boolean(definition.dock),
    label: copy.services[definition.id]?.label ?? definition.id,
    hint: copy.services[definition.id]?.hint ?? copy.comingSoon,
  }));

  const dockItems = sortDockItems(allItems.filter((item) => item.dock));

  const groups = GROUP_ORDER.map((groupId) => ({
    id: groupId,
    label: copy.groups[groupId] ?? groupId,
    items: allItems.filter((item) => item.groupId === groupId),
  }));

  return {
    language,
    copy: {
      badge: copy.badge,
      timeLabel: copy.timeLabel,
      brandSubtitle: copy.brandSubtitle,
      shortcutsTitle: copy.shortcutsTitle,
      shortcutsActionLabel: copy.shortcutsActionLabel,
      quickAccessTitle: copy.quickAccessTitle,
      browseAllServices: copy.browseAllServices,
      publicTitle: copy.publicTitle,
      publicBody: copy.publicBody,
      appTitle: copy.appTitle,
      appBody: copy.appBody,
      openSocial: copy.openSocial,
      openChats: copy.openChats,
      signIn: copy.signIn,
      profile: copy.profile,
      publicHome: copy.publicHome,
      current: copy.current,
      activeNow: copy.activeNow,
      comingSoon: copy.comingSoon,
    },
    allItems,
    dockItems,
    quickItems: allItems.filter((item) => QUICK_ACCESS_IDS.includes(item.id as (typeof QUICK_ACCESS_IDS)[number])),
    groups,
  };
}

export function resolveActiveLauncherId(pathname: string): string | null {
  const directMatch = DEFINITIONS.find((definition) => definition.routeMatch && (pathname === definition.routeMatch || pathname.startsWith(`${definition.routeMatch}/`)));
  if (directMatch) {
    return directMatch.id;
  }
  return null;
}
