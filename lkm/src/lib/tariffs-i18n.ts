export type Language = 'ru' | 'en' | 'hi';

export type TariffsDictionary = {
  pageTitle: string;
  pageSubtitle: string;
  backToCabinet: string;
  languageLabel: string;
  loading: string;
  errorTitle: string;
  errorDescription: string;
  retry: string;
  emptyTitle: string;
  emptyDescription: string;
  regionLabel: string;
  currencyLabel: string;
  gatewayLabel: string;
  paymentMethodLabel: string;
  limitsLabel: string;
  limitsTemplate: string;
  sectionHowTitle: string;
  howSteps: string[];
  sectionTariffsTitle: string;
  sectionTariffsSubtitle: string;
  lkmColumn: string;
  receiveColumn: string;
  payColumn: string;
  pricePerLkmColumn: string;
  sectionExampleTitle: string;
  exampleLead: string;
  sectionImportantTitle: string;
  importantItems: string[];
  backendDisclaimerLabel: string;
  sectionFaqTitle: string;
  faq: Array<{ question: string; answer: string }>;
};

export const DEFAULT_LANGUAGE: Language = 'en';

export const LANGUAGE_LABELS: Record<Language, string> = {
  ru: 'RU',
  en: 'EN',
  hi: 'हिंदी',
};

export const LANGUAGE_LOCALES: Record<Language, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  hi: 'hi-IN',
};

