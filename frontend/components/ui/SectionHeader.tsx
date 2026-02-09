import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SemanticColorTokens } from '../../theme/semanticTokens';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  colors: SemanticColorTokens;
  onPress?: () => void;
  rightLabel?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  colors,
  onPress,
  rightLabel,
}) => {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      {...(onPress ? { onPress } : {})}
    >
      <View style={styles.left}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {!!rightLabel && <Text style={[styles.right, { color: colors.accent }]}>{rightLabel}</Text>}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
  },
  right: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 10,
  },
});
