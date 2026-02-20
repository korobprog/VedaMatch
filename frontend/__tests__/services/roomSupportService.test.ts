const mockAuthorizedFetch = jest.fn();
const mockDonate = jest.fn();

jest.mock('../../services/authSessionService', () => ({
  authorizedFetch: (...args: any[]) => mockAuthorizedFetch(...args),
}));

jest.mock('../../services/charityService', () => ({
  charityService: {
    donate: (...args: any[]) => mockDonate(...args),
  },
}));

import { roomSupportService } from '../../services/roomSupportService';

describe('roomSupportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads support config', async () => {
    mockAuthorizedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        enabled: true,
        projectId: 55,
        defaultAmount: 20,
        cooldownHours: 24,
      }),
    });

    const cfg = await roomSupportService.getSupportConfig();

    expect(cfg.enabled).toBe(true);
    expect(cfg.projectId).toBe(55);
    expect(cfg.defaultAmount).toBe(20);
    expect(cfg.cooldownHours).toBe(24);
    expect(cfg.platformContributionEnabled).toBe(true);
    expect(cfg.platformContributionDefault).toBe(5);
    expect(mockAuthorizedFetch).toHaveBeenCalledWith(
      expect.stringContaining('/support/config?service=rooms'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sends donation via charity service', async () => {
    mockDonate.mockResolvedValue({ donationId: 1 });

    await roomSupportService.donateToRooms(10, 20, false, 'Support', 77);

    expect(mockDonate).toHaveBeenCalledWith(undefined, {
      projectId: 10,
      amount: 20,
      includeTips: false,
      karmaMessage: 'Support',
      isAnonymous: false,
      wantsCertificate: false,
      sourceService: 'rooms',
      sourceTrigger: 'support_prompt',
      sourceRoomId: 77,
      sourceContext: JSON.stringify({
        roomId: 77,
        screen: 'RoomChat',
        feature: 'rooms_support_prompt',
      }),
      platformContributionEnabled: false,
    });
  });
});
