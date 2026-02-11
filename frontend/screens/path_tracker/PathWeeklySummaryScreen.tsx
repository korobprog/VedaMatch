import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { pathTrackerService, PathTrackerWeeklySummary } from '../../services/pathTrackerService';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useUser } from '../../context/UserContext';
import { useSettings } from '../../context/SettingsContext';

export const PathWeeklySummaryScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors } = useRoleTheme(user?.role, isDarkMode);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PathTrackerWeeklySummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await pathTrackerService.getWeeklySummary();
      setData(summary);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('pathTracker.weeklyLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary }}>{t('pathTracker.weeklyLoadError')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('pathTracker.weeklyTitle')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('pathTracker.weeklyRange', { from: data.fromDate, to: data.toDate })}
      </Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.metric, { color: colors.textPrimary }]}>
          {t('pathTracker.weeklyCompletionRate', { rate: data.completionRate.toFixed(0) })}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {t('pathTracker.weeklyCounts', {
            completed: data.completedDays,
            assigned: data.assignedDays,
            checkins: data.checkinDays,
          })}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {t('pathTracker.streak', { current: data.streakCurrent, best: data.streakBest })}
        </Text>
        <Text style={[styles.note, { color: colors.textPrimary }]}>{data.gentleSummary}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {data.days.map((d) => (
          <View key={d.date} style={styles.row}>
            <Text style={[styles.dayDate, { color: colors.textPrimary }]}>{d.date}</Text>
            <Text style={[styles.dayState, { color: colors.textSecondary }]}>
              {d.completed ? t('pathTracker.dayCompleted') : d.hasCheckin ? t('pathTracker.dayInProgress') : t('pathTracker.dayMissed')}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  metric: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13 },
  note: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  dayDate: { fontSize: 13, fontWeight: '600' },
  dayState: { fontSize: 13 },
});

