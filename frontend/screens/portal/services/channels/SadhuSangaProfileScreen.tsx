import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { channelService } from '../../../../services/channelService';
import { supportService } from '../../../../services/supportService';
import { multimediaService } from '../../../../services/multimediaService';
import SadhuSangaLayout from './components/SadhuSangaLayout';

export default function SadhuSangaProfileScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { user } = useUser();
  const { isDarkMode } = useSettings();
  const { colors } = useRoleTheme(user?.role, isDarkMode);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [subscriptionsCount, setSubscriptionsCount] = useState(0);
  const [savedLecturesCount, setSavedLecturesCount] = useState(0);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [profileCity, setProfileCity] = useState('');
  const profileMath = String(user?.madh || '').trim();

  const openTab = useCallback((tab: 'home' | 'schedule' | 'live' | 'profile') => {
    const tabRouteMap: Record<typeof tab, 'SadhuSangaHub' | 'SadhuSangaSchedule' | 'SadhuSangaLive' | 'SadhuSangaProfile'> = {
      home: 'SadhuSangaHub',
      schedule: 'SadhuSangaSchedule',
      live: 'SadhuSangaLive',
      profile: 'SadhuSangaProfile',
    };
    const targetRoute = tabRouteMap[tab];
    if (targetRoute === 'SadhuSangaProfile') {
      return;
    }
    navigation.replace(targetRoute);
  }, [navigation]);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const [channelsResult, favoritesResult, ticketsResult, pushResult] = await Promise.allSettled([
        channelService.getChannels({ page: 1, limit: 100, sadhuSanga: true }),
        multimediaService.getFavorites(1, 1),
        supportService.listMyTickets(1, 200),
        channelService.getSadhuSangaPushPreference(),
      ]);

      if (channelsResult.status === 'fulfilled') {
        const subscribed = (channelsResult.value.channels || []).filter((item) => Boolean(item.isFollowing)).length;
        setSubscriptionsCount(subscribed);
      } else {
        setSubscriptionsCount(0);
      }

      if (favoritesResult.status === 'fulfilled') {
        setSavedLecturesCount(Math.max(0, Number(favoritesResult.value.total) || 0));
      } else {
        setSavedLecturesCount(0);
      }

      if (ticketsResult.status === 'fulfilled') {
        const questions = (ticketsResult.value.tickets || []).filter((ticket) => ticket.entryPoint === 'sadhu_sanga_question');
        setQuestionsCount(questions.length);
      } else {
        setQuestionsCount(0);
      }

      if (pushResult.status === 'fulfilled') {
        setProfileCity(pushResult.value.city || user?.city || '');
      } else {
        setProfileCity(user?.city || '');
      }
    } catch {
      setSubscriptionsCount(0);
      setSavedLecturesCount(0);
      setQuestionsCount(0);
      setProfileCity(user?.city || '');
    } finally {
      setLoading(false);
    }
  }, [user?.city]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  const displayName = user?.spiritualName || user?.karmicName || t('portal.sadhuSangaProfile.fallbackName');
  const displayLetter = displayName[0]?.toUpperCase?.() || t('portal.sadhuSangaProfile.fallbackLetter');

  return (
    <SadhuSangaLayout
      colors={colors}
      subtitle={t('portal.sadhuSangaProfile.subtitle')}
      activeTab="profile"
      onBack={() => navigation.goBack()}
      onNotificationsPress={() => navigation.navigate('SadhuSangaSmartPush')}
      onTabPress={openTab}
    >
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.mainScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.tabPaneWrap}>
              <View style={styles.profileTopRow}>
                <View style={styles.profileAvatarCircle}>
                  <Text style={styles.profileAvatarLetter}>{displayLetter}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{displayName}</Text>
                  <Text style={styles.profileStatus}>{t('portal.sadhuSangaProfile.status')}</Text>
                </View>
              </View>

              <View style={styles.profileCardList}>
                <TouchableOpacity style={styles.profileCardRow} onPress={() => openTab('home')}>
                  <Text style={styles.profileCardTitle}>{t('portal.sadhuSangaProfile.cards.subscriptions')}</Text>
                  <Text style={styles.profileCardValue}>{subscriptionsCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileCardRow} onPress={() => navigation.navigate('FavoritesScreen')}>
                  <Text style={styles.profileCardTitle}>{t('portal.sadhuSangaProfile.cards.savedLectures')}</Text>
                  <Text style={styles.profileCardValue}>{savedLecturesCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileCardRow} onPress={() => navigation.navigate('SupportInbox')}>
                  <Text style={styles.profileCardTitle}>{t('portal.sadhuSangaProfile.cards.myQuestions')}</Text>
                  <Text style={styles.profileCardValue}>{questionsCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileCardRow} onPress={() => navigation.navigate('SadhuSangaSmartPush')}>
                  <Text style={styles.profileCardTitle}>{t('portal.sadhuSangaProfile.cards.myCity')}</Text>
                  <Text style={styles.profileCardText}>{profileCity || t('portal.sadhuSangaProfile.notSpecified')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileCardRow} onPress={() => navigation.navigate('EditProfile')}>
                  <Text style={styles.profileCardTitle}>{t('portal.sadhuSangaProfile.cards.myMath')}</Text>
                  <Text style={styles.profileCardText}>{profileMath || t('portal.sadhuSangaProfile.notSpecified')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.profileDonateCard}>
                <Text style={styles.profileDonateTitle}>{t('portal.sadhuSangaProfile.donate.title')}</Text>
                <Text style={styles.profileDonateText}>{t('portal.sadhuSangaProfile.donate.text')}</Text>
                <TouchableOpacity style={styles.profileDonateButton} onPress={() => Alert.alert(t('portal.sadhuSangaProfile.donate.alertTitle'), t('portal.sadhuSangaProfile.donate.alertText')) }>
                  <Text style={styles.profileDonateButtonText}>{t('portal.sadhuSangaProfile.donate.button')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
    </SadhuSangaLayout>
  );
}

const createStyles = (colors: ReturnType<typeof useRoleTheme>['colors']) => StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 110,
  },
  tabPaneWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF1C4',
    borderWidth: 2,
    borderColor: '#F3D771',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarLetter: {
    color: '#E38500',
    fontSize: 34,
    fontWeight: '900',
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '900',
  },
  profileStatus: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  profileCardList: {
    gap: 8,
  },
  profileCardRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 14,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileCardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  profileCardValue: {
    borderRadius: 999,
    backgroundColor: '#FFF1C4',
    color: '#D17000',
    fontSize: 19,
    fontWeight: '900',
    minWidth: 34,
    textAlign: 'center',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  profileCardText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  profileDonateCard: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: '#FF8F00',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 10,
    alignItems: 'center',
  },
  profileDonateTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  profileDonateText: {
    color: '#FFF1D2',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  profileDonateButton: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  profileDonateButtonText: {
    color: '#DE5D00',
    fontSize: 18,
    fontWeight: '900',
  },
});
