import { SUPPORTED_LANGUAGES, type Language } from "@vedamatch/domain-types";

export type Dictionary = {
  appName: string;
  nav: {
    portal: string;
    profile: string;
    settings: string;
    library: string;
    news: string;
    wallet: string;
    services: string;
    travel: string;
    contacts: string;
    chats: string;
    support: string;
    login: string;
    register: string;
    logout: string;
  };
  landing: {
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  auth: {
    loginTitle: string;
    registerTitle: string;
    email: string;
    password: string;
    submitLogin: string;
    submitRegister: string;
    successRedirect: string;
  };
  portal: {
    title: string;
    subtitle: string;
    emptyState: string;
    notAuthenticated: string;
  };
  common: {
    loading: string;
    error: string;
    save: string;
    retry: string;
    open: string;
    details: string;
  };
};

export const dictionaries: Record<Language, Dictionary> = {
  ru: {
    appName: "VedaMatch",
    nav: {
      portal: "Портал",
      profile: "Профиль",
      settings: "Настройки",
      library: "Библиотека",
      news: "Новости",
      wallet: "Кошелек",
      services: "Сервисы",
      travel: "Путешествия",
      contacts: "Контакты",
      chats: "Чаты",
      support: "Поддержка",
      login: "Войти",
      register: "Регистрация",
      logout: "Выйти",
    },
    landing: {
      title: "Полная web-версия VedaMatch",
      subtitle: "Публичные страницы, портал пользователя и core product flows на базе существующего backend.",
      primaryCta: "Открыть портал",
      secondaryCta: "Войти",
    },
    auth: {
      loginTitle: "Вход",
      registerTitle: "Регистрация",
      email: "Email",
      password: "Пароль",
      submitLogin: "Войти",
      submitRegister: "Создать аккаунт",
      successRedirect: "Переходим в портал...",
    },
    portal: {
      title: "Портал пользователя",
      subtitle: "Core web shell для профиля, контента, сервисов и коммуникаций.",
      emptyState: "Данные пока не загружены.",
      notAuthenticated: "Для этого раздела нужен вход в аккаунт.",
    },
    common: {
      loading: "Загрузка...",
      error: "Ошибка",
      save: "Сохранить",
      retry: "Повторить",
      open: "Открыть",
      details: "Подробнее",
    },
  },
  en: {
    appName: "VedaMatch",
    nav: {
      portal: "Portal",
      profile: "Profile",
      settings: "Settings",
      library: "Library",
      news: "News",
      wallet: "Wallet",
      services: "Services",
      travel: "Travel",
      contacts: "Contacts",
      chats: "Chats",
      support: "Support",
      login: "Login",
      register: "Register",
      logout: "Logout",
    },
    landing: {
      title: "Full VedaMatch web app",
      subtitle: "Public pages, user portal, and core product flows on top of the existing backend.",
      primaryCta: "Open portal",
      secondaryCta: "Sign in",
    },
    auth: {
      loginTitle: "Login",
      registerTitle: "Register",
      email: "Email",
      password: "Password",
      submitLogin: "Sign in",
      submitRegister: "Create account",
      successRedirect: "Redirecting to portal...",
    },
    portal: {
      title: "User portal",
      subtitle: "Core web shell for profile, content, services, and communications.",
      emptyState: "No data loaded yet.",
      notAuthenticated: "This section requires authentication.",
    },
    common: {
      loading: "Loading...",
      error: "Error",
      save: "Save",
      retry: "Retry",
      open: "Open",
      details: "Details",
    },
  },
  hi: {
    appName: "VedaMatch",
    nav: {
      portal: "पोर्टल",
      profile: "प्रोफ़ाइल",
      settings: "सेटिंग्स",
      library: "लाइब्रेरी",
      news: "समाचार",
      wallet: "वॉलेट",
      services: "सेवाएँ",
      travel: "यात्रा",
      contacts: "संपर्क",
      chats: "चैट",
      support: "सपोर्ट",
      login: "लॉगिन",
      register: "रजिस्टर",
      logout: "लॉगआउट",
    },
    landing: {
      title: "VedaMatch का पूर्ण web ऐप",
      subtitle: "मौजूदा backend पर public pages, user portal और core product flows.",
      primaryCta: "पोर्टल खोलें",
      secondaryCta: "लॉगिन करें",
    },
    auth: {
      loginTitle: "लॉगिन",
      registerTitle: "रजिस्टर",
      email: "ईमेल",
      password: "पासवर्ड",
      submitLogin: "लॉगिन",
      submitRegister: "अकाउंट बनाएँ",
      successRedirect: "पोर्टल पर भेजा जा रहा है...",
    },
    portal: {
      title: "यूज़र पोर्टल",
      subtitle: "प्रोफ़ाइल, कंटेंट, सेवाओं और कम्युनिकेशन के लिए core web shell.",
      emptyState: "अभी कोई डेटा लोड नहीं हुआ है।",
      notAuthenticated: "इस सेक्शन के लिए लॉगिन आवश्यक है।",
    },
    common: {
      loading: "लोड हो रहा है...",
      error: "त्रुटि",
      save: "सहेजें",
      retry: "फिर से प्रयास करें",
      open: "खोलें",
      details: "विवरण",
    },
  },
};

export function normalizeLanguage(input?: string | null): Language {
  const lowered = String(input || "").trim().toLowerCase();
  const exact = SUPPORTED_LANGUAGES.find((language) => language === lowered);
  if (exact) {
    return exact;
  }

  const base = lowered.split("-")[0];
  const byBase = SUPPORTED_LANGUAGES.find((language) => language === base);
  return byBase ?? "en";
}

export function getDictionary(language?: string | null): Dictionary {
  return dictionaries[normalizeLanguage(language)];
}

export function resolveLanguageFromHost(hostname: string): Language {
  const normalizedHost = hostname.toLowerCase().trim();
  if (normalizedHost.endsWith(".vedamatch.ru") || normalizedHost === "vedamatch.ru") {
    return "ru";
  }
  return "en";
}
