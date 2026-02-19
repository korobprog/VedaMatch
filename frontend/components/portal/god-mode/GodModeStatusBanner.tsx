import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGodModeFilters } from '../../../hooks/useGodModeFilters';

export const GodModeStatusBanner: React.FC = () => {
  const { t } = useTranslation();
  const { enabled, activeMath } = useGodModeFilters();
  if (!enabled || !activeMath) return null;

  const formattedFilters = activeMath.filters
    .map((filter) => {
      const key = `portal.filters.${filter}`;
      const translated = t(key);
      if (translated !== key) {
        return translated;
      }

      const normalized = filter.replace(/_/g, ' ').trim();
      if (!normalized) {
        return filter;
      }
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(', ');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('portal.godMode.viewingMath', { name: activeMath.mathName })}</Text>
      <Text style={styles.filters}>{formattedFilters}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  title: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 12,
  },
  filters: {
    marginTop: 3,
    color: '#4B5563',
    fontSize: 11,
  },
});
