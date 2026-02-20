import type { LegalDocumentType, LegalLanguage } from '../config/legal.config';

type LocalLegalSection = {
  title: string;
  paragraphs: string[];
};

export type LocalLegalDocument = {
  title: string;
  updatedAt: string;
  sections: LocalLegalSection[];
};

type LegalRetentionDays = {
  account: number;
  media: number;
  logs: number;
  legalTax: number;
};

export type LegalRuntimeConfig = {
  operatorFullName: string;
  supportEmail: string;
  privacyEmail: string;
  legalEmail: string;
  retentionDays: LegalRetentionDays;
};

export const DEFAULT_LEGAL_RUNTIME_CONFIG: LegalRuntimeConfig = {
  operatorFullName: 'Self-employed service operator (RF, NPD)',
  supportEmail: 'support@vedamatch.ru',
  privacyEmail: 'privacy@vedamatch.ru',
  legalEmail: 'legal@vedamatch.ru',
  retentionDays: {
    account: 30,
    media: 30,
    logs: 365,
    legalTax: 1825,
  },
};

const toNonEmptyString = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed || fallback;
};

const toPositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
};

export const normalizeLegalRuntimeConfig = (value: unknown): LegalRuntimeConfig => {
  const source = (value && typeof value === 'object') ? (value as Record<string, unknown>) : {};
  const retentionSource =
    source.retentionDays && typeof source.retentionDays === 'object'
      ? (source.retentionDays as Record<string, unknown>)
      : {};

  return {
    operatorFullName: toNonEmptyString(source.operatorFullName, DEFAULT_LEGAL_RUNTIME_CONFIG.operatorFullName),
    supportEmail: toNonEmptyString(source.supportEmail, DEFAULT_LEGAL_RUNTIME_CONFIG.supportEmail),
    privacyEmail: toNonEmptyString(source.privacyEmail, DEFAULT_LEGAL_RUNTIME_CONFIG.privacyEmail),
    legalEmail: toNonEmptyString(source.legalEmail, DEFAULT_LEGAL_RUNTIME_CONFIG.legalEmail),
    retentionDays: {
      account: toPositiveInt(retentionSource.account, DEFAULT_LEGAL_RUNTIME_CONFIG.retentionDays.account),
      media: toPositiveInt(retentionSource.media, DEFAULT_LEGAL_RUNTIME_CONFIG.retentionDays.media),
      logs: toPositiveInt(retentionSource.logs, DEFAULT_LEGAL_RUNTIME_CONFIG.retentionDays.logs),
      legalTax: toPositiveInt(retentionSource.legalTax, DEFAULT_LEGAL_RUNTIME_CONFIG.retentionDays.legalTax),
    },
  };
};

type LocalLegalDocumentMap = Record<LegalDocumentType, Record<LegalLanguage, LocalLegalDocument>>;

const applyTemplate = (text: string, config: LegalRuntimeConfig): string => {
  const replacements: Record<string, string> = {
    '{{operatorFullName}}': config.operatorFullName,
    '{{supportEmail}}': config.supportEmail,
    '{{privacyEmail}}': config.privacyEmail,
    '{{legalEmail}}': config.legalEmail,
    '{{retentionAccountDays}}': String(config.retentionDays.account),
    '{{retentionMediaDays}}': String(config.retentionDays.media),
    '{{retentionLogDays}}': String(config.retentionDays.logs),
    '{{retentionLegalTaxDays}}': String(config.retentionDays.legalTax),
  };

  return Object.keys(replacements).reduce((result, token) => {
    return result.split(token).join(replacements[token]);
  }, text);
};

