import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    Calendar, MapPin, Users, Share2, MessageCircle,
    CheckCircle, XCircle, Info, DollarSign, Home, Bus, Globe,
    ChevronLeft
} from 'lucide-react-native';
import { yatraService } from '../../../services/yatraService';
import { Yatra, YatraParticipant, YATRA_THEME_LABELS } from '../../../types/yatra';
import LinearGradient from 'react-native-linear-gradient';
import { useUser } from '../../../context/UserContext';
import OrganizerBadge from '../../../components/travel/OrganizerBadge';
import YatraReviewsSection from '../../../components/travel/YatraReviewsSection';

const { width } = Dimensions.get('window');

const YatraDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { yatraId } = route.params;

    const [yatra, setYatra] = useState<Yatra | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [myParticipation, setMyParticipation] = useState<YatraParticipant | null>(null);

    const { user } = useUser(); // Get current user
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const isOrganizer = (yatra && user && user.ID && yatra.organizerId === user.ID) || isAdmin;

    const [pendingParticipants, setPendingParticipants] = useState<YatraParticipant[]>([]);


    // Load yatra details and user's participation status
    const loadYatra = useCallback(async () => {
        try {
            setLoading(true);
            const data = await yatraService.getYatra(yatraId);
            setYatra(data);

            // Load user's participation status
            if (user && user.ID) {
                try {
                    const participation = await yatraService.getMyParticipation(yatraId);
                    setMyParticipation(participation);
                } catch (e) {
                    console.log('No participation found');
                }
            }

            // Check if user is organizer or admin to fetch pending requests
            if (user && user.ID && (data.organizerId === user.ID || user.role === 'admin' || user.role === 'superadmin')) {
                try {
                    const pending = await yatraService.getPendingParticipants(yatraId);
                    setPendingParticipants(pending);
                } catch (e) {
                    console.error('Failed to load pending participants', e);
                }
            }
        } catch (error) {
            console.error('Error loading yatra details:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить информацию о туре');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    }, [yatraId, navigation, user]);

    const handleJoin = async () => {
        if (!yatra) return;

        try {
            setJoining(true);
            await yatraService.joinYatra(yatra.id, { message: 'Хочу присоединиться!' });
            Alert.alert('Заявка отправлена', 'Организатор рассмотрит вашу заявку.');
            loadYatra(); // Reload to update status
        } catch (error: any) {
            console.error('Error joining yatra:', error);
            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось отправить заявку');
        } finally {
            setJoining(false);
        }
    };

    const handleApprove = async (participantId: number) => {
        try {
            await yatraService.approveParticipant(yatraId, participantId);
            Alert.alert('Успех', 'Участник одобрен');
            loadYatra();
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось одобрить участника');
        }
    };

    const handleReject = async (participantId: number) => {
        try {
            await yatraService.rejectParticipant(yatraId, participantId);
            Alert.alert('Успех', 'Заявка отклонена');
            loadYatra();
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось отклонить заявку');
        }
    };

    const handleShare = async () => {
        // Implement share logic
    };

    useEffect(() => {
        loadYatra();
    }, [loadYatra]);

    if (loading || !yatra) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF9500" />
            </View>
        );
    }

    const routePoints = yatraService.parseRoutePoints(yatra.routePoints);
    const photos = yatraService.parsePhotos(yatra.photos);
    const duration = yatraService.getTripDuration(yatra.startDate, yatra.endDate);

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: yatraService.getImageUrl(yatra.coverImageUrl || null) }}
                        style={styles.coverImage}
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.gradient}
                    />

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2} />
                    </TouchableOpacity>

                    <View style={styles.headerContent}>
                        <View style={styles.themeBadge}>
                            <Text style={styles.themeText}>
                                {YATRA_THEME_LABELS[yatra.theme] || yatra.theme}
                            </Text>
                        </View>
                        <Text style={styles.title}>{yatra.title}</Text>
                        <View style={[styles.locationRow]}>
                            <MapPin size={16} color="#FF9500" />
                            <Text style={styles.locationText}>
                                {yatra.startCity} → {yatra.endCity}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Organizer Info */}
                <View style={styles.organizerSection}>
                    <Text style={styles.sectionLabel}>Организатор</Text>
                    <View style={styles.organizerRow}>
                        <Image
                            source={{ uri: yatra.organizer?.avatarUrl || 'https://via.placeholder.com/50' }}
                            style={styles.organizerAvatar}
                        />
                        <View style={styles.organizerInfo}>
                            <Text style={styles.organizerName}>
                                {yatra.organizer?.spiritualName || yatra.organizer?.karmicName || 'Организатор'}
                            </Text>
                            <Text style={styles.organizerLocation}>
                                {yatra.organizer?.city}, {yatra.organizer?.country}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.messageButton}>
                            <MessageCircle size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    {/* Organizer Badge */}
                    <View style={{ marginTop: 12 }}>
                        <OrganizerBadge userId={yatra.organizerId} variant="compact" />
                    </View>
                </View>

                {/* Organizer Pending Requests & Control Panel */}
                {isOrganizer && (
                    <View style={styles.section}>
                        <View style={styles.infoBox}>
                            <Users size={24} color="#FF9500" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoTitle}>Управление туром</Text>
                                {pendingParticipants.length === 0 ? (
                                    <Text style={styles.infoText}>Нет новых заявок на участие.</Text>
                                ) : (
                                    <>
                                        <Text style={[styles.infoText, { marginBottom: 8 }]}>Новые заявки: {pendingParticipants.length}</Text>
                                        {pendingParticipants.map(participant => (
                                            <View key={participant.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 8 }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Пол-ль #{participant.userId}</Text>
                                                    <Text style={{ color: '#AAA', fontSize: 12 }}>{participant.message || '...'}</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                                    <TouchableOpacity onPress={() => handleApprove(participant.id)}>
                                                        <CheckCircle size={24} color="#34C759" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => handleReject(participant.id)}>
                                                        <XCircle size={24} color="#FF3B30" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </>
                                )}

                                {/* Group Chat Button */}
                                {yatra.chatRoomId && (
                                    <TouchableOpacity
                                        style={styles.chatButton}
                                        onPress={() => navigation.navigate('RoomChat', { roomId: yatra.chatRoomId, roomName: yatra.title + ' - Чат', isYatraChat: true })}
                                    >
                                        <MessageCircle size={20} color="#FFFFFF" />
                                        <Text style={styles.chatButtonText}>Открыть групповой чат</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                )}

                {/* Participant Chat Access (for approved participants) */}
                {!isOrganizer && myParticipation?.status === 'approved' && yatra.chatRoomId && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.participantChatButton}
                            onPress={() => navigation.navigate('RoomChat', { roomId: yatra.chatRoomId, roomName: yatra.title + ' - Чат', isYatraChat: true })}
                        >
                            <MessageCircle size={24} color="#FFFFFF" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.chatButtonText}>Групповой чат участников</Text>
                                <Text style={{ color: '#AAA', fontSize: 12 }}>Общайтесь с группой</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Quick Stats */}
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Calendar size={24} color="#5AC8FA" />
                        <Text style={styles.statLabel}>Даты</Text>
                        <Text style={styles.statValue}>
                            {yatraService.formatDateRange(yatra.startDate, yatra.endDate)}
                        </Text>
                        <Text style={styles.statSub}>{duration} дней</Text>
                    </View>
                    <View style={[styles.statItem, styles.statBorder]}>
                        <Users size={24} color="#34C759" />
                        <Text style={styles.statLabel}>Участники</Text>
                        <Text style={styles.statValue}>
                            {yatra.participantCount}/{yatra.maxParticipants}
                        </Text>
                        <Text style={styles.statSub}>места есть</Text>
                    </View>
                    <View style={styles.statItem}>
                        <DollarSign size={24} color="#FF9500" />
                        <Text style={styles.statLabel}>Бюджет</Text>
                        <Text style={styles.statValue}>
                            {yatra.costEstimate || 'Бесплатно'}
                        </Text>
                        <Text style={styles.statSub}>на человека</Text>
                    </View>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>О путешествии</Text>
                    <Text style={styles.descriptionText}>{yatra.description}</Text>
                </View>

                {/* Logistics */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Детали</Text>

                    {yatra.accommodation && (
                        <View style={styles.detailRow}>
                            <Home size={20} color="#8E8E93" />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailTitle}>Проживание</Text>
                                <Text style={styles.detailText}>{yatra.accommodation}</Text>
                            </View>
                        </View>
                    )}

                    {yatra.transportation && (
                        <View style={styles.detailRow}>
                            <Bus size={20} color="#8E8E93" />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailTitle}>Транспорт</Text>
                                <Text style={styles.detailText}>{yatra.transportation}</Text>
                            </View>
                        </View>
                    )}

                    {yatra.language && (
                        <View style={styles.detailRow}>
                            <Globe size={20} color="#8E8E93" />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailTitle}>Язык группы</Text>
                                <Text style={styles.detailText}>{yatra.language}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Route */}
                {routePoints.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Маршрут</Text>
                        <View style={styles.timeline}>
                            {routePoints.map((point, index) => (
                                <View key={index} style={styles.timelineItem}>
                                    <View style={styles.timelineLeft}>
                                        <View style={[
                                            styles.timelineDot,
                                            index === 0 && styles.startDot,
                                            index === routePoints.length - 1 && styles.endDot
                                        ]} />
                                        {index !== routePoints.length - 1 && <View style={styles.timelineLine} />}
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.pointName}>{point.name}</Text>
                                        {point.description && (
                                            <Text style={styles.pointDesc}>{point.description}</Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Requirements */}
                {yatra.requirements && (
                    <View style={styles.section}>
                        <View style={styles.infoBox}>
                            <Info size={24} color="#FF9500" />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoTitle}>Важно знать</Text>
                                <Text style={styles.infoText}>{yatra.requirements}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Reviews Section */}
                <YatraReviewsSection
                    yatraId={yatraId}
                    yatraStatus={yatra.status}
                    isParticipant={!!myParticipation && myParticipation.status === 'approved'}
                />

            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.actionBar}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Share2 size={24} color="#FFFFFF" />
                </TouchableOpacity>
                {/* Join / Status Button */}
                {isOrganizer ? (
                    <View style={[styles.actionButton, styles.disabledButton]}>
                        <Text style={styles.actionButtonText}>Вы организатор</Text>
                    </View>
                ) : myParticipation ? (
                    <View style={[styles.actionButton, styles.disabledButton,
                    myParticipation.status === 'approved' ? styles.approvedButton :
                        myParticipation.status === 'rejected' ? styles.rejectedButton : {}
                    ]}>
                        <Text style={styles.actionButtonText}>
                            {myParticipation.status === 'approved' ? 'Вы участвуете' :
                                myParticipation.status === 'rejected' ? 'Заявка отклонена' :
                                    'Заявка отправлена'}
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.actionButton, joining && styles.actionButtonDisabled]}
                        onPress={handleJoin}
                        disabled={joining}
                    >
                        {joining ? (
                            <ActivityIndicator color="#000000" />
                        ) : (
                            <Text style={styles.actionButtonText}>Присоединиться</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    content: {
        flex: 1,
    },
    imageContainer: {
        height: 350,
        width: '100%',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    headerContent: {
        position: 'absolute',
        bottom: 70,
        left: 20,
        right: 20,
    },
    themeBadge: {
        backgroundColor: '#FF9500',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 12,
    },
    themeText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
        lineHeight: 38,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    locationText: {
        color: '#E5E5EA',
        fontSize: 16,
        fontWeight: '500',
    },
    organizerSection: {
        padding: 20,
        backgroundColor: '#1C1C1E',
        marginHorizontal: 16,
        marginTop: -30,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    sectionLabel: {
        fontSize: 12,
        textTransform: 'uppercase',
        color: '#8E8E93',
        fontWeight: '600',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    organizerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    organizerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#FF9500',
    },
    organizerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    organizerName: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 2,
    },
    organizerLocation: {
        color: '#8E8E93',
        fontSize: 14,
    },
    messageButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#1C1C1E',
        marginTop: 16,
        marginHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statBorder: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#2C2C2E',
    },
    statLabel: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 8,
        marginBottom: 4,
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    statSub: {
        color: '#636366',
        fontSize: 10,
        marginTop: 2,
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    descriptionText: {
        color: '#E5E5EA',
        fontSize: 16,
        lineHeight: 24,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    detailContent: {
        flex: 1,
        marginLeft: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
        paddingBottom: 16,
    },
    detailTitle: {
        color: '#8E8E93',
        fontSize: 14,
        marginBottom: 4,
    },
    detailText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    timeline: {
        borderLeftWidth: 2,
        borderColor: '#2C2C2E',
        marginLeft: 8,
        paddingLeft: 24,
        paddingVertical: 8,
    },
    timelineItem: {
        marginBottom: 24,
        position: 'relative',
    },
    timelineLeft: {
        position: 'absolute',
        left: -31,
        top: 0,
        bottom: 0,
        alignItems: 'center',
    },
    timelineDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#2C2C2E',
        borderWidth: 2,
        borderColor: '#000000',
    },
    startDot: {
        backgroundColor: '#34C759',
    },
    endDot: {
        backgroundColor: '#FF3B30',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#2C2C2E',
        marginVertical: 4,
    },
    timelineContent: {
        marginTop: -4,
    },
    pointName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    pointDesc: {
        color: '#8E8E93',
        fontSize: 14,
    },
    infoBox: {
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: 'rgba(255, 149, 0, 0.3)',
    },
    infoContent: {
        flex: 1,
        marginLeft: 12,
    },
    infoTitle: {
        color: '#FF9500',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    infoText: {
        color: '#E5E5EA',
        fontSize: 14,
        lineHeight: 20,
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1C1C1E',
        padding: 16,
        paddingBottom: 32,
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
        gap: 12,
    },
    shareButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButton: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FF9500',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonDisabled: {
        opacity: 0.7,
    },
    actionButtonText: {
        color: '#000000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#2C2C2E',
    },
    approvedButton: {
        backgroundColor: '#34C759',
    },
    rejectedButton: {
        backgroundColor: '#FF3B30',
    },
    chatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#34C759',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 16,
        gap: 8,
    },
    chatButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    participantChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#34C759',
    },
});

export default YatraDetailScreen;
