import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { BlurView } from '@react-native-community/blur';
import apiClient from '../../../lib/apiClient';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';

interface InviteFriendModalProps {
    visible: boolean;
    onClose: () => void;
    roomId: number;
}

export const InviteFriendModal: React.FC<InviteFriendModalProps> = ({ visible, onClose, roomId }) => {
    const { t, i18n } = useTranslation();
    const { isDarkMode, vTheme } = useSettings();
    const { user } = useUser();

    const [friends, setFriends] = useState<any[]>([]);
    const [roomMembers, setRoomMembers] = useState<any[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<string>('member');
    const [loading, setLoading] = useState(true);
    const [invitingId, setInvitingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [creatingInviteLink, setCreatingInviteLink] = useState(false);
    const copy = useMemo(() => {
        const language = String(i18n.language || '').toLowerCase();
        if (language.startsWith('hi')) {
            return {
                userAlreadyMember: 'उपयोगकर्ता पहले से सदस्य है',
                failedToInvite: 'आमंत्रित नहीं किया जा सका',
                removedFromGroup: 'समूह से हटा दिया गया',
                failedToRemove: 'हटाया नहीं जा सका',
                userPromotedToAdmin: 'उपयोगकर्ता को एडमिन बनाया गया',
                failedToUpdateRole: 'भूमिका अपडेट नहीं की जा सकी',
                inviteLinkUnavailable: 'आमंत्रण लिंक उपलब्ध नहीं है',
                inviteLinkCopied: 'आमंत्रण लिंक क्लिपबोर्ड पर कॉपी किया गया',
                failedToCreateInviteLink: 'आमंत्रण लिंक बनाया नहीं जा सका',
                member: 'सदस्य',
                searchFriends: 'मित्र खोजें...',
                noMatchingFriends: 'मिलते-जुलते मित्र नहीं मिले',
            };
        }
        if (language.startsWith('en')) {
            return {
                userAlreadyMember: 'User is already a member',
                failedToInvite: 'Failed to invite',
                removedFromGroup: 'Removed from group',
                failedToRemove: 'Failed to remove',
                userPromotedToAdmin: 'User promoted to Admin',
                failedToUpdateRole: 'Failed to update role',
                inviteLinkUnavailable: 'Invite link is unavailable',
                inviteLinkCopied: 'Invite link copied to clipboard',
                failedToCreateInviteLink: 'Failed to create invite link',
                member: 'Member',
                searchFriends: 'Search friends...',
                noMatchingFriends: 'No matching friends found',
            };
        }
        return {
            userAlreadyMember: 'Пользователь уже состоит в комнате',
            failedToInvite: 'Не удалось пригласить',
            removedFromGroup: 'Удалён из группы',
            failedToRemove: 'Не удалось удалить',
            userPromotedToAdmin: 'Пользователь назначен администратором',
            failedToUpdateRole: 'Не удалось обновить роль',
            inviteLinkUnavailable: 'Ссылка-приглашение недоступна',
            inviteLinkCopied: 'Ссылка-приглашение скопирована',
            failedToCreateInviteLink: 'Не удалось создать ссылку-приглашение',
            member: 'Участник',
            searchFriends: 'Искать друзей...',
            noMatchingFriends: 'Подходящие друзья не найдены',
        };
    }, [i18n.language]);

    const fetchFriends = useCallback(async () => {
        if (!user) return;
        try {
            const [friendsResponse, membersResponse] = await Promise.all([
                apiClient.get('/friends'),
                apiClient.get(`/rooms/${roomId}/members`)
            ]);

            const friendsData = friendsResponse.data || [];
            const members = membersResponse.data || [];
            setFriends(Array.isArray(friendsData) ? friendsData : []);
            // members is now [{user: {...}, role: "admin"}]
            setRoomMembers(Array.isArray(members) ? members : []);

            const myMemberRecord = members.find((m: any) => m.user?.ID === user.ID);
            if (myMemberRecord) {
                setCurrentUserRole(myMemberRecord.role);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [roomId, user]);

    useEffect(() => {
        if (visible && user) {
            setLoading(true);
            void fetchFriends();
        }
    }, [fetchFriends, visible, user]);

    const handleInvite = async (friendId: number) => {
        setInvitingId(friendId);
        try {
            await apiClient.post('/rooms/invite', {
                roomId,
                userId: friendId,
            });

            Alert.alert(t('common.success'), t('chat.invite') + ' ' + t('common.success'));
            const membersResponse = await apiClient.get(`/rooms/${roomId}/members`);
            const members = membersResponse.data || [];
            setRoomMembers(Array.isArray(members) ? members : []);
        } catch (error: any) {
            if (error?.response?.status === 409) {
                Alert.alert(t('common.info'), t('chat.alreadyMember') || copy.userAlreadyMember);
            } else {
                Alert.alert(t('common.error'), error?.response?.data?.error || copy.failedToInvite);
            }
        } finally {
            setInvitingId(null);
        }
    };

    const handleRemove = async (friendId: number) => {
        setInvitingId(friendId);
        try {
            await apiClient.post('/rooms/remove', {
                roomId,
                userId: friendId,
            });
            Alert.alert(t('common.success'), copy.removedFromGroup);
            setRoomMembers(prev => prev.filter(m => m.user?.ID !== friendId));
        } catch (error: any) {
            Alert.alert(t('common.error'), error?.response?.data?.error || copy.failedToRemove);
        } finally {
            setInvitingId(null);
        }
    };

    const handleMakeAdmin = async (friendId: number) => {
        setInvitingId(friendId);
        try {
            await apiClient.post('/rooms/role', {
                roomId,
                userId: friendId,
                role: 'admin',
            });
            Alert.alert(t('common.success'), copy.userPromotedToAdmin);
            setRoomMembers(prev => prev.map(m =>
                m.user.ID === friendId ? { ...m, role: 'admin' } : m
            ));
        } catch (error: any) {
            Alert.alert(t('common.error'), error?.response?.data?.error || copy.failedToUpdateRole);
        } finally {
            setInvitingId(null);
        }
    };

    const copyRoomLink = async () => {
        if (creatingInviteLink) return;
        setCreatingInviteLink(true);
        try {
            const response = await apiClient.post(`/rooms/${roomId}/invite-link`, {});
            const data = response.data || {};
            const inviteLink = typeof data?.inviteLink === 'string' && data.inviteLink.trim()
                ? data.inviteLink.trim()
                : (typeof data?.inviteToken === 'string' && data.inviteToken.trim()
                    ? `vedamatch://rooms/join/${data.inviteToken.trim()}`
                    : '');
            if (!inviteLink) {
                Alert.alert(t('common.error'), copy.inviteLinkUnavailable);
                return;
            }
            Clipboard.setString(inviteLink);
            Alert.alert(t('common.success'), copy.inviteLinkCopied);
        } catch (error: any) {
            Alert.alert(t('common.error'), error?.response?.data?.error || copy.failedToCreateInviteLink);
        } finally {
            setCreatingInviteLink(false);
        }
    };

    const filteredFriends = friends
        .filter((v, i, a) => a.findIndex((friendItem) => friendItem.ID === v.ID) === i) // Ensure unique IDs
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
                                    {isMember ? (canRemoveThisMember ? t('common.remove') || 'Remove' : copy.member) : t('chat.invite')}
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
                <KeyboardAwareContainer style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }} useTopInset={false}>
                    <View style={styles.modalContent}>
                        <BlurView
                            style={StyleSheet.absoluteFill}
                            blurType={isDarkMode ? 'dark' : 'light'}
                            blurAmount={20}
                            reducedTransparencyFallbackColor={isDarkMode ? '#0F172A' : '#FDFCFB'}
                        />
                        <View style={styles.headerRow}>
                            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                                <X size={22} color={vTheme.colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: vTheme.colors.text }]}>
                                {t('chat.inviteFriends')}
                            </Text>
                            <TouchableOpacity
                                testID="invite-link-button"
                                onPress={() => { void copyRoomLink(); }}
                                style={styles.headerButton}
                                disabled={creatingInviteLink}
                            >
                                {creatingInviteLink ? (
                                    <ActivityIndicator size="small" color={vTheme.colors.primary} />
                                ) : (
                                    <Link2 size={20} color={vTheme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: vTheme.colors.divider }]}>
                            <Search size={18} color={vTheme.colors.textSecondary} style={{ marginLeft: 12 }} />
                            <TextInput
                                style={[styles.searchInput, { color: vTheme.colors.text }]}
                                placeholder={t('common.search') || copy.searchFriends}
                                placeholderTextColor={vTheme.colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color={vTheme.colors.primary} style={{ margin: 40 }} />
                        ) : (
                            <FlatList
                                data={filteredFriends}
                                keyExtractor={item => item.ID.toString()}
                                renderItem={renderItem}
                                keyboardShouldPersistTaps="handled"
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={{ color: vTheme.colors.textSecondary, fontSize: 15 }}>
                                            {friends.length === 0 ? t('chat.noHistory') : copy.noMatchingFriends}
                                        </Text>
                                    </View>
                                }
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingBottom: 40 }}
                                showsVerticalScrollIndicator={false}
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
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    modalContent: {
        width: '100%',
        height: '88%',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        padding: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: '700',
        textAlign: 'center',
        flex: 1,
        letterSpacing: -0.4,
    },
    friendItem: {
        flexDirection: 'row',
        paddingVertical: 14,
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    friendInfo: {
        flex: 1,
        marginLeft: 14,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    friendEmail: {
        fontSize: 13,
        opacity: 0.7,
    },
    inviteButton: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    inviteButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        height: 48,
        paddingHorizontal: 12,
        fontSize: 16,
        fontWeight: '500',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