const LOCAL_LEGAL_DOCUMENTS: LocalLegalDocumentMap = {
  privacy: {
    en: {
      title: 'Privacy Policy',
      updatedAt: 'Updated: 2026-02-20',
      sections: [
        {
          title: '1. Operator and contact',
          paragraphs: [
            'VedaMatch is currently operated by {{operatorFullName}}.',
            'Privacy contact: {{privacyEmail}}. General support: {{supportEmail}}.',
          ],
        },
        {
          title: '2. What we collect',
          paragraphs: [
            'We may process account data (email, profile fields), content you upload (messages/media), technical data (device/session identifiers), and location only when location-based features are enabled.',
          ],
        },
        {
          title: '3. Why we process data',
          paragraphs: [
            'Data is used to provide authentication, messaging/media features, notifications, abuse prevention, stability, and user support.',
          ],
        },
        {
          title: '4. LKM policy',
          paragraphs: [
            'LKM are internal non-monetary points for in-app engagement.',
            'LKM are not legal tender, not electronic money, and not a payment instrument.',
            'LKM cannot be exchanged, withdrawn, or redeemed for cash or crypto outside the app.',
          ],
        },
        {
          title: '5. Account deletion',
          paragraphs: [
            'You can request deletion in app: Settings -> Delete account.',
            'You can also use the deletion page on the website.',
            'On deletion, active sessions are revoked and personal data is deleted or anonymized according to retention policy.',
            'Default retention windows: account {{retentionAccountDays}} days, media {{retentionMediaDays}} days, logs {{retentionLogDays}} days, legal/tax records {{retentionLegalTaxDays}} days.',
          ],
        },
        {
          title: '6. Operator change notice',
          paragraphs: [
            'If operator status changes to a Kazakhstan legal entity, we will publish updated legal documents with a new effective date before the change applies.',
          ],
        },
      ],
    },
    ru: {
      title: 'Политика конфиденциальности',
      updatedAt: 'Обновлено: 20.02.2026',
      sections: [
        {
          title: '1. Оператор и контакты',
          paragraphs: [
            'VedaMatch сейчас управляется оператором: {{operatorFullName}}.',
            'Контакт по приватности: {{privacyEmail}}. Общая поддержка: {{supportEmail}}.',
          ],
        },
        {
          title: '2. Какие данные мы собираем',
          paragraphs: [
            'Мы можем обрабатывать данные аккаунта (email, поля профиля), загруженный контент (сообщения/медиа), технические данные (идентификаторы устройства/сессии), а также геолокацию только при включении соответствующих функций.',
          ],
        },
        {
          title: '3. Зачем мы обрабатываем данные',
          paragraphs: [
            'Данные используются для авторизации, работы сообщений/медиа, уведомлений, защиты от злоупотреблений, стабильности сервиса и поддержки пользователей.',
          ],
        },
        {
          title: '4. Политика LKM',
          paragraphs: [
            'LKM — внутренние неплатежные баллы активности внутри приложения.',
            'LKM не являются законным платежным средством, электронными деньгами или платежным инструментом.',
            'LKM нельзя обменять, вывести или погасить в деньги/крипто вне приложения.',
          ],
        },
        {
          title: '5. Удаление аккаунта',
          paragraphs: [
            'Запросить удаление можно в приложении: Settings -> Delete account.',
            'Также можно использовать страницу удаления на сайте.',
            'После удаления активные сессии отзываются, а персональные данные удаляются или анонимизируются по правилам хранения.',
            'Базовые сроки хранения: аккаунт {{retentionAccountDays}} дней, медиа {{retentionMediaDays}} дней, логи {{retentionLogDays}} дней, legal/tax {{retentionLegalTaxDays}} дней.',
          ],
        },
        {
          title: '6. Уведомление о смене оператора',
          paragraphs: [
            'При переходе на юридическое лицо в Казахстане мы заранее опубликуем обновленные документы с новой датой вступления в силу.',
          ],
        },
      ],
    },
    hi: {
      title: 'गोपनीयता नीति',
      updatedAt: 'अपडेट: 2026-02-20',
      sections: [
        {
          title: '1. ऑपरेटर और संपर्क',
          paragraphs: [
            'VedaMatch वर्तमान में इस ऑपरेटर द्वारा संचालित है: {{operatorFullName}}.',
            'प्राइवेसी संपर्क: {{privacyEmail}}. सामान्य सपोर्ट: {{supportEmail}}.',
          ],
        },
        {
          title: '2. हम कौन सा डेटा एकत्र करते हैं',
          paragraphs: [
            'हम अकाउंट डेटा (ईमेल, प्रोफ़ाइल फ़ील्ड), यूज़र कंटेंट (मैसेज/मीडिया), तकनीकी डेटा (डिवाइस/सेशन पहचान) और लोकेशन डेटा केवल फीचर सक्षम होने पर प्रोसेस कर सकते हैं।',
          ],
        },
        {
          title: '3. डेटा क्यों प्रोसेस किया जाता है',
          paragraphs: [
            'डेटा का उपयोग लॉगिन, मैसेजिंग/मीडिया फीचर, नोटिफिकेशन, दुरुपयोग रोकथाम, सेवा स्थिरता और सपोर्ट के लिए किया जाता है।',
          ],
        },
        {
          title: '4. LKM नीति',
          paragraphs: [
            'LKM ऐप के भीतर उपयोग होने वाले आंतरिक गैर-भुगतान पॉइंट हैं।',
            'LKM कानूनी मुद्रा, इलेक्ट्रॉनिक मनी या भुगतान साधन नहीं हैं।',
            'LKM को ऐप के बाहर नकद/क्रिप्टो में बदला या निकाला नहीं जा सकता।',
          ],
        },
        {
          title: '5. अकाउंट डिलीशन',
          paragraphs: [
            'डिलीशन अनुरोध ऐप में उपलब्ध है: Settings -> Delete account.',
            'वेबसाइट डिलीशन पेज भी उपलब्ध है।',
            'डिलीशन के बाद सक्रिय सेशन रद्द होते हैं और व्यक्तिगत डेटा को नीति के अनुसार हटाया या anonymize किया जाता है।',
            'डिफ़ॉल्ट प्रतिधारण अवधि: अकाउंट {{retentionAccountDays}} दिन, मीडिया {{retentionMediaDays}} दिन, लॉग्स {{retentionLogDays}} दिन, legal/tax रिकॉर्ड {{retentionLegalTaxDays}} दिन।',
          ],
        },
        {
          title: '6. ऑपरेटर परिवर्तन सूचना',
          paragraphs: [
            'यदि ऑपरेटर आगे चलकर कज़ाखस्तान की कानूनी इकाई में बदलता है, तो हम नई प्रभावी तिथि के साथ अपडेटेड दस्तावेज पहले से प्रकाशित करेंगे।',
          ],
        },
      ],
    },
  },
  terms: {
    en: {
      title: 'Terms of Use',
      updatedAt: 'Updated: 2026-02-20',
      sections: [
        {
          title: '1. Acceptance',
          paragraphs: [
            'By using VedaMatch, you accept these Terms.',
          ],
        },
        {
          title: '2. Operator status',
          paragraphs: [
            'VedaMatch is currently operated by {{operatorFullName}}.',
            'If operation is migrated to a Kazakhstan legal entity, updated Terms will be published in advance with a new effective date.',
            'Legal contact: {{legalEmail}}.',
          ],
        },
        {
          title: '3. User conduct',
          paragraphs: [
            'You must not publish illegal, abusive, fraudulent, or rights-infringing content.',
          ],
        },
        {
          title: '4. Moderation',
          paragraphs: [
            'We may remove content and limit accounts that violate laws, these Terms, or moderation rules.',
          ],
        },
        {
          title: '5. LKM policy',
          paragraphs: [
            'LKM are internal non-monetary points for app features only.',
            'LKM are not legal tender and not a payment instrument.',
            'LKM cannot be sold, withdrawn, or redeemed for money.',
          ],
        },
      ],
    },
    ru: {
      title: 'Условия использования',
      updatedAt: 'Обновлено: 20.02.2026',
      sections: [
        {
          title: '1. Принятие условий',
          paragraphs: [
            'Используя VedaMatch, вы принимаете настоящие Условия.',
          ],
        },
        {
          title: '2. Статус оператора',
          paragraphs: [
            'VedaMatch сейчас управляется оператором: {{operatorFullName}}.',
            'При переходе оператора на юридическое лицо в Казахстане обновленные Условия будут опубликованы заранее с новой датой вступления в силу.',
            'Юридический контакт: {{legalEmail}}.',
          ],
        },
        {
          title: '3. Правила поведения',
          paragraphs: [
            'Запрещено публиковать незаконный, оскорбительный, мошеннический или нарушающий чужие права контент.',
          ],
        },
        {
          title: '4. Модерация',
          paragraphs: [
            'Мы можем удалять контент и ограничивать аккаунты при нарушении закона, Условий или правил модерации.',
          ],
        },
        {
          title: '5. Политика LKM',
          paragraphs: [
            'LKM — внутренние неплатежные баллы, используемые только для функций приложения.',
            'LKM не являются законным платежным средством и не являются платежным инструментом.',
            'LKM нельзя продавать, выводить или обменивать на деньги.',
          ],
        },
      ],
    },
    hi: {
      title: 'उपयोग की शर्तें',
      updatedAt: 'अपडेट: 2026-02-20',
      sections: [
        {
          title: '1. स्वीकृति',
          paragraphs: [
            'VedaMatch का उपयोग करके आप इन शर्तों को स्वीकार करते हैं।',
          ],
        },
        {
          title: '2. ऑपरेटर स्थिति',
          paragraphs: [
            'VedaMatch वर्तमान में इस ऑपरेटर द्वारा संचालित है: {{operatorFullName}}.',
            'यदि ऑपरेशन बाद में कज़ाखस्तान की कानूनी इकाई में स्थानांतरित होता है, तो नई प्रभावी तिथि के साथ अपडेटेड Terms पहले प्रकाशित किए जाएंगे।',
            'कानूनी संपर्क: {{legalEmail}}.',
          ],
        },
        {
          title: '3. उपयोगकर्ता आचरण',
          paragraphs: [
            'अवैध, अपमानजनक, धोखाधड़ीपूर्ण या अधिकारों का उल्लंघन करने वाला कंटेंट प्रकाशित करना निषिद्ध है।',
          ],
        },
        {
          title: '4. मॉडरेशन',
          paragraphs: [
            'कानून, इन शर्तों या मॉडरेशन नियमों के उल्लंघन पर कंटेंट हटाया जा सकता है और अकाउंट सीमित किया जा सकता है।',
          ],
        },
        {
          title: '5. LKM नीति',
          paragraphs: [
            'LKM केवल ऐप फीचर्स के लिए उपयोग होने वाले आंतरिक गैर-भुगतान पॉइंट हैं।',
            'LKM कानूनी मुद्रा नहीं हैं और भुगतान साधन नहीं हैं।',
            'LKM को बेचा, निकाला या पैसे में बदला नहीं जा सकता।',
          ],
        },
      ],
    },
  },
  'account-deletion': {
    en: {
      title: 'Account Deletion Policy',
      updatedAt: 'Updated: 2026-02-20',
      sections: [
        {
          title: '1. How to request deletion',
          paragraphs: [
            'Open Settings -> Delete account and confirm action.',
          ],
        },
        {
          title: '2. What happens after request',
          paragraphs: [
            'Account access is revoked, active sessions are invalidated, and personal data is deleted or anonymized according to legal retention requirements.',
          ],
        },
        {
          title: '3. Contact',
          paragraphs: [
            'For deletion/privacy requests: {{privacyEmail}}.',
          ],
        },
      ],
    },
    ru: {
      title: 'Политика удаления аккаунта',
      updatedAt: 'Обновлено: 20.02.2026',
      sections: [
        {
          title: '1. Как подать запрос',
          paragraphs: [
            'Откройте Settings -> Delete account и подтвердите удаление.',
          ],
        },
        {
          title: '2. Что происходит после запроса',
          paragraphs: [
            'Доступ к аккаунту прекращается, активные сессии отзываются, персональные данные удаляются или анонимизируются согласно требованиям хранения данных.',
          ],
        },
        {
          title: '3. Контакт',
          paragraphs: [
            'По запросам удаления и приватности: {{privacyEmail}}.',
          ],
        },
      ],
    },
    hi: {
      title: 'अकाउंट डिलीशन नीति',
      updatedAt: 'अपडेट: 2026-02-20',
      sections: [
        {
          title: '1. डिलीशन अनुरोध कैसे करें',
          paragraphs: [
            'Settings -> Delete account खोलें और कार्रवाई की पुष्टि करें।',
          ],
        },
        {
          title: '2. अनुरोध के बाद क्या होगा',
          paragraphs: [
            'अकाउंट एक्सेस बंद किया जाएगा, सक्रिय सेशन रद्द होंगे, और व्यक्तिगत डेटा कानूनी प्रतिधारण आवश्यकताओं के अनुसार हटाया या anonymize किया जाएगा।',
          ],
        },
        {
          title: '3. संपर्क',
          paragraphs: [
            'डिलीशन/प्राइवेसी अनुरोध के लिए: {{privacyEmail}}.',
          ],
        },
      ],
    },
  },
};

export const getLocalLegalDocument = (
  type: LegalDocumentType,
  language: LegalLanguage,
  runtimeConfig: LegalRuntimeConfig = DEFAULT_LEGAL_RUNTIME_CONFIG,
): LocalLegalDocument => {
  const baseDocument = LOCAL_LEGAL_DOCUMENTS[type][language] || LOCAL_LEGAL_DOCUMENTS[type].en;

  return {
    ...baseDocument,
    sections: baseDocument.sections.map((section) => ({
      ...section,
      paragraphs: section.paragraphs.map((paragraph) => applyTemplate(paragraph, runtimeConfig)),
    })),
  };
};
