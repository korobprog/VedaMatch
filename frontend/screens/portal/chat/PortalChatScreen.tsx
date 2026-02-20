import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../../utils/url';
import { COLORS } from '../../../components/chat/ChatConstants';
import { MessageCircle, Plus, ChevronRight, Users } from 'lucide-react-native';

import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';

import { CreateRoomModal } from './CreateRoomModal';
import { InviteFriendModal } from './InviteFriendModal';
import { EditRoomImageModal } from './EditRoomImageModal';
import { OpenRoomJoinModal } from './OpenRoomJoinModal';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { useSettings } from '../../../context/SettingsContext';
import { usePressFeedback } from '../../../hooks/usePressFeedback';
import { authorizedFetch } from '../../../services/authSessionService';

const EMOJI_MAP: any = {
    'krishna': '🕉️',
    'om': '🕉️',
    'japa': '📿',
    'kirtan': '🪈',
    'scriptures': '📖',
    'lotus': '🌺',
    'tulasi': '🌿',
    'deity': '🙏',
    'peacock': '🦚',
    'general': '🕉️',
};

export const PortalChatScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t, i18n } = useTranslation();
    const { isDarkMode, vTheme, portalBackgroundType } = useSettings();
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const { user } = useUser();
    const { colors } = useRoleTheme(user?.role, isDarkMode);

    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [inviteVisible, setInviteVisible] = useState(false);
    const [editImageVisible, setEditImageVisible] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [selectedRoomImageUrl, setSelectedRoomImageUrl] = useState<string>('');
    const [joiningRoomId, setJoiningRoomId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'my' | 'open'>('my');
    const [openJoinRoom, setOpenJoinRoom] = useState<any | null>(null);
    const [joinAsListener, setJoinAsListener] = useState(false);
    const [preJoinLoading, setPreJoinLoading] = useState(false);
    const isPhotoBg = portalBackgroundType === 'image';
    const triggerTapFeedback = usePressFeedback();
    const myRooms = useMemo(() => rooms.filter((room) => room?.isMember === true), [rooms]);
    const openRooms = useMemo(() => rooms.filter((room) => room?.isPublic === true), [rooms]);
    const visibleRooms = activeTab === 'my' ? myRooms : openRooms;

    const fetchRooms = async () => {
        if (!user?.ID) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const response = await authorizedFetch(`${API_PATH}/rooms`);
            if (response.ok) {
                const data = await response.json();
                setRooms(data);
            } else {
                console.log('Fetch rooms failed', await response.text());
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user?.ID) {
            fetchRooms();
        }
    }, [user?.ID]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRooms();
    };

    const openRoom = async (room: any, listenerMode = false) => {
        const roomID = Number(room?.ID);
        if (!Number.isFinite(roomID) || roomID <= 0) {
            return;
        }

        if (room?.canJoin && !room?.isMember) {
            setJoiningRoomId(roomID);
            try {
                const response = await authorizedFetch(`${API_PATH}/rooms/${roomID}/join`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    Alert.alert(t('common.error'), data.error || 'Failed to join room');
                    return;
                }
            } catch (error) {
                Alert.alert(t('common.error'), 'Network error');
                return;
            } finally {
                setJoiningRoomId(null);
            }
        }

        navigation.navigate('RoomChat', {
            roomId: roomID,
            roomName: room.name,
            listenerMode,
            showSupportPrompt: true,
        });
    };

    const handleRoomPress = (room: any) => {
        if (activeTab === 'open') {
            setJoinAsListener(false);
            setOpenJoinRoom(room);
            return;
        }
        void openRoom(room, false);
    };

    const handleConfirmOpenJoin = async () => {
        if (!openJoinRoom || preJoinLoading) return;
        setPreJoinLoading(true);
        try {
            await openRoom(openJoinRoom, joinAsListener);
            setOpenJoinRoom(null);
        } finally {
            setPreJoinLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isPreset = !!EMOJI_MAP[item.imageUrl];
        const mediaUrl = !isPreset ? getMediaUrl(item.imageUrl) : null;
        const emoji = EMOJI_MAP[item.imageUrl] || EMOJI_MAP['general'];
        const createdAt = new Date(item.CreatedAt);
        const roomMembers = item.membersCount || item.members_count || item.members?.length || 0;
        const roomID = Number(item.ID);
        const isJoining = joiningRoomId === roomID;
        const myRole = String(item?.myRole || '').toLowerCase();
        const canInviteMembers = myRole === 'owner' || myRole === 'admin';
        const canEditRoomImage = myRole === 'owner';

        return (
            <TouchableOpacity
                activeOpacity={0.88}
                style={[
                    styles.chatItem,
                    {
                        backgroundColor: isPhotoBg ? 'rgba(0,0,0,0.5)' : colors.surfaceElevated,
                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.15)' : colors.border,
                    },
                ]}
                onPress={() => {
                    triggerTapFeedback();
                    handleRoomPress(item);
                }}
                onLongPress={() => {
                    const actions: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }> = [];
                    if (canEditRoomImage) {
                        actions.push({
                            text: t('chat.editImage'),
                            onPress: () => {
                                setSelectedRoomId(item.ID);
                                setSelectedRoomImageUrl(item.imageUrl || 'general');
                                setEditImageVisible(true);
                            }
                        });
                    }
                    if (canInviteMembers) {
                        actions.push({
                            text: t('chat.inviteFriends'),
                            onPress: () => setInviteVisible(true),
                        });
                    }
                    if (actions.length === 0) {
                        return;
                    }

                    setSelectedRoomId(item.ID);
                    Alert.alert(
                        item.name,
                        t('chat.roomOptions'),
                        [
                            ...actions,
                            {
                                text: t('common.cancel'),
                                style: 'cancel',
                            },
                        ]
                    );
                }}
                disabled={isJoining}
            >
                <View style={[styles.chatIcon, { backgroundColor: colors.accentSoft }]}>
                    {mediaUrl ? (
                        <Image source={{ uri: mediaUrl }} style={styles.chatImage} />
                    ) : (
                        <Text style={styles.chatEmoji}>{emoji}</Text>
                    )}
                </View>
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeaderRow}>
                        <Text style={[styles.chatName, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={[styles.chatTime, { color: vTheme.colors.textSecondary }]}>
                            {createdAt.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <Text style={[styles.lastMsg, { color: isPhotoBg ? 'rgba(255,255,255,0.86)' : colors.textSecondary }]} numberOfLines={2}>
                        {item.description || t('chat.noDescription')}
                    </Text>
                    <View style={styles.metaRow}>
                        <View style={[styles.metaChip, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : colors.accentSoft }]}>
                            <Users size={12} color={isPhotoBg ? '#FFFFFF' : colors.accent} />
                            <Text style={[styles.metaText, { color: isPhotoBg ? '#FFFFFF' : colors.textSecondary }]}>
                                {roomMembers}
                            </Text>
                        </View>
                        <View style={[styles.visibilityBadge, { backgroundColor: item.isPublic ? 'rgba(34,197,94,0.18)' : 'rgba(148,163,184,0.24)' }]}>
                            <Text style={[styles.visibilityText, { color: item.isPublic ? '#15803d' : (isPhotoBg ? '#FFFFFF' : colors.textSecondary) }]}>
                                {item.isPublic ? (t('chat.publicRoom') || 'Публичная') : (t('chat.privateRoom') || 'Приватная')}
                            </Text>
                        </View>
                        <Text style={[styles.metaDate, { color: isPhotoBg ? 'rgba(255,255,255,0.78)' : colors.textSecondary }]}>
                            {createdAt.toLocaleDateString(i18n.language)}
                        </Text>
                    </View>
                </View>
                <View style={[styles.chevronWrap, { borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : colors.border }]}>
                    {isJoining ? (
                        <ActivityIndicator size="small" color={isPhotoBg ? '#FFFFFF' : colors.textSecondary} />
                    ) : (
                        <ChevronRight size={16} color={isPhotoBg ? '#FFFFFF' : colors.textSecondary} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    return (
        <ProtectedScreen>
            <View style={[styles.container, { backgroundColor: isPhotoBg ? 'transparent' : colors.background }]}>
                <FlatList
                    data={visibleRooms}
                    keyExtractor={item => item.ID.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={visibleRooms.length ? styles.list : styles.listEmpty}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accent]} />
                    }
                    ListHeaderComponent={
                        <View style={styles.headerBlock}>
                            <View>
                                <Text style={[styles.title, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>Комнаты</Text>
                                <Text style={[styles.subtitle, { color: isPhotoBg ? 'rgba(255,255,255,0.84)' : colors.textSecondary }]}>
                                    {visibleRooms.length
                                        ? `${t(activeTab === 'my' ? 'chat.myRoomsTab' : 'chat.openRoomsTab')}: ${visibleRooms.length}`
                                        : (activeTab === 'my' ? (t('chat.noRooms') || 'Комнаты не найдены') : (t('chat.openRoomsEmpty') || 'Открытых комнат пока нет'))}
                                </Text>
                            </View>
                            <View style={[styles.countBadge, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : colors.accentSoft, borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : colors.border }]}>
                                <MessageCircle size={14} color={isPhotoBg ? '#FFFFFF' : colors.accent} />
                                <Text style={[styles.countText, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>{visibleRooms.length}</Text>
                            </View>
                            <View style={[styles.tabBar, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : colors.surfaceElevated, borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : colors.border }]}>
                                <TouchableOpacity
                                    testID="rooms-tab-my"
                                    activeOpacity={0.9}
                                    onPress={() => setActiveTab('my')}
                                    style={[
                                        styles.tabButton,
                                        activeTab === 'my' && { backgroundColor: colors.accent },
                                    ]}
                                >
                                    <Text style={[styles.tabButtonText, { color: activeTab === 'my' ? '#fff' : (isPhotoBg ? '#fff' : colors.textSecondary) }]}>
                                        {t('chat.myRoomsTab')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    testID="rooms-tab-open"
                                    activeOpacity={0.9}
                                    onPress={() => setActiveTab('open')}
                                    style={[
                                        styles.tabButton,
                                        activeTab === 'open' && { backgroundColor: colors.accent },
                                    ]}
                                >
                                    <Text style={[styles.tabButtonText, { color: activeTab === 'open' ? '#fff' : (isPhotoBg ? '#fff' : colors.textSecondary) }]}>
                                        {t('chat.openRoomsTab')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={[
                            styles.emptyContainer,
                            {
                                backgroundColor: isPhotoBg ? 'rgba(0,0,0,0.5)' : colors.surfaceElevated,
                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.15)' : colors.border,
                            },
                        ]}>
                            <View style={[styles.emptyIcon, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : colors.accentSoft }]}>
                                <MessageCircle size={24} color={isPhotoBg ? '#FFFFFF' : colors.accent} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>{t('chat.noRooms')}</Text>
                            <Text style={[styles.emptySub, { color: isPhotoBg ? 'rgba(255,255,255,0.84)' : colors.textSecondary }]}>
                                {activeTab === 'my'
                                    ? 'Создайте первую комнату и пригласите друзей'
                                    : (t('chat.openRoomsEmpty') || 'Открытых комнат пока нет')}
                            </Text>
                            {activeTab === 'my' && (
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        setModalVisible(true);
                                    }}
                                >
                                    <Plus size={16} color="#fff" />
                                    <Text style={styles.emptyButtonText}>Новая комната</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
                {/* Create Room Button (FAB) */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                        styles.fab,
                        {
                            backgroundColor: colors.accent,
                            borderColor: isPhotoBg ? 'rgba(255,255,255,0.42)' : colors.border,
                        },
                    ]}
                    onPress={() => {
                        triggerTapFeedback();
                        setModalVisible(true);
                    }}
                >
                    <Plus size={18} color="#fff" />
                    <Text style={styles.fabText}>Новая комната</Text>
                </TouchableOpacity>

                <CreateRoomModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onRoomCreated={fetchRooms}
                />

                {selectedRoomId && (
                    <>
                        <InviteFriendModal
                            visible={inviteVisible}
                            onClose={() => setInviteVisible(false)}
                            roomId={selectedRoomId}
                        />
                        <EditRoomImageModal
                            visible={editImageVisible}
                            onClose={() => setEditImageVisible(false)}
                            roomId={selectedRoomId}
                            currentImageUrl={selectedRoomImageUrl}
                            onImageUpdated={fetchRooms}
                        />
                    </>
                )}

                <OpenRoomJoinModal
                    visible={Boolean(openJoinRoom)}
                    roomName={openJoinRoom?.name}
                    joinAsListener={joinAsListener}
                    onChangeJoinAsListener={setJoinAsListener}
                    onCancel={() => setOpenJoinRoom(null)}
                    onConfirm={handleConfirmOpenJoin}
                    loading={preJoinLoading}
                    isPhotoBg={isPhotoBg}
                    colors={colors}
                    t={t}
                />
            </View>
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, paddingBottom: 100 },
    listEmpty: { flexGrow: 1, padding: 16, paddingBottom: 120 },
    headerBlock: {
        marginBottom: 14,
        gap: 10,
    },
    tabBar: {
        minHeight: 46,
        borderRadius: 14,
        borderWidth: 1,
        padding: 4,
        flexDirection: 'row',
        gap: 6,
    },
    tabButton: {
        flex: 1,
        minHeight: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 34,
    },
    subtitle: {
        marginTop: 4,
        fontSize: 14,
        lineHeight: 20,
    },
    countBadge: {
        minHeight: 36,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    countText: {
        fontSize: 13,
        fontWeight: '700',
    },
    chatItem: {
        flexDirection: 'row',
        padding: 14,
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 12,
        minHeight: 96,
    },
    chatIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatImage: {
        width: 46,
        height: 46,
        borderRadius: 14,
    },
    chatEmoji: {
        fontSize: 22,
    },
    chatInfo: {
        flex: 1,
        marginLeft: 12,
    },
    chatHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatName: {
        flex: 1,
        fontSize: 17,
        fontWeight: '800',
        marginRight: 8,
    },
    chatTime: {
        fontSize: 12,
        fontWeight: '600',
    },
    lastMsg: {
        fontSize: 14.5,
        marginTop: 3,
        lineHeight: 20,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    metaChip: {
        minHeight: 24,
        borderRadius: 999,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '700',
    },
    metaDate: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 'auto',
    },
    visibilityBadge: {
        paddingHorizontal: 8,
        minHeight: 24,
        borderRadius: 999,
        justifyContent: 'center',
    },
    visibilityText: {
        fontSize: 11,
        fontWeight: '700',
    },
    chevronWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        marginTop: 40,
        paddingHorizontal: 20,
        paddingVertical: 24,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        marginTop: 14,
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '800',
    },
    emptySub: {
        marginTop: 8,
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
    emptyButton: {
        marginTop: 16,
        minHeight: 44,
        borderRadius: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        minHeight: 50,
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    fabText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
