import { isServiceAllowedForRole } from '../../types/portal';

describe('portal service access', () => {
    it('allows ekadashi service only for devotee role', () => {
        expect(isServiceAllowedForRole('ekadashi_calendar', 'devotee')).toBe(true);
        expect(isServiceAllowedForRole('ekadashi_calendar', 'user')).toBe(false);
        expect(isServiceAllowedForRole('news', 'user')).toBe(true);
    });
});
