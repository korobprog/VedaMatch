import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    FlatList,
    TouchableOpacity,
    useColorScheme,
    ActivityIndicator,
    Alert,
    TextInput,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';

interface InviteFriendModalProps {
    visible: boolean;
    onClose: () => void;
    roomId: number;
}

export const InviteFriendModal: React.FC<InviteFriendModalProps> = ({ visible, onClose, roomId }) => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { user } = useUser();

    const [friends, setFriends] = useState<any[]>([]);
    const [roomMembers, setRoomMembers] = useState<any[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<string>('member');
    const [loading, setLoading] = useState(true);
    const [invitingId, setInvitingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchFriends = async () => {
        if (!user) return;
        try {
            const [friendsResponse, membersResponse] = await Promise.all([
                fetch(`${API_PATH}/friends/${user.ID}`),
                fetch(`${API_PATH}/rooms/${roomId}/members`)
            ]);

            if (friendsResponse.ok) {
                const data = await friendsResponse.json();
                setFriends(data);
            }

            if (membersResponse.ok) {
                const members = await membersResponse.json();
                // members is now [{user: {...}, role: "admin"}]
                setRoomMembers(members);

                const myMemberRecord = members.find((m: any) => m.user?.ID === user.ID);
                if (myMemberRecord) {
                    setCurrentUserRole(myMemberRecord.role);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchFriends();
        }
    }, [visible]);

    const handleInvite = async (friendId: number) => {
        setInvitingId(friendId);
        try {
            const response = await fetch(`${API_PATH}/rooms/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomId: roomId,
                    userId: friendId,
                }),
            });

            if (response.ok) {
                Alert.alert(t('common.success'), t('chat.invite') + ' ' + t('common.success'));
                // Refetch members to get proper data
                const membersResponse = await fetch(`${API_PATH}/rooms/${roomId}/members`);
                if (membersResponse.ok) {
                    const members = await membersResponse.json();
                    setRoomMembers(members);
                }
            } else if (response.status === 409) {
                Alert.alert(t('common.info'), t('chat.alreadyMember') || 'User is already a member');
            } else {
                const data = await response.json();
                Alert.alert(t('common.error'), data.error || 'Failed to invite');
            }
        } catch (error) {
            Alert.alert(t('common.error'), 'Network error');
        } finally {
            setInvitingId(null);
        }
    };

    const handleRemove = async (friendId: number) => {
        setInvitingId(friendId);
        try {
            const response = await fetch(`${API_PATH}/rooms/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomId: roomId,
                    userId: friendId,
                }),
            });

            if (response.ok) {
                Alert.alert(t('common.success'), 'Removed from group');
                setRoomMembers(prev => prev.filter(m => m.user?.ID !== friendId));
            } else {
                const data = await response.json();
                Alert.alert(t('common.error'), data.error || 'Failed to remove');
            }
        } catch (error) {
            Alert.alert(t('common.error'), 'Network error');
        } finally {
            setInvitingId(null);
        }
    };

    const handleMakeAdmin = async (friendId: number) => {
        setInvitingId(friendId);
        try {
            const response = await fetch(`${API_PATH}/rooms/role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomId: roomId,
                    userId: friendId,
                    role: 'admin',
                }),
            });

            if (response.ok) {
                Alert.alert(t('common.success'), 'User promoted to Admin');
                setRoomMembers(prev => prev.map(m =>
                    m.user.ID === friendId ? { ...m, role: 'admin' } : m
                ));
            } else {
                Alert.alert(t('common.error'), 'Failed to update role');
            }
        } catch (error) {
            Alert.alert(t('common.error'), 'Network error');
        } finally {
            setInvitingId(null);
        }
    };

    const copyRoomLink = () => {
        const link = `rag-agent://room/${roomId}`;
        Clipboard.setString(link);
        Alert.alert(t('common.success'), 'Link copied to clipboard');
    };

    const filteredFriends = friends.filter(friend =>
        friend.karmicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: any) => {
        const memberRecord = roomMembers.find(m => m.user?.ID === item.ID);
        const isMember = !!memberRecord;
        const isAdmin = memberRecord?.role === 'admin';
        const canManage = currentUserRole === 'admin';

        return (
            <View style={[styles.friendItem, { borderBottomColor: theme.borderColor }]}>
                <View style={[styles.avatar, { backgroundColor: theme.header }]}>
                    <Text style={{ fontSize: 18 }}>👤</Text>
                </View>
                <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: theme.text }]}>
                        {item.karmicName} {isAdmin && '👑'}
                    </Text>
                    <Text style={[styles.friendEmail, { color: theme.subText }]}>{item.email}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {isMember && canManage && !isAdmin && (
                        <TouchableOpacity
                            style={[
                                styles.inviteButton,
                                { backgroundColor: theme.header, borderWidth: 1, borderColor: theme.accent }
                            ]}
                            onPress={() => handleMakeAdmin(item.ID)}
                            disabled={invitingId === item.ID}
                        >
                            <Text style={[styles.inviteButtonText, { color: theme.accent }]}>
                                Admin
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.inviteButton,
                            { backgroundColor: isMember ? '#ff4444' : theme.accent }
                        ]}
                        onPress={() => isMember ? (canManage ? handleRemove(item.ID) : null) : handleInvite(item.ID)}
                        disabled={invitingId === item.ID || (isMember && !canManage)}
                    >
                        {invitingId === item.ID ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.inviteButtonText}>
                                {isMember ? 'Remove' : t('chat.invite')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>{t('chat.inviteFriends')}</Text>
                        <TouchableOpacity onPress={copyRoomLink} style={styles.linkButton}>
                            <Text style={{ fontSize: 20 }}>🔗</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={[styles.searchInput, {
                            color: theme.text,
                            backgroundColor: theme.header,
                            borderColor: theme.borderColor
                        }]}
                        placeholder={t('common.search') || "Search friends..."}
                        placeholderTextColor={theme.subText}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />

                    {loading ? (
                        <ActivityIndicator size="large" color={theme.accent} style={{ margin: 20 }} />
                    ) : (
                        <FlatList
                            data={filteredFriends}
                            keyExtractor={item => item.ID.toString()}
                            renderItem={renderItem}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={{ color: theme.subText }}>
                                        {friends.length === 0 ? t('chat.noHistory') : 'No matching friends found'}
                                    </Text>
                                </View>
                            }
                            style={{ maxHeight: 400 }}
                        />
                    )}

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={[styles.closeButtonText, { color: theme.text }]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        borderRadius: 20,
        padding: 24,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    friendItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 0.5,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendInfo: {
        flex: 1,
        marginLeft: 12,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '500',
    },
    friendEmail: {
        fontSize: 12,
    },
    inviteButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    inviteButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    closeButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    linkButton: {
        padding: 5,
    },
    searchInput: {
        height: 40,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        borderWidth: 1,
    }
});
