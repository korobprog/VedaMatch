import { formatTemplate, type Language } from '@/lib/tariffs-i18n';

export type CabinetDictionary = {
  languageLabel: string;
  heroTitle: string;
  heroSubtitle: string;
  tariffsLink: string;
  regionLabel: string;
  regionCis: string;
  regionNonCis: string;
  gatewayLabel: string;
  currencyLabel: string;
  authTitle: string;
  authCheckingTelegramMiniApp: string;
  authCheckingTelegramReturn: string;
  authUsuallyTakes: string;
  continueManually: string;
  authLinkNote: string;
  authLinkNoteMobile: string;
  authSocialHint: string;
  authGooglePending: string;
  authLoginWithVK: string;
  authOr: string;
  emailLabel: string;
  passwordLabel: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  authLogin: string;
  authLoggingIn: string;
  authLinkTelegram: string;
  authLinkingTelegram: string;
  authVerifying: string;
  authAuthorized: string;
  authAuthorizedTelegram: string;
  authReturningToApp: string;
  authReturnHint: string;
  authSessionAutoRefresh: string;
  authReturnToApp: string;
  authLogout: string;
  walletTitle: string;
  walletBalance: string;
  walletNominalRate: string;
  walletVerificationBot: string;
  proPreviewTitle: string;
  proPreviewSubtitle: string;
  proPreviewEmpty: string;
  proPreviewDaysTemplate: string;
  proPreviewFromLabel: string;
  topupTitle: string;
  topupLoadingPackages: string;
  topupCustomAmount: string;
  topupRangeTemplate: string;
  topupGateway: string;
  topupCurrency: string;
  topupPackagesAfterAuth: string;
  calculatorTitle: string;
  calculatorBlockedInApp: string;
  calculatorGetQuote: string;
  calculatorWorking: string;
  calculatorYouReceive: string;
  calculatorYouPay: string;
  calculatorQuoteValidUntil: string;
  calculatorCreateTopup: string;
  calculatorCreatingTopup: string;
  calculatorTopupId: string;
  calculatorStatus: string;
  calculatorRiskRoute: string;
  calculatorWebhookNote: string;
  historyTitle: string;
  historyNeedsAuth: string;
  historyStatusLabel: string;
  historyStatusAll: string;
  historyPerPage: string;
  historyBack: string;
  historyPageTemplate: string;
  historyNext: string;
  historyShare: string;
  historyLoading: string;
  historyEmpty: string;
  historyRiskLabel: string;
  historyTotalTemplate: string;
  shareTitle: string;
  shareText: string;
  shareSent: string;
  shareCopied: string;
  shareUnsupported: string;
  shareFailed: string;
  errorUnknown: string;
  errorTelegramAlreadyLinked: string;
  errorTelegramConflict: string;
  errorTelegramRequired: string;
  errorSocialLoginVK: string;
  errorSocialLoginGeneric: string;
  errorSocialVKCancelled: string;
  errorSocialVKExchange: string;
  errorSocialVKMissingCode: string;
  errorSocialVKInvalidToken: string;
  errorAccessTokenMissing: string;
  errorPrepareAppReturn: string;
  successReturningToApp: string;
  successLoginViaProviderTemplate: string;
  errorGoogleMissingToken: string;
  errorVKNotConfigured: string;
  errorOriginMissing: string;
  errorVKPopupBlocked: string;
  errorVKPopupClosedTemplate: string;
  errorSocialConfigLoad: string;
  errorTelegramAuthTimeout: string;
  successTelegramLogin: string;
  errorTelegramSessionChecked: string;
  errorTelegramDataExpired: string;
  errorEnterEmailPassword: string;
  successTelegramLinked: string;
  successAuthorized: string;
  errorTopupOnlyWeb: string;
  errorAuthRequired: string;
  errorPackagesNotLoaded: string;
  errorPackageUnavailable: string;
  errorInvalidAmountTemplate: string;
  successQuoteCreated: string;
  errorCreateQuoteFirst: string;
  successTopupCreated: string;
  errorTimeoutTemplate: string;
  errorNetworkTemplate: string;
  statusLabels: Record<'all' | 'pending_payment' | 'paid' | 'manual_review' | 'credited' | 'rejected', string>;
};

