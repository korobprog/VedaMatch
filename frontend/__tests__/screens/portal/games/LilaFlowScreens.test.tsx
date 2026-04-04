import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import LilaQueueScreen from '../../../../screens/portal/games/LilaQueueScreen';
import LilaLobbyScreen from '../../../../screens/portal/games/LilaLobbyScreen';
import LilaResultsScreen from '../../../../screens/portal/games/LilaResultsScreen';
import type { LilaBootstrap, LilaMatchSnapshot } from '../../../../types/lila';

jest.mock('../../../../components/theme/ScreenScaffold', () => ({
  ScreenScaffold: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
});

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const mockReact = require('react');
    mockReact.useEffect(() => callback(), [callback]);
  },
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => false),
  }),
}));

jest.mock('../../../../context/UserContext', () => ({
  useUser: () => ({
    user: { ID: 7 },
  }),
}));

const mockUseLilaMatchSession = jest.fn();
jest.mock('../../../../hooks/useLilaMatchSession', () => ({
  useLilaMatchSession: (...args: unknown[]) => mockUseLilaMatchSession(...args),
}));

const mockGetLilaBootstrap = jest.fn();
const mockGetCachedLilaBootstrap = jest.fn();
const mockGetLilaMatch = jest.fn();
const mockPrimeLilaBootstrap = jest.fn();
jest.mock('../../../../services/lilaGameService', () => {
  const actual = jest.requireActual('../../../../services/lilaGameService');
  return {
    ...actual,
    getLilaBootstrap: (...args: unknown[]) => mockGetLilaBootstrap(...args),
    getCachedLilaBootstrap: (...args: unknown[]) => mockGetCachedLilaBootstrap(...args),
    getLilaMatch: (...args: unknown[]) => mockGetLilaMatch(...args),
    primeLilaBootstrap: (...args: unknown[]) => mockPrimeLilaBootstrap(...args),
  };
});

