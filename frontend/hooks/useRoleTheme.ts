import { useMemo } from 'react';
import { PortalRole } from '../types/portalBlueprint';
import { buildComponentTokens } from '../theme/componentTokens';
import { getRoleTheme, resolvePortalRole } from '../theme/roleThemes';
import { buildSemanticTokens } from '../theme/semanticTokens';

export function useRoleTheme(role?: PortalRole | string | null, isDarkMode = true) {
  return useMemo(() => {
    const resolvedRole = resolvePortalRole(role);
    const roleTheme = getRoleTheme(resolvedRole);
    const colors = buildSemanticTokens(roleTheme, isDarkMode);
    const components = buildComponentTokens(colors);

    return {
      resolvedRole,
      roleTheme,
      colors,
      components,
    };
  }, [role, isDarkMode]);
}