export const LKM_CABINET_I18N: Record<Language, CabinetDictionary> = {
  ru: {
    languageLabel: 'Язык',
    heroTitle: 'Кошелек LKM',
    heroSubtitle: 'Пополнение баланса LKM и покупка PRO для экосистемы VedaMatch. Доступно на сайте и в Telegram-боте.',
    tariffsLink: 'Тарифы',
    regionLabel: 'Регион',
    regionCis: 'СНГ',
    regionNonCis: 'вне СНГ',
    gatewayLabel: 'Шлюз оплаты',
    currencyLabel: 'Валюта',
    authTitle: 'Авторизация',
    authCheckingTelegramMiniApp: 'Проверяем вход через Telegram Mini App...',
    authCheckingTelegramReturn: 'Проверяем вход через Telegram и готовим возврат в приложение VedaMatch...',
    authUsuallyTakes: 'Обычно это занимает до 10 секунд.',
    continueManually: 'Продолжить вручную',
    authLinkNote: 'Разовый вход email/пароль нужен, чтобы привязать Telegram к вашему аккаунту VedaMatch.',
    authLinkNoteMobile: 'Разовый вход email/пароль нужен, чтобы привязать Telegram к вашему аккаунту VedaMatch и вернуть вас в приложение.',
    authSocialHint: 'Войти можно через Google или VK. Email и пароль остаются как резервный способ.',
    authGooglePending: 'Подтверждаем вход через Google...',
    authLoginWithVK: 'Войти через VK',
    authOr: 'или',
    emailLabel: 'Email',
    passwordLabel: 'Пароль',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: '••••••••',
    authLogin: 'Войти',
    authLoggingIn: 'Вход...',
    authLinkTelegram: 'Привязать Telegram',
    authLinkingTelegram: 'Привязываем...',
    authVerifying: 'Подтверждаем...',
    authAuthorized: 'Авторизовано',
    authAuthorizedTelegram: 'Авторизовано через Telegram',
    authReturningToApp: 'Авторизация завершена. Возвращаемся в приложение VedaMatch...',
    authReturnHint: 'Если приложение не открылось автоматически, используйте кнопку ниже.',
    authSessionAutoRefresh: 'Сессия продлевается автоматически, пока действует refresh-сессия.',
    authReturnToApp: 'Вернуться в приложение',
    authLogout: 'Выйти',
    walletTitle: 'Кошелек',
    walletBalance: 'Текущий активный баланс',
    walletNominalRate: 'Номинальный курс',
    walletVerificationBot: 'Для верификации можно использовать бота',
    proPreviewTitle: 'PRO планы',
    proPreviewSubtitle: 'Актуальные цены на PRO из монетизации.',
    proPreviewEmpty: 'Планы PRO временно недоступны.',
    proPreviewDaysTemplate: '{days} дней',
    proPreviewFromLabel: 'От',
    topupTitle: 'Пополнение счета',
    topupLoadingPackages: 'Загрузка пакетов...',
    topupCustomAmount: 'Произвольная сумма',
    topupRangeTemplate: 'Диапазон: {min}..{max} LKM, шаг {step}',
    topupGateway: 'Платежный шлюз',
    topupCurrency: 'Валюта',
    topupPackagesAfterAuth: 'После авторизации загрузятся пакеты региона.',
    calculatorTitle: 'Расчет и создание',
    calculatorBlockedInApp: 'Обнаружен встроенный канал приложения. Пополнение в приложении запрещено. Используйте сайт или Telegram-бот.',
    calculatorGetQuote: 'Получить расчет',
    calculatorWorking: 'Считаем...',
    calculatorYouReceive: 'Вы получите',
    calculatorYouPay: 'Итого к оплате',
    calculatorQuoteValidUntil: 'Расчет действует до',
    calculatorCreateTopup: 'Создать пополнение',
    calculatorCreatingTopup: 'Создаем...',
    calculatorTopupId: 'ID пополнения',
    calculatorStatus: 'Статус',
    calculatorRiskRoute: 'Риск-маршрут',
    calculatorWebhookNote: 'После подтвержденного webhook начисляется ровно {amount} LKM в кошелек.',
    historyTitle: 'История пополнений',
    historyNeedsAuth: 'История доступна после авторизации.',
    historyStatusLabel: 'Статус',
    historyStatusAll: 'Все',
    historyPerPage: 'На странице',
    historyBack: 'Назад',
    historyPageTemplate: 'Страница {page} / {pages}',
    historyNext: 'Вперед',
    historyShare: 'Поделиться ссылкой',
    historyLoading: 'Загрузка истории...',
    historyEmpty: 'Пополнений пока нет.',
    historyRiskLabel: 'Риск',
    historyTotalTemplate: 'Всего записей: {total}',
    shareTitle: 'История пополнений LKM',
    shareText: 'Ссылка на текущий фильтр истории пополнений',
    shareSent: 'Ссылка отправлена',
    shareCopied: 'Ссылка скопирована',
    shareUnsupported: 'Копирование не поддерживается браузером',
    shareFailed: 'Не удалось поделиться ссылкой',
    errorUnknown: 'Неизвестная ошибка',
    errorTelegramAlreadyLinked: 'К этому аккаунту уже был привязан другой Telegram. Выполните вход еще раз: привязка будет обновлена.',
    errorTelegramConflict: 'Этот Telegram уже привязан к другому аккаунту VedaMatch.',
    errorTelegramRequired: 'Аккаунт Telegram не привязан. Выполните разовый вход email/пароль для привязки.',
    errorSocialLoginVK: 'Не удалось выполнить вход через VK',
    errorSocialLoginGeneric: 'Не удалось выполнить social login',
    errorSocialVKCancelled: 'Вход через VK был отменен',
    errorSocialVKExchange: 'VK не выдал access token. Проверьте настройки web-приложения и попробуйте снова.',
    errorSocialVKMissingCode: 'VK не вернул код авторизации',
    errorSocialVKInvalidToken: 'VK вернул невалидный токен',
    errorAccessTokenMissing: 'Не удалось получить access token',
    errorPrepareAppReturn: 'Не удалось подготовить возврат в приложение',
    successReturningToApp: 'Авторизация завершена. Возвращаемся в приложение VedaMatch...',
    successLoginViaProviderTemplate: 'Вход через {provider} выполнен',
    errorGoogleMissingToken: 'Google не вернул id token',
    errorVKNotConfigured: 'VK web авторизация пока не настроена',
    errorOriginMissing: 'Не удалось определить origin текущего сайта',
    errorVKPopupBlocked: 'Браузер заблокировал окно VK авторизации. Разрешите popup и попробуйте снова.',
    errorVKPopupClosedTemplate: 'VK popup закрылся до callback. Проверьте redirect URI в VK ID Web app: {uri}',
    errorSocialConfigLoad: 'Не удалось загрузить social auth config',
    errorTelegramAuthTimeout: 'Проверка Telegram заняла слишком много времени. Выполните разовый вход email/пароль для привязки.',
    successTelegramLogin: 'Вход через Telegram выполнен',
    errorTelegramSessionChecked: 'Telegram-сессия уже проверена. Выполните разовый вход email/пароль для привязки.',
    errorTelegramDataExpired: 'Данные Telegram устарели. Закройте Mini App и откройте снова из бота.',
    errorEnterEmailPassword: 'Введите email и пароль',
    successTelegramLinked: 'Telegram успешно привязан и авторизация выполнена',
    successAuthorized: 'Авторизация успешна',
    errorTopupOnlyWeb: 'Пополнение доступно только на web и в Telegram-боте',
    errorAuthRequired: 'Требуется авторизация',
    errorPackagesNotLoaded: 'Пакеты не загружены',
    errorPackageUnavailable: 'Выбранный пакет недоступен. Обновите страницу и выберите пакет заново.',
    errorInvalidAmountTemplate: 'Введите корректную сумму: {min}..{max}, шаг {step}',
    successQuoteCreated: 'Расчет сформирован',
    errorCreateQuoteFirst: 'Сначала сформируйте quote',
    successTopupCreated: 'Пополнение создано, ожидается оплата через выбранный платежный шлюз',
    errorTimeoutTemplate: 'Запрос превысил таймаут {seconds}с',
    errorNetworkTemplate: 'Сетевая ошибка при обращении к {url}',
    statusLabels: {
      all: 'Все',
      pending_payment: 'Ожидает оплату',
      paid: 'Оплачено',
      manual_review: 'На ручной проверке',
      credited: 'Зачислено',
      rejected: 'Отклонено',
    },
  },
  en: {
    languageLabel: 'Language',
    heroTitle: 'LKM Wallet',
    heroSubtitle: 'Top up your LKM balance and review PRO pricing for the VedaMatch ecosystem. Available on the website and in the Telegram bot.',
    tariffsLink: 'Tariffs',
    regionLabel: 'Region',
    regionCis: 'CIS',
    regionNonCis: 'outside CIS',
    gatewayLabel: 'Payment gateway',
    currencyLabel: 'Currency',
    authTitle: 'Authorization',
    authCheckingTelegramMiniApp: 'Checking Telegram Mini App login...',
    authCheckingTelegramReturn: 'Checking Telegram login and preparing return to the VedaMatch app...',
    authUsuallyTakes: 'This usually takes up to 10 seconds.',
    continueManually: 'Continue manually',
    authLinkNote: 'A one-time email/password login is required to link Telegram to your VedaMatch account.',
    authLinkNoteMobile: 'A one-time email/password login is required to link Telegram to your VedaMatch account and return you to the app.',
    authSocialHint: 'You can sign in with Google or VK. Email and password remain as a fallback method.',
    authGooglePending: 'Confirming Google sign-in...',
    authLoginWithVK: 'Sign in with VK',
    authOr: 'or',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: '••••••••',
    authLogin: 'Sign in',
    authLoggingIn: 'Signing in...',
    authLinkTelegram: 'Link Telegram',
    authLinkingTelegram: 'Linking...',
    authVerifying: 'Confirming...',
    authAuthorized: 'Authorized',
    authAuthorizedTelegram: 'Authorized via Telegram',
    authReturningToApp: 'Authorization completed. Returning to the VedaMatch app...',
    authReturnHint: 'If the app did not open automatically, use the button below.',
    authSessionAutoRefresh: 'The session is refreshed automatically while the refresh session is active.',
    authReturnToApp: 'Return to app',
    authLogout: 'Log out',
    walletTitle: 'Wallet',
    walletBalance: 'Current active balance',
    walletNominalRate: 'Nominal rate',
    walletVerificationBot: 'For verification you can use the bot',
    proPreviewTitle: 'PRO plans',
    proPreviewSubtitle: 'Current PRO prices from monetization.',
    proPreviewEmpty: 'PRO plans are temporarily unavailable.',
    proPreviewDaysTemplate: '{days} days',
    proPreviewFromLabel: 'From',
    topupTitle: 'Top up balance',
    topupLoadingPackages: 'Loading packages...',
    topupCustomAmount: 'Custom amount',
    topupRangeTemplate: 'Range: {min}..{max} LKM, step {step}',
    topupGateway: 'Payment gateway',
    topupCurrency: 'Currency',
    topupPackagesAfterAuth: 'Regional packages will load after authorization.',
    calculatorTitle: 'Quote and top-up',
    calculatorBlockedInApp: 'An in-app channel was detected. Top-up is blocked inside the app. Use the website or Telegram bot.',
    calculatorGetQuote: 'Get quote',
    calculatorWorking: 'Calculating...',
    calculatorYouReceive: 'You receive',
    calculatorYouPay: 'Total to pay',
    calculatorQuoteValidUntil: 'Quote valid until',
    calculatorCreateTopup: 'Create top-up',
    calculatorCreatingTopup: 'Creating...',
    calculatorTopupId: 'Top-up ID',
    calculatorStatus: 'Status',
    calculatorRiskRoute: 'Risk route',
    calculatorWebhookNote: 'After confirmed webhook, exactly {amount} LKM will be credited to the wallet.',
    historyTitle: 'Top-up history',
    historyNeedsAuth: 'History is available after authorization.',
    historyStatusLabel: 'Status',
    historyStatusAll: 'All',
    historyPerPage: 'Per page',
    historyBack: 'Back',
    historyPageTemplate: 'Page {page} / {pages}',
    historyNext: 'Next',
    historyShare: 'Share link',
    historyLoading: 'Loading history...',
    historyEmpty: 'No top-ups yet.',
    historyRiskLabel: 'Risk',
    historyTotalTemplate: 'Total records: {total}',
    shareTitle: 'LKM top-up history',
    shareText: 'Link to the current top-up history filter',
    shareSent: 'Link shared',
    shareCopied: 'Link copied',
    shareUnsupported: 'Copy is not supported by this browser',
    shareFailed: 'Failed to share the link',
    errorUnknown: 'Unknown error',
    errorTelegramAlreadyLinked: 'Another Telegram account had already been linked here. Sign in again to refresh the link.',
    errorTelegramConflict: 'This Telegram account is already linked to another VedaMatch account.',
    errorTelegramRequired: 'Telegram is not linked. Use one email/password sign-in to link it.',
    errorSocialLoginVK: 'VK sign-in failed',
    errorSocialLoginGeneric: 'Social login failed',
    errorSocialVKCancelled: 'VK sign-in was cancelled',
    errorSocialVKExchange: 'VK did not issue an access token. Check the web app settings and try again.',
    errorSocialVKMissingCode: 'VK did not return an authorization code',
    errorSocialVKInvalidToken: 'VK returned an invalid token',
    errorAccessTokenMissing: 'Could not get access token',
    errorPrepareAppReturn: 'Could not prepare app return',
    successReturningToApp: 'Authorization completed. Returning to the VedaMatch app...',
    successLoginViaProviderTemplate: 'Signed in with {provider}',
    errorGoogleMissingToken: 'Google did not return an id token',
    errorVKNotConfigured: 'VK web authorization is not configured yet',
    errorOriginMissing: 'Could not determine the current site origin',
    errorVKPopupBlocked: 'The browser blocked the VK authorization popup. Allow popups and try again.',
    errorVKPopupClosedTemplate: 'VK popup was closed before callback. Check redirect URI in VK ID Web app: {uri}',
    errorSocialConfigLoad: 'Could not load social auth config',
    errorTelegramAuthTimeout: 'Telegram verification took too long. Use one email/password sign-in to link it.',
    successTelegramLogin: 'Signed in via Telegram',
    errorTelegramSessionChecked: 'This Telegram session was already verified. Use one email/password sign-in to link it.',
    errorTelegramDataExpired: 'Telegram data expired. Close the Mini App and open it again from the bot.',
    errorEnterEmailPassword: 'Enter email and password',
    successTelegramLinked: 'Telegram was linked successfully and authorization completed',
    successAuthorized: 'Authorization successful',
    errorTopupOnlyWeb: 'Top-up is available only on the web and in the Telegram bot',
    errorAuthRequired: 'Authorization is required',
    errorPackagesNotLoaded: 'Packages are not loaded',
    errorPackageUnavailable: 'The selected package is unavailable. Refresh the page and select it again.',
    errorInvalidAmountTemplate: 'Enter a valid amount: {min}..{max}, step {step}',
    successQuoteCreated: 'Quote created',
    errorCreateQuoteFirst: 'Create a quote first',
    successTopupCreated: 'Top-up created, payment is now expected through the selected gateway',
    errorTimeoutTemplate: 'Request exceeded timeout of {seconds}s',
    errorNetworkTemplate: 'Network error while requesting {url}',
    statusLabels: {
      all: 'All',
      pending_payment: 'Pending payment',
      paid: 'Paid',
      manual_review: 'Manual review',
      credited: 'Credited',
      rejected: 'Rejected',
    },
  },
  hi: {
    languageLabel: 'भाषा',
    heroTitle: 'LKM वॉलेट',
    heroSubtitle: 'VedaMatch इकोसिस्टम के लिए LKM बैलेंस टॉप-अप और PRO प्राइसिंग यहाँ देखें। यह वेबसाइट और Telegram bot में उपलब्ध है।',
    tariffsLink: 'टैरिफ',
    regionLabel: 'क्षेत्र',
    regionCis: 'CIS',
    regionNonCis: 'CIS के बाहर',
    gatewayLabel: 'पेमेंट गेटवे',
    currencyLabel: 'मुद्रा',
    authTitle: 'अथॉराइज़ेशन',
    authCheckingTelegramMiniApp: 'Telegram Mini App लॉगिन की जांच हो रही है...',
    authCheckingTelegramReturn: 'Telegram लॉगिन की जांच हो रही है और VedaMatch app में वापसी तैयार की जा रही है...',
    authUsuallyTakes: 'यह आमतौर पर 10 सेकंड तक लेता है।',
    continueManually: 'मैन्युअली जारी रखें',
    authLinkNote: 'Telegram को अपने VedaMatch खाते से जोड़ने के लिए एक बार email/password लॉगिन आवश्यक है।',
    authLinkNoteMobile: 'Telegram को अपने VedaMatch खाते से जोड़ने और app में लौटने के लिए एक बार email/password लॉगिन आवश्यक है।',
    authSocialHint: 'आप Google या VK से साइन इन कर सकते हैं। Email और password बैकअप विकल्प रहते हैं।',
    authGooglePending: 'Google sign-in की पुष्टि हो रही है...',
    authLoginWithVK: 'VK से साइन इन करें',
    authOr: 'या',
    emailLabel: 'Email',
    passwordLabel: 'पासवर्ड',
    emailPlaceholder: 'you@example.com',
    passwordPlaceholder: '••••••••',
    authLogin: 'साइन इन',
    authLoggingIn: 'साइन इन हो रहा है...',
    authLinkTelegram: 'Telegram लिंक करें',
    authLinkingTelegram: 'लिंक किया जा रहा है...',
    authVerifying: 'पुष्टि हो रही है...',
    authAuthorized: 'अधिकृत',
    authAuthorizedTelegram: 'Telegram के माध्यम से अधिकृत',
    authReturningToApp: 'अथॉराइज़ेशन पूरा हुआ। VedaMatch app में वापस जा रहे हैं...',
    authReturnHint: 'यदि app अपने आप नहीं खुला, तो नीचे का बटन उपयोग करें।',
    authSessionAutoRefresh: 'Refresh session सक्रिय रहने तक session अपने आप बढ़ती रहती है।',
    authReturnToApp: 'App में वापस जाएँ',
    authLogout: 'लॉग आउट',
    walletTitle: 'वॉलेट',
    walletBalance: 'वर्तमान सक्रिय बैलेंस',
    walletNominalRate: 'नाममात्र दर',
    walletVerificationBot: 'वेरिफिकेशन के लिए आप bot का उपयोग कर सकते हैं',
    proPreviewTitle: 'PRO प्लान',
    proPreviewSubtitle: 'Monetization से वर्तमान PRO कीमतें।',
    proPreviewEmpty: 'PRO प्लान फिलहाल उपलब्ध नहीं हैं।',
    proPreviewDaysTemplate: '{days} दिन',
    proPreviewFromLabel: 'शुरू',
    topupTitle: 'बैलेंस टॉप-अप',
    topupLoadingPackages: 'पैकेज लोड हो रहे हैं...',
    topupCustomAmount: 'कस्टम राशि',
    topupRangeTemplate: 'रेंज: {min}..{max} LKM, स्टेप {step}',
    topupGateway: 'पेमेंट गेटवे',
    topupCurrency: 'मुद्रा',
    topupPackagesAfterAuth: 'अथॉराइज़ेशन के बाद क्षेत्रीय पैकेज लोड होंगे।',
    calculatorTitle: 'क्वोट और टॉप-अप',
    calculatorBlockedInApp: 'ऐप के भीतर चैनल पाया गया। ऐप के अंदर टॉप-अप ब्लॉक है। वेबसाइट या Telegram bot का उपयोग करें।',
    calculatorGetQuote: 'क्वोट प्राप्त करें',
    calculatorWorking: 'गणना हो रही है...',
    calculatorYouReceive: 'आपको मिलेगा',
    calculatorYouPay: 'कुल भुगतान',
    calculatorQuoteValidUntil: 'क्वोट मान्य है',
    calculatorCreateTopup: 'टॉप-अप बनाएं',
    calculatorCreatingTopup: 'बनाया जा रहा है...',
    calculatorTopupId: 'टॉप-अप ID',
    calculatorStatus: 'स्टेटस',
    calculatorRiskRoute: 'रिस्क रूट',
    calculatorWebhookNote: 'Webhook पुष्टि के बाद ठीक {amount} LKM वॉलेट में जमा होंगे।',
    historyTitle: 'टॉप-अप हिस्ट्री',
    historyNeedsAuth: 'हिस्ट्री अथॉराइज़ेशन के बाद उपलब्ध है।',
    historyStatusLabel: 'स्टेटस',
    historyStatusAll: 'सभी',
    historyPerPage: 'प्रति पेज',
    historyBack: 'पीछे',
    historyPageTemplate: 'पेज {page} / {pages}',
    historyNext: 'आगे',
    historyShare: 'लिंक साझा करें',
    historyLoading: 'हिस्ट्री लोड हो रही है...',
    historyEmpty: 'अभी कोई टॉप-अप नहीं है।',
    historyRiskLabel: 'रिस्क',
    historyTotalTemplate: 'कुल रिकॉर्ड: {total}',
    shareTitle: 'LKM टॉप-अप हिस्ट्री',
    shareText: 'वर्तमान टॉप-अप हिस्ट्री फ़िल्टर की लिंक',
    shareSent: 'लिंक भेजी गई',
    shareCopied: 'लिंक कॉपी हो गई',
    shareUnsupported: 'यह ब्राउज़र कॉपी सपोर्ट नहीं करता',
    shareFailed: 'लिंक साझा नहीं हो सकी',
    errorUnknown: 'अज्ञात त्रुटि',
    errorTelegramAlreadyLinked: 'यहाँ पहले कोई दूसरा Telegram खाता जुड़ा था। लिंक ताज़ा करने के लिए फिर से साइन इन करें।',
    errorTelegramConflict: 'यह Telegram खाता पहले से किसी दूसरे VedaMatch खाते से जुड़ा है।',
    errorTelegramRequired: 'Telegram लिंक नहीं है। इसे जोड़ने के लिए एक बार email/password साइन-इन करें।',
    errorSocialLoginVK: 'VK sign-in विफल हुआ',
    errorSocialLoginGeneric: 'Social login विफल हुआ',
    errorSocialVKCancelled: 'VK sign-in रद्द कर दिया गया',
    errorSocialVKExchange: 'VK ने access token नहीं दिया। Web app settings जांचें और फिर प्रयास करें।',
    errorSocialVKMissingCode: 'VK ने authorization code वापस नहीं किया',
    errorSocialVKInvalidToken: 'VK ने अमान्य token लौटाया',
    errorAccessTokenMissing: 'Access token प्राप्त नहीं हो सका',
    errorPrepareAppReturn: 'App में वापसी तैयार नहीं हो सकी',
    successReturningToApp: 'अथॉराइज़ेशन पूरा हुआ। VedaMatch app में वापस जा रहे हैं...',
    successLoginViaProviderTemplate: '{provider} के माध्यम से साइन इन हुआ',
    errorGoogleMissingToken: 'Google ने id token वापस नहीं किया',
    errorVKNotConfigured: 'VK web authorization अभी कॉन्फ़िगर नहीं है',
    errorOriginMissing: 'वर्तमान साइट origin निर्धारित नहीं हो सका',
    errorVKPopupBlocked: 'ब्राउज़र ने VK authorization popup ब्लॉक कर दिया। Popups की अनुमति दें और फिर प्रयास करें।',
    errorVKPopupClosedTemplate: 'VK popup callback से पहले बंद हो गया। VK ID Web app में redirect URI जांचें: {uri}',
    errorSocialConfigLoad: 'Social auth config लोड नहीं हो सका',
    errorTelegramAuthTimeout: 'Telegram वेरिफिकेशन में बहुत समय लगा। इसे जोड़ने के लिए एक बार email/password साइन-इन करें।',
    successTelegramLogin: 'Telegram के माध्यम से साइन इन हुआ',
    errorTelegramSessionChecked: 'यह Telegram session पहले ही verify हो चुकी है। इसे जोड़ने के लिए एक बार email/password साइन-इन करें।',
    errorTelegramDataExpired: 'Telegram डेटा समाप्त हो गया है। Mini App बंद करें और bot से फिर खोलें।',
    errorEnterEmailPassword: 'Email और password दर्ज करें',
    successTelegramLinked: 'Telegram सफलतापूर्वक लिंक हुआ और अथॉराइज़ेशन पूरा हुआ',
    successAuthorized: 'अथॉराइज़ेशन सफल हुआ',
    errorTopupOnlyWeb: 'टॉप-अप केवल web और Telegram bot में उपलब्ध है',
    errorAuthRequired: 'अथॉराइज़ेशन आवश्यक है',
    errorPackagesNotLoaded: 'पैकेज लोड नहीं हुए हैं',
    errorPackageUnavailable: 'चयनित पैकेज उपलब्ध नहीं है। पेज रीफ़्रेश करें और फिर चुनें।',
    errorInvalidAmountTemplate: 'सही राशि दर्ज करें: {min}..{max}, स्टेप {step}',
    successQuoteCreated: 'क्वोट तैयार हो गया',
    errorCreateQuoteFirst: 'पहले क्वोट तैयार करें',
    successTopupCreated: 'टॉप-अप बना दिया गया है, अब चयनित gateway के माध्यम से भुगतान अपेक्षित है',
    errorTimeoutTemplate: 'Request का timeout {seconds} सेकंड से अधिक हो गया',
    errorNetworkTemplate: '{url} पर request करते समय network error हुआ',
    statusLabels: {
      all: 'सभी',
      pending_payment: 'भुगतान लंबित',
      paid: 'भुगतान हो गया',
      manual_review: 'मैन्युअल समीक्षा',
      credited: 'जमा किया गया',
      rejected: 'अस्वीकृत',
    },
  },
};

export function formatCabinetCopy(
  template: string,
  values: Record<string, string | number>,
): string {
  return formatTemplate(template, values);
}