const translations: Record<string, string> = {
  'portal.lila.badge': 'Lila',
  'portal.lila.queue.title': 'Match queue',
  'portal.lila.queue.subtitle': 'Queue subtitle',
  'portal.lila.queue.estWait': 'Wait',
  'portal.lila.queue.rounds': 'Rounds',
  'portal.lila.queue.players': 'Players',
  'portal.lila.queue.rotationTitle': 'Queue contract',
  'portal.lila.queue.rotationSubtitle': 'Rotation subtitle',
  'portal.lila.queue.estWaitLine': 'Average queue time: {{amount}} sec.',
  'portal.lila.queue.teamLine': 'Team size for this mode: {{amount}}.',
  'portal.lila.queue.rewardLine': 'Base win reward: +{{amount}} bonus Lakshmani.',
  'portal.lila.queue.phaseSearching': 'Searching',
  'portal.lila.queue.phaseLobby': 'Lobby prep',
  'portal.lila.queue.phaseBattle': 'Battle',
  'portal.lila.queue.phaseRewards': 'Rewards',
  'portal.lila.queue.progressTitle': 'Why queue now',
  'portal.lila.queue.progressSubtitle': 'Queue connected progression',
  'portal.lila.queue.progressEmpty': 'No active goals',
  'portal.lila.queue.modeFocus.sabhaTitle': 'What sabha promises',
  'portal.lila.queue.modeFocus.sabhaBody': 'Sabha works better when the player already expects team lobby, consultation, and shared sampradaya contribution.',
  'portal.lila.queue.modeFocus.duelTitle': 'What duel promises',
  'portal.lila.queue.modeFocus.duelBody': 'Duel starts fast.',
  'portal.lila.queue.modeFocus.survivalTitle': 'What survival promises',
  'portal.lila.queue.modeFocus.survivalBody': 'Survival is wave-based endurance.',
  'portal.lila.queue.loadoutTitle': 'Siddhi loadout',
  'portal.lila.queue.loadoutSubtitle': 'One special power can be activated once per match.',
  'portal.lila.queue.serverAuthority': 'Server authority',
  'portal.lila.queue.statuses.waiting': 'waiting for opponents',
  'portal.lila.home.streakLabel': 'Streak',
  'portal.lila.home.onboardingTitle': 'Onboarding',
  'portal.lila.queue.firstMatchHint': 'First match hint',
  'portal.lila.actions.join': 'Join',
  'portal.lila.actions.pass': 'Pass',
  'portal.lila.actions.store': 'Store',
  'portal.lila.modes.sabha.title': 'Sabha',
  'portal.lila.modes.sabha.detail': 'Sabha detail',
  'portal.lila.modes.duel.title': 'Duel',
  'portal.lila.modes.duel.detail': 'Duel detail',
  'portal.lila.modes.survival.title': 'Survival',
  'portal.lila.modes.survival.detail': 'Survival detail',
  'portal.lila.locations.ayodhya': 'Ayodhya',
  'portal.lila.locations.kurukshetra': 'Kurukshetra',
  'portal.lila.locations.dwarka': 'Dwarka',
  'portal.lila.phases.queue': 'Queue',
  'portal.lila.phases.lobby': 'Lobby',
  'portal.lila.phases.question_open': 'Question',
  'portal.lila.phases.match_finished': 'Finished',
  'portal.lila.siddhis.drishti': 'Drishti',
  'portal.lila.siddhis.mantra_shield': 'Mantra Shield',
  'portal.lila.siddhis.vimana': 'Vimana',
  'portal.lila.siddhis.maya': 'Maya',
  'portal.lila.lobby.title': 'Arena lobby',
  'portal.lila.lobby.subtitle': 'Lobby subtitle',
  'portal.lila.lobby.readyCheck': 'Ready check',
  'portal.lila.lobby.connectionHint': 'Realtime connection hint',
  'portal.lila.lobby.modePrep.survivalTitle': 'Survival prep',
  'portal.lila.lobby.modePrep.survivalBody': 'Before survival starts, the player should clearly see how many participants are still alive and how many are ready for the first wave.',
  'portal.lila.lobby.modePrep.sabhaTitle': 'Sabha prep',
  'portal.lila.lobby.modePrep.sabhaBody': 'Sabha lobby explains coordination.',
  'portal.lila.lobby.modePrep.duelTitle': 'Duel startup',
  'portal.lila.lobby.modePrep.duelBody': 'Duel starts quickly.',
  'portal.lila.lobby.teamPanels': 'Team panels',
  'portal.lila.lobby.consultWindow': 'Consult window',
  'portal.lila.lobby.consultHint': 'Consult hint',
  'portal.lila.lobby.instantHint': 'Instant hint',
  'portal.lila.lobby.sampradaya_sun': 'Sun',
  'portal.lila.lobby.sampradaya_moon': 'Moon',
  'portal.lila.lobby.consultBadge': 'Consult 10s',
  'portal.lila.actions.ready': 'Ready',
  'portal.lila.actions.backHome': 'Back home',
  'portal.lila.realtime.live': 'Realtime live',
  'portal.lila.realtime.fallbackPolling': 'Fallback polling',
  'portal.lila.realtime.reconnecting': 'Reconnecting',
  'portal.lila.match.teamAlive': 'Alive',
  'portal.lila.match.teamReady': 'Ready',
  'portal.lila.match.teamScore': 'Team score',
  'portal.lila.results.title': 'Lila results',
  'portal.lila.results.subtitle': 'Results subtitle',
  'portal.lila.results.winner': 'Winner: {{winner}}',
  'portal.lila.results.karmaDelta': 'Karma',
  'portal.lila.results.punnyaEarned': 'Punya',
  'portal.lila.results.bonusEarned': 'Bonus',
  'portal.lila.results.rankProgress': 'Rank progress',
  'portal.lila.results.recentRewardTitle': 'Fresh reward',
  'portal.lila.results.progressTitle': 'Post-match progression',
  'portal.lila.results.progressSubtitle': 'Progress subtitle',
  'portal.lila.results.modeSummary.survivalTitle': 'Survival result',
  'portal.lila.results.modeSummary.survivalBody': 'You finished in place {{place}} out of {{total}}. In survival that matters more than a single round score.',
  'portal.lila.results.modeSummary.sabhaTitle': 'Sabha result',
  'portal.lila.results.modeSummary.sabhaBody': 'Sampradaya {{team}} finished the match with a combined contribution of {{score}} points.',
  'portal.lila.results.modeSummary.duelTitle': 'Duel result',
  'portal.lila.results.modeSummary.duelBody': 'The duel closed with a {{delta}}-point gap. In duel mode that is the clearest tempo signal.',
  'portal.lila.actions.replay': 'Replay',
  'contacts.userFallback': 'User #{{id}}',
  'common.loading': 'Loading',
  'common.error': 'Error',
  'common.me': 'Me',
  'common.retry': 'Retry',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, options?: Record<string, unknown>) => {
      const template = translations[key] || key;
      if (!options) {
        return template;
      }
      return Object.entries(options).reduce(
        (result, [name, value]) => result.replace(`{{${name}}}`, String(value)),
        template,
      );
    },
  }),
}));

const buildBootstrap = (overrides: Partial<LilaBootstrap> = {}): LilaBootstrap => ({
  locations: ['ayodhya', 'kurukshetra', 'dwarka'],
  modes: [],
  profile: null,
  quests: [],
  siddhis: ['drishti', 'mantra_shield', 'vimana', 'maya'],
  queueDepth: {},
  modePlayerCounts: { sabha: 4, survival: 6, duel: 2 },
  activeSeason: null,
  passProgress: null,
  storeItems: [],
  ownedItems: [],
  purchaseHistory: [],
  giftHistory: [],
  leaderboard: [],
  subscription: null,
  bonusBalance: 0,
  realBalance: 0,
  openMatches: [],
  openQueue: [],
  availableQuestions: [],
  metrics: {},
  activeStreak: 0,
  dailyQuestProgress: [],
  weeklyQuestProgress: [],
  recentRewards: [],
  recommendedMode: 'duel',
  tutorialState: {
    completed: true,
    currentStep: 'done',
    seenIntro: true,
    completedMatches: 1,
  },
  ...overrides,
});

