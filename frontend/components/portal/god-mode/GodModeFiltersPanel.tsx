import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MathFilter } from '../../../types/portalBlueprint';

interface GodModeFiltersPanelProps {
  filters: MathFilter[];
  activeMathId?: string;
  onSelectMath: (mathId: string) => void;
}

export const GodModeFiltersPanel: React.FC<GodModeFiltersPanelProps> = ({
  filters,
  activeMathId,
  onSelectMath,
}) => {
  if (!filters || filters.length === 0) return null;

  const active = filters.find((f) => f.mathId === activeMathId) || filters[0];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Режим Бога: фильтры матхов</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mathRow}>
        {filters.map((item) => {
          const selected = item.mathId === active.mathId;
          return (
            <Pressable
              key={item.mathId}
              onPress={() => onSelectMath(item.mathId)}
              style={[styles.mathChip, selected && styles.mathChipSelected]}
            >
              <Text style={[styles.mathChipText, selected && styles.mathChipTextSelected]}>
                {item.mathName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.caption}>Вы видите матх {active.mathName}</Text>
      <Text style={styles.filtersText}>{active.filters.join(', ')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  mathRow: {
    gap: 8,
    marginBottom: 8,
  },
  mathChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  mathChipSelected: {
    backgroundColor: '#111827',
  },
  mathChipText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
  },
  mathChipTextSelected: {
    color: '#FFFFFF',
  },
  caption: {
    fontSize: 12,
    color: '#6B7280',
  },
  filtersText: {
    marginTop: 2,
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '500',
  },
});
