import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { DatingScreen } from '../../../../screens/portal/dating/DatingScreen';
import { datingService } from '../../../../services/datingService';

// Mocks
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../../../context/UserContext', () => ({
  useUser: () => ({
    user: { ID: 1, city: 'Test City', spiritualName: 'TestUser' },
  }),
}));

jest.mock('../../../../context/ChatContext', () => ({
  useChat: () => ({
    setChatRecipient: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../../services/datingService', () => ({
  datingService: {
    getCandidates: jest.fn(() => Promise.resolve([])),
    getCities: jest.fn(() => Promise.resolve([])),
    getStats: jest.fn(() => Promise.resolve({ total: 0, city: 0, new: 0 })),
    getFriends: jest.fn(() => Promise.resolve([])),
    getMediaUrl: jest.fn((url) => url),
  },
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
// Mocking ProtectedScreen to just render children
jest.mock('../../../../components/ProtectedScreen', () => ({
  ProtectedScreen: ({ children }: any) => children,
}));

describe('DatingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(<DatingScreen />);
    await waitFor(() => {
      expect(datingService.getCandidates).toHaveBeenCalled();
    });
  });

  it('switches modes when chips are pressed', async () => {
    const { getByText } = render(<DatingScreen />);
    
    // Initial call (default family mode)
    await waitFor(() => {
        expect(datingService.getCandidates).toHaveBeenCalledWith(expect.objectContaining({ mode: 'family' }));
    });

    // Switch to Business
    const businessChip = getByText('Business');
    fireEvent.press(businessChip);

    await waitFor(() => {
      expect(datingService.getCandidates).toHaveBeenCalledWith(expect.objectContaining({ mode: 'business' }));
    });
    
    // Switch back to Family
    const familyChip = getByText('Family');
    fireEvent.press(familyChip);
    
     await waitFor(() => {
      expect(datingService.getCandidates).toHaveBeenCalledWith(expect.objectContaining({ mode: 'family' }));
    });
  });
});
