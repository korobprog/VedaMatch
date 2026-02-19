import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTranslation } from 'react-i18next';
import { X, Link2, UserPlus, ShieldCheck, UserMinus, Search, User as UserIcon } from 'lucide-react-native';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';
import { authorizedFetch } from '../../../services/authSessionService';

interface InviteFriendModalProps {
    visible: boolean;
    onClose: () => void;
    roomId: number;
}

export const InviteFriendModal: React.FC<InviteFriendModalProps> = ({ visible, onClose, roomId }) => {
    const { t } = useTranslation();
    const { isDarkMode, vTheme } = useSettings();
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { user } = useUser();

    const [friends, setFriends] = useState<any[]>([]);
    const [roomMembers, setRoomMembers] = useState<any[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<string>('member');
    const [loading, setLoading] = useState(true);
    const [invitingId, setInvitingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [creatingInviteLink, setCreatingInviteLink] = useState(false);

    const fetchFriends = async () => {
        if (!user) return;
        try {
            const [friendsResponse, membersResponse] = await Promise.all([
                authorizedFetch(`${API_PATH}/friends`),
                authorizedFetch(`${API_PATH}/rooms/${roomId}/members`)
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
        if (visible && user) {
            setLoading(true);
            fetchFriends();
        }
    }, [roomId, visible, user]);

    const handleInvite = async (friendId: number) => {
        setInvitingId(friendId);
        try {
            const response = await authorizedFetch(`${API_PATH}/rooms/invite`, {
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
                const membersResponse = await authorizedFetch(`${API_PATH}/rooms/${roomId}/members`);
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
            const response = await authorizedFetch(`${API_PATH}/rooms/remove`, {
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
            const response = await authorizedFetch(`${API_PATH}/rooms/role`, {
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

    const copyRoomLink = async () => {
        if (creatingInviteLink) return;
        setCreatingInviteLink(true);
        try {
            const response = await authorizedFetch(`${API_PATH}/rooms/${roomId}/invite-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                Alert.alert(t('common.error'), data.error || 'Failed to create invite link');
                return;
            }
            const data = await response.json().catch(() => ({}));
            const inviteLink = typeof data?.inviteLink === 'string' && data.inviteLink.trim()
                ? data.inviteLink.trim()
                : (typeof data?.inviteToken === 'string' && data.inviteToken.trim()
                    ? `vedamatch://rooms/join/${data.inviteToken.trim()}`
                    : '');
            if (!inviteLink) {
                Alert.alert(t('common.error'), 'Invite link is unavailable');
                return;
            }
            Clipboard.setString(inviteLink);
            Alert.alert(t('common.success'), 'Invite link copied to clipboard');
        } catch (error) {
            Alert.alert(t('common.error'), 'Network error');
        } finally {
            setCreatingInviteLink(false);
        }
    };

    const filteredFriends = friends
        .filter((v, i, a) => a.findIndex(t => t.ID === v.ID) === i) // Ensure unique IDs
        .filter(friend =>
            friend.karmicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            friend.email.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const renderItem = ({ item }: any) => {
        const memberRecord = roomMembers.find(m => m.user?.ID === item.ID);
        const isMember = !!memberRecord;
        const memberRole = String(memberRecord?.role || '').toLowerCase();
        const isOwner = memberRole === 'owner';
        const isAdmin = memberRole === 'admin';
        const currentRole = String(currentUserRole || '').toLowerCase();
        const canRemove = currentRole === 'owner' || currentRole === 'admin';
        const canPromote = currentRole === 'owner';
        const canRemoveThisMember = canRemove && !isOwner && !(currentRole === 'admin' && isAdmin);

        return (
            <View style={[styles.friendItem, { borderBottomColor: vTheme.colors.divider }]}>
                <View style={[styles.avatar, { backgroundColor: vTheme.colors.backgroundSecondary }]}>
                    <UserIcon size={20} color={vTheme.colors.primary} />
                </View>
                <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: vTheme.colors.text }]}>
                        {item.karmicName} {(isAdmin || isOwner) && '👑'}
                    </Text>
                    <Text style={[styles.friendEmail, { color: vTheme.colors.textSecondary }]}>{item.email}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {isMember && canPromote && !isAdmin && !isOwner && (
                        <TouchableOpacity
                            style={[
                                styles.iconButton,
                                { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.primary, borderWidth: 1 }
                            ]}
                            onPress={() => handleMakeAdmin(item.ID)}
                            disabled={invitingId === item.ID}
                        >
                            <ShieldCheck size={18} color={vTheme.colors.primary} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.inviteButton,
                            { backgroundColor: isMember ? vTheme.colors.accent : vTheme.colors.primary }
                        ]}
                        onPress={() => isMember ? (canRemoveThisMember ? handleRemove(item.ID) : null) : handleInvite(item.ID)}
                        disabled={invitingId === item.ID || (isMember && !canRemoveThisMember)}
                    >
                        {invitingId === item.ID ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                {isMember ? (
                                    <UserMinus size={16} color="#fff" />
                                ) : (
                                    <UserPlus size={16} color="#fff" />
                                )}
                                <Text style={styles.inviteButtonText}>
                                    {isMember ? (canRemoveThisMember ? t('common.remove') || 'Remove' : 'Member') : t('chat.invite')}
                                </Text>
                            </View>
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
                <KeyboardAwareContainer style={{ width: '100%' }} useTopInset={false}>
                <View style={[styles.modalContent, { backgroundColor: vTheme.colors.background }]}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={onClose} style={styles.headerIcon}>
                            <X size={26} color={vTheme.colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: vTheme.colors.text }]}>
                            {t('chat.inviteFriends')}
                        </Text>
                        <TouchableOpacity
                            testID="invite-link-button"
                            onPress={() => { void copyRoomLink(); }}
                            style={styles.headerIcon}
                            disabled={creatingInviteLink}
                        >
                            {creatingInviteLink ? (
                                <ActivityIndicator size="small" color={vTheme.colors.primary} />
                            ) : (
                                <Link2 size={24} color={vTheme.colors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.searchContainer, { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider }]}>
                        <Search size={18} color={vTheme.colors.textSecondary} style={{ marginLeft: 12 }} />
                        <TextInput
                            style={[styles.searchInput, { color: vTheme.colors.text }]}
                            placeholder={t('common.search') || "Search friends..."}
                            placeholderTextColor={vTheme.colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={theme.accent} style={{ margin: 20 }} />
                    ) : (
                        <FlatList
                            data={filteredFriends}
                            keyExtractor={item => item.ID.toString()}
                            renderItem={renderItem}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={{ color: vTheme.colors.textSecondary }}>
                                        {friends.length === 0 ? t('chat.noHistory') : 'No matching friends found'}
                                    </Text>
                                </View>
                            }
                            style={{ maxHeight: 400 }}
                        />
                    )}
                </View>
                </KeyboardAwareContainer>
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
        marginBottom: 24,
    },
    headerIcon: {
        padding: 5,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        height: 44,
        paddingHorizontal: 12,
        fontSize: 16,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