const buildSnapshot = (overrides: Partial<LilaMatchSnapshot> = {}): LilaMatchSnapshot => ({
  match: {
    code: 'match-1',
    mode: 'survival',
    status: 'lobby',
  },
  rounds: [],
  players: [7, 8, 9],
  queueEntries: [
    { userId: 7, mode: 'survival', status: 'ready' },
    { userId: 8, mode: 'survival', status: 'matched' },
    { userId: 9, mode: 'survival', status: 'matched' },
  ],
  locale: 'en',
  currentRound: null,
  currentQuestion: null,
  readyUserIds: [7],
  scoreboard: [
    { userId: 7, score: 12, isReady: true, isEliminated: false },
    { userId: 8, score: 8, isReady: false, isEliminated: false },
    { userId: 9, score: 5, isReady: false, isEliminated: true },
  ],
  eliminatedUserIds: [9],
  answeredUserIds: [],
  phase: 'lobby',
  stateVersion: 1,
  serverTime: '2026-04-04T00:00:00Z',
  resolution: null,
  ...overrides,
});

describe('Lila flow screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCachedLilaBootstrap.mockReturnValue(null);
    mockPrimeLilaBootstrap.mockImplementation(() => undefined);
    mockUseLilaMatchSession.mockReturnValue({
      snapshot: buildSnapshot(),
      connectionState: 'live',
      recoverSnapshot: jest.fn(),
      setInitialSnapshot: jest.fn(),
    });
    mockGetLilaMatch.mockResolvedValue(buildSnapshot({
      match: { code: 'match-1', mode: 'survival', status: 'finished', winnerUserId: 7 },
    }));
    mockGetLilaBootstrap.mockResolvedValue(buildBootstrap({
      recentRewards: [{ kind: 'xp', title: 'Fresh reward', amount: 25, currency: 'xp', awardedAt: '2026-04-04T00:00:00Z' }],
    }));
  });

  it('renders sabha-specific queue promise copy', async () => {
    mockGetLilaBootstrap.mockResolvedValueOnce(buildBootstrap({
      recommendedMode: 'sabha',
      modePlayerCounts: { sabha: 6, duel: 2, survival: 4 },
    }));

    const navigation = { replace: jest.fn(), navigate: jest.fn() };
    const route = { key: 'LilaQueue', name: 'LilaQueue', params: { mode: 'sabha' } };
    const screen = render(<LilaQueueScreen navigation={navigation as any} route={route as any} />);

    await waitFor(() => {
      expect(screen.getByText('What sabha promises')).toBeTruthy();
      expect(screen.getByText('Sabha works better when the player already expects team lobby, consultation, and shared sampradaya contribution.')).toBeTruthy();
    });
  });

  it('renders survival-specific lobby prep copy', async () => {
    const navigation = { replace: jest.fn(), navigate: jest.fn() };
    const route = { key: 'LilaLobby', name: 'LilaLobby', params: { mode: 'survival', matchCode: 'match-1' } };
    const screen = render(<LilaLobbyScreen navigation={navigation as any} route={route as any} />);

    await waitFor(() => {
      expect(screen.getByText('Survival prep')).toBeTruthy();
      expect(screen.getByText('Before survival starts, the player should clearly see how many participants are still alive and how many are ready for the first wave.')).toBeTruthy();
    });
  });

  it('renders survival-specific result summary', async () => {
    const navigation = { replace: jest.fn(), navigate: jest.fn() };
    const route = { key: 'LilaResults', name: 'LilaResults', params: { mode: 'survival', matchCode: 'match-1' } };
    const screen = render(<LilaResultsScreen navigation={navigation as any} route={route as any} />);

    await waitFor(() => {
      expect(screen.getByText('Survival result')).toBeTruthy();
      expect(screen.getByText('You finished in place 1 out of 3. In survival that matters more than a single round score.')).toBeTruthy();
    });
  });

  it('redirects lobby to match when session becomes active', async () => {
    mockUseLilaMatchSession.mockReturnValueOnce({
      snapshot: buildSnapshot({
        match: { code: 'match-1', mode: 'survival', status: 'active' },
      }),
      connectionState: 'live',
      recoverSnapshot: jest.fn(),
      setInitialSnapshot: jest.fn(),
    });

    const navigation = { replace: jest.fn(), navigate: jest.fn() };
    const route = { key: 'LilaLobby', name: 'LilaLobby', params: { mode: 'survival', matchCode: 'match-1' } };
    render(<LilaLobbyScreen navigation={navigation as any} route={route as any} />);

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('LilaMatch', { mode: 'survival', matchCode: 'match-1' });
    });
  });

  it('redirects queue to results when live match is already finished', async () => {
    mockGetLilaBootstrap.mockResolvedValueOnce(buildBootstrap({
      openMatches: [{ code: 'match-finished', mode: 'duel', status: 'finished' }],
    }));

    const navigation = { replace: jest.fn(), navigate: jest.fn() };
    const route = { key: 'LilaQueue', name: 'LilaQueue', params: { mode: 'duel' } };
    render(<LilaQueueScreen navigation={navigation as any} route={route as any} />);

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('LilaResults', {
        mode: 'duel',
        matchCode: 'match-finished',
      });
    });
  });
});
