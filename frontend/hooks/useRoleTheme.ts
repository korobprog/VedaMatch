import { useMemo } from 'react';
import { PortalRole } from '../types/portalBlueprint';
import { buildComponentTokens } from '../theme/componentTokens';
import { getRoleTheme, resolvePortalRole } from '../theme/roleThemes';
import { buildSemanticTokens } from '../theme/semanticTokens';

export function useRoleTheme(role?: PortalRole | string | null, isDarkMode = true) {
  return useMemo(() => {
    const resolvedRole = resolvePortalRole(role);
    const roleTheme = getRoleTheme(resolvedRole);

    // NOTE: Role-based themes are currently all designed with dark gradients.
    // To ensure text contrast (textPrimary/textSecondary), we force dark-mode tokens
    // for these themes regardless of the system isDarkMode setting.
    const colors = buildSemanticTokens(roleTheme, true);
    const components = buildComponentTokens(colors);

    return {
      resolvedRole,
      roleTheme,
      colors,
      components,
    };
  }, [role]); // Removed isDarkMode from dependencies as it's now ignored for colors
}