export const TARIFFS_I18N: Record<Language, TariffsDictionary> = {
  ru: {
    pageTitle: 'Тарифы LKM',
    pageSubtitle:
      'Здесь показано, как формируется оплата: вы платите реальными деньгами и получаете LKM для платных сервисов VedaMatch.',
    backToCabinet: 'Вернуться в кабинет',
    languageLabel: 'Язык',
    loading: 'Загружаем тарифы...',
    errorTitle: 'Не удалось загрузить тарифы',
    errorDescription: 'Проверьте соединение и попробуйте снова.',
    retry: 'Повторить',
    emptyTitle: 'Тарифы временно недоступны',
    emptyDescription: 'Пакеты не найдены. Попробуйте позже.',
    regionLabel: 'Регион',
    currencyLabel: 'Валюта',
    gatewayLabel: 'Платежный шлюз',
    paymentMethodLabel: 'Метод оплаты',
    limitsLabel: 'Лимиты пополнения',
    limitsTemplate: 'Минимум {min} LKM · Максимум {max} LKM · Шаг {step} LKM',
    sectionHowTitle: 'Как работает оплата',
    howSteps: [
      'Вы выбираете пакет или указываете сумму LKM.',
      'Сервис показывает итог к оплате с учетом региона, валюты и комиссии.',
      'После подтверждения платежа LKM зачисляются в ваш кошелек.',
    ],
    sectionTariffsTitle: 'Текущие тарифы',
    sectionTariffsSubtitle: 'Актуальные пакеты приходят напрямую из платежного API.',
    lkmColumn: 'Пакет LKM',
    receiveColumn: 'К получению',
    payColumn: 'К оплате',
    pricePerLkmColumn: 'Цена за 1 LKM',
    sectionExampleTitle: 'Пример расчета',
    exampleLead: 'Для пакета',
    sectionImportantTitle: 'Важно',
    importantItems: [
      'Цена зависит от региона, валюты и платежного шлюза.',
      'Комиссия уже учтена в сумме к оплате.',
      'После оплаты проверьте чек и запись в истории пополнений.',
      'LKM используются внутри экосистемы VedaMatch для сервисов и услуг.',
    ],
    backendDisclaimerLabel: 'Дисклеймер платежного провайдера',
    sectionFaqTitle: 'Частые вопросы',
    faq: [
      {
        question: 'Это подписка или разовая оплата?',
        answer: 'Пополнение LKM — разовая оплата выбранного пакета.',
      },
      {
        question: 'Почему сумма в валюте может отличаться?',
        answer: 'На итог влияют регион, выбранный шлюз и текущие тарифные условия.',
      },
      {
        question: 'Где смотреть подтверждение оплаты?',
        answer: 'Подтверждение доступно в истории пополнений в кабинете LKM.',
      },
    ],
  },
  en: {
    pageTitle: 'LKM Tariffs',
    pageSubtitle:
      'This page explains your payment: you pay with real money and receive LKM for paid VedaMatch services.',
    backToCabinet: 'Back to cabinet',
    languageLabel: 'Language',
    loading: 'Loading tariffs...',
    errorTitle: 'Failed to load tariffs',
    errorDescription: 'Check your connection and try again.',
    retry: 'Retry',
    emptyTitle: 'Tariffs are temporarily unavailable',
    emptyDescription: 'No packages were returned. Please try again later.',
    regionLabel: 'Region',
    currencyLabel: 'Currency',
    gatewayLabel: 'Payment gateway',
    paymentMethodLabel: 'Payment method',
    limitsLabel: 'Top-up limits',
    limitsTemplate: 'Min {min} LKM · Max {max} LKM · Step {step} LKM',
    sectionHowTitle: 'How payment works',
    howSteps: [
      'Choose a package or enter a custom LKM amount.',
      'The system shows total payment based on region, currency, and fees.',
      'After payment confirmation, LKM is credited to your wallet.',
    ],
    sectionTariffsTitle: 'Current tariffs',
    sectionTariffsSubtitle: 'Live package data comes directly from the payment API.',
    lkmColumn: 'LKM package',
    receiveColumn: 'You receive',
    payColumn: 'You pay',
    pricePerLkmColumn: 'Price per 1 LKM',
    sectionExampleTitle: 'Calculation example',
    exampleLead: 'For package',
    sectionImportantTitle: 'Important',
    importantItems: [
      'Price depends on region, currency, and payment gateway.',
      'Processing fee is already included in the total payment amount.',
      'After payment, check your receipt and top-up history record.',
      'LKM is used inside the VedaMatch ecosystem for services.',
    ],
    backendDisclaimerLabel: 'Payment provider disclaimer',
    sectionFaqTitle: 'FAQ',
    faq: [
      {
        question: 'Is this a subscription or one-time payment?',
        answer: 'LKM top-up is a one-time payment for the selected package.',
      },
      {
        question: 'Why can the payment amount vary by currency?',
        answer: 'The final amount depends on region, gateway, and tariff conditions.',
      },
      {
        question: 'Where can I verify the payment?',
        answer: 'Use top-up history in your LKM cabinet to see payment records.',
      },
    ],
  },
  hi: {
    pageTitle: 'LKM टैरिफ',
    pageSubtitle:
      'यह पेज आपकी पेमेंट को सरल तरीके से समझाता है: आप असली पैसे से भुगतान करते हैं और VedaMatch सेवाओं के लिए LKM प्राप्त करते हैं।',
    backToCabinet: 'कैबिनेट पर वापस जाएँ',
    languageLabel: 'भाषा',
    loading: 'टैरिफ लोड हो रहे हैं...',
    errorTitle: 'टैरिफ लोड नहीं हो पाए',
    errorDescription: 'कनेक्शन जांचें और फिर से प्रयास करें।',
    retry: 'फिर से प्रयास करें',
    emptyTitle: 'टैरिफ फिलहाल उपलब्ध नहीं हैं',
    emptyDescription: 'पैकेज नहीं मिले। कृपया बाद में प्रयास करें।',
    regionLabel: 'क्षेत्र',
    currencyLabel: 'मुद्रा',
    gatewayLabel: 'पेमेंट गेटवे',
    paymentMethodLabel: 'पेमेंट तरीका',
    limitsLabel: 'टॉप-अप सीमाएँ',
    limitsTemplate: 'न्यूनतम {min} LKM · अधिकतम {max} LKM · स्टेप {step} LKM',
    sectionHowTitle: 'पेमेंट कैसे काम करती है',
    howSteps: [
      'आप पैकेज चुनते हैं या कस्टम LKM राशि दर्ज करते हैं।',
      'सिस्टम क्षेत्र, मुद्रा और शुल्क के आधार पर कुल भुगतान दिखाता है।',
      'पेमेंट पुष्टि के बाद LKM आपके वॉलेट में जमा होते हैं।',
    ],
    sectionTariffsTitle: 'वर्तमान टैरिफ',
    sectionTariffsSubtitle: 'पैकेज डेटा सीधे पेमेंट API से आता है।',
    lkmColumn: 'LKM पैकेज',
    receiveColumn: 'आपको मिलेगा',
    payColumn: 'आप भुगतान करेंगे',
    pricePerLkmColumn: '1 LKM की कीमत',
    sectionExampleTitle: 'कैलकुलेशन उदाहरण',
    exampleLead: 'पैकेज',
    sectionImportantTitle: 'महत्वपूर्ण',
    importantItems: [
      'कीमत क्षेत्र, मुद्रा और गेटवे के अनुसार बदलती है।',
      'कुल भुगतान में प्रोसेसिंग शुल्क शामिल है।',
      'पेमेंट के बाद रसीद और इतिहास में एंट्री जांचें।',
      'LKM का उपयोग VedaMatch इकोसिस्टम की सेवाओं में होता है।',
    ],
    backendDisclaimerLabel: 'पेमेंट प्रोवाइडर डिस्क्लेमर',
    sectionFaqTitle: 'सामान्य प्रश्न',
    faq: [
      {
        question: 'क्या यह सब्सक्रिप्शन है या एक बार की पेमेंट?',
        answer: 'LKM टॉप-अप चुने हुए पैकेज की एक बार की पेमेंट है।',
      },
      {
        question: 'पेमेंट राशि अलग क्यों हो सकती है?',
        answer: 'अंतिम राशि क्षेत्र, गेटवे और टैरिफ शर्तों पर निर्भर करती है।',
      },
      {
        question: 'पेमेंट कन्फर्मेशन कहाँ देखें?',
        answer: 'कन्फर्मेशन LKM कैबिनेट की टॉप-अप हिस्ट्री में देखें।',
      },
    ],
  },
};

export function normalizeLanguage(input: string | null | undefined): Language | null {
  const raw = (input || '').trim().toLowerCase();
  if (!raw) {
    return null;
  }
  if (raw === 'ru' || raw.startsWith('ru-')) {
    return 'ru';
  }
  if (raw === 'hi' || raw.startsWith('hi-')) {
    return 'hi';
  }
  if (raw === 'en' || raw.startsWith('en-')) {
    return 'en';
  }
  return null;
}

export function formatTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }, template);
}
