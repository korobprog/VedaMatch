import { getRoomChatVisualTokens, ROOM_CHAT_ACCENT, ROOM_CHAT_DENSITY } from '../../../../screens/portal/chat/roomChatVisualTokens';

describe('roomChatVisualTokens', () => {
  it('uses fixed accent in light mode', () => {
    const tokens = getRoomChatVisualTokens(false);

    expect(tokens.accent).toBe('#FF7A1A');
    expect(tokens.accent).toBe(ROOM_CHAT_ACCENT);
    expect(tokens.blurType).toBe('light');
    expect(tokens.canvas).toBeTruthy();
  });

  it('uses same fixed accent in dark mode', () => {
    const tokens = getRoomChatVisualTokens(true);

    expect(tokens.accent).toBe('#FF7A1A');
    expect(tokens.accent).toBe(ROOM_CHAT_ACCENT);
    expect(tokens.blurType).toBe('dark');
    expect(tokens.canvas).toBeTruthy();
  });

  it('exports stable density constants', () => {
    expect(ROOM_CHAT_DENSITY.inputSendButton).toBeGreaterThan(40);
    expect(ROOM_CHAT_DENSITY.headerBackButton).toBeGreaterThan(36);
    expect(ROOM_CHAT_DENSITY.radiusPill).toBe(999);
  });
});
