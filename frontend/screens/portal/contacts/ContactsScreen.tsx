import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, useColorScheme, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../../components/chat/ChatConstants';
import { contactService, UserContact } from '../../../services/contactService';
import { API_BASE_URL } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';

import { useChat } from '../../../context/ChatContext';

export const ContactsScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const { setChatRecipient } = useChat();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { user: currentUser } = useUser();

    const [search, setSearch] = useState('');
    const [allContacts, setAllContacts] = useState<UserContact[]>([]);
    const [friends, setFriends] = useState<UserContact[]>([]);
    const [blockedContacts, setBlockedContacts] = useState<UserContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'friends' | 'blocked'>('all');

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const contacts = await contactService.getContacts();
            setAllContacts(contacts);
            if (currentUser?.ID) {
                const userFriends = await contactService.getFriends(currentUser.ID);
                setFriends(userFriends);
                const blocked = await contactService.getBlockedUsers(currentUser.ID);
                setBlockedContacts(blocked);
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = async (contactId: number) => {
        if (!currentUser?.ID) return;
        try {
            await contactService.unblockUser(currentUser.ID, contactId);
            fetchContacts();
        } catch (error) {
            console.error('Error unblocking user:', error);
        }
    };

    const isOnline = (lastSeen: string) => {
        if (!lastSeen) return false;
        const lastSeenDate = new Date(lastSeen);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
        return diffMinutes < 5; // Online if active in last 5 minutes
    };

    const displayedContacts = (
        filter === 'all' ? allContacts :
            filter === 'friends' ? friends : blockedContacts
    ).filter(c => {
        const isSelf = currentUser?.ID && c.ID === currentUser.ID;
        if (isSelf) return false;

        // In All and Friends, don't show anyone who is blocked
        if (filter !== 'blocked') {
            const isBlocked = blockedContacts.some(bc => bc.ID === c.ID);
            if (isBlocked) return false;
        }

        return c.karmicName?.toLowerCase().includes(search.toLowerCase()) ||
            c.spiritualName?.toLowerCase().includes(search.toLowerCase());
    });

    const renderItem = ({ item }: { item: UserContact }) => {
        const avatarUrl = item.avatarUrl ? `${API_BASE_URL}${item.avatarUrl}` : null;
        const online = isOnline(item.lastSeen);
        const isBlocked = filter === 'blocked';

        return (
            <TouchableOpacity
                style={[styles.contactItem, { borderBottomColor: theme.borderColor }]}
                onPress={() => {
                    if (isBlocked) return;
                    const isFriend = friends.some(f => f.ID === item.ID);
                    if (isFriend) {
                        setChatRecipient(item);
                        navigation.navigate('Chat');
                    } else {
                        navigation.navigate('ContactProfile', { userId: item.ID });
                    }
                }}
                disabled={isBlocked}
            >
                <View style={styles.avatarContainer}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.button }]}>
                            <Text style={{ color: theme.buttonText, fontWeight: 'bold' }}>
                                {(item.spiritualName || item.karmicName || '?')[0]}
                            </Text>
                        </View>
                    )}
                    {online && !isBlocked && <View style={styles.onlineStatus} />}
                </View>
                <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, { color: theme.text }]}>
                        {item.spiritualName || item.karmicName}
                    </Text>
                    <Text style={[styles.contactDesc, { color: theme.subText }]}>
                        {item.identity || 'Devotee'} • {item.city}, {item.country}
                    </Text>
                </View>
                {isBlocked ? (
                    <TouchableOpacity
                        onPress={() => handleUnblock(item.ID)}
                        style={styles.unblockBtn}
                    >
                        <Text style={[styles.unblockText, { color: theme.accent }]}>{t('contacts.unblock')}</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={{ color: theme.accent, fontSize: 18 }}>›</Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.filterBar}>
                <TouchableOpacity
                    onPress={() => setFilter('all')}
                    style={[styles.filterBtn, filter === 'all' && { borderBottomColor: theme.accent }]}
                >
                    <Text style={[styles.filterText, { color: filter === 'all' ? theme.text : theme.subText }]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setFilter('friends')}
                    style={[styles.filterBtn, filter === 'friends' && { borderBottomColor: theme.accent }]}
                >
                    <Text style={[styles.filterText, { color: filter === 'friends' ? theme.text : theme.subText }]}>Friends</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setFilter('blocked')}
                    style={[styles.filterBtn, filter === 'blocked' && { borderBottomColor: theme.accent }]}
                >
                    <Text style={[styles.filterText, { color: filter === 'blocked' ? theme.text : theme.subText }]}>{t('contacts.blocked')}</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                <TextInput
                    style={[styles.searchInput, { color: theme.inputText }]}
                    placeholder={t('contacts.searchPlaceholder')}
                    placeholderTextColor={theme.subText}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>
            <FlatList
                data={displayedContacts}
                keyExtractor={item => item.ID.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshing={loading}
                onRefresh={fetchContacts}
                ListHeaderComponent={filter === 'blocked' && displayedContacts.length > 0 ? (
                    <Text style={[styles.blockedHint, { color: theme.subText }]}>
                        {t('contacts.blockConfirmMsg')}
                    </Text>
                ) : null}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator color={theme.accent} />
                        ) : (
                            <Text style={[styles.empty, { color: theme.subText }]}>No contacts found</Text>
                        )}
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    filterBtn: {
        paddingVertical: 10,
        marginRight: 24,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    filterText: {
        fontSize: 15,
        fontWeight: '600',
    },
    searchContainer: {
        margin: 16,
        paddingHorizontal: 16,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
    },
    searchInput: { fontSize: 16 },
    list: { paddingBottom: 20 },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
    },
    avatarContainer: {
        width: 50,
        height: 50,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    onlineStatus: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    contactInfo: {
        flex: 1,
        marginLeft: 16,
    },
    contactName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    contactDesc: {
        fontSize: 13,
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    empty: {
        textAlign: 'center',
    },
    unblockBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    unblockText: {
        fontSize: 13,
        fontWeight: '600',
    },
    blockedHint: {
        fontSize: 12,
        padding: 16,
        textAlign: 'center',
        fontStyle: 'italic',
    }
});
