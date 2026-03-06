import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, InteractionManager, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Compass, HelpCircle, Heart, Infinity, Leaf } from 'lucide-react-native';
import { ROLE_OPTIONS } from '../../constants/roleOptions';
import { PortalBlueprint, PortalRole } from '../../types/portalBlueprint';
import { RoleInfoModal } from './RoleInfoModal';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { useTranslation } from 'react-i18next';

interface RoleSelectionSectionProps {
  selectedRole: string;
  onSelectRole: (role: PortalRole) => void;
  blueprints?: Record<string, PortalBlueprint>;
  autoOpenHint?: boolean;
}

const roleIcon = (role: string, color: string) => {
  if (role === 'in_goodness') return <Leaf size={14} color={color} />;
  if (role === 'yogi') return <Infinity size={14} color={color} />;
  if (role === 'devotee') return <Heart size={14} color={color} />;
  return <Compass size={14} color={color} />;
};

export const RoleSelectionSection: React.FC<RoleSelectionSectionProps> = ({
  selectedRole,
  onSelectRole,
  blueprints,
  autoOpenHint = false,
}) => {
  const { i18n } = useTranslation();
  const { colors } = useRoleTheme(selectedRole, true);
  const roleCopy = {
    ru: {
      sectionTitle: 'Роль в портале',
      sectionSubtitle: 'Роль влияет на быстрый доступ, приоритет сервисов и подсказки.',
      activeRole: 'Активная роль',
      roles: {
        user: { title: 'Искатель', subtitle: 'Стартовый профиль', description: 'Для мягкого входа в экосистему сервисов.', servicesHint: ['Медиа', 'Новости', 'Библиотека', 'Обучение'] },
        in_goodness: { title: 'В благости', subtitle: 'Саттвичный фокус', description: 'Питание, дисциплина, практики и сервисы баланса.', servicesHint: ['Кафе', 'Обучение', 'Услуги'] },
        yogi: { title: 'Йог', subtitle: 'Практика и ретриты', description: 'Для активной практики и образовательных маршрутов.', servicesHint: ['Услуги', 'Yatra', 'Медиа'] },
        devotee: { title: 'Преданный', subtitle: 'Сева и община', description: 'Профиль для служения, ятр и глубокого вовлечения.', servicesHint: ['Сева', 'Благотворительность', 'Yatra', 'Новости'] },
      },
    },
    hi: {
      sectionTitle: 'पोर्टल में भूमिका',
      sectionSubtitle: 'भूमिका त्वरित पहुँच, सेवा प्राथमिकता और संकेतों को प्रभावित करती है।',
      activeRole: 'सक्रिय भूमिका',
      roles: {
        user: { title: 'साधक', subtitle: 'प्रारंभिक प्रोफ़ाइल', description: 'सेवा इकोसिस्टम में सहज प्रवेश के लिए।', servicesHint: ['मीडिया', 'समाचार', 'लाइब्रेरी', 'शिक्षा'] },
        in_goodness: { title: 'सत्त्व में', subtitle: 'सात्त्विक फोकस', description: 'आहार, अनुशासन, अभ्यास और संतुलन सेवाओं के लिए।', servicesHint: ['कैफ़े', 'शिक्षा', 'सेवाएँ'] },
        yogi: { title: 'योगी', subtitle: 'अभ्यास और रिट्रीट', description: 'सक्रिय साधना और शैक्षिक मार्गों के लिए।', servicesHint: ['सेवाएँ', 'Yatra', 'मीडिया'] },
        devotee: { title: 'भक्त', subtitle: 'सेवा और संग', description: 'सेवा, यात्राओं और गहरे सहभाग के लिए प्रोफ़ाइल।', servicesHint: ['सेवा', 'चैरिटी', 'Yatra', 'समाचार'] },
      },
    },
    en: {
      sectionTitle: 'Role in portal',
      sectionSubtitle: 'Role affects quick access, service priority, and hints.',
      activeRole: 'Active role',
      roles: {
        user: { title: 'Seeker', subtitle: 'Starter profile', description: 'For a smooth entry into the service ecosystem.', servicesHint: ['Media', 'News', 'Library', 'Education'] },
        in_goodness: { title: 'In Goodness', subtitle: 'Sattvic focus', description: 'Nutrition, discipline, practices, and balance services.', servicesHint: ['Cafe', 'Education', 'Services'] },
        yogi: { title: 'Yogi', subtitle: 'Practice and retreats', description: 'For active practice and educational routes.', servicesHint: ['Services', 'Yatra', 'Media'] },
        devotee: { title: 'Devotee', subtitle: 'Seva and community', description: 'A profile for service, yatras, and deep involvement.', servicesHint: ['Seva', 'Charity', 'Yatra', 'News'] },
      },
    },
  } as const;
  const language = i18n.language === 'ru' ? 'ru' : i18n.language === 'hi' ? 'hi' : 'en';
  const localized = roleCopy[language];
  const resolveLocalizedRole = (role: string) => (
    localized.roles[role as keyof typeof localized.roles] || localized.roles.user
  );
  const [infoRole, setInfoRole] = useState<PortalRole | null>(null);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!autoOpenHint || infoRole || autoOpenedRef.current) {
      return;
    }
    const task = InteractionManager.runAfterInteractions(() => {
      autoOpenedRef.current = true;
      setInfoRole((selectedRole as PortalRole) || 'user');
    });
    return () => task.cancel();
  }, [autoOpenHint, infoRole, selectedRole]);

  const activeOption = useMemo(
    () => ROLE_OPTIONS.find((o) => o.id === infoRole) || ROLE_OPTIONS[0],
    [infoRole]
  );

  const servicesHint = useMemo(() => {
    if (!infoRole) return [];
    const fromBlueprint = blueprints?.[infoRole]?.servicesHint;
    if (fromBlueprint && fromBlueprint.length > 0) return [...fromBlueprint];
    return [...(resolveLocalizedRole(infoRole).servicesHint || [])];
  }, [blueprints, infoRole, localized.roles]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{localized.sectionTitle}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {localized.sectionSubtitle}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {ROLE_OPTIONS.map((option) => {
          const selected = selectedRole === option.id;
          const optionCopy = resolveLocalizedRole(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelectRole(option.id)}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              selected && {
                borderColor: option.highlightColor,
                shadowColor: option.highlightColor,
                shadowOpacity: 0.22,
                shadowRadius: 10,
                  elevation: 5,
                },
              ]}
              testID={`role-card-${option.id}`}
            >
              <View style={[styles.topAccent, { backgroundColor: option.highlightColor }]} />

              <View style={styles.imageWrap}>
                <Image source={option.image} style={styles.image} resizeMode="cover" />
                <Pressable
                  onPress={() => setInfoRole(option.id)}
                  hitSlop={10}
                  style={[styles.helpButton, { backgroundColor: colors.overlay, borderColor: colors.border }]}
                  testID={`role-help-${option.id}`}
                >
                  <HelpCircle size={16} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={styles.content}>
                <View style={styles.titleRow}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }, selected && { color: option.highlightColor }]}>
                  {optionCopy.title}
                </Text>
                  <View style={[styles.iconBadge, { backgroundColor: `${option.highlightColor}20` }]}>
                    {roleIcon(option.id, option.highlightColor)}
                  </View>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{optionCopy.subtitle}</Text>
                <Text style={[styles.cardDescription, { color: colors.textPrimary }]}>{optionCopy.description}</Text>

                {selected && (
                  <View style={[styles.selectedChip, { backgroundColor: option.highlightColor }]}>
                    <Text style={styles.selectedText}>{localized.activeRole}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <RoleInfoModal
        visible={!!infoRole}
        title={resolveLocalizedRole(activeOption.id).title}
        servicesHint={servicesHint}
        role={infoRole || selectedRole}
        onClose={() => setInfoRole(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(248,250,252,0.82)',
    lineHeight: 17,
  },
  row: {
    paddingHorizontal: 16,
    paddingRight: 26,
    gap: 12,
  },
  card: {
    width: 224,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(15,23,42,0.5)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 5,
  },
  topAccent: {
    height: 4,
  },
  imageWrap: {
    position: 'relative',
    padding: 10,
    paddingBottom: 8,
  },
  image: {
    width: '100%',
    height: 96,
    borderRadius: 10,
  },
  helpButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(248,250,252,0.7)',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(248,250,252,0.85)',
    lineHeight: 16,
  },
  selectedChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
