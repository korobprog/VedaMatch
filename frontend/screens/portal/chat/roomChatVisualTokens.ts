import { DimensionValue, Platform, TextStyle } from 'react-native';

export interface RoomChatVisualTokens {
  accent: string;
  accentMuted: string;
  accentTextOnPrimary: string;
  canvas: string;
  headerShell: string;
  headerShellOpaque: string;
  headerBorder: string;
  headerTitle: string;
  headerSubtitle: string;
  headerIcon: string;
  headerActionButton: string;
  headerActionButtonOpaque: string;
  readerCard: string;
  readerCardOpaque: string;
  readerCardBorder: string;
  readerNavCard: string;
  readerNavLabel: string;
  readerDivider: string;
  readerPrimaryText: string;
  readerSecondaryText: string;
  messageMine: string;
  messageMineBorder: string;
  messageOther: string;
  messageOtherBorder: string;
  messageText: string;
  messageMeta: string;
  avatarBg: string;
  emptyCard: string;
  emptyCardBorder: string;
  inputBar: string;
  inputBarOpaque: string;
  inputBarBorder: string;
  inputField: string;
  inputFieldBorder: string;
  inputText: string;
  inputPlaceholder: string;
  shadow: string;
  blurType: 'light' | 'dark';
  blurAmountHeader: number;
  blurAmountCard: number;
  blurAmountInput: number;
  gradientTop: [string, string];
  fontFamily: string;
  fontWeightSemibold: TextStyle['fontWeight'];
  fontWeightBold: TextStyle['fontWeight'];
}

export interface RoomChatDensity {
  radiusXs: number;
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
  radiusXl: number;
  radiusPill: number;
  spacingXs: number;
  spacingSm: number;
  spacingMd: number;
  spacingLg: number;
  spacingXl: number;
  messageMaxWidth: DimensionValue;
  headerBackButton: number;
  headerActionButton: number;
  inputBarMinHeight: number;
  inputSendButton: number;
}

const FIXED_ACCENT = '#FF7A1A';

const SYSTEM_FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
}) as string;

export const ROOM_CHAT_DENSITY: RoomChatDensity = {
  radiusXs: 10,
  radiusSm: 14,
  radiusMd: 18,
  radiusLg: 20,
  radiusXl: 24,
  radiusPill: 999,
  spacingXs: 4,
  spacingSm: 8,
  spacingMd: 12,
  spacingLg: 16,
  spacingXl: 24,
  messageMaxWidth: '82%',
  headerBackButton: 42,
  headerActionButton: 34,
  inputBarMinHeight: 60,
  inputSendButton: 46,
};

const LIGHT_TOKENS: RoomChatVisualTokens = {
  accent: FIXED_ACCENT,
  accentMuted: '#B8C2D1',
  accentTextOnPrimary: '#FFFFFF',
  canvas: '#F2F4F8',
  headerShell: 'rgba(247,249,252,0.95)',
  headerShellOpaque: '#F4F7FB',
  headerBorder: '#D8E0EA',
  headerTitle: '#0F172A',
  headerSubtitle: '#475569',
  headerIcon: '#0F172A',
  headerActionButton: '#FFFFFF',
  headerActionButtonOpaque: '#EEF3F9',
  readerCard: 'rgba(255,255,255,0.98)',
  readerCardOpaque: '#FFFFFF',
  readerCardBorder: '#D9E1EB',
  readerNavCard: '#F7FAFD',
  readerNavLabel: '#E7EDF5',
  readerDivider: '#D5DEEA',
  readerPrimaryText: '#111827',
  readerSecondaryText: '#475569',
  messageMine: '#FFF2E9',
  messageMineBorder: '#FFC18E',
  messageOther: '#FFFFFF',
  messageOtherBorder: '#D8E1ED',
  messageText: '#111827',
  messageMeta: 'rgba(15,23,42,0.56)',
  avatarBg: '#EDF2F9',
  emptyCard: '#FFFFFF',
  emptyCardBorder: '#D8E1ED',
  inputBar: '#FFFFFF',
  inputBarOpaque: '#FFFFFF',
  inputBarBorder: '#D7DFEA',
  inputField: '#F6F8FC',
  inputFieldBorder: '#D5DEEA',
  inputText: '#0F172A',
  inputPlaceholder: '#6B7A90',
  shadow: '#0B1220',
  blurType: 'light',
  blurAmountHeader: 8,
  blurAmountCard: 8,
  blurAmountInput: 8,
  gradientTop: ['rgba(255,255,255,0.48)', 'rgba(255,255,255,0.0)'],
  fontFamily: SYSTEM_FONT,
  fontWeightSemibold: '600',
  fontWeightBold: '700',
};

const DARK_TOKENS: RoomChatVisualTokens = {
  accent: FIXED_ACCENT,
  accentMuted: '#4B5563',
  accentTextOnPrimary: '#FFFFFF',
  canvas: '#0B1120',
  headerShell: 'rgba(18,28,47,0.95)',
  headerShellOpaque: '#121C2F',
  headerBorder: '#2B3A55',
  headerTitle: '#EAF0FF',
  headerSubtitle: '#B9C6DF',
  headerIcon: '#EAF0FF',
  headerActionButton: '#1A2740',
  headerActionButtonOpaque: '#1F2F4B',
  readerCard: 'rgba(15,23,42,0.95)',
  readerCardOpaque: '#0F172A',
  readerCardBorder: '#2A3A57',
  readerNavCard: '#162338',
  readerNavLabel: '#1E2E49',
  readerDivider: '#31435F',
  readerPrimaryText: '#EAF0FF',
  readerSecondaryText: '#C9D5EC',
  messageMine: 'rgba(255,122,26,0.2)',
  messageMineBorder: 'rgba(255,122,26,0.5)',
  messageOther: '#17263B',
  messageOtherBorder: '#2E3F5C',
  messageText: '#F2F6FF',
  messageMeta: 'rgba(216,228,249,0.62)',
  avatarBg: '#1F2D46',
  emptyCard: '#0F172A',
  emptyCardBorder: '#2A3A57',
  inputBar: '#111C2F',
  inputBarOpaque: '#111C2F',
  inputBarBorder: '#2A3A57',
  inputField: '#17263B',
  inputFieldBorder: '#2E3F5C',
  inputText: '#F2F6FF',
  inputPlaceholder: '#A9B6D1',
  shadow: '#020617',
  blurType: 'dark',
  blurAmountHeader: 10,
  blurAmountCard: 10,
  blurAmountInput: 10,
  gradientTop: ['rgba(148,163,184,0.18)', 'rgba(15,23,42,0)'],
  fontFamily: SYSTEM_FONT,
  fontWeightSemibold: '600',
  fontWeightBold: '700',
};

export function getRoomChatVisualTokens(isDarkMode: boolean): RoomChatVisualTokens {
  return isDarkMode ? DARK_TOKENS : LIGHT_TOKENS;
}

export const ROOM_CHAT_ACCENT = FIXED_ACCENT;
