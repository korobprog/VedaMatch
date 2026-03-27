import { SUPPORTED_LANGUAGES, type Language } from "@vedamatch/domain-types";

export type Dictionary = {
  appName: string;
  languageLabel: string;
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
    shellEyebrow: string;
    shellTitle: string;
    shellSubtitle: string;
    publicHome: string;
    loadingTitle: string;
    loadingSubtitle: string;
    overviewTitle: string;
    overviewBody: string;
    profileCardTitle: string;
    profileCardBody: string;
    socialCardTitle: string;
    socialCardBody: string;
    utilityCardTitle: string;
    utilityCardBody: string;
  };
  profile: {
    title: string;
    subtitle: string;
    karmicName: string;
    spiritualName: string;
    nickname: string;
    identity: string;
    city: string;
    country: string;
    save: string;
    saving: string;
    updated: string;
    updateFailed: string;
  };
  contacts: {
    title: string;
    subtitle: string;
    empty: string;
    protectedContact: string;
    openChat: string;
    loadFailed: string;
  };
  chats: {
    inboxTitle: string;
    inboxSubtitle: string;
    inboxEmpty: string;
    inboxLoadFailed: string;
    noPreview: string;
    pinned: string;
    muted: string;
    unread: string;
    read: string;
    recentThread: string;
    backToInbox: string;
    threadTitle: string;
    peerUserId: string;
    threadEmpty: string;
    threadLoadFailed: string;
    threadSendFailed: string;
    reply: string;
    replyPlaceholder: string;
    contractHint: string;
    sending: string;
    send: string;
    you: string;
    sender: string;
    unsupportedPayload: string;
    image: string;
    audio: string;
    video: string;
    file: string;
    contactCard: string;
    emptyMessage: string;
    messageMetaFallback: string;
  };
  library: {
    eyebrow: string;
    title: string;
    subtitle: string;
    empty: string;
    untitledBook: string;
    scripture: string;
    readerBodyFallback: string;
    readerFooter: string;
    openReader: string;
    backToLibrary: string;
    readerDetail: string;
    detailFallback: string;
    chaptersCount: string;
    chaptersTitle: string;
    chaptersEmpty: string;
    chapterLabel: string;
    firstChapterPreview: string;
    firstChapterBody: string;
    versesEmpty: string;
    verseLabel: string;
  };
  news: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: string;
    page: string;
    pagesTotal: string;
    empty: string;
    noSummary: string;
    important: string;
    views: string;
    openArticle: string;
    source: string;
    backToNews: string;
    originalSource: string;
  };
  services: {
    eyebrow: string;
    title: string;
    subtitle: string;
    empty: string;
    serviceLabel: string;
    untitled: string;
    detailFallback: string;
    priceFrom: string;
    pricingFuture: string;
  };
  travel: {
    eyebrow: string;
    title: string;
    subtitle: string;
    empty: string;
    yatraLabel: string;
    untitled: string;
    detailFallback: string;
    datesMissing: string;
  };
  support: {
    eyebrow: string;
    title: string;
    telegramEnabled: string;
    telegramDisabled: string;
    inAppEnabled: string;
    inAppDisabled: string;
    openTelegram: string;
    openChannel: string;
    eligibility: string;
    eligibleYes: string;
    eligibleNo: string;
    rollout: string;
    sla: string;
    slaMissing: string;
    inboxTitle: string;
    inboxSubtitle: string;
    empty: string;
    unread: string;
    noPreview: string;
    requesterFallback: string;
    loadFailed: string;
    notAvailable: string;
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
    languageLabel: "Язык",
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
      shellEyebrow: "Авторизованная оболочка",
      shellTitle: "VedaMatch Web",
      shellSubtitle: "Браузерный вход для профиля, social core, контента, поддержки и перехода в кошелек.",
      publicHome: "Публичная главная",
      loadingTitle: "Загрузка web-сессии",
      loadingSubtitle: "Восстанавливаем браузерную авторизацию и общие настройки.",
      overviewTitle: "Основной web shell",
      overviewBody: "Эта авторизованная оболочка является новой browser-native точкой входа VedaMatch. На первом этапе она покрывает core domains и сознательно не включает звонки, live media и mobile-only сценарии.",
      profileCardTitle: "Профиль и настройки",
      profileCardBody: "Редактируются через общую auth-session и `/update-profile`.",
      socialCardTitle: "Social core",
      socialCardBody: "Контакты, список диалогов и direct chat thread работают как browser-first flows.",
      utilityCardTitle: "Контент и сервисы",
      utilityCardBody: "Библиотека, новости, сервисы, путешествия, переход в wallet и support уже заведены как deep links.",
    },
    profile: {
      title: "Профиль и настройки",
      subtitle: "Browser-first редактор профиля поверх общей auth-session и `/api/update-profile`.",
      karmicName: "Кармическое имя",
      spiritualName: "Духовное имя",
      nickname: "Никнейм",
      identity: "Идентичность",
      city: "Город",
      country: "Страна",
      save: "Сохранить профиль",
      saving: "Сохраняем...",
      updated: "Профиль обновлен.",
      updateFailed: "Не удалось обновить профиль.",
    },
    contacts: {
      title: "Контакты",
      subtitle: "Защищенный каталог пользователей для social web entrypoint. Каждый контакт можно сразу открыть в browser-first direct chat.",
      empty: "Контакты пока не найдены.",
      protectedContact: "Защищенный контакт",
      openChat: "Открыть чат",
      loadFailed: "Не удалось загрузить контакты.",
    },
    chats: {
      inboxTitle: "Личные чаты",
      inboxSubtitle: "Browser-first inbox на базе `GET /api/messages/conversations` с фокусом на unread-контекст и быстрый вход в диалог.",
      inboxEmpty: "Диалогов пока нет.",
      inboxLoadFailed: "Не удалось загрузить диалоги.",
      noPreview: "Нет превью",
      pinned: "Закреплен",
      muted: "Без звука",
      unread: "Непрочитано",
      read: "Прочитано",
      recentThread: "Недавний диалог",
      backToInbox: "Назад к списку чатов",
      threadTitle: "Диалог",
      peerUserId: "ID собеседника",
      threadEmpty: "Сообщений пока нет.",
      threadLoadFailed: "Не удалось загрузить сообщения.",
      threadSendFailed: "Не удалось отправить сообщение.",
      reply: "Ответ",
      replyPlaceholder: "Напишите сообщение...",
      contractHint: "Сообщения отправляются через общий контракт `/api/messages`.",
      sending: "Отправка...",
      send: "Отправить",
      you: "Вы",
      sender: "Собеседник",
      unsupportedPayload: "Неподдерживаемый payload сообщения",
      image: "Изображение",
      audio: "Аудио",
      video: "Видео",
      file: "Файл",
      contactCard: "Карточка контакта",
      emptyMessage: "Пустое сообщение",
      messageMetaFallback: "Сообщение",
    },
    library: {
      eyebrow: "Контентный домен",
      title: "Библиотека и вход в reader",
      subtitle: "SSR-поверхность для писаний и reading journeys. Это browser-first каталог библиотеки на общем API client.",
      empty: "Книги пока не найдены.",
      untitledBook: "Книга без названия",
      scripture: "Писание",
      readerBodyFallback: "На основе этой карточки можно строить detail pages для reader.",
      readerFooter: "Подготовлено для будущих deep links на книгу, главу и стих.",
      openReader: "Открыть reader",
      backToLibrary: "Назад к библиотеке",
      readerDetail: "Детали reader",
      detailFallback: "Страница книги построена на общем library API.",
      chaptersCount: "Главы",
      chaptersTitle: "Главы",
      chaptersEmpty: "Для этой книги главы не найдены.",
      chapterLabel: "Глава",
      firstChapterPreview: "Превью первой главы",
      firstChapterBody: "Показываем главу {chapter} как начальное browser-превью reader. Следующим шагом можно вынести главы в отдельные routes.",
      versesEmpty: "Стихи пока не найдены.",
      verseLabel: "Стих",
    },
    news: {
      eyebrow: "Контентный домен",
      title: "Лента новостей",
      subtitle: "SSR-friendly лента для editorial content, важных обновлений и будущих article detail routes.",
      items: "Материалов",
      page: "Страница",
      pagesTotal: "Всего страниц",
      empty: "Новости пока не найдены.",
      noSummary: "Нет краткого описания",
      important: "Важно",
      views: "Просмотры",
      openArticle: "Открыть статью",
      source: "Источник",
      backToNews: "Назад к новостям",
      originalSource: "Оригинальный источник",
    },
    services: {
      eyebrow: "Сервисный домен",
      title: "Сервисы",
      subtitle: "Browser-first каталог сервисов для нового web runtime. Это входной слой для discovery, commerce routing и будущих detail pages.",
      empty: "Сервисы пока не найдены.",
      serviceLabel: "Сервис",
      untitled: "Сервис без названия",
      detailFallback: "На основе этой записи можно строить detail surface сервиса.",
      priceFrom: "От",
      pricingFuture: "Стоимость появится в следующем detail flow.",
    },
    travel: {
      eyebrow: "Сервисный домен",
      title: "Путешествия и ятры",
      subtitle: "Публичная и пользовательская точка входа для yatra discovery в web shell. Layout готов к дальнейшему разделению на public routes и protected booking flows.",
      empty: "Ятры пока не найдены.",
      yatraLabel: "Ятра",
      untitled: "Ятра без названия",
      detailFallback: "Travel detail pages и booking UX можно нарастить на этом route.",
      datesMissing: "Даты не указаны",
    },
    support: {
      eyebrow: "Сервисный домен",
      title: "Поддержка",
      telegramEnabled: "Telegram включен",
      telegramDisabled: "Telegram выключен",
      inAppEnabled: "In-app тикеты включены",
      inAppDisabled: "In-app тикеты выключены",
      openTelegram: "Открыть Telegram-поддержку",
      openChannel: "Открыть канал поддержки",
      eligibility: "Доступность",
      eligibleYes: "Текущий пользователь может пользоваться in-app поддержкой.",
      eligibleNo: "In-app поддержка сейчас недоступна для этого пользователя.",
      rollout: "Роллаут",
      sla: "SLA",
      slaMissing: "Текст SLA недоступен.",
      inboxTitle: "Список обращений",
      inboxSubtitle: "Защищенный список тикетов для первой web-волны.",
      empty: "Тикеты поддержки пока не найдены.",
      unread: "Непрочитано",
      noPreview: "Нет превью сообщения.",
      requesterFallback: "Пользователь поддержки",
      loadFailed: "Не удалось загрузить поддержку.",
      notAvailable: "Недоступно",
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
    languageLabel: "Language",
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
      shellEyebrow: "Authenticated shell",
      shellTitle: "VedaMatch Web",
      shellSubtitle: "Browser-native entrypoint for profile, social core, content, support, and wallet routing.",
      publicHome: "Public home",
      loadingTitle: "Loading web session",
      loadingSubtitle: "Restoring browser auth state and shared settings.",
      overviewTitle: "Core web shell",
      overviewBody: "This authenticated shell is the new browser-native entrypoint for VedaMatch. It intentionally starts with core domains and keeps calls, live media, and native-only flows out of phase 1.",
      profileCardTitle: "Profile and settings",
      profileCardBody: "Editable through the shared auth session and `/update-profile`.",
      socialCardTitle: "Social core",
      socialCardBody: "Contacts, conversation list, and direct thread pages are browser-first.",
      utilityCardTitle: "Content and utility",
      utilityCardBody: "Library, news, services, travel, wallet routing, and support entry are mapped to deep links.",
    },
    profile: {
      title: "Profile and settings",
      subtitle: "Browser-first profile editor using the shared auth session and `/api/update-profile`.",
      karmicName: "Karmic name",
      spiritualName: "Spiritual name",
      nickname: "Nickname",
      identity: "Identity",
      city: "City",
      country: "Country",
      save: "Save profile",
      saving: "Saving...",
      updated: "Profile updated.",
      updateFailed: "Failed to update profile.",
    },
    contacts: {
      title: "Contacts core",
      subtitle: "Protected people directory for the social web entrypoint. Each contact can be opened directly into a browser-first direct chat thread.",
      empty: "No contacts returned yet.",
      protectedContact: "Protected contact",
      openChat: "Open chat",
      loadFailed: "Failed to load contacts.",
    },
    chats: {
      inboxTitle: "Direct chat inbox",
      inboxSubtitle: "Browser-first inbox powered by `GET /api/messages/conversations`, focused on unread context and fast thread entry.",
      inboxEmpty: "No conversations yet.",
      inboxLoadFailed: "Failed to load conversations.",
      noPreview: "No preview",
      pinned: "Pinned",
      muted: "Muted",
      unread: "Unread",
      read: "Read",
      recentThread: "Recent thread",
      backToInbox: "Back to inbox",
      threadTitle: "Direct chat thread",
      peerUserId: "Peer user ID",
      threadEmpty: "No messages yet.",
      threadLoadFailed: "Failed to load messages.",
      threadSendFailed: "Failed to send message.",
      reply: "Reply",
      replyPlaceholder: "Write a direct message...",
      contractHint: "Messages are sent through the shared `/api/messages` contract.",
      sending: "Sending...",
      send: "Send",
      you: "You",
      sender: "Sender",
      unsupportedPayload: "Unsupported message payload",
      image: "Image",
      audio: "Audio",
      video: "Video",
      file: "File",
      contactCard: "Contact card",
      emptyMessage: "Empty message",
      messageMetaFallback: "Message",
    },
    library: {
      eyebrow: "Content domain",
      title: "Library and reader entry",
      subtitle: "SSR content surface for scriptures and reading journeys. This is the browser-first library catalog built on the shared API client.",
      empty: "No books returned yet.",
      untitledBook: "Untitled book",
      scripture: "Scripture",
      readerBodyFallback: "Reader detail pages can build on top of this catalog entry.",
      readerFooter: "Prepared for future book, chapter, and verse deep links.",
      openReader: "Open reader",
      backToLibrary: "Back to library",
      readerDetail: "Reader detail",
      detailFallback: "Book detail page generated from the shared library API.",
      chaptersCount: "Chapters",
      chaptersTitle: "Chapters",
      chaptersEmpty: "No chapters returned for this book.",
      chapterLabel: "Chapter",
      firstChapterPreview: "First chapter preview",
      firstChapterBody: "Showing chapter {chapter} as the initial browser reader preview. Next step can split this into chapter routes.",
      versesEmpty: "No verses returned yet.",
      verseLabel: "Verse",
    },
    news: {
      eyebrow: "Content domain",
      title: "News feed core",
      subtitle: "SSR-friendly public feed for editorial content, important updates, and future article detail routes.",
      items: "Items",
      page: "Page",
      pagesTotal: "Pages total",
      empty: "No news returned yet.",
      noSummary: "No summary",
      important: "Important",
      views: "Views",
      openArticle: "Open article",
      source: "Source",
      backToNews: "Back to news",
      originalSource: "Original source",
    },
    services: {
      eyebrow: "Utility domain",
      title: "Services core",
      subtitle: "Browser-first services catalog for the new web runtime. This is the entry layer for service discovery, commerce routing, and future detail pages.",
      empty: "No services returned yet.",
      serviceLabel: "Service",
      untitled: "Untitled service",
      detailFallback: "Service detail surface can be built on top of this entry.",
      priceFrom: "From",
      pricingFuture: "Pricing available in future detail flow.",
    },
    travel: {
      eyebrow: "Utility domain",
      title: "Travel and yatra",
      subtitle: "Public and user entrypoint for yatra discovery in the web shell. The layout is ready for a later split into public route pages and protected booking flows.",
      empty: "No yatras returned yet.",
      yatraLabel: "Yatra",
      untitled: "Untitled yatra",
      detailFallback: "Travel detail pages and booking UX can extend this route.",
      datesMissing: "Dates not provided",
    },
    support: {
      eyebrow: "Utility domain",
      title: "Support entry",
      telegramEnabled: "Telegram enabled",
      telegramDisabled: "Telegram disabled",
      inAppEnabled: "In-app ticket enabled",
      inAppDisabled: "In-app ticket disabled",
      openTelegram: "Open Telegram support",
      openChannel: "Open support channel",
      eligibility: "Eligibility",
      eligibleYes: "Current user is eligible for in-app support.",
      eligibleNo: "In-app support is not currently available for this user.",
      rollout: "Rollout",
      sla: "SLA",
      slaMissing: "Support SLA text is not available.",
      inboxTitle: "Support inbox",
      inboxSubtitle: "Protected ticket list for the first web wave.",
      empty: "No support tickets returned yet.",
      unread: "Unread",
      noPreview: "No message preview available.",
      requesterFallback: "Support requester",
      loadFailed: "Failed to load support.",
      notAvailable: "N/A",
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
    languageLabel: "भाषा",
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
      shellEyebrow: "प्रमाणित शेल",
      shellTitle: "VedaMatch Web",
      shellSubtitle: "प्रोफ़ाइल, social core, कंटेंट, सपोर्ट और वॉलेट रूटिंग के लिए browser-native entrypoint.",
      publicHome: "पब्लिक होम",
      loadingTitle: "वेब सत्र लोड हो रहा है",
      loadingSubtitle: "ब्राउज़र auth state और shared settings बहाल किए जा रहे हैं।",
      overviewTitle: "मुख्य web shell",
      overviewBody: "यह प्रमाणित shell VedaMatch का नया browser-native entrypoint है। पहले चरण में यह core domains से शुरू होता है और calls, live media और native-only flows को बाहर रखता है।",
      profileCardTitle: "प्रोफ़ाइल और सेटिंग्स",
      profileCardBody: "इन्हें shared auth session और `/update-profile` के जरिए बदला जा सकता है।",
      socialCardTitle: "Social core",
      socialCardBody: "Contacts, conversation list और direct chat thread browser-first flows हैं।",
      utilityCardTitle: "कंटेंट और सेवाएँ",
      utilityCardBody: "लाइब्रेरी, न्यूज़, सेवाएँ, यात्रा, wallet routing और support entry deep links के रूप में उपलब्ध हैं।",
    },
    profile: {
      title: "प्रोफ़ाइल और सेटिंग्स",
      subtitle: "Shared auth session और `/api/update-profile` पर आधारित browser-first प्रोफ़ाइल एडिटर।",
      karmicName: "कार्मिक नाम",
      spiritualName: "आध्यात्मिक नाम",
      nickname: "निकनेम",
      identity: "पहचान",
      city: "शहर",
      country: "देश",
      save: "प्रोफ़ाइल सहेजें",
      saving: "सहेजा जा रहा है...",
      updated: "प्रोफ़ाइल अपडेट हो गई।",
      updateFailed: "प्रोफ़ाइल अपडेट नहीं हो सकी।",
    },
    contacts: {
      title: "संपर्क",
      subtitle: "Social web entrypoint के लिए सुरक्षित people directory. हर contact को सीधे browser-first direct chat में खोला जा सकता है।",
      empty: "अभी कोई संपर्क उपलब्ध नहीं है।",
      protectedContact: "सुरक्षित संपर्क",
      openChat: "चैट खोलें",
      loadFailed: "संपर्क लोड नहीं हो सके।",
    },
    chats: {
      inboxTitle: "डायरेक्ट चैट इनबॉक्स",
      inboxSubtitle: "यह browser-first inbox `GET /api/messages/conversations` पर आधारित है और unread context तथा तेज thread entry पर केंद्रित है।",
      inboxEmpty: "अभी कोई संवाद नहीं है।",
      inboxLoadFailed: "संवाद लोड नहीं हो सके।",
      noPreview: "कोई प्रीव्यू नहीं",
      pinned: "पिन किया गया",
      muted: "म्यूट",
      unread: "अपठित",
      read: "पढ़ लिया गया",
      recentThread: "हाल का संवाद",
      backToInbox: "इनबॉक्स पर वापस जाएँ",
      threadTitle: "डायरेक्ट चैट थ्रेड",
      peerUserId: "सामने वाले यूज़र का ID",
      threadEmpty: "अभी कोई संदेश नहीं है।",
      threadLoadFailed: "संदेश लोड नहीं हो सके।",
      threadSendFailed: "संदेश भेजा नहीं जा सका।",
      reply: "उत्तर",
      replyPlaceholder: "डायरेक्ट संदेश लिखें...",
      contractHint: "संदेश shared `/api/messages` contract के जरिए भेजे जाते हैं।",
      sending: "भेजा जा रहा है...",
      send: "भेजें",
      you: "आप",
      sender: "भेजने वाला",
      unsupportedPayload: "असमर्थित संदेश payload",
      image: "छवि",
      audio: "ऑडियो",
      video: "वीडियो",
      file: "फ़ाइल",
      contactCard: "संपर्क कार्ड",
      emptyMessage: "खाली संदेश",
      messageMetaFallback: "संदेश",
    },
    library: {
      eyebrow: "कंटेंट डोमेन",
      title: "लाइब्रेरी और reader entry",
      subtitle: "शास्त्रों और reading journeys के लिए SSR content surface. यह shared API client पर बना browser-first library catalog है।",
      empty: "अभी कोई पुस्तक नहीं मिली।",
      untitledBook: "बिना शीर्षक की पुस्तक",
      scripture: "शास्त्र",
      readerBodyFallback: "इस catalog entry पर आगे reader detail pages बनाई जा सकती हैं।",
      readerFooter: "भविष्य के book, chapter और verse deep links के लिए तैयार।",
      openReader: "रीडर खोलें",
      backToLibrary: "लाइब्रेरी पर वापस",
      readerDetail: "रीडर विवरण",
      detailFallback: "यह पुस्तक पृष्ठ shared library API से बनाया गया है।",
      chaptersCount: "अध्याय",
      chaptersTitle: "अध्याय",
      chaptersEmpty: "इस पुस्तक के लिए कोई अध्याय नहीं मिला।",
      chapterLabel: "अध्याय",
      firstChapterPreview: "पहले अध्याय का प्रीव्यू",
      firstChapterBody: "अभी अध्याय {chapter} को शुरुआती browser reader preview के रूप में दिखाया जा रहा है। अगला कदम chapter routes जोड़ना हो सकता है।",
      versesEmpty: "अभी कोई श्लोक नहीं मिला।",
      verseLabel: "श्लोक",
    },
    news: {
      eyebrow: "कंटेंट डोमेन",
      title: "न्यूज़ फ़ीड",
      subtitle: "Editorial content, महत्वपूर्ण updates और future article detail routes के लिए SSR-friendly feed.",
      items: "आइटम",
      page: "पृष्ठ",
      pagesTotal: "कुल पृष्ठ",
      empty: "अभी कोई समाचार नहीं मिला।",
      noSummary: "कोई सारांश नहीं",
      important: "महत्वपूर्ण",
      views: "दृश्य",
      openArticle: "लेख खोलें",
      source: "स्रोत",
      backToNews: "समाचार पर वापस",
      originalSource: "मूल स्रोत",
    },
    services: {
      eyebrow: "यूटिलिटी डोमेन",
      title: "सेवाएँ",
      subtitle: "नए web runtime के लिए browser-first services catalog. यह discovery, commerce routing और future detail pages का entry layer है।",
      empty: "अभी कोई सेवा नहीं मिली।",
      serviceLabel: "सेवा",
      untitled: "बिना शीर्षक की सेवा",
      detailFallback: "इस entry पर service detail surface बनाया जा सकता है।",
      priceFrom: "से",
      pricingFuture: "मूल्य अगले detail flow में उपलब्ध होगा।",
    },
    travel: {
      eyebrow: "यूटिलिटी डोमेन",
      title: "यात्रा और यात्रा-धाम",
      subtitle: "Web shell में yatra discovery के लिए public और user entrypoint. Layout आगे public routes और protected booking flows में विभाजन के लिए तैयार है।",
      empty: "अभी कोई यात्रा नहीं मिली।",
      yatraLabel: "यात्रा",
      untitled: "बिना शीर्षक की यात्रा",
      detailFallback: "Travel detail pages और booking UX इस route पर आगे जोड़े जा सकते हैं।",
      datesMissing: "तिथियाँ उपलब्ध नहीं हैं",
    },
    support: {
      eyebrow: "यूटिलिटी डोमेन",
      title: "सपोर्ट",
      telegramEnabled: "Telegram सक्षम",
      telegramDisabled: "Telegram अक्षम",
      inAppEnabled: "In-app टिकट सक्षम",
      inAppDisabled: "In-app टिकट अक्षम",
      openTelegram: "Telegram सपोर्ट खोलें",
      openChannel: "सपोर्ट चैनल खोलें",
      eligibility: "पात्रता",
      eligibleYes: "वर्तमान उपयोगकर्ता in-app support के लिए पात्र है।",
      eligibleNo: "इस उपयोगकर्ता के लिए in-app support अभी उपलब्ध नहीं है।",
      rollout: "रोलआउट",
      sla: "SLA",
      slaMissing: "Support SLA text उपलब्ध नहीं है।",
      inboxTitle: "सपोर्ट इनबॉक्स",
      inboxSubtitle: "पहली web wave के लिए सुरक्षित ticket list.",
      empty: "अभी कोई support ticket नहीं मिला।",
      unread: "अपठित",
      noPreview: "कोई message preview उपलब्ध नहीं है।",
      requesterFallback: "सपोर्ट उपयोगकर्ता",
      loadFailed: "सपोर्ट लोड नहीं हो सका।",
      notAvailable: "उपलब्ध नहीं",
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
