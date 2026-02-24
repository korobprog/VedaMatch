import { useMemo } from 'react';
import { PortalRole } from '../types/portalBlueprint';
import { buildComponentTokens } from '../theme/componentTokens';
import { getRoleTheme, resolvePortalRole } from '../theme/roleThemes';
import { buildSemanticTokensWithScreenTheme } from '../theme/semanticTokens';
import { ScreenThemeDark, ScreenThemeLight } from '../theme/screenTheme';

export function useRoleTheme(role?: PortalRole | string | null, isDarkMode = true) {
  return useMemo(() => {
    const resolvedRole = resolvePortalRole(role);
    const roleTheme = getRoleTheme(resolvedRole);
    const screenTheme = isDarkMode ? ScreenThemeDark : ScreenThemeLight;
    const colors = buildSemanticTokensWithScreenTheme(roleTheme, screenTheme);
    const components = buildComponentTokens(colors);

    return {
      resolvedRole,
      roleTheme,
      colors,
      components,
    };
  }, [role, isDarkMode]);
}
