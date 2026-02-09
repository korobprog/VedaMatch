import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGodModeFilters } from '../../../hooks/useGodModeFilters';

export const GodModeStatusBanner: React.FC = () => {
  const { enabled, activeMath } = useGodModeFilters();
  if (!enabled || !activeMath) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вы видите матх {activeMath.mathName}</Text>
      <Text style={styles.filters}>{activeMath.filters.join(', ')}</Text>
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
