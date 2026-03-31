import type {
  LilaMetric,
  LilaModerationItem,
  LilaPublishState,
  LilaQuestion,
  LilaGameMode,
} from '@/components/games/lila/lilaData';

export interface LilaAdminQuestionRecord {
  ID?: number;
  UpdatedAt?: string;
  slug?: string;
  type?: string;
  category?: string;
  difficulty?: string;
  status?: string;
  allowedModesJson?: string;
  promptRu?: string;
  promptEn?: string;
  promptHi?: string;
  optionsRuJson?: string;
  optionsEnJson?: string;
  optionsHiJson?: string;
  explanationRu?: string;
  explanationEn?: string;
  explanationHi?: string;
  assetUrl?: string;
  assetKind?: string;
  correctOption?: string;
  correctOrderJson?: string;
  sourceRef?: string;
  metaJson?: string;
}

export interface LilaAdminStoreItemRecord {
  ID?: number;
  code: string;
  type: string;
  nameRu: string;
  nameEn: string;
  nameHi: string;
  descriptionRu?: string;
  descriptionEn?: string;
  descriptionHi?: string;
  priceBonus?: number;
  priceReal?: number;
  canUseBonus?: boolean;
  canUseReal?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  status?: string;
  metaJson?: string;
}

export interface LilaAdminPassSeasonRecord {
  ID?: number;
  code: string;
  nameRu: string;
  nameEn: string;
  nameHi: string;
  descriptionRu?: string;
  descriptionEn?: string;
  descriptionHi?: string;
  status?: string;
  startsAt: string;
  endsAt: string;
  premiumPriceReal?: number;
  dailyBonusJson?: string;
  premiumRewardJson?: string;
  metaJson?: string;
}

export interface LilaAdminLiveOpsResponse {
  storeItems: LilaAdminStoreItemRecord[];
  passSeasons: LilaAdminPassSeasonRecord[];
  dharmaPercent: number;
}

export interface LilaAdminMetricsSnapshot {
  queueDepth?: Record<string, number>;
  activeMatches?: number;
  finishedMatchesToday?: number;
  openRounds?: number;
  settlementFailures?: number;
  purchaseFailures?: number;
  reconnects?: number;
  bonusLedgerEntries?: number;
  dharmaFundReservations?: number;
  at?: string;
}

