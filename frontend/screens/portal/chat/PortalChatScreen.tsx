import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../../utils/url';
import { ModernVedicTheme } from '../../../theme/ModernVedicTheme';
import { COLORS } from '../../../components/chat/ChatConstants';

import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';

import { CreateRoomModal } from './CreateRoomModal';
import { InviteFriendModal } from './InviteFriendModal';
import { EditRoomImageModal } from './EditRoomImageModal';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { useSettings } from '../../../context/SettingsContext';

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
    const { isDarkMode, vTheme } = useSettings();
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const { user } = useUser();

    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [inviteVisible, setInviteVisible] = useState(false);
    const [editImageVisible, setEditImageVisible] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [selectedRoomImageUrl, setSelectedRoomImageUrl] = useState<string>('');

    const fetchRooms = async () => {
        if (!user?.ID) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_PATH}/rooms`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
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

    const renderItem = ({ item }: { item: any }) => {
        const isPreset = !!EMOJI_MAP[item.imageUrl];
        const mediaUrl = !isPreset ? getMediaUrl(item.imageUrl) : null;
        const emoji = EMOJI_MAP[item.imageUrl] || EMOJI_MAP['general'];

        return (
            <TouchableOpacity
                style={[styles.chatItem, { borderBottomColor: theme.borderColor }]}
                onPress={() => navigation.navigate('RoomChat', { roomId: item.ID, roomName: item.name })}
                onLongPress={() => {
                    // Admins only or everyone? Let's say everyone can invite for now
                    setSelectedRoomId(item.ID);
                    Alert.alert(
                        item.name,
                        t('chat.roomOptions'),
                        [
                            {
                                text: t('chat.editImage'),
                                onPress: () => {
                                    setSelectedRoomId(item.ID);
                                    setSelectedRoomImageUrl(item.imageUrl || 'general');
                                    setEditImageVisible(true);
                                }
                            },
                            {
                                text: t('chat.inviteFriends'),
                                onPress: () => setInviteVisible(true),
                            },
                            {
                                text: t('common.cancel'),
                                style: 'cancel',
                            },
                        ]
                    );
                }}
            >
                <View style={[styles.chatIcon, { backgroundColor: theme.accent }]}>
                    {mediaUrl ? (
                        <Image source={{ uri: mediaUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    ) : (
                        <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    )}
                </View>
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeaderRow}>
                        <Text style={[styles.chatName, { color: vTheme.colors.text }]}>{item.name}</Text>
                        <Text style={[styles.chatTime, { color: vTheme.colors.textSecondary }]}>
                            {new Date(item.CreatedAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <Text style={[styles.lastMsg, { color: vTheme.colors.textSecondary }]} numberOfLines={1}>
                        {item.description || t('chat.noDescription')}
                    </Text>
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
            <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
                <FlatList
                    data={rooms}
                    keyExtractor={item => item.ID.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accent]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ color: theme.subText }}>{t('chat.noRooms')}</Text>
                        </View>
                    }
                />
                {/* Create Room Button (FAB) */}
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: theme.accent }]}
                    onPress={() => setModalVisible(true)}
                >
                    <Text style={styles.fabText}>+</Text>
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
            </View>
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    list: { paddingVertical: 8 },
    chatItem: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 0.5,
    },
    chatIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatInfo: {
        flex: 1,
        marginLeft: 16,
    },
    chatHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    chatTime: {
        fontSize: 11,
    },
    lastMsg: {
        fontSize: 14,
        marginTop: 2,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
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
        fontSize: 30,
        fontWeight: 'bold',
    },
});
