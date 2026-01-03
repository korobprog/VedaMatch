import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, useColorScheme, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { COLORS } from '../../../components/chat/ChatConstants';
import { contactService, UserContact } from '../../../services/contactService';
import { API_BASE_URL, API_PATH } from '../../../config/api.config';
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

    // City Filter State
    const [filterCity, setFilterCity] = useState('');
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');

    useEffect(() => {
        fetchContacts();
        fetchCities();
    }, []);

    useEffect(() => {
        if (currentUser?.city) {
            setFilterCity(currentUser.city);
        }
    }, [currentUser]);

    const fetchCities = async () => {
        try {
            const response = await axios.get(`${API_PATH}/dating/cities`);
            setAvailableCities(response.data);
        } catch (error) {
            console.error('Failed to fetch cities:', error);
        }
    };

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

        // Apply City Filter only for 'all' tab
        if (filter === 'all' && filterCity) {
            if (c.city !== filterCity) return false;
        }

        return c.karmicName?.toLowerCase().includes(search.toLowerCase()) ||
            c.spiritualName?.toLowerCase().includes(search.toLowerCase());
    }).sort((a, b) => {
        if (filter === 'all') {
            const isFriendA = friends.some(f => f.ID === a.ID);
            const isFriendB = friends.some(f => f.ID === b.ID);
            if (isFriendA && !isFriendB) return -1;
            if (!isFriendA && isFriendB) return 1;
        }
        return 0;
    });

    const renderItem = ({ item }: { item: UserContact }) => {
        const avatarUrl = item.avatarUrl ? `${API_BASE_URL}${item.avatarUrl}` : null;
        const online = isOnline(item.lastSeen);
        const isBlocked = filter === 'blocked';
        const isFriend = friends.some(f => f.ID === item.ID);

        return (
            <TouchableOpacity
                style={[styles.contactItem, { borderBottomColor: theme.borderColor }]}
                onPress={() => {
                    if (isBlocked) return;
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
                    <View style={styles.nameRow}>
                        <Text style={[styles.contactName, { color: theme.text }]}>
                            {item.spiritualName || item.karmicName}
                        </Text>
                        {isFriend && !isBlocked && (
                            <View style={[styles.friendTag, { backgroundColor: theme.accent + '20' }]}>
                                <Text style={[styles.friendTagText, { color: theme.accent }]}>
                                    {t('contacts.friend')}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.contactDesc, { color: theme.subText }]}>
                        {item.identity || 'Devotee'} • {item.city}
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

    const filteredCities = availableCities.filter(city =>
        city.toLowerCase().includes(citySearchQuery.toLowerCase())
    );

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

            {filter === 'all' && (
                <View style={[styles.cityFilterContainer, { backgroundColor: theme.inputBackground }]}>
                    <TouchableOpacity
                        style={styles.cityFilterBtn}
                        onPress={() => setShowCityPicker(true)}
                    >
                        <Text style={[styles.cityFilterText, { color: theme.text }]}>
                            📍 {filterCity || t('dating.allCities', 'All Cities')}
                        </Text>
                        <Text style={{ color: theme.subText }}>▼</Text>
                    </TouchableOpacity>
                </View>
            )}

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

            {/* City Selection Modal */}
            <Modal
                visible={showCityPicker}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header, maxHeight: '60%' }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{t('dating.selectCity', 'Select City')}</Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor, marginBottom: 10 }]}
                            value={citySearchQuery}
                            onChangeText={setCitySearchQuery}
                            placeholder={t('dating.searchCity', 'Search City...')}
                            placeholderTextColor={theme.subText}
                        />

                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            <TouchableOpacity
                                style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}
                                onPress={() => {
                                    setFilterCity('');
                                    setShowCityPicker(false);
                                }}
                            >
                                <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{t('dating.allCities', 'All Cities')}</Text>
                            </TouchableOpacity>
                            {filteredCities.map((city, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}
                                    onPress={() => {
                                        setFilterCity(city);
                                        setShowCityPicker(false);
                                    }}
                                >
                                    <Text style={{ color: theme.text }}>{city}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={{ padding: 15, alignItems: 'center' }}
                            onPress={() => setShowCityPicker(false)}
                        >
                            <Text style={{ color: theme.subText }}>{t('common.close', 'Close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    cityFilterContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginTop: 5,
        marginHorizontal: 16,
        borderRadius: 8,
    },
    cityFilterBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cityFilterText: {
        fontWeight: '600',
        fontSize: 14,
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
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    friendTag: {
        marginLeft: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    friendTagText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 16,
        padding: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 15,
    },
});