const parseJSON = <T>(raw: string | undefined, fallback: T): T => {
  if (!raw || !raw.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const mapApiModeToUi = (mode: string): LilaGameMode => {
  switch (mode) {
    case 'dharma_duel':
      return 'duel';
    case 'sabha':
      return 'sabha';
    case 'survival_in_samsara':
      return 'survival';
    default:
      return 'duel';
  }
};

export const mapUiModeToApi = (mode: LilaGameMode): string => {
  switch (mode) {
    case 'duel':
      return 'dharma_duel';
    case 'sabha':
      return 'sabha';
    case 'survival':
      return 'survival_in_samsara';
    default:
      return 'dharma_duel';
  }
};

export const mapApiStatusToUi = (status?: string): LilaPublishState => {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'review':
      return 'review';
    case 'active':
      return 'active';
    case 'archived':
      return 'archived';
    default:
      return 'draft';
  }
};

export const mapUiStatusToApi = (status: LilaPublishState): string => status;

export const createLilaQuestionDraft = (): LilaQuestion => ({
  id: `draft-${Date.now()}`,
  slug: 'new-question',
  type: 'single_choice',
  category: 'shastra_vidya',
  difficulty: 'tamas',
  modes: ['duel'],
  status: 'draft',
  assetUrl: '',
  answerKey: '',
  prompt: { ru: '', en: '', hi: '' },
  options: { ru: ['', '', '', ''], en: ['', '', '', ''], hi: ['', '', '', ''] },
  explanation: { ru: '', en: '', hi: '' },
  updatedAt: new Date().toISOString(),
});

export const mapApiQuestionToDraft = (record: LilaAdminQuestionRecord): LilaQuestion => {
  const correctOrder = parseJSON<string[]>(record.correctOrderJson, []);
  return {
    id: record.ID || `draft-${record.slug || Date.now()}`,
    slug: record.slug || '',
    type: (record.type as LilaQuestion['type']) || 'single_choice',
    category: (record.category as LilaQuestion['category']) || 'shastra_vidya',
    difficulty: (record.difficulty as LilaQuestion['difficulty']) || 'tamas',
    modes: parseJSON<string[]>(record.allowedModesJson, []).map(mapApiModeToUi),
    status: mapApiStatusToUi(record.status),
    assetUrl: record.assetUrl || '',
    answerKey: record.type === 'ordering' ? correctOrder.join('\n') : record.correctOption || '',
    prompt: {
      ru: record.promptRu || '',
      en: record.promptEn || '',
      hi: record.promptHi || '',
    },
    options: {
      ru: parseJSON<string[]>(record.optionsRuJson, []),
      en: parseJSON<string[]>(record.optionsEnJson, []),
      hi: parseJSON<string[]>(record.optionsHiJson, []),
    },
    explanation: {
      ru: record.explanationRu || '',
      en: record.explanationEn || '',
      hi: record.explanationHi || '',
    },
    updatedAt: record.UpdatedAt || new Date().toISOString(),
  };
};

export const buildQuestionPayload = (draft: LilaQuestion) => {
  const normalizedModes = draft.modes.map(mapUiModeToApi);
  const correctOrder = draft.answerKey
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    slug: draft.slug.trim(),
    type: draft.type,
    category: draft.category,
    difficulty: draft.difficulty,
    status: mapUiStatusToApi(draft.status),
    allowedModes: normalizedModes,
    prompt: draft.prompt,
    options: {
      ru: draft.options.ru.map((item) => item.trim()).filter(Boolean),
      en: draft.options.en.map((item) => item.trim()).filter(Boolean),
      hi: draft.options.hi.map((item) => item.trim()).filter(Boolean),
    },
    explanation: draft.explanation,
    assetUrl: draft.assetUrl.trim(),
    assetKind: draft.assetUrl.trim() ? (draft.type === 'image_choice' ? 'image' : 'reference') : 'none',
    correctOption: draft.type === 'ordering' ? '' : draft.answerKey.trim(),
    correctOrder: draft.type === 'ordering' ? correctOrder : [],
    sourceRef: '',
    meta: {},
  };
};

export const formatMetrics = (snapshot: LilaAdminMetricsSnapshot | null): LilaMetric[] => {
  if (!snapshot) {
    return [];
  }

  const queueDepth = Object.values(snapshot.queueDepth || {}).reduce((sum, value) => sum + Number(value || 0), 0);

  return [
    {
      label: 'Queue depth',
      value: String(queueDepth),
      trend: `Duel ${snapshot.queueDepth?.dharma_duel || 0} · Sabha ${snapshot.queueDepth?.sabha || 0} · Survival ${snapshot.queueDepth?.survival_in_samsara || 0}`,
    },
    {
      label: 'Active matches',
      value: String(snapshot.activeMatches || 0),
      trend: `${snapshot.finishedMatchesToday || 0} finished today`,
    },
    {
      label: 'Reconnects',
      value: String(snapshot.reconnects || 0),
      trend: `${snapshot.openRounds || 0} open rounds`,
    },
    {
      label: 'Purchase failures',
      value: String(snapshot.purchaseFailures || 0),
      trend: `${snapshot.dharmaFundReservations || 0} dharma reservations`,
    },
  ];
};

export const formatModerationItems = (questions: LilaQuestion[]): LilaModerationItem[] =>
  questions
    .filter((question) => question.status !== 'active')
    .slice(0, 12)
    .map((question) => ({
      id: String(question.id),
      questionSlug: question.slug,
      title: question.prompt.en || question.prompt.ru || question.slug,
      author: `${question.category} · ${question.difficulty}`,
      status:
        question.status === 'archived'
          ? 'rejected'
          : question.status === 'active'
            ? 'reviewed'
            : 'pending',
      createdAt: question.updatedAt,
    }));
