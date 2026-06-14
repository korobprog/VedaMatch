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
    mobilePromo: {
      eyebrow: string;
      title: string;
      body: string;
      versionLabel: string;
      iosLabel: string;
      iosHint: string;
      androidLabel: string;
      androidHint: string;
    };
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
    emptySearch: string;
    emptyBlocked: string;
    protectedContact: string;
    openChat: string;
    loadFailed: string;
    allTab: string;
    friendsTab: string;
    blockedTab: string;
    searchPlaceholder: string;
    resultsLabel: string;
    loadMore: string;
    loadingMore: string;
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
  union: {
    eyebrow: string;
    title: string;
    subtitle: string;
    profileSubtitle: string;
    requestsSubtitle: string;
    publicTitle: string;
    publicBody: string;
    publicPrimary: string;
    publicSecondary: string;
    publicStatsLabel: string;
    publicTrust: string;
    publicModesTitle: string;
    publicModeBodies: Record<"family" | "friendship" | "business" | "seva", string>;
    publicMale: string;
    publicFemale: string;
    navSearch: string;
    navProfile: string;
    navRequests: string;
    navChats: string;
    navWallet: string;
    navLabel: string;
    brandSubtitle: string;
    balanceLabel: string;
    topUp: string;
    filters: string;
    mode: string;
    allModes: string;
    family: string;
    friendship: string;
    business: string;
    seva: string;
    city: string;
    minAge: string;
    maxAge: string;
    madh: string;
    identity: string;
    skills: string;
    industry: string;
    search: string;
    reset: string;
    createProfile: string;
    editProfile: string;
    requests: string;
    unlock: string;
    unlocked: string;
    locked: string;
    lockedHint: string;
    unlockProfile: string;
    unlockCost: string;
    insufficientBalance: string;
    openWallet: string;
    writeRequest: string;
    requestMessagePlaceholder: string;
    sendRequest: string;
    requestPending: string;
    requestAccepted: string;
    requestRejected: string;
    openChat: string;
    incomingRequests: string;
    outgoingRequests: string;
    noRequests: string;
    accept: string;
    reject: string;
    cancel: string;
    profileTitle: string;
    socialLinks: string;
    socialLinkUrl: string;
    addSocialLink: string;
    saveProfile: string;
    submitProfile: string;
    age: string;
    country: string;
    bio: string;
    intentions: string;
    interests: string;
    compatibility: string;
    details: string;
    paidAccess: string;
    socialLinksLocked: string;
    postsLocked: string;
    noSocialLinks: string;
    noPosts: string;
    platform: string;
    visible: string;
    hidden: string;
    datingEnabled: string;
    publicationStatus: string;
    profileSaved: string;
    profileSubmitted: string;
    requestSent: string;
    actionFailed: string;
    chatGateHint: string;
    balanceUnavailable: string;
    empty: string;
    loadFailed: string;
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
  theme: {
    label: string;
    system: string;
    light: string;
    dark: string;
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
      mobilePromo: {
        eyebrow: "Для телефона удобнее",
        title: "Пользоваться VedaMatch удобнее в мобильном приложении",
        body: "С телефона быстрее отвечать, читать сообщения и держать сервисы VedaMatch под рукой. Установите приложение на Android или iPhone, если ссылка уже доступна.",
        versionLabel: "Версия",
        iosLabel: "Скачать для iPhone",
        iosHint: "Открыть App Store",
        androidLabel: "Скачать для Android",
        androidHint: "Открыть Google Play или APK",
      },
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
      emptySearch: "По этому запросу контакты не найдены.",
      emptyBlocked: "В заблокированных контактах пока пусто.",
      protectedContact: "Защищенный контакт",
      openChat: "Открыть чат",
      loadFailed: "Не удалось загрузить контакты.",
      allTab: "Все",
      friendsTab: "Друзья",
      blockedTab: "Заблокированные",
      searchPlaceholder: "Поиск по имени, городу или email",
      resultsLabel: "контактов",
      loadMore: "Показать еще",
      loadingMore: "Загружаем еще...",
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
    union: {
      eyebrow: "Союз",
      title: "Знакомства по ценностям",
      subtitle: "Ищите людей для семьи, дружбы, дела и севы, а детали открывайте осознанно через LKM.",
      profileSubtitle: "Заполните анкету, соцссылки и отправьте профиль на публикацию.",
      requestsSubtitle: "Управляйте заявками и открывайте чат только после взаимного согласия.",
      publicTitle: "Осознанные знакомства без лишнего шума",
      publicBody: "Пространство для людей, которые ищут близость, дружбу, проекты и севу через общие ценности.",
      publicPrimary: "Войти",
      publicSecondary: "Создать анкету",
      publicStatsLabel: "Анкет в Союзе",
      publicTrust: "Анкеты проходят публикацию, а детали открываются по согласию.",
      publicModesTitle: "Выберите формат связи",
      publicModeBodies: {
        family: "Спутник жизни и зрелый семейный выбор.",
        friendship: "Люди рядом по практике, интересам и пути.",
        business: "Партнеры, команды и проекты с общими принципами.",
        seva: "Совместное служение и полезные инициативы.",
      },
      publicMale: "муж.",
      publicFemale: "жен.",
      navSearch: "Поиск",
      navProfile: "Анкета",
      navRequests: "Заявки",
      navChats: "Чаты",
      navWallet: "Кошелек",
      navLabel: "Навигация Союза",
      brandSubtitle: "Осознанные знакомства",
      balanceLabel: "Баланс LKM",
      topUp: "Пополнить",
      filters: "Фильтры",
      mode: "Режим",
      allModes: "Все режимы",
      family: "Семья",
      friendship: "Дружба",
      business: "Дело",
      seva: "Сева",
      city: "Город",
      minAge: "Возраст от",
      maxAge: "Возраст до",
      madh: "Традиция",
      identity: "Идентичность",
      skills: "Навыки",
      industry: "Сфера",
      search: "Показать",
      reset: "Сбросить",
      createProfile: "Создать анкету",
      editProfile: "Редактировать анкету",
      requests: "Заявки",
      unlock: "Открыть",
      unlocked: "Открыто",
      locked: "Закрыто",
      lockedHint: "Детали профиля доступны после открытия за LKM.",
      unlockProfile: "Открыть анкету",
      unlockCost: "Стоимость: {price} LKM",
      insufficientBalance: "Недостаточно LKM для открытия анкеты.",
      openWallet: "Открыть кошелек",
      writeRequest: "Запросить общение",
      requestMessagePlaceholder: "Коротко напишите, почему хотите пообщаться.",
      sendRequest: "Отправить заявку",
      requestPending: "Заявка ожидает ответа",
      requestAccepted: "Общение подтверждено",
      requestRejected: "Заявка отклонена",
      openChat: "Открыть чат",
      incomingRequests: "Входящие",
      outgoingRequests: "Исходящие",
      noRequests: "Заявок пока нет.",
      accept: "Принять",
      reject: "Отклонить",
      cancel: "Отменить",
      profileTitle: "Анкета Союза",
      socialLinks: "Социальные сети",
      socialLinkUrl: "Ссылка",
      addSocialLink: "Добавить ссылку",
      saveProfile: "Сохранить анкету",
      submitProfile: "Отправить на публикацию",
      age: "Возраст",
      country: "Страна",
      bio: "О себе",
      intentions: "Намерения",
      interests: "Интересы",
      compatibility: "Совместимость",
      details: "Детали",
      paidAccess: "Платный доступ",
      socialLinksLocked: "Соцсети закрыты до открытия анкеты.",
      postsLocked: "Публикации закрыты до открытия анкеты.",
      noSocialLinks: "Соцссылки не указаны.",
      noPosts: "Публикаций пока нет.",
      platform: "Платформа",
      visible: "Видно после открытия",
      hidden: "Скрыто",
      datingEnabled: "Анкета активна",
      publicationStatus: "Статус публикации",
      profileSaved: "Анкета сохранена.",
      profileSubmitted: "Анкета отправлена на публикацию.",
      requestSent: "Заявка отправлена.",
      actionFailed: "Действие не выполнено.",
      chatGateHint: "Чат откроется после подтверждения заявки.",
      balanceUnavailable: "Баланс недоступен",
      empty: "Анкеты пока не найдены.",
      loadFailed: "Не удалось загрузить Союз.",
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
    theme: {
      label: "Тема интерфейса",
      system: "Авто",
      light: "Светлая",
      dark: "Темная",
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
      mobilePromo: {
        eyebrow: "Better on phone",
        title: "VedaMatch is more convenient in the mobile app",
        body: "It is faster to reply, check messages, and keep VedaMatch services one tap away on your phone. Install the app for Android or iPhone when a download link is available.",
        versionLabel: "Version",
        iosLabel: "Download for iPhone",
        iosHint: "Open the App Store",
        androidLabel: "Download for Android",
        androidHint: "Open Google Play or APK",
      },
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
      emptySearch: "No contacts matched this search.",
      emptyBlocked: "No blocked contacts yet.",
      protectedContact: "Protected contact",
      openChat: "Open chat",
      loadFailed: "Failed to load contacts.",
      allTab: "All",
      friendsTab: "Friends",
      blockedTab: "Blocked",
      searchPlaceholder: "Search by name, city, or email",
      resultsLabel: "contacts",
      loadMore: "Load more",
      loadingMore: "Loading more...",
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
    union: {
      eyebrow: "Union",
      title: "Values-based dating",
      subtitle: "Find people for family, friendship, work, and seva, then unlock details intentionally with LKM.",
      profileSubtitle: "Complete your profile, add social links, and submit it for publishing.",
      requestsSubtitle: "Manage requests and open chats only after mutual consent.",
      publicTitle: "Conscious connections without the noise",
      publicBody: "A focused space for people seeking family, friendship, projects, and seva through shared values.",
      publicPrimary: "Sign in",
      publicSecondary: "Create profile",
      publicStatsLabel: "Union profiles",
      publicTrust: "Profiles pass publication checks and reveal details by consent.",
      publicModesTitle: "Choose your connection mode",
      publicModeBodies: {
        family: "A life partner and a mature family choice.",
        friendship: "People close to your practice, interests, and path.",
        business: "Partners, teams, and projects with shared principles.",
        seva: "Service, volunteering, and useful initiatives.",
      },
      publicMale: "men",
      publicFemale: "women",
      navSearch: "Search",
      navProfile: "Profile",
      navRequests: "Requests",
      navChats: "Chats",
      navWallet: "Wallet",
      navLabel: "Union navigation",
      brandSubtitle: "Conscious connections",
      balanceLabel: "LKM balance",
      topUp: "Top up",
      filters: "Filters",
      mode: "Mode",
      allModes: "All modes",
      family: "Family",
      friendship: "Friendship",
      business: "Business",
      seva: "Seva",
      city: "City",
      minAge: "Age from",
      maxAge: "Age to",
      madh: "Tradition",
      identity: "Identity",
      skills: "Skills",
      industry: "Industry",
      search: "Show",
      reset: "Reset",
      createProfile: "Create profile",
      editProfile: "Edit profile",
      requests: "Requests",
      unlock: "Unlock",
      unlocked: "Unlocked",
      locked: "Locked",
      lockedHint: "Profile details are available after unlocking with LKM.",
      unlockProfile: "Unlock profile",
      unlockCost: "Cost: {price} LKM",
      insufficientBalance: "Not enough LKM to unlock this profile.",
      openWallet: "Open wallet",
      writeRequest: "Request a chat",
      requestMessagePlaceholder: "Briefly explain why you would like to talk.",
      sendRequest: "Send request",
      requestPending: "Request is waiting",
      requestAccepted: "Chat confirmed",
      requestRejected: "Request rejected",
      openChat: "Open chat",
      incomingRequests: "Incoming",
      outgoingRequests: "Outgoing",
      noRequests: "No requests yet.",
      accept: "Accept",
      reject: "Reject",
      cancel: "Cancel",
      profileTitle: "Union profile",
      socialLinks: "Social links",
      socialLinkUrl: "Link",
      addSocialLink: "Add link",
      saveProfile: "Save profile",
      submitProfile: "Submit for publishing",
      age: "Age",
      country: "Country",
      bio: "Bio",
      intentions: "Intentions",
      interests: "Interests",
      compatibility: "Compatibility",
      details: "Details",
      paidAccess: "Paid access",
      socialLinksLocked: "Social links are locked until the profile is unlocked.",
      postsLocked: "Posts are locked until the profile is unlocked.",
      noSocialLinks: "No social links provided.",
      noPosts: "No posts yet.",
      platform: "Platform",
      visible: "Visible after unlock",
      hidden: "Hidden",
      datingEnabled: "Profile active",
      publicationStatus: "Publication status",
      profileSaved: "Profile saved.",
      profileSubmitted: "Profile submitted for publishing.",
      requestSent: "Request sent.",
      actionFailed: "Action failed.",
      chatGateHint: "Chat opens after the request is accepted.",
      balanceUnavailable: "Balance unavailable",
      empty: "No profiles found yet.",
      loadFailed: "Failed to load Union.",
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
    theme: {
      label: "Interface theme",
      system: "Auto",
      light: "Light",
      dark: "Dark",
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
      mobilePromo: {
        eyebrow: "फोन पर बेहतर",
        title: "VedaMatch मोबाइल ऐप में ज़्यादा सुविधाजनक है",
        body: "फोन पर जवाब देना, संदेश देखना और VedaMatch सेवाओं तक जल्दी पहुँचना आसान रहता है। लिंक उपलब्ध हो तो Android या iPhone ऐप इंस्टॉल करें।",
        versionLabel: "वर्ज़न",
        iosLabel: "iPhone के लिए डाउनलोड करें",
        iosHint: "App Store खोलें",
        androidLabel: "Android के लिए डाउनलोड करें",
        androidHint: "Google Play या APK खोलें",
      },
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
      emptySearch: "इस खोज के लिए कोई संपर्क नहीं मिला।",
      emptyBlocked: "अभी कोई ब्लॉक किया गया संपर्क नहीं है।",
      protectedContact: "सुरक्षित संपर्क",
      openChat: "चैट खोलें",
      loadFailed: "संपर्क लोड नहीं हो सके।",
      allTab: "सभी",
      friendsTab: "मित्र",
      blockedTab: "अवरुद्ध",
      searchPlaceholder: "नाम, शहर या ईमेल से खोजें",
      resultsLabel: "संपर्क",
      loadMore: "और दिखाएँ",
      loadingMore: "और लोड हो रहा है...",
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
    union: {
      eyebrow: "यूनियन",
      title: "मूल्यों पर आधारित परिचय",
      subtitle: "परिवार, मित्रता, काम और सेवा के लिए लोगों को खोजें, फिर LKM से विवरण समझदारी से खोलें।",
      profileSubtitle: "अपनी प्रोफ़ाइल, सोशल लिंक और प्रकाशन के लिए आवश्यक जानकारी पूरी करें।",
      requestsSubtitle: "अनुरोध संभालें और आपसी सहमति के बाद ही चैट खोलें।",
      publicTitle: "शोर-शराबे से दूर सचेत परिचय",
      publicBody: "साझा मूल्यों के आधार पर परिवार, मित्रता, प्रोजेक्ट और सेवा खोजने वालों के लिए केंद्रित स्थान।",
      publicPrimary: "लॉगिन करें",
      publicSecondary: "प्रोफ़ाइल बनाएँ",
      publicStatsLabel: "यूनियन प्रोफ़ाइल",
      publicTrust: "प्रोफ़ाइल प्रकाशन जाँच से गुजरती हैं और सहमति के बाद विवरण खुलते हैं।",
      publicModesTitle: "अपना संबंध मोड चुनें",
      publicModeBodies: {
        family: "जीवन साथी और परिपक्व पारिवारिक चयन।",
        friendship: "अभ्यास, रुचियों और मार्ग से जुड़े लोग।",
        business: "साझा सिद्धांतों वाले साझेदार, टीमें और प्रोजेक्ट।",
        seva: "साथ मिलकर सेवा और उपयोगी पहल।",
      },
      publicMale: "पुरुष",
      publicFemale: "महिला",
      navSearch: "खोज",
      navProfile: "प्रोफ़ाइल",
      navRequests: "अनुरोध",
      navChats: "चैट",
      navWallet: "वॉलेट",
      navLabel: "यूनियन नेविगेशन",
      brandSubtitle: "सचेत परिचय",
      balanceLabel: "LKM बैलेंस",
      topUp: "टॉप अप",
      filters: "फ़िल्टर",
      mode: "मोड",
      allModes: "सभी मोड",
      family: "परिवार",
      friendship: "मित्रता",
      business: "व्यवसाय",
      seva: "सेवा",
      city: "शहर",
      minAge: "उम्र से",
      maxAge: "उम्र तक",
      madh: "परंपरा",
      identity: "पहचान",
      skills: "कौशल",
      industry: "क्षेत्र",
      search: "दिखाएँ",
      reset: "रीसेट",
      createProfile: "प्रोफ़ाइल बनाएँ",
      editProfile: "प्रोफ़ाइल संपादित करें",
      requests: "अनुरोध",
      unlock: "खोलें",
      unlocked: "खुली हुई",
      locked: "बंद",
      lockedHint: "प्रोफ़ाइल विवरण LKM से खोलने के बाद उपलब्ध हैं।",
      unlockProfile: "प्रोफ़ाइल खोलें",
      unlockCost: "लागत: {price} LKM",
      insufficientBalance: "इस प्रोफ़ाइल को खोलने के लिए पर्याप्त LKM नहीं है।",
      openWallet: "वॉलेट खोलें",
      writeRequest: "चैट अनुरोध भेजें",
      requestMessagePlaceholder: "संक्षेप में लिखें कि आप बात क्यों करना चाहते हैं.",
      sendRequest: "अनुरोध भेजें",
      requestPending: "अनुरोध प्रतीक्षा में है",
      requestAccepted: "चैट स्वीकृत है",
      requestRejected: "अनुरोध अस्वीकार हुआ",
      openChat: "चैट खोलें",
      incomingRequests: "आने वाले",
      outgoingRequests: "भेजे गए",
      noRequests: "अभी कोई अनुरोध नहीं है.",
      accept: "स्वीकार करें",
      reject: "अस्वीकार करें",
      cancel: "रद्द करें",
      profileTitle: "यूनियन प्रोफ़ाइल",
      socialLinks: "सोशल लिंक",
      socialLinkUrl: "लिंक",
      addSocialLink: "लिंक जोड़ें",
      saveProfile: "प्रोफ़ाइल सहेजें",
      submitProfile: "प्रकाशन के लिए भेजें",
      age: "उम्र",
      country: "देश",
      bio: "परिचय",
      intentions: "इरादे",
      interests: "रुचियाँ",
      compatibility: "अनुकूलता",
      details: "विवरण",
      paidAccess: "सशुल्क पहुंच",
      socialLinksLocked: "सोशल लिंक प्रोफ़ाइल खुलने तक बंद हैं.",
      postsLocked: "पोस्ट प्रोफ़ाइल खुलने तक बंद हैं.",
      noSocialLinks: "कोई सोशल लिंक नहीं है.",
      noPosts: "अभी कोई पोस्ट नहीं है.",
      platform: "प्लेटफ़ॉर्म",
      visible: "खोलने के बाद दिखेगा",
      hidden: "छिपा हुआ",
      datingEnabled: "प्रोफ़ाइल सक्रिय",
      publicationStatus: "प्रकाशन स्थिति",
      profileSaved: "प्रोफ़ाइल सहेजी गई.",
      profileSubmitted: "प्रोफ़ाइल प्रकाशन के लिए भेजी गई.",
      requestSent: "अनुरोध भेज दिया गया.",
      actionFailed: "क्रिया पूरी नहीं हुई.",
      chatGateHint: "अनुरोध स्वीकार होने के बाद चैट खुलेगी.",
      balanceUnavailable: "बैलेंस उपलब्ध नहीं",
      empty: "अभी कोई प्रोफ़ाइल नहीं मिली.",
      loadFailed: "यूनियन लोड नहीं हो सका.",
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
    theme: {
      label: "इंटरफ़ेस थीम",
      system: "ऑटो",
      light: "लाइट",
      dark: "डार्क",
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
