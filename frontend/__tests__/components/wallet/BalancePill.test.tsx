import React from 'react';
import { render } from '@testing-library/react-native';
import { BalancePill } from '../../../components/wallet/BalancePill';

const mockNavigate = jest.fn();
const mockUseWallet = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../context/WalletContext', () => ({
  useWallet: () => mockUseWallet(),
}));

describe('BalancePill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders total balance and bonus badge', () => {
    mockUseWallet.mockReturnValue({
      loading: false,
      totalBalance: 140,
      bonusBalance: 40,
      wallet: {
        pendingBalance: 20,
      },
    });

    const { getByText } = render(<BalancePill showPending />);

    expect(getByText('140')).toBeTruthy();
    expect(getByText('B: 40')).toBeTruthy();
    expect(getByText('+20')).toBeTruthy();
  });

  it('hides bonus badge when bonus balance is zero', () => {
    mockUseWallet.mockReturnValue({
      loading: false,
      totalBalance: 100,
      bonusBalance: 0,
      wallet: {
        pendingBalance: 0,
      },
    });

    const { getByText, queryByText } = render(<BalancePill />);

    expect(getByText('100')).toBeTruthy();
    expect(queryByText(/B:/)).toBeNull();
  });
});
