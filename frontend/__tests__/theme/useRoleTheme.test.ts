import { renderHook } from '@testing-library/react-native';
import { useRoleTheme } from '../../hooks/useRoleTheme';

describe('useRoleTheme', () => {
  it('returns expected accent colors for all supported roles', () => {
    const roles = [
      { role: 'user', accent: '#6B7280' },
      { role: 'in_goodness', accent: '#22C55E' },
      { role: 'yogi', accent: '#0EA5E9' },
      { role: 'devotee', accent: '#F97316' },
    ] as const;

    roles.forEach(({ role, accent }) => {
      const { result } = renderHook(() => useRoleTheme(role, true));
      expect(result.current.colors.accent).toBe(accent);
    });
  });

  it('falls back to user theme for unknown/admin role', () => {
    const { result } = renderHook(() => useRoleTheme('admin', true));
    expect(result.current.resolvedRole).toBe('user');
    expect(result.current.colors.accent).toBe('#6B7280');
  });
});
