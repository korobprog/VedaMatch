import React from 'react';
import { render } from '@testing-library/react-native';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { buildSemanticTokens } from '../../../theme/semanticTokens';
import { getRoleTheme } from '../../../theme/roleThemes';

const roles = ['user', 'in_goodness', 'yogi', 'devotee'] as const;

describe('Role themed UI components', () => {
  roles.forEach((role) => {
    it(`renders SectionHeader in ${role} theme`, () => {
      const colors = buildSemanticTokens(getRoleTheme(role), true);
      const { toJSON } = render(
        <SectionHeader title="Header" subtitle="Subtitle" colors={colors} rightLabel="Action" />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it(`renders PrimaryButton in ${role} theme`, () => {
      const colors = buildSemanticTokens(getRoleTheme(role), true);
      const { toJSON } = render(
        <PrimaryButton label="Continue" colors={colors} tone="accent" />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
