export type LilaLocale = 'ru' | 'en' | 'hi';

export type LilaQuestionType = 'single_choice' | 'image_choice' | 'ordering';
export type LilaQuestionCategory = 'shastra_vidya' | 'itihasa_gyaan' | 'bhakti_ras' | 'sanskrit_challenge';
export type LilaDifficulty = 'tamas' | 'rajas' | 'sattva';
export type LilaGameMode = 'duel' | 'sabha' | 'survival';
export type LilaPublishState = 'draft' | 'review' | 'active' | 'archived';

export interface LilaQuestion {
  id: string | number;
  slug: string;
  type: LilaQuestionType;
  category: LilaQuestionCategory;
  difficulty: LilaDifficulty;
  modes: LilaGameMode[];
  status: LilaPublishState;
  assetUrl: string;
  answerKey: string;
  prompt: Record<LilaLocale, string>;
  options: Record<LilaLocale, string[]>;
  explanation: Record<LilaLocale, string>;
  updatedAt: string;
}

export interface LilaStoreItem {
  id: string;
  name: string;
  description: string;
  bonusPrice: number;
  realPrice: number;
  isActive: boolean;
}

export interface LilaPassConfig {
  seasonName: string;
  durationDays: number;
  premiumPriceReal: number;
  freeTrackTitle: string;
  premiumTrackTitle: string;
  rewardHighlights: string[];
}

export interface LilaSubscriptionConfig {
  title: string;
  monthlyPriceReal: number;
  bonusDaily: number;
  adFree: boolean;
  extraMatchmakingPriority: boolean;
}

export interface LilaGiftBundle {
  id: string;
  title: string;
  realPrice: number;
  bonusGift: number;
  note: string;
}

export interface LilaDharmaFundConfig {
  percentBps: number;
  enabled: boolean;
  internalLedgerLabel: string;
  note: string;
}

export interface LilaMetric {
  label: string;
  value: string;
  trend: string;
}

export interface LilaModerationItem {
  id: string;
  questionSlug: string;
  title: string;
  author: string;
  status: 'pending' | 'reviewed' | 'rejected';
  createdAt: string;
}

export const LILA_LOCALES: LilaLocale[] = ['ru', 'en', 'hi'];

export const LILA_QUESTION_TYPES: Array<{ value: LilaQuestionType; label: string }> = [
  { value: 'single_choice', label: 'Single choice' },
  { value: 'image_choice', label: 'Image choice' },
  { value: 'ordering', label: 'Ordering' },
];

export const LILA_CATEGORIES: Array<{ value: LilaQuestionCategory; label: string; hint: string }> = [
  { value: 'shastra_vidya', label: 'Shastra-Vidya', hint: 'Scripture quotes, deities, book names' },
  { value: 'itihasa_gyaan', label: 'Itihasa-Gyan', hint: 'Epics, lineages, battle facts' },
  { value: 'bhakti_ras', label: 'Bhakti-Ras', hint: 'Saints, festivals, sacred culture' },
  { value: 'sanskrit_challenge', label: 'Sanskrit-Challenge', hint: 'Translations and word meanings' },
];

export const LILA_DIFFICULTIES: Array<{ value: LilaDifficulty; label: string; tone: string }> = [
  { value: 'tamas', label: 'Tamas', tone: 'Beginner' },
  { value: 'rajas', label: 'Rajas', tone: 'Intermediate' },
  { value: 'sattva', label: 'Sattva', tone: 'Advanced' },
];

export const LILA_MODES: Array<{ value: LilaGameMode; label: string }> = [
  { value: 'duel', label: 'Dharma Duel' },
  { value: 'sabha', label: 'Sabha' },
  { value: 'survival', label: 'Survival in Samsara' },
];

export const LILA_PUBLISH_STATES: Array<{ value: LilaPublishState; label: string; tone: string }> = [
  { value: 'draft', label: 'Draft', tone: 'Slate' },
  { value: 'review', label: 'Review', tone: 'Amber' },
  { value: 'active', label: 'Published', tone: 'Emerald' },
  { value: 'archived', label: 'Archived', tone: 'Red' },
];

