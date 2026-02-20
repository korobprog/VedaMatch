import AsyncStorage from '@react-native-async-storage/async-storage';
import { multimediaSupportService } from '../../services/multimediaSupportService';
import { charityService } from '../../services/charityService';
import { authorizedFetch } from '../../services/authSessionService';

jest.mock('../../services/authSessionService', () => ({
  authorizedFetch: jest.fn(),
}));

jest.mock('../../services/charityService', () => ({
  charityService: {
    donate: jest.fn(),
  },
}));

describe('multimediaSupportService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('loads support config for multimedia', async () => {
    (authorizedFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        enabled: true,
        projectId: 77,
        defaultAmount: 25,
        cooldownHours: 12,
      }),
    });

    const cfg = await multimediaSupportService.getSupportConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.projectId).toBe(77);
    expect(cfg.defaultAmount).toBe(25);
  });

  it('sends donate request with multimedia attribution', async () => {
    (charityService.donate as jest.Mock).mockResolvedValueOnce({ success: true });
    await multimediaSupportService.donateToMultimedia(100, 20, false, 'support', 'support_prompt', 'MultimediaHub');
    expect(charityService.donate).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        projectId: 100,
        amount: 20,
        sourceService: 'multimedia',
        sourceTrigger: 'support_prompt',
      }),
    );
  });

  it('handles cooldown and interactions', async () => {
    expect(await multimediaSupportService.getPromptCooldown(1)).toBe(0);
    await multimediaSupportService.setPromptCooldown(1);
    expect(await multimediaSupportService.getPromptCooldown(1)).toBeGreaterThan(0);

    const count1 = await multimediaSupportService.incrementInteractions(1);
    const count2 = await multimediaSupportService.incrementInteractions(1);
    expect(count1).toBe(1);
    expect(count2).toBe(2);
  });
});

