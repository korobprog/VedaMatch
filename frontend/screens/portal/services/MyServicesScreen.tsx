/**
 * MyServicesScreen - Экран "Мои сервисы" (для специалиста)
 */
import React, { useState, useEffect, useCallback } from 'react';
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

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string }> = {
    draft: { label: 'Черновик', color: '#9E9E9E' },
    active: { label: 'Активен', color: '#4CAF50' },
    paused: { label: 'Приостановлен', color: '#FFA500' },
    archived: { label: 'Архив', color: '#616161' },
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

    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadServices = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await getMyServices();
            setServices(response.services || []);
        } catch (error) {
            console.log('[MyServices] Failed to load services (expected if none/unauthorized):', error);
            setServices([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Reload on focus
    useFocusEffect(
        useCallback(() => {
            loadServices();
        }, [loadServices])
    );

    const handleRefresh = () => {
        loadServices(true);
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
        try {
            if (service.status === 'active') {
                await pauseService(service.id);
                Alert.alert('Готово', 'Услуга приостановлена');
            } else {
                await publishService(service.id);
                Alert.alert('Готово', 'Услуга опубликована');
            }
            loadServices(true);
        } catch (error: any) {
            Alert.alert('Ошибка', error.message || 'Не удалось изменить статус');
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
                        try {
                            await deleteService(service.id);
                            Alert.alert('Готово', 'Услуга удалена');
                            loadServices(true);
                        } catch (error: any) {
                            Alert.alert('Ошибка', error.message || 'Не удалось удалить');
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
                <Plus size={20} color="#000" />
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
                            colors={['#1a1a2e', '#16213e']}
                            style={styles.coverPlaceholder}
                        >
                            <CategoryIcon name={iconName} size={40} color="rgba(255, 215, 0, 0.4)" />
                        </LinearGradient>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                        <Text style={[styles.statusText, { color: '#fff' }]}>
                            {statusConfig.label.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Info */}
                <View style={styles.cardBody}>
                    <Text style={styles.serviceTitle} numberOfLines={2}>{service.title}</Text>
                    <View style={styles.categoryRow}>
                        <CategoryIcon name={iconName} size={12} color="#FFD700" />
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
                                <Star size={14} color="#FFD700" fill="#FFD700" />
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
                        <Edit3 size={18} color="#FFD700" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleViewService(service)}
                    >
                        <Eye size={18} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, isActive && styles.actionButtonActive]}
                        onPress={() => handleToggleStatus(service)}
                    >
                        {isActive ? (
                            <EyeOff size={18} color="#FFA500" />
                        ) : (
                            <Eye size={18} color="#4CAF50" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteService(service)}
                    >
                        <Trash2 size={18} color="#F44336" />
                    </TouchableOpacity>
                </View>

                {/* Schedule Link */}
                <TouchableOpacity
                    style={styles.scheduleLink}
                    onPress={() => handleManageSchedule(service)}
                >
                    <Calendar size={16} color="#FFD700" />
                    <Text style={styles.scheduleLinkText}>Настроить расписание и слоты</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <LinearGradient colors={['#0a0a14', '#12122b', '#0a0a14']} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Fixed Premium Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerCircleButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Управление услугами</Text>
                        <Text style={styles.headerSubtitle}>Ваши духовные предложения</Text>
                    </View>
                    <TouchableOpacity style={styles.addButton} onPress={handleCreateService}>
                        <Plus size={22} color="#F59E0B" />
                    </TouchableOpacity>
                </View>

                {/* Content Body */}
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#F59E0B" />
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
                                tintColor="#F59E0B"
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
                            colors={['#F59E0B', '#D97706']}
                            style={styles.fabGradient}
                        >
                            <Plus size={28} color="#000" />
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
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
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerCircleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
        textAlign: 'center',
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.1)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 22,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 16,
    },
    emptySubtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
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
        backgroundColor: '#F59E0B',
        paddingHorizontal: 30,
        paddingVertical: 18,
        borderRadius: 24,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    createButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '800',
    },
    serviceCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 32,
        marginBottom: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
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
        color: '#fff',
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
        color: '#F59E0B',
        fontSize: 13,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 20,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        marginTop: 4,
    },
    statLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    actionButtonActive: {
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        borderColor: 'rgba(245, 158, 11, 0.1)',
    },
    scheduleLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    scheduleLinkText: {
        color: '#F59E0B',
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
        shadowColor: '#F59E0B',
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