export const initialLilaQuestions: LilaQuestion[] = [
  {
    id: 'lila-q-001',
    slug: 'krishna-time-quote',
    type: 'single_choice',
    category: 'shastra_vidya',
    difficulty: 'rajas',
    modes: ['duel', 'survival'],
    status: 'review',
    assetUrl: '',
    answerKey: 'Krsna',
    prompt: {
      ru: 'Кто произнес слова "Я есть время, великий разрушитель миров"?',
      en: 'Who spoke the words, "I am time, the great destroyer of worlds"?',
      hi: 'यह वाक्य किसने कहा: "मैं काल हूं, लोकों का महान संहारक"?',
    },
    options: {
      ru: ['Кришна', 'Арджуна', 'Вьяса', 'Нарада'],
      en: ['Krishna', 'Arjuna', 'Vyasa', 'Narada'],
      hi: ['कृष्ण', 'अर्जुन', 'व्यास', 'नारद'],
    },
    explanation: {
      ru: 'Это известная форма из "Бхагавад-гиты".',
      en: 'This is the well-known form from the Bhagavad Gita.',
      hi: 'यह भगवद्गीता का प्रसिद्ध वाक्य है।',
    },
    updatedAt: '2026-03-29T12:00:00Z',
  },
  {
    id: 'lila-q-002',
    slug: 'arjuna-horse',
    type: 'image_choice',
    category: 'itihasa_gyaan',
    difficulty: 'tamas',
    modes: ['duel', 'sabha'],
    status: 'active',
    assetUrl: 'https://placehold.co/640x360/png?text=Lila+Asset',
    answerKey: 'white-horse',
    prompt: {
      ru: 'Как звали коня Арджуны?',
      en: 'What was the name of Arjuna’s horse?',
      hi: 'अर्जुन के अश्व का नाम क्या था?',
    },
    options: {
      ru: ['Швета', 'Ариштха', 'Уджджайи', 'Капила'],
      en: ['Shveta', 'Arishta', 'Ujjayi', 'Kapila'],
      hi: ['श्वेत', 'अरिष्ट', 'उज्जयी', 'कपिल'],
    },
    explanation: {
      ru: 'В школьной версии эпоса часто используется образ белого коня.',
      en: 'The epics often refer to Arjuna with a white horse motif.',
      hi: 'महाकाव्य में अर्जुन के साथ श्वेत अश्व का वर्णन मिलता है।',
    },
    updatedAt: '2026-03-28T08:45:00Z',
  },
];

export const defaultLilaStoreItems: LilaStoreItem[] = [
  { id: 'store-1', name: 'Lotus Frame', description: 'Golden lotus profile frame', bonusPrice: 120, realPrice: 0, isActive: true },
  { id: 'store-2', name: 'Maya Shuffle', description: 'One-use duel confusion effect', bonusPrice: 40, realPrice: 25, isActive: true },
  { id: 'store-3', name: 'Temple Garland', description: 'Victory cosmetic burst', bonusPrice: 60, realPrice: 30, isActive: true },
];

export const defaultLilaPass: LilaPassConfig = {
  seasonName: 'Sadhana Pass - Vrindavan Cycle',
  durationDays: 30,
  premiumPriceReal: 299,
  freeTrackTitle: 'Free track',
  premiumTrackTitle: 'Premium track',
  rewardHighlights: ['Daily bonus Lakshmi', 'Exclusive frames', 'Festival emotes'],
};

export const defaultLilaSubscription: LilaSubscriptionConfig = {
  title: 'Bhakti Premium',
  monthlyPriceReal: 499,
  bonusDaily: 20,
  adFree: true,
  extraMatchmakingPriority: true,
};

export const defaultLilaGifts: LilaGiftBundle[] = [
  { id: 'gift-1', title: 'Sacred postcard', realPrice: 49, bonusGift: 10, note: 'Personal greeting with mantra art' },
  { id: 'gift-2', title: 'Guru blessing', realPrice: 149, bonusGift: 30, note: 'Mentor shareable reward bundle' },
  { id: 'gift-3', title: 'Festival offering', realPrice: 299, bonusGift: 75, note: 'Seasonal celebratory bundle' },
];

export const defaultLilaDharmaFund: LilaDharmaFundConfig = {
  percentBps: 500,
  enabled: true,
  internalLedgerLabel: 'Dharma Fund reserve',
  note: 'Track internal allocation per purchase; payout automation stays in backend phase 2.',
};

export const lilaMetrics: LilaMetric[] = [
  { label: 'Queue depth', value: '128', trend: '+12% vs yesterday' },
  { label: 'Match start latency', value: '2.4s', trend: '-0.3s from baseline' },
  { label: 'Reconnect success', value: '97.8%', trend: '+1.1%' },
  { label: 'Purchase failures', value: '0.7%', trend: '-0.2%' },
];

export const lilaModerationQueue: LilaModerationItem[] = [
  { id: 'mod-1', questionSlug: 'krishna-time-quote', title: 'Bhagavad Gita quote review', author: 'Priya', status: 'pending', createdAt: '2026-03-30T08:15:00Z' },
  { id: 'mod-2', questionSlug: 'arjuna-horse', title: 'Epic image prompt', author: 'Anand', status: 'reviewed', createdAt: '2026-03-29T19:32:00Z' },
  { id: 'mod-3', questionSlug: 'tulasi-meaning', title: 'Sanskrit translation', author: 'Maya', status: 'rejected', createdAt: '2026-03-29T13:05:00Z' },
];
