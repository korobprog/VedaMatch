import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { pathTrackerService, PathTrackerRequestType, PathTrackerStep } from '../../services/pathTrackerService';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useUser } from '../../context/UserContext';
import { useSettings } from '../../context/SettingsContext';

type Route = RouteProp<RootStackParamList, 'PathStep'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const REQUEST_TYPES: PathTrackerRequestType[] = ['explain', 'simplify', 'alternative', 'deepen', 'support'];

export const PathStepScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors } = useRoleTheme(user?.role, isDarkMode);

  const [step, setStep] = useState<PathTrackerStep | undefined>(route.params?.step);
  const [loading, setLoading] = useState(!route.params?.step);
  const [assistantReply, setAssistantReply] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (step) return;
    const load = async () => {
      try {
        const today = await pathTrackerService.getToday();
        if (today.step) {
          setStep(today.step);
        }
      } catch (error: any) {
        Alert.alert(t('common.error'), error?.message || t('pathTracker.stepLoadError'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [step, t]);

  const stepId = useMemo(() => step?.stepId || route.params?.stepId, [route.params?.stepId, step?.stepId]);

  const askAssistant = async (requestType: PathTrackerRequestType) => {
    if (!stepId) return;
    setBusyAction(requestType);
    try {
      const data = await pathTrackerService.assistantHelp({ stepId, requestType });
      setAssistantReply(data.reply);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('pathTracker.assistantError'));
    } finally {
      setBusyAction(null);
    }
  };

  const complete = async () => {
    if (!stepId) return;
    setBusyAction('complete');
    try {
      await pathTrackerService.completeStep(stepId);
      navigation.replace('PathReflection', { stepId });
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('pathTracker.completeError'));
    } finally {
      setBusyAction(null);
    }
  };

  const openSuggestedService = async () => {
    const id = step?.suggestedServiceId;
    if (!id) return;
    await pathTrackerService.markUnlockOpened(id);
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

  if (!step) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary }}>{t('pathTracker.stepMissing')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{step.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('pathTracker.formatAndDuration', { format: step.format, minutes: step.durationMin })}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {step.instructions.map((line, idx) => (
          <Text key={`${line}-${idx}`} style={[styles.line, { color: colors.textPrimary }]}>
            {idx + 1}. {line}
          </Text>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pathTracker.assistantTitle')}</Text>
      <View style={styles.actionsRow}>
        {REQUEST_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.actionChip, { borderColor: colors.border }]}
            onPress={() => askAssistant(type)}
            disabled={busyAction !== null}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 12 }}>
              {busyAction === type ? t('common.loading') : t(`pathTracker.assistantActions.${type}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {assistantReply ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.line, { color: colors.textPrimary }]}>{assistantReply}</Text>
        </View>
      ) : null}

      {step.suggestedServiceId ? (
        <TouchableOpacity style={[styles.suggestBtn, { borderColor: colors.border }]} onPress={openSuggestedService}>
          <Text style={[styles.suggestText, { color: colors.textPrimary }]}>
            {t('pathTracker.openSuggestedService', { title: step.suggestedServiceTitle || step.suggestedServiceId })}
          </Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={[styles.complete, { backgroundColor: colors.accent }]} onPress={complete} disabled={busyAction !== null}>
        <Text style={styles.completeText}>{busyAction === 'complete' ? t('common.loading') : t('pathTracker.completeStep')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  line: { fontSize: 14, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  suggestBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  suggestText: { fontSize: 14, fontWeight: '600' },
  complete: { borderRadius: 12, alignItems: 'center', paddingVertical: 14 },
  completeText: { color: '#fff', fontWeight: '700' },
});
