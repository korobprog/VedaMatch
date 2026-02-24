import { buildComponentTokens } from '../../theme/componentTokens';
import { buildSemanticTokensWithScreenTheme } from '../../theme/semanticTokens';
import { getRoleTheme } from '../../theme/roleThemes';
import { ScreenThemeLight } from '../../theme/screenTheme';

describe('component tokens', () => {
  it('maps semantic tokens to topBar/card/input/button consistently', () => {
    const roleTheme = getRoleTheme('devotee');
    const semantic = buildSemanticTokensWithScreenTheme(roleTheme, ScreenThemeLight);
    const tokens = buildComponentTokens(semantic);

    expect(tokens.topBar.background).toBe(semantic.surfaceElevated);
    expect(tokens.topBar.border).toBe(semantic.border);
    expect(tokens.card.background).toBe(semantic.surfaceElevated);
    expect(tokens.card.accentBorder).toBe(semantic.accent);
    expect(tokens.input.background).toBe(semantic.surface);
    expect(tokens.input.placeholder).toBe(semantic.textSecondary);
    expect(tokens.button.primaryText).toBe(semantic.textPrimary);
  });
});

