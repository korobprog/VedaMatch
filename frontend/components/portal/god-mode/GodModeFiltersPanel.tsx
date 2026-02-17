import React, { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { MathFilter } from '../../../types/portalBlueprint';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!filters || filters.length === 0) return null;

  const active = filters.find((f) => f.mathId === activeMathId) || filters[0];

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(250, 'easeInEaseOut', 'opacity'),
    );
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      {/* Header row — always visible, tap to toggle */}
      <Pressable onPress={toggleExpanded} style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.proLabel}>PRO</Text>
          <Text style={styles.activeMathName} numberOfLines={1}>
            {active.mathName}
          </Text>
        </View>
        <View
          style={[
            styles.chevronWrapper,
            expanded && styles.chevronRotated,
          ]}
        >
          <ChevronDown size={16} color="#6B7280" />
        </View>
      </Pressable>

      {/* Expandable content */}
      {expanded && (
        <View style={styles.expandedContent}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mathRow}
          >
            {filters.map((item) => {
              const selected = item.mathId === active.mathId;
              return (
                <Pressable
                  key={item.mathId}
                  onPress={() => onSelectMath(item.mathId)}
                  style={[styles.mathChip, selected && styles.mathChipSelected]}
                >
                  <Text
                    style={[
                      styles.mathChipText,
                      selected && styles.mathChipTextSelected,
                    ]}
                  >
                    {item.mathName}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.caption}>
            {t('portal.godMode.viewingMath', { name: active.mathName })}
          </Text>
          <Text style={styles.filtersText}>
            {active.filters
              .map((f) => t(`portal.filters.${f}`, f))
              .join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 40,
    marginTop: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  proLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: '#111827',
    paddingHorizontal: 3,
    paddingVertical: 0,
    borderRadius: 2,
    overflow: 'hidden',
    letterSpacing: 0.2,
  },
  activeMathName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  chevronWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
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
