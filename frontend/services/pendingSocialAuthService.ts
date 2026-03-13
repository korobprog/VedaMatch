import AsyncStorage from '@react-native-async-storage/async-storage';

export type PendingSocialAuthProvider = 'vk' | 'telegram';
export type PendingSocialAuthFlow = 'login' | 'link';

type PendingSocialAuthEntry = {
  flow: PendingSocialAuthFlow;
  provider: PendingSocialAuthProvider;
  state: string;
  updatedAt: number;
};

type PendingSocialAuthStore = Record<string, PendingSocialAuthEntry>;

const STORAGE_KEY = '@vedamatch/pending-social-auth';
const MAX_ENTRY_AGE_MS = 30 * 60 * 1000;

const buildEntryKey = (
  provider: PendingSocialAuthProvider,
  flow: PendingSocialAuthFlow,
): string => `${flow}:${provider}`;

const readStore = async (): Promise<PendingSocialAuthStore> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed as PendingSocialAuthStore;
  } catch {
    return {};
  }
};

const writeStore = async (store: PendingSocialAuthStore): Promise<void> => {
  if (Object.keys(store).length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const rememberPendingSocialAuthState = async (
  provider: PendingSocialAuthProvider,
  flow: PendingSocialAuthFlow,
  state: string,
): Promise<void> => {
  const normalizedState = state.trim();
  if (!normalizedState) return;

  const store = await readStore();
  store[buildEntryKey(provider, flow)] = {
    provider,
    flow,
    state: normalizedState,
    updatedAt: Date.now(),
  };
  await writeStore(store);
};

export const getPendingSocialAuthState = async (
  provider: PendingSocialAuthProvider,
  flow: PendingSocialAuthFlow,
): Promise<string> => {
  const store = await readStore();
  const entryKey = buildEntryKey(provider, flow);
  const entry = store[entryKey];

  if (!entry) {
    return '';
  }

  const isInvalid = (
    entry.provider !== provider
    || entry.flow !== flow
    || typeof entry.state !== 'string'
    || !entry.state.trim()
    || typeof entry.updatedAt !== 'number'
    || Date.now() - entry.updatedAt > MAX_ENTRY_AGE_MS
  );

  if (isInvalid) {
    delete store[entryKey];
    await writeStore(store);
    return '';
  }

  return entry.state.trim();
};

export const clearPendingSocialAuthState = async (
  provider: PendingSocialAuthProvider,
  flow: PendingSocialAuthFlow,
): Promise<void> => {
  const store = await readStore();
  const entryKey = buildEntryKey(provider, flow);

  if (!(entryKey in store)) {
    return;
  }

  delete store[entryKey];
  await writeStore(store);
};
