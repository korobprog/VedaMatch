import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, CalendarDays, House, PlayCircle, UserRound } from 'lucide-react-native';
import { useRoleTheme } from '../../../../../hooks/useRoleTheme';

export type SadhuSangaTab = 'home' | 'schedule' | 'live' | 'profile';

type SadhuSangaLayoutProps = {
  colors: ReturnType<typeof useRoleTheme>['colors'];
  subtitle: string;
  activeTab: SadhuSangaTab;
  onBack: () => void;
  onNotificationsPress: () => void;
  onTabPress: (tab: SadhuSangaTab) => void;
  children: React.ReactNode;
};

export default function SadhuSangaLayout({
  colors,
  subtitle,
  activeTab,
  onBack,
  onNotificationsPress,
  onTabPress,
  children,
}: SadhuSangaLayoutProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const gradientColors = useMemo<[string, string, string]>(() => {
    return [colors.background, colors.background, colors.background];
  }, [colors.background]);

  return (
    <LinearGradient colors={gradientColors} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onBack}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Садху Санга</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity style={styles.notifyButton} onPress={onNotificationsPress}>
            <Bell size={18} color={colors.textPrimary} />
            <View style={styles.notifyDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>{children}</View>

        <View style={styles.bottomNavBar}>
          <TouchableOpacity style={styles.bottomNavItem} onPress={() => onTabPress('home')}>
            <House size={20} color={activeTab === 'home' ? '#FFAA00' : colors.textSecondary} />
            <Text style={[styles.bottomNavText, activeTab === 'home' && styles.bottomNavTextActive]}>Главная</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomNavItem} onPress={() => onTabPress('schedule')}>
            <CalendarDays size={20} color={activeTab === 'schedule' ? '#FFAA00' : colors.textSecondary} />
            <Text style={[styles.bottomNavText, activeTab === 'schedule' && styles.bottomNavTextActive]}>Расписание</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomNavItem} onPress={() => onTabPress('live')}>
            <PlayCircle size={20} color={activeTab === 'live' ? '#FFAA00' : colors.textSecondary} />
            <Text style={[styles.bottomNavText, activeTab === 'live' && styles.bottomNavTextActive]}>Эфиры</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomNavItem} onPress={() => onTabPress('profile')}>
            <UserRound size={20} color={activeTab === 'profile' ? '#FFAA00' : colors.textSecondary} />
            <Text style={[styles.bottomNavText, activeTab === 'profile' && styles.bottomNavTextActive]}>Профиль</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: ReturnType<typeof useRoleTheme>['colors']) => StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F9425F',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  bottomNavBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 54,
  },
  bottomNavText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  bottomNavTextActive: {
    color: '#FFAA00',
  },
});
