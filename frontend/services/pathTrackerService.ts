import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';
import i18n from '../i18n';

const TODAY_CACHE_KEY = 'path_tracker_today_cache';
const PENDING_QUEUE_KEY = 'path_tracker_pending_queue';

export type PathTrackerRequestType = 'explain' | 'simplify' | 'alternative' | 'deepen' | 'support';

export interface PathTrackerAction {
  id: string;
  label: string;
}

export interface PathTrackerStep {
  stepId: number;
  date: string;
  role: string;
  durationMin: number;
  format: string;
  title: string;
  instructions: string[];
  fallbackText: string;
  actions: PathTrackerAction[];
  tone: string;
  status: 'assigned' | 'completed' | 'skipped' | string;
  generationSource: 'llm' | 'template' | string;
  suggestedServiceId?: string;
  suggestedServiceTitle?: string;
}

export interface PathTrackerToday {
  date: string;
  role: string;
  hasCheckin: boolean;
  hasReflection: boolean;
  checkin?: {
    moodCode: string;
    energyCode: string;
    availableMinutes: number;
    freeText?: string;
    timezone?: string;
  };
  step?: PathTrackerStep;
  state: {
    streakCurrent: number;
    streakBest: number;
    loadLevel: string;
    trajectoryPhase?: string;
    experienceSegment?: string;
    unlockTotal?: number;
    unlockCount?: number;
    unlockNextService?: string;
    rolloutCohort?: string;
    phase3Variant?: string;
    lastFormat: string;
    experimentBucket?: string;
  };
  isStale?: boolean;
}

export interface PathTrackerUnlockStatus {
  totalServices: number;
  unlockedServices: number;
  nextServiceId?: string;
  nextServiceTitle?: string;
  unlockedList: string[];
}

export interface PathTrackerWeeklyDay {
  date: string;
  hasCheckin: boolean;
  stepStatus: string;
  completed: boolean;
  hasReflection: boolean;
}

export interface PathTrackerWeeklySummary {
  fromDate: string;
  toDate: string;
  completedDays: number;
  assignedDays: number;
  checkinDays: number;
  completionRate: number;
  streakCurrent: number;
  streakBest: number;
  gentleSummary: string;
  experimentBucket: string;
  days: PathTrackerWeeklyDay[];
}

type PendingAction =
  | { type: 'complete'; payload: { stepId: number } }
  | { type: 'reflect'; payload: { stepId: number; resultMood?: string; reflectionText?: string } };

const enqueuePending = async (action: PendingAction) => {
  const current = await loadPendingQueue();
  current.push(action);
  await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(current));
};

const loadPendingQueue = async (): Promise<PendingAction[]> => {
  const raw = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
  if (!raw || raw === 'undefined' || raw === 'null') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const flushPendingQueue = async () => {
  const queue = await loadPendingQueue();
  if (queue.length === 0) return;

  const remaining: PendingAction[] = [];

  for (const action of queue) {
    const endpoint = action.type === 'complete' ? '/path-tracker/complete' : '/path-tracker/reflect';
    try {
      await apiClient.post(endpoint, action.payload);
    } catch {
      remaining.push(action);
    }
  }

  await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(remaining));
};

export const pathTrackerService = {
  async getToday(): Promise<PathTrackerToday> {
    try {
      await flushPendingQueue();
      const { data } = await apiClient.get<PathTrackerToday>('/path-tracker/today');
      await AsyncStorage.setItem(TODAY_CACHE_KEY, JSON.stringify(data));
      return data;
    } catch (error) {
      const cached = await AsyncStorage.getItem(TODAY_CACHE_KEY);
      if (cached && cached !== 'undefined' && cached !== 'null') {
        const parsed = JSON.parse(cached) as PathTrackerToday;
        parsed.isStale = true;
        return parsed;
      }
      throw error;
    }
  },

  async saveCheckin(payload: {
    moodCode: string;
    energyCode: string;
    availableMinutes: 3 | 5 | 10;
    freeText?: string;
    timezone?: string;
  }) {
    const { data } = await apiClient.post<{ checkin: any }>('/path-tracker/checkin', payload);
    return data;
  },

  async generateStep(): Promise<PathTrackerStep> {
    const { data } = await apiClient.post<{ step: PathTrackerStep }>('/path-tracker/generate-step', {});
    return data.step;
  },

  async completeStep(stepId: number) {
    try {
      const { data } = await apiClient.post<{ step: PathTrackerStep }>('/path-tracker/complete', { stepId });
      return data;
    } catch (error) {
      await enqueuePending({ type: 'complete', payload: { stepId } });
      return { queued: true, error };
    }
  },

  async reflectStep(payload: { stepId: number; resultMood?: string; reflectionText?: string }) {
    try {
      const { data } = await apiClient.post<{ reply: string }>('/path-tracker/reflect', payload);
      return data;
    } catch (error) {
      await enqueuePending({ type: 'reflect', payload });
      return {
        reply: i18n.language?.startsWith('ru')
          ? 'Сохранили локально, отправим при следующем подключении.'
          : i18n.language?.startsWith('hi')
            ? 'स्थानीय रूप से सहेजा गया, अगली कनेक्शन पर भेजेंगे।'
            : 'Saved locally, will send on the next connection.',
        queued: true,
        error,
      };
    }
  },

  async assistantHelp(payload: { stepId: number; requestType: PathTrackerRequestType; message?: string }) {
    const { data } = await apiClient.post<{ reply: string }>('/path-tracker/assistant', payload);
    return data;
  },

  async getWeeklySummary(): Promise<PathTrackerWeeklySummary> {
    const { data } = await apiClient.get<PathTrackerWeeklySummary>('/path-tracker/weekly-summary');
    return data;
  },

  async getUnlockStatus(role?: string): Promise<PathTrackerUnlockStatus> {
    const { data } = await apiClient.get<PathTrackerUnlockStatus>('/path-tracker/unlock-status', {
      params: role ? { role } : undefined,
    });
    return data;
  },

  async markUnlockOpened(serviceId: string) {
    try {
      const { data } = await apiClient.post<{ ok: boolean }>('/path-tracker/unlock-opened', { serviceId });
      return data;
    } catch {
      return { ok: false };
    }
  },
};
