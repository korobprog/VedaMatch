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
} from 'lucide-react-native';
import {
    Service,
    ServiceStatus,
    getMyServices,
    deleteService,
    publishService,
    pauseService,
    CATEGORY_LABELS,
    CATEGORY_ICONS,
} from '../../../services/serviceService';

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string }> = {
    draft: { label: 'Черновик', color: '#9E9E9E' },
    active: { label: 'Активен', color: '#4CAF50' },
    paused: { label: 'Приостановлен', color: '#FFA500' },
    archived: { label: 'Архив', color: '#616161' },
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
            console.error('Failed to load services:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить сервисы');
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
                Alert.alert('Готово', 'Сервис приостановлен');
            } else {
                await publishService(service.id);
                Alert.alert('Готово', 'Сервис опубликован');
            }
            loadServices(true);
        } catch (error: any) {
            Alert.alert('Ошибка', error.message || 'Не удалось изменить статус');
        }
    };

    const handleDeleteService = (service: Service) => {
        Alert.alert(
            'Удалить сервис?',
            `Вы уверены, что хотите удалить "${service.title}"? Это действие нельзя отменить.`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteService(service.id);
                            Alert.alert('Готово', 'Сервис удалён');
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
            <Text style={styles.emptyIcon}>🔮</Text>
            <Text style={styles.emptyTitle}>У вас пока нет сервисов</Text>
            <Text style={styles.emptySubtitle}>
                Создайте свой первый сервис и начните принимать записи
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateService}>
                <Plus size={20} color="#1a1a2e" />
                <Text style={styles.createButtonText}>Создать сервис</Text>
            </TouchableOpacity>
        </View>
    );

    const renderServiceCard = (service: Service) => {
        const statusConfig = STATUS_CONFIG[service.status];
        const isActive = service.status === 'active';

        return (
            <View key={service.id} style={styles.serviceCard}>
                {/* Cover & Status */}
                <View style={styles.cardHeader}>
                    {service.coverImageUrl ? (
                        <Image source={{ uri: service.coverImageUrl }} style={styles.coverImage} />
                    ) : (
                        <View style={styles.coverPlaceholder}>
                            <Text style={styles.placeholderEmoji}>{CATEGORY_ICONS[service.category]}</Text>
                        </View>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                </View>

                {/* Info */}
                <View style={styles.cardBody}>
                    <Text style={styles.serviceTitle} numberOfLines={2}>{service.title}</Text>
                    <Text style={styles.serviceCategory}>
                        {CATEGORY_ICONS[service.category]} {CATEGORY_LABELS[service.category]}
                    </Text>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Users size={14} color="rgba(255,255,255,0.5)" />
                            <Text style={styles.statValue}>{service.bookingsCount}</Text>
                            <Text style={styles.statLabel}>записей</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Eye size={14} color="rgba(255,255,255,0.5)" />
                            <Text style={styles.statValue}>{service.viewsCount}</Text>
                            <Text style={styles.statLabel}>просмотров</Text>
                        </View>
                        {service.rating > 0 && (
                            <View style={styles.statItem}>
                                <Star size={14} color="#FFD700" />
                                <Text style={styles.statValue}>{service.rating.toFixed(1)}</Text>
                                <Text style={styles.statLabel}>({service.reviewsCount})</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditService(service)}
                    >
                        <Edit3 size={16} color="#FFD700" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleViewService(service)}
                    >
                        <Eye size={16} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, isActive && styles.actionButtonActive]}
                        onPress={() => handleToggleStatus(service)}
                    >
                        {isActive ? (
                            <EyeOff size={16} color="#FFA500" />
                        ) : (
                            <Eye size={16} color="#4CAF50" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteService(service)}
                    >
                        <Trash2 size={16} color="#F44336" />
                    </TouchableOpacity>
                </View>

                {/* Schedule Button */}
                <TouchableOpacity
                    style={styles.scheduleButton}
                    onPress={() => handleManageSchedule(service)}
                >
                    <Calendar size={16} color="#FFD700" />
                    <Text style={styles.scheduleButtonText}>Настроить расписание</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Мои сервисы</Text>
                    <TouchableOpacity style={styles.addButton} onPress={handleCreateService}>
                        <Plus size={24} color="#FFD700" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#FFD700" />
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
                                tintColor="#FFD700"
                            />
                        }
                    >
                        {services.length === 0 ? (
                            renderEmptyState()
                        ) : (
                            services.map(renderServiceCard)
                        )}
                        <View style={{ height: 32 }} />
                    </ScrollView>
                )}

                {/* FAB */}
                {services.length > 0 && (
                    <TouchableOpacity style={styles.fab} onPress={handleCreateService}>
                        <Plus size={28} color="#1a1a2e" />
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
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 12,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
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
        padding: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 32,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFD700',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 28,
    },
    createButtonText: {
        color: '#1a1a2e',
        fontSize: 15,
        fontWeight: '600',
    },
    serviceCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: 120,
    },
    coverPlaceholder: {
        width: '100%',
        height: 120,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 40,
    },
    statusBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    cardBody: {
        padding: 16,
    },
    serviceTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 6,
    },
    serviceCategory: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 13,
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    statLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
    },
    cardActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonActive: {
        backgroundColor: 'rgba(255, 165, 0, 0.15)',
    },
    scheduleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    scheduleButtonText: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: '500',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFD700',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
