/**
 * MyServicesScreen - Экран "Мои сервисы" (для специалиста)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
    ArrowLeft,
    Plus,
    Eye,
    EyeOff,
    Edit3,
    Trash2,
    Calendar,
    Users,
    Star,
    Sparkles,
    Brain,
    Target,
    Infinity as InfinityIcon,
    Flame,
    BookOpen,
    Leaf,
    LayoutGrid,
} from 'lucide-react-native';
import {
    Service,
    ServiceStatus,
    getMyServices,
    deleteService,
    publishService,
    pauseService,
    CATEGORY_LABELS,
    CATEGORY_ICON_NAMES,
} from '../../../services/serviceService';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string }> = {
    draft: { label: 'Черновик', color: 'rgb(158,158,158)' },
    active: { label: 'Активен', color: 'rgb(76,175,80)' },
    paused: { label: 'Приостановлен', color: 'rgb(255,165,0)' },
    archived: { label: 'Архив', color: 'rgb(97,97,97)' },
};

const CategoryIcon = ({ name, color, size }: { name: string, color: string, size: number }) => {
    switch (name) {
        case 'Star': return <Star size={size} color={color} />;
        case 'Brain': return <Brain size={size} color={color} />;
        case 'Target': return <Target size={size} color={color} />;
        case 'Infinity': return <InfinityIcon size={size} color={color} />;
        case 'Flame': return <Flame size={size} color={color} />;
        case 'BookOpen': return <BookOpen size={size} color={color} />;
        case 'Leaf': return <Leaf size={size} color={color} />;
        case 'Sparkles': return <Sparkles size={size} color={color} />;
        default: return <Sparkles size={size} color={color} />;
    }
};

export default function MyServicesScreen() {
    const navigation = useNavigation<any>();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const isMountedRef = useRef(true);
    const latestLoadRequestRef = useRef(0);
    const actionLocksRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
            actionLocksRef.current.clear();
        };
    }, []);

    const loadServices = useCallback(async (isRefresh = false) => {
        const requestId = ++latestLoadRequestRef.current;
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await getMyServices();
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            setServices(response.services || []);
        } catch (error) {
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            console.log('[MyServices] Failed to load services (expected if none/unauthorized):', error);
            setServices([]);
        } finally {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    // Reload on focus
    useFocusEffect(
        useCallback(() => {
            loadServices();
        }, [loadServices])
    );

    const handleRefresh = () => {
        if (refreshing || loading) {
            return;
        }
        void loadServices(true);
    };

    const handleCreateService = () => {
        navigation.navigate('CreateService');
    };

    const handleEditService = (service: Service) => {
        navigation.navigate('CreateService', { serviceId: service.id });
    };

    const handleViewService = (service: Service) => {
        navigation.navigate('ServiceDetail', { serviceId: service.id });
    };

    const handleToggleStatus = async (service: Service) => {
        if (actionLocksRef.current.has(service.id)) {
            return;
        }
        actionLocksRef.current.add(service.id);
        try {
            if (service.status === 'active') {
                await pauseService(service.id);
                if (isMountedRef.current) {
                    Alert.alert('Готово', 'Услуга приостановлена');
                }
            } else {
                await publishService(service.id);
                if (isMountedRef.current) {
                    Alert.alert('Готово', 'Услуга опубликована');
                }
            }
            await loadServices(true);
        } catch (error: any) {
            if (isMountedRef.current) {
                Alert.alert('Ошибка', error.message || 'Не удалось изменить статус');
            }
        } finally {
            actionLocksRef.current.delete(service.id);
        }
    };

    const handleDeleteService = (service: Service) => {
        Alert.alert(
            'Удалить услугу?',
            `Вы уверены, что хотите удалить "${service.title}"? Это действие нельзя отменить.`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        if (actionLocksRef.current.has(service.id)) {
                            return;
                        }
                        actionLocksRef.current.add(service.id);
                        try {
                            await deleteService(service.id);
                            if (isMountedRef.current) {
                                Alert.alert('Готово', 'Услуга удалена');
                            }
                            await loadServices(true);
                        } catch (error: any) {
                            if (isMountedRef.current) {
                                Alert.alert('Ошибка', error.message || 'Не удалось удалить');
                            }
                        } finally {
                            actionLocksRef.current.delete(service.id);
                        }
                    },
                },
            ]
        );
    };

    const handleManageSchedule = (service: Service) => {
        navigation.navigate('ServiceSchedule', { serviceId: service.id });
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <LayoutGrid size={48} color="rgba(255, 255, 255, 0.1)" />
            </View>
            <Text style={styles.emptyTitle}>У вас пока нет услуг</Text>
            <Text style={styles.emptySubtitle}>
                Создайте свою первую услугу и начните принимать записи от клиентов
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateService}>
                <Plus size={20} color={colors.textPrimary} />
                <Text style={styles.createButtonText}>Добавить первую услугу</Text>
            </TouchableOpacity>
        </View>
    );

    const renderServiceCard = (service: Service) => {
        const statusConfig = STATUS_CONFIG[service.status];
        const isActive = service.status === 'active';
        const iconName = CATEGORY_ICON_NAMES[service.category] || 'Sparkles';

        return (
            <View key={service.id} style={styles.serviceCard}>
                {/* Cover & Status */}
                <View style={styles.cardHeader}>
                    {service.coverImageUrl ? (
                        <Image source={{ uri: service.coverImageUrl }} style={styles.coverImage} />
                    ) : (
                        <LinearGradient
                            colors={[roleTheme.gradient[1], roleTheme.gradient[2]]}
                            style={styles.coverPlaceholder}
                        >
                            <CategoryIcon name={iconName} size={40} color={colors.accentSoft} />
                        </LinearGradient>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                        <Text style={[styles.statusText, { color: colors.textPrimary }]}>
                            {statusConfig.label.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Info */}
                <View style={styles.cardBody}>
                    <Text style={styles.serviceTitle} numberOfLines={2}>{service.title}</Text>
                    <View style={styles.categoryRow}>
                        <CategoryIcon name={iconName} size={12} color={colors.accent} />
                        <Text style={styles.serviceCategory}>
                            {CATEGORY_LABELS[service.category]}
                        </Text>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Users size={14} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.statValue}>{service.bookingsCount || 0}</Text>
                            <Text style={styles.statLabel}>записей</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Eye size={14} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.statValue}>{service.viewsCount || 0}</Text>
                            <Text style={styles.statLabel}>просмотров</Text>
                        </View>
                        {service.rating > 0 && (
                            <View style={styles.statItem}>
                                <Star size={14} color={colors.accent} fill={colors.accent} />
                                <Text style={styles.statValue}>{service.rating.toFixed(1)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Actions Grid */}
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditService(service)}
                    >
                        <Edit3 size={18} color={colors.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleViewService(service)}
                    >
                        <Eye size={18} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, isActive && styles.actionButtonActive]}
                        onPress={() => handleToggleStatus(service)}
                    >
                        {isActive ? (
                            <EyeOff size={18} color={colors.warning} />
                        ) : (
                            <Eye size={18} color={colors.success} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteService(service)}
                    >
                        <Trash2 size={18} color={colors.danger} />
                    </TouchableOpacity>
                </View>

                {/* Schedule Link */}
                <TouchableOpacity
                    style={styles.scheduleLink}
                    onPress={() => handleManageSchedule(service)}
                >
                    <Calendar size={16} color={colors.accent} />
                    <Text style={[styles.scheduleLinkText, { color: colors.accent }]}>Настроить расписание и слоты</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Fixed Premium Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerCircleButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Управление услугами</Text>
                        <Text style={styles.headerSubtitle}>Ваши духовные предложения</Text>
                    </View>
                    <TouchableOpacity style={styles.addButton} onPress={handleCreateService}>
                        <Plus size={22} color={colors.accent} />
                    </TouchableOpacity>
                </View>

                {/* Content Body */}
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                ) : (
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={colors.accent}
                            />
                        }
                    >
                        {services.length === 0 ? (
                            renderEmptyState()
                        ) : (
                            services.map(renderServiceCard)
                        )}
                        <View style={{ height: 100 }} />
                    </ScrollView>
                )}

                {/* Floating Action Button Mastery */}
                {services.length > 0 && (
                    <TouchableOpacity
                        style={styles.fab}
                        onPress={handleCreateService}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={[colors.accent, roleTheme.accentStrong]}
                            style={styles.fabGradient}
                        >
                            <Plus size={28} color={colors.textPrimary} />
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerCircleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
        textAlign: 'center',
    },
    headerSubtitle: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accentSoft,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.accentSoft,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    emptyContainer: {
        paddingTop: 100,
        alignItems: 'center',
    },
    emptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyTitle: {
        color: colors.textPrimary,
        fontSize: 22,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 16,
    },
    emptySubtitle: {
        color: colors.textSecondary,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.accent,
        paddingHorizontal: 30,
        paddingVertical: 18,
        borderRadius: 24,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    createButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '800',
    },
    serviceCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 32,
        marginBottom: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        height: 200,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 8,
        zIndex: 10,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cardBody: {
        padding: 24,
    },
    serviceTitle: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
        lineHeight: 28,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    serviceCategory: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 24,
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 20,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '900',
        marginTop: 4,
    },
    statLabel: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    cardActions: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingBottom: 24,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionButtonActive: {
        backgroundColor: colors.accentSoft,
        borderColor: colors.accentSoft,
    },
    scheduleLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: colors.accentSoft,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    scheduleLinkText: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: '800',
    },
    fab: {
        position: 'absolute',
        bottom: 40,
        right: 24,
        width: 68,
        height: 68,
        borderRadius: 34,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
