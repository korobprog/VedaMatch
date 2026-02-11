import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { pathTrackerService, PathTrackerToday } from '../../services/pathTrackerService';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useUser } from '../../context/UserContext';
import { useSettings } from '../../context/SettingsContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const PathTrackerHomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors } = useRoleTheme(user?.role, isDarkMode);

  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<PathTrackerToday | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pathTrackerService.getToday();
      setToday(data);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('pathTracker.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleGenerate = async () => {
    try {
      const step = await pathTrackerService.generateStep();
      navigation.navigate('PathStep', { stepId: step.stepId, step });
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('pathTracker.stepError'));
    }
  };

  const openSuggestedService = (id?: string) => {
    if (!id) return;
    if (id === 'multimedia') {
      navigation.navigate('MultimediaHub');
      return;
    }
    if (id === 'education') {
      navigation.navigate('EducationHome');
      return;
    }
    if (id === 'services') {
      navigation.navigate('ServicesHome');
      return;
    }
    if (id === 'seva') {
      navigation.navigate('SevaHub');
      return;
    }
    if (id === 'video_circles') {
      navigation.navigate('VideoCirclesScreen');
      return;
    }
    if (id === 'news') {
      navigation.navigate('Portal', { initialTab: 'news' });
      return;
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!today) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary }}>{t('pathTracker.loadError')}</Text>
      </View>
    );
  }

  const showCheckin = !today.hasCheckin;
  const showGenerate = today.hasCheckin && !today.step;
  const showComplete = today.step && today.step.status !== 'completed';
  const showReflect = today.step && today.step.status === 'completed' && !today.hasReflection;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('pathTracker.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('pathTracker.subtitle')}</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {t('pathTracker.dayStatus', { date: today.date })}
        </Text>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          {t('pathTracker.streak', { current: today.state?.streakCurrent || 0, best: today.state?.streakBest || 0 })}
        </Text>
        {today.isStale ? (
          <Text style={[styles.warning, { color: colors.warning }]}>{t('pathTracker.offlineCached')}</Text>
        ) : null}
      </View>

      {today.step ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{today.step.title}</Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {t('pathTracker.formatAndDuration', { format: today.step.format, minutes: today.step.durationMin })}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {t('pathTracker.stepStatus', { status: today.step.status })}
          </Text>
        </View>
      ) : null}

      {today.step?.suggestedServiceId ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('pathTracker.unlockTitle')}</Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {t('pathTracker.unlockSubtitle', { title: today.step.suggestedServiceTitle || today.step.suggestedServiceId })}
          </Text>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border, marginTop: 8 }]}
            onPress={() => openSuggestedService(today.step?.suggestedServiceId)}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
              {t('pathTracker.openSuggestedService', { title: today.step.suggestedServiceTitle || today.step.suggestedServiceId })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {showCheckin && (
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('PathCheckin')}>
          <Text style={styles.primaryBtnText}>{t('pathTracker.startCheckin')}</Text>
        </TouchableOpacity>
      )}
      {showGenerate && (
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={handleGenerate}>
          <Text style={styles.primaryBtnText}>{t('pathTracker.generateStep')}</Text>
        </TouchableOpacity>
      )}
      {showComplete && today.step && (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('PathStep', { stepId: today.step!.stepId, step: today.step! })}
        >
          <Text style={styles.primaryBtnText}>{t('pathTracker.openStep')}</Text>
        </TouchableOpacity>
      )}
      {showReflect && today.step && (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('PathReflection', { stepId: today.step!.stepId })}
        >
          <Text style={styles.primaryBtnText}>{t('pathTracker.openReflection')}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={load}>
        <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>{t('pathTracker.refresh')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => navigation.navigate('PathWeeklySummary')}>
        <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>{t('pathTracker.weeklyOpen')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 10 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardMeta: { fontSize: 13 },
  warning: { fontSize: 12, fontWeight: '600' },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
});
