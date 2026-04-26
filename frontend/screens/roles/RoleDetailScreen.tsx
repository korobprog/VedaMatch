import React, { useCallback, useMemo, useState } from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, ChevronRight, Compass, HelpCircle, Heart, Infinity, Leaf } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROLE_OPTIONS, RoleOption } from '../../constants/roleOptions';
import { PortalRole } from '../../types/portalBlueprint';
import { RootStackParamList } from '../../types/navigation';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { RoleInfoModal } from '../../components/roles/RoleInfoModal';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleDetail'>;
type DisplayRole = 'user' | 'in_goodness' | 'yogi' | 'devotee';

const normalizeDisplayRole = (role: PortalRole): DisplayRole => {
    if (role === 'in_goodness' || role === 'yogi' || role === 'devotee') {
        return role;
    }
    return 'user';
};

const roleIcon = (role: string, color: string) => {
    if (role === 'in_goodness') return <Leaf size={14} color={color} />;
    if (role === 'yogi') return <Infinity size={14} color={color} />;
    if (role === 'devotee') return <Heart size={14} color={color} />;
    return <Compass size={14} color={color} />;
};

const RoleDetailScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const params = route.params;
    const initialRole = normalizeDisplayRole((params?.role as PortalRole) || 'user');

    const [selectedRole, setSelectedRole] = useState<DisplayRole>(initialRole);
    const [infoRole, setInfoRole] = useState<PortalRole | null>(null);

    // Sync selectedRole when params.role changes (e.g., navigating back and forth)
    React.useEffect(() => {
        const newRole = normalizeDisplayRole((params?.role as PortalRole) || 'user');
        setSelectedRole(newRole);
    }, [params?.role]);

    const { colors, roleTheme } = useRoleTheme(selectedRole, true);

    const title = t('roleDetail.title', { defaultValue: 'Выберите роль' });
    const subtitle = t('roleDetail.subtitle', { defaultValue: 'Роль влияет на быстрый доступ, приоритет сервисов и подсказки.' });
    const ctaText = params?.context === 'settings'
        ? t('roleDetail.ctaSettings', { defaultValue: 'Сохранить роль' })
        : t('roleDetail.cta', { defaultValue: 'Заполнить профиль' });

    const roleNames = useMemo(() => ({
        user: t('roleDetail.roles.user', { defaultValue: 'Искатель' }),
        in_goodness: t('roleDetail.roles.inGoodness', { defaultValue: 'В благости' }),
        yogi: t('roleDetail.roles.yogi', { defaultValue: 'Йог' }),
        devotee: t('roleDetail.roles.devotee', { defaultValue: 'Преданный' }),
    }), [t]);
    const roleSubtitles = useMemo(() => ({
        user: t('roleDetail.roles.userSub', { defaultValue: 'Стартовый профиль' }),
        in_goodness: t('roleDetail.roles.inGoodnessSub', { defaultValue: 'Саттвичный фокус' }),
        yogi: t('roleDetail.roles.yogiSub', { defaultValue: 'Практика и ретриты' }),
        devotee: t('roleDetail.roles.devoteeSub', { defaultValue: 'Сева и община' }),
    }), [t]);
    const roleDescriptions = useMemo(() => ({
        user: t('roleDetail.roles.userDesc', { defaultValue: 'Для мягкого входа в экосистему сервисов.' }),
        in_goodness: t('roleDetail.roles.inGoodnessDesc', { defaultValue: 'Питание, дисциплина, практики и сервисы баланса.' }),
        yogi: t('roleDetail.roles.yogiDesc', { defaultValue: 'Для активной практики и образовательных маршрутов.' }),
        devotee: t('roleDetail.roles.devoteeDesc', { defaultValue: 'Профиль для служения, ятр и глубокого вовлечения.' }),
    }), [t]);

    const activeRoleData = useMemo(() => {
        const roleOption = ROLE_OPTIONS.find((o) => o.id === selectedRole) || ROLE_OPTIONS[0];
        return {
            ...roleOption,
            title: roleNames[selectedRole as keyof typeof roleNames],
            subtitle: roleSubtitles[selectedRole as keyof typeof roleSubtitles],
            description: roleDescriptions[selectedRole as keyof typeof roleDescriptions],
            servicesHint: roleOption?.servicesHint || [],
        };
    }, [selectedRole, roleNames, roleSubtitles, roleDescriptions]);

    const resolveLocalizedRole = useCallback((roleId: string) => ({
        title: roleNames[normalizeDisplayRole(roleId as PortalRole)] || roleNames.user,
        subtitle: roleSubtitles[normalizeDisplayRole(roleId as PortalRole)] || roleSubtitles.user,
        description: roleDescriptions[normalizeDisplayRole(roleId as PortalRole)] || roleDescriptions.user,
        servicesHint: ROLE_OPTIONS.find((o) => o.id === normalizeDisplayRole(roleId as PortalRole))?.servicesHint || [],
    }), [roleNames, roleSubtitles, roleDescriptions]);

    const handleContinue = () => {
        navigation.navigate('RoleProfileForm', {
            role: selectedRole,
            context: params?.context || 'registration',
            email: params?.email,
            password: params?.password,
            inviteCode: params?.inviteCode,
        });
    };

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Portal');
        }
    };

    const renderRoleChip = useCallback((option: RoleOption) => {
        const isSelected = selectedRole === normalizeDisplayRole(option.id as PortalRole);
        const normalizedRoleId = normalizeDisplayRole(option.id as PortalRole);
        const localizedData = resolveLocalizedRole(normalizedRoleId);

        // Make active color brighter and more visible
        return (
            <Pressable
                key={option.id}
                onPress={() => setSelectedRole(normalizedRoleId)}
                style={[
                    styles.roleChip,
                    {
                        backgroundColor: isSelected ? `${option.highlightColor}22` : 'rgba(30,41,59,0.9)',
                        borderColor: isSelected ? option.highlightColor : `${option.highlightColor}80`,
                        borderWidth: isSelected ? 2.5 : 2,
                    },
                    isSelected && styles.roleChipSelected,
                ]}
            >
                <View style={[styles.roleChipIcon, { backgroundColor: isSelected ? 'rgba(255,255,255,0.35)' : `${option.highlightColor}60` }]}>
                    {roleIcon(normalizedRoleId, '#FFFFFF')}
                </View>
                <View style={styles.roleChipTextContainer}>
                    <Text
                        style={[
                            styles.roleChipText,
                            {
                                color: '#FFFFFF',
                                fontWeight: isSelected ? '800' : '600',
                                textShadowColor: 'rgba(0,0,0,0.4)',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 3,
                            },
                        ]}
                        numberOfLines={1}
                    >
                        {localizedData.title}
                    </Text>
                </View>
                {isSelected && (
                    <View style={[styles.checkBadge, { borderColor: option.highlightColor }]}>
                        <Text style={[styles.checkBadgeText, { color: option.highlightColor }]}>✓</Text>
                    </View>
                )}
            </Pressable>
        );
    }, [selectedRole, resolveLocalizedRole]);

    return (
        <View style={[styles.container, { backgroundColor: colors.overlay }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={handleBack}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
                >
                    <ArrowLeft size={20} color="#F8FAFC" />
                </Pressable>
                <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
                    {title}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: insets.bottom + 120 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Role Chips (Horizontal) */}
                <View style={styles.chipsContainer}>
                    {ROLE_OPTIONS.map(renderRoleChip)}
                </View>

                <Text style={styles.screenSubtitle}>
                    {subtitle}
                </Text>

                {/* Active Role Details */}
                <View
                    style={[
                        styles.roleDetailsCard,
                        {
                            backgroundColor: 'rgba(30,41,59,0.95)',
                            borderColor: activeRoleData.highlightColor,
                            borderWidth: 2,
                        },
                    ]}
                >
                    {/* Top Accent */}
                    <View style={[styles.topAccent, { backgroundColor: activeRoleData.highlightColor }]} />

                    {/* Role Image */}
                    <View style={styles.imageContainer}>
                        <Image
                            key={selectedRole}
                            source={activeRoleData.image}
                            defaultSource={activeRoleData.image as number}
                            style={styles.roleImage}
                            resizeMode="cover"
                            fadeDuration={0}
                        />
                        <Pressable
                            onPress={() => setInfoRole(selectedRole)}
                            hitSlop={10}
                            style={styles.helpButton}
                        >
                            <HelpCircle size={18} color="#FFFFFF" />
                        </Pressable>
                    </View>

                    {/* Role Info */}
                    <View style={styles.roleInfo}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.roleTitle, { color: '#FFFFFF' }]}>
                                {activeRoleData.title}
                            </Text>
                            <View style={[styles.iconBadge, { backgroundColor: `${activeRoleData.highlightColor}30` }]}>
                                {roleIcon(selectedRole, activeRoleData.highlightColor)}
                            </View>
                        </View>

                        <Text style={[styles.roleSubtitle, { color: activeRoleData.highlightColor }]}>
                            {activeRoleData.subtitle}
                        </Text>

                        <Text style={[styles.roleDescription, { color: '#E2E8F0' }]}>
                            {activeRoleData.description}
                        </Text>

                        {/* Services Hint */}
                        <View style={styles.servicesContainer}>
                            <Text style={[styles.servicesLabel, { color: colors.textSecondary }]}>
                                {t('roleDetail.availableServices', { defaultValue: 'Доступные сервисы' })}:
                            </Text>
                            <View style={styles.servicesList}>
                                {activeRoleData.servicesHint.map((service) => (
                                    <View
                                        key={service}
                                        style={[
                                            styles.serviceTag,
                                            {
                                                backgroundColor: `${activeRoleData.highlightColor}15`,
                                                borderColor: `${activeRoleData.highlightColor}40`,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.serviceTagText, { color: activeRoleData.highlightColor }]}>
                                            {service}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Continue Button */}
                <LinearGradient
                    colors={[roleTheme.accent, roleTheme.accentStrong]}
                    style={styles.continueButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <Pressable
                        onPress={handleContinue}
                        style={styles.continueButtonInner}
                    >
                        <Text style={styles.continueButtonText}>{ctaText}</Text>
                        <ChevronRight size={20} color="#FFFFFF" />
                    </Pressable>
                </LinearGradient>
            </ScrollView>

            {/* Role Info Modal */}
            <RoleInfoModal
                visible={!!infoRole}
                title={resolveLocalizedRole(selectedRole).title}
                servicesHint={resolveLocalizedRole(selectedRole).servicesHint}
                role={selectedRole}
                onClose={() => setInfoRole(null)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    chipsContainer: {
        gap: 8,
        marginBottom: 16,
    },
    roleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 2,
        minHeight: 52,
    },
    roleChipSelected: {
        shadowColor: '#000',
        shadowOpacity: 0.16,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 5,
    },
    roleChipIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    roleChipTextContainer: {
        flex: 1,
        alignItems: 'flex-start',
    },
    roleChipText: {
        fontSize: 15,
    },
    checkBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: -6,
        right: -6,
        borderWidth: 2,
    },
    checkBadgeText: {
        fontSize: 12,
        fontWeight: '800',
    },
    screenSubtitle: {
        color: 'rgba(226,232,240,0.82)',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 16,
        paddingHorizontal: 2,
    },
    roleDetailsCard: {
        borderRadius: 20,
        borderWidth: 2,
        overflow: 'visible',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 6,
        marginBottom: 24,
    },
    topAccent: {
        height: 4,
    },
    imageContainer: {
        padding: 16,
        paddingBottom: 12,
        minHeight: 200,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    roleImage: {
        width: '100%',
        height: 180,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    helpButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(15,23,42,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleInfo: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    roleTitle: {
        fontSize: 24,
        fontWeight: '800',
    },
    iconBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleSubtitle: {
        fontSize: 14,
        marginBottom: 12,
    },
    roleDescription: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 20,
    },
    servicesContainer: {
        gap: 10,
    },
    servicesLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    servicesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    serviceTag: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
    },
    serviceTagText: {
        fontSize: 12,
        fontWeight: '600',
    },
    continueButton: {
        borderRadius: 16,
        shadowColor: '#F57C00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
        marginBottom: 24,
        overflow: 'hidden',
    },
    continueButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});

export default RoleDetailScreen;
