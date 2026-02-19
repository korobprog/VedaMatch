import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_PATH } from '../config/api.config';
import { getAuthHeaders } from './contactService';
import { authorizedFetch } from './authSessionService';

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

const parseJSON = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
};

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

  const headers = await getAuthHeaders();
  const remaining: PendingAction[] = [];

  for (const action of queue) {
    const endpoint = action.type === 'complete' ? '/path-tracker/complete' : '/path-tracker/reflect';
    try {
      const response = await authorizedFetch(`${API_PATH}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(action.payload),
      });
      if (!response.ok) {
        remaining.push(action);
      }
    } catch {
      remaining.push(action);
    }
  }

  await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(remaining));
};

export const pathTrackerService = {
  async getToday(): Promise<PathTrackerToday> {
    const headers = await getAuthHeaders();
    try {
      await flushPendingQueue();
      const response = await authorizedFetch(`${API_PATH}/path-tracker/today`, { headers });
      if (!response.ok) {
        throw new Error(`Failed to get today's tracker state: ${response.status}`);
      }
      const data = await parseJSON<PathTrackerToday>(response);
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
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${API_PATH}/path-tracker/checkin`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to save checkin');
    }
    return parseJSON<{ checkin: any }>(response);
  },

  async generateStep(): Promise<PathTrackerStep> {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${API_PATH}/path-tracker/generate-step`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to generate daily step');
    }
    const data = await parseJSON<{ step: PathTrackerStep }>(response);
    return data.step;
  },

  async completeStep(stepId: number) {
    const headers = await getAuthHeaders();
    try {
      const response = await authorizedFetch(`${API_PATH}/path-tracker/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ stepId }),
      });
      if (!response.ok) {
        throw new Error('Failed to complete step');
      }
      return parseJSON<{ step: PathTrackerStep }>(response);
    } catch (error) {
      await enqueuePending({ type: 'complete', payload: { stepId } });
      return { queued: true, error };
    }
  },

  async reflectStep(payload: { stepId: number; resultMood?: string; reflectionText?: string }) {
    const headers = await getAuthHeaders();
    try {
      const response = await authorizedFetch(`${API_PATH}/path-tracker/reflect`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to save reflection');
      }
      return parseJSON<{ reply: string }>(response);
    } catch (error) {
      await enqueuePending({ type: 'reflect', payload });
      return { reply: 'Сохранили локально, отправим при следующем подключении.', queued: true, error };
    }
  },

  async assistantHelp(payload: { stepId: number; requestType: PathTrackerRequestType; message?: string }) {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${API_PATH}/path-tracker/assistant`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to get assistant help');
    }
    return parseJSON<{ reply: string }>(response);
  },

  async getWeeklySummary(): Promise<PathTrackerWeeklySummary> {
    const headers = await getAuthHeaders();
    const response = await authorizedFetch(`${API_PATH}/path-tracker/weekly-summary`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to load weekly summary');
    }
    return parseJSON<PathTrackerWeeklySummary>(response);
  },

  async getUnlockStatus(role?: string): Promise<PathTrackerUnlockStatus> {
    const headers = await getAuthHeaders();
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    const response = await authorizedFetch(`${API_PATH}/path-tracker/unlock-status${query}`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to load unlock status');
    }
    return parseJSON<PathTrackerUnlockStatus>(response);
  },

  async markUnlockOpened(serviceId: string) {
    const headers = await getAuthHeaders();
    try {
      const response = await authorizedFetch(`${API_PATH}/path-tracker/unlock-opened`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ serviceId }),
      });
      if (!response.ok) {
        throw new Error('Failed to mark unlock opened');
      }
      return parseJSON<{ ok: boolean }>(response);
    } catch {
      return { ok: false };
    }
  },
};
