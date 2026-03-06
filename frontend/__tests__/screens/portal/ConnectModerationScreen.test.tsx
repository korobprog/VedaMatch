import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import ConnectModerationScreen from '../../../screens/portal/connect/ConnectModerationScreen';

const mockGetModerationQueue = jest.fn();
const mockApproveOpportunity = jest.fn();
const mockRejectOpportunity = jest.fn();
const mockGetApplications = jest.fn();
const mockUpdateApplicationStatus = jest.fn();
const mockT = (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key;

jest.mock('../../../context/UserContext', () => ({
  useUser: () => ({
    user: { role: 'admin' },
  }),
}));

jest.mock('../../../services/connectService', () => ({
  connectService: {
    getModerationQueue: (...args: any[]) => mockGetModerationQueue(...args),
    approveOpportunity: (...args: any[]) => mockApproveOpportunity(...args),
    rejectOpportunity: (...args: any[]) => mockRejectOpportunity(...args),
    getApplications: (...args: any[]) => mockGetApplications(...args),
    updateApplicationStatus: (...args: any[]) => mockUpdateApplicationStatus(...args),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'en' },
  }),
}));

jest.mock('../../../i18n', () => ({
  __esModule: true,
  default: { t: mockT },
  t: mockT,
}));

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const reactModule = require('react');
  return ({ children, visible }: { children: React.ReactNode; visible: boolean }) => (
    visible ? reactModule.createElement(reactModule.Fragment, null, children) : null
  );
});

describe('ConnectModerationScreen', () => {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  } as any;

  const route = {
    key: 'ConnectModeration',
    name: 'ConnectModeration',
    params: undefined,
  } as any;

  beforeEach(() => {
    navigation.goBack.mockReset();
    navigation.navigate.mockReset();
    mockGetModerationQueue.mockReset();
    mockApproveOpportunity.mockReset();
    mockRejectOpportunity.mockReset();
    mockGetApplications.mockReset();
    mockUpdateApplicationStatus.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetModerationQueue.mockResolvedValue([
      {
        id: 11,
        title: 'Kitchen prep',
        category: 'prasadam',
        entryLevel: 'intro',
        participationFormat: 'offline',
        status: 'moderation',
        newcomerFriendly: true,
        mentorAvailable: false,
        requiresApproval: false,
        createdByUser: { karmicName: 'Nitai Das' },
      },
    ]);
    mockGetApplications.mockResolvedValue([
      {
        id: 71,
        opportunityId: 11,
        userId: 21,
        status: 'pending',
        message: 'I can help after work',
        user: { karmicName: 'Radha Devi' },
      },
    ]);
    mockUpdateApplicationStatus.mockResolvedValue({
      id: 71,
      opportunityId: 11,
      userId: 21,
      status: 'approved',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends reviewer note when approving opportunity', async () => {
    const screen = render(<ConnectModerationScreen navigation={navigation} route={route} />);
    await act(async () => {
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.queryByText('Kitchen prep')).toBeTruthy());
    await waitFor(() => expect(mockGetModerationQueue).toHaveBeenCalledWith('moderation'));

    fireEvent.press(screen.getByText('Approve'));
    fireEvent.changeText(
      screen.getByTestId('connect-moderation-reason-input'),
      'Looks safe for first-time volunteers',
    );
    fireEvent.press(screen.getByTestId('connect-moderation-submit'));

    await waitFor(() => {
      expect(mockApproveOpportunity).toHaveBeenCalledWith(11, {
        reason: 'Looks safe for first-time volunteers',
      });
    });
  });

  it('adds preset note into moderation reason', async () => {
    const screen = render(<ConnectModerationScreen navigation={navigation} route={route} />);
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.queryByText('Kitchen prep')).toBeTruthy());

    fireEvent.press(screen.getByText('Reject'));
    fireEvent.press(screen.getByText('Needs clearer location details'));

    expect(screen.getByDisplayValue('Needs clearer location details')).toBeTruthy();
  });

  it('sends reviewer note when rejecting opportunity', async () => {
    const screen = render(<ConnectModerationScreen navigation={navigation} route={route} />);
    await act(async () => {
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.queryByText('Kitchen prep')).toBeTruthy());
    await waitFor(() => expect(mockGetModerationQueue).toHaveBeenCalled());

    fireEvent.press(screen.getByText('Reject'));
    fireEvent.changeText(
      screen.getByTestId('connect-moderation-reason-input'),
      'Needs more location details',
    );
    fireEvent.press(screen.getByTestId('connect-moderation-submit'));

    await waitFor(() => {
      expect(mockRejectOpportunity).toHaveBeenCalledWith(11, {
        reason: 'Needs more location details',
      });
    });
  });

  it('updates application status from moderation panel', async () => {
    const screen = render(<ConnectModerationScreen navigation={navigation} route={route} />);
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.queryByText('Kitchen prep')).toBeTruthy());
    fireEvent.press(screen.getByTestId('connect-moderation-applications-toggle-11'));

    await waitFor(() => expect(mockGetApplications).toHaveBeenCalledWith(11));
    await waitFor(() => expect(screen.queryByText('Radha Devi')).toBeTruthy());

    fireEvent.press(screen.getByTestId('connect-moderation-application-71-approved'));
    fireEvent.changeText(
      screen.getByTestId('connect-moderation-application-reason-input'),
      'Approved for this week',
    );
    fireEvent.press(screen.getByTestId('connect-moderation-application-submit'));

    await waitFor(() => {
      expect(mockUpdateApplicationStatus).toHaveBeenCalledWith(71, {
        status: 'approved',
        note: 'Approved for this week',
      });
    });
  });
});
