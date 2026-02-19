import { linking } from '../../navigation/linking';

describe('linking rooms invite path', () => {
  it('defines deep-link path rooms/join/:token', () => {
    const config: any = linking.config?.screens || {};
    expect(config.RoomInviteEntry?.path).toBe('rooms/join/:token');
    expect(config.RoomInviteEntry?.parse?.token('abc')).toBe('abc');
  });
});
