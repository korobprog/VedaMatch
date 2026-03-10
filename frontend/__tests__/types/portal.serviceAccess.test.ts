import { canAccessVedicCalendarRole, isServiceAllowedForRole } from '../../types/portal';

describe('portal service access', () => {
    it('allows ekadashi service for devotee, internal admin roles, and pro bypass', () => {
        expect(isServiceAllowedForRole('ekadashi_calendar', 'devotee')).toBe(true);
        expect(isServiceAllowedForRole('ekadashi_calendar', 'admin')).toBe(true);
        expect(isServiceAllowedForRole('ekadashi_calendar', 'superadmin')).toBe(true);
        expect(isServiceAllowedForRole('ekadashi_calendar', 'user', { godModeEnabled: true })).toBe(true);
        expect(isServiceAllowedForRole('ekadashi_calendar', 'user', { currentPlan: 'pro_monthly' })).toBe(true);
        expect(isServiceAllowedForRole('ekadashi_calendar', 'user')).toBe(false);
        expect(isServiceAllowedForRole('news', 'user')).toBe(true);
    });

    it('matches the shared calendar role helper', () => {
        expect(canAccessVedicCalendarRole('devotee')).toBe(true);
        expect(canAccessVedicCalendarRole('admin')).toBe(true);
        expect(canAccessVedicCalendarRole('superadmin')).toBe(true);
        expect(canAccessVedicCalendarRole('user', { godModeEnabled: true })).toBe(true);
        expect(canAccessVedicCalendarRole('user', { currentPlan: 'pro_yearly' })).toBe(true);
        expect(canAccessVedicCalendarRole('yogi')).toBe(false);
    });
});
