import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, useColorScheme, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../../utils/url';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { COLORS } from '../../../components/chat/ChatConstants';
import { contactService, UserContact } from '../../../services/contactService';
import { API_BASE_URL, API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { ProtectedScreen } from '../../../components/ProtectedScreen';

import { useChat } from '../../../context/ChatContext';
import { Phone, MessageCircle } from 'lucide-react-native';

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

    // City Filter State - support multiple cities
    const [filterCities, setFilterCities] = useState<string[]>([]);
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [friendIds, setFriendIds] = useState<number[]>([]);

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        // We don't set the city filter automatically anymore to avoid confusion when no users are in the same city
        /*
        if (currentUser?.city) {
            setFilterCities([currentUser.city]);
        }
        */
    }, [currentUser?.city]);

    const fetchCities = async () => {
        try {
            const token = await contactService.getAuthToken();
            const response = await axios.get(`${API_PATH}/dating/cities`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Cities from API:', response.data);
            setAvailableCities(response.data);
        } catch (error) {
            console.error('Failed to fetch cities:', error);
            // Extract unique cities from contacts
            const citiesFromContacts = new Set<string>();
            allContacts.forEach(contact => {
                if (contact.city) {
                    citiesFromContacts.add(contact.city);
                }
            });
            const cities = Array.from(citiesFromContacts).sort();
            setAvailableCities(cities);
            console.log('Fallback cities from contacts:', cities);
        }
    };

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const contacts = await contactService.getContacts();
            console.log('Contacts fetched:', contacts.length);
            setAllContacts(contacts);

            // Extract cities from contacts
            const citiesSet = new Set<string>();
            contacts.forEach(contact => {
                if (contact.city) {
                    citiesSet.add(contact.city);
                }
            });
            const citiesFromContacts = Array.from(citiesSet).sort();

            // Try to get cities from API, fallback to contacts
            try {
                const token = await contactService.getAuthToken();
                const response = await axios.get(`${API_PATH}/dating/cities`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.data && response.data.length > 0) {
                    setAvailableCities(response.data);
                    console.log('Cities from API:', response.data.length);
                } else {
                    setAvailableCities(citiesFromContacts);
                    console.log('No cities from API, using contacts:', citiesFromContacts.length);
                }
            } catch (apiError) {
                setAvailableCities(citiesFromContacts);
                console.log('API error, using cities from contacts:', citiesFromContacts.length);
            }

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
    ).filter((c: UserContact) => {
        const isSelf = currentUser?.ID && c.ID === currentUser.ID;
        if (isSelf) return false;

        // In All and Friends, don't show anyone who is blocked
        if (filter !== 'blocked') {
            const isBlocked = blockedContacts.some(bc => bc.ID === c.ID);
            if (isBlocked) return false;
        }

        // Apply City Filter only for 'all' tab - support multiple cities
        if (filter === 'all' && filterCities.length > 0) {
            if (!filterCities.includes(c.city)) return false;
        }

        // Search by name, city, or country
        if (search) {
            const searchLower = search.toLowerCase();
            return c.karmicName?.toLowerCase().includes(searchLower) ||
                c.spiritualName?.toLowerCase().includes(searchLower) ||
                c.city?.toLowerCase().includes(searchLower) ||
                c.country?.toLowerCase().includes(searchLower) ||
                c.yatra?.toLowerCase().includes(searchLower);
        }

        return true;
    }).sort((a, b) => {
        if (filter === 'all') {
            const isFriendA = friends.some(f => f.ID === a.ID);
            const isFriendB = friends.some(f => f.ID === b.ID);
            if (isFriendA && !isFriendB) return -1;
            if (!isFriendA && isFriendB) return 1;
        }
        return 0;
    });

    const getLocalTime = (timezone?: string) => {
        if (!timezone) return '';
        try {
            return new Date().toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (e) {
            return '';
        }
    };

    const renderItem = ({ item }: { item: UserContact }) => {
        const avatarUrl = getMediaUrl(item.avatarUrl);
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
                        {item.identity || 'Devotee'} • {item.country}, {item.city}
                        {item.yatra ? ` • ${item.yatra}` : ''}
                        {item.timezone ? ` • ${getLocalTime(item.timezone)}` : ''}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isFriend && (
                            <TouchableOpacity
                                style={[styles.callBtn, { backgroundColor: theme.button + '10' }]}
                                onPress={() => {
                                    navigation.navigate('CallScreen', {
                                        targetId: item.ID,
                                        isIncoming: false,
                                        callerName: item.spiritualName || item.karmicName || 'User'
                                    });
                                }}
                            >
                                <Phone size={20} color={theme.primary} />
                            </TouchableOpacity>
                        )}
                        {isFriend && (
                            <TouchableOpacity
                                style={[styles.callBtn, { backgroundColor: theme.button + '10' }]}
                                onPress={() => {
                                    setChatRecipient(item);
                                    navigation.navigate('Chat');
                                }}
                            >
                                <MessageCircle size={20} color={theme.primary} />
                            </TouchableOpacity>
                        )}
                        <Text style={{ color: theme.accent, fontSize: 18, marginLeft: 10 }}>›</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const toggleCityFilter = (city: string) => {
        setFilterCities((prev: string[]) => {
            if (prev.includes(city)) {
                return prev.filter(c => c !== city);
            } else {
                return [...prev, city];
            }
        });
    };

    const clearCityFilters = () => {
        setFilterCities([]);
    };

    const filteredCities = availableCities.filter((city: string) =>
        city.toLowerCase().includes(citySearchQuery.toLowerCase())
    );

    const uniqueCountries = Array.from(new Set(allContacts.map((c: UserContact) => c.country).filter(Boolean))).sort();
    const uniqueCities = availableCities;

    return (
        <ProtectedScreen requireCompleteProfile={false}>
            <View style={styles.container}>
                <View style={styles.filterBar}>
                    <TouchableOpacity
                        onPress={() => setFilter('all')}
                        style={[styles.filterBtn, filter === 'all' && { borderBottomColor: theme.accent }]}
                    >
                        <Text style={[styles.filterText, { color: filter === 'all' ? theme.text : theme.subText }]}>All ({displayedContacts.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilter('friends')}
                        style={[styles.filterBtn, filter === 'friends' && { borderBottomColor: theme.accent }]}
                    >
                        <Text style={[styles.filterText, { color: filter === 'friends' ? theme.text : theme.subText }]}>Friends ({friends.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilter('blocked')}
                        style={[styles.filterBtn, filter === 'blocked' && { borderBottomColor: theme.accent }]}
                    >
                        <Text style={[styles.filterText, { color: filter === 'blocked' ? theme.text : theme.subText }]}>{t('contacts.blocked')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Location Filters */}
                {filter === 'all' && (
                    <View style={[styles.filtersContainer, { backgroundColor: theme.header }]}>
                        {/* City Filter */}
                        <TouchableOpacity
                            style={[styles.filterChip, filterCities.length > 0 && { backgroundColor: theme.accent + '30', borderColor: theme.accent }]}
                            onPress={() => setShowCityPicker(true)}
                        >
                            <Text style={[styles.filterChipText, { color: filterCities.length > 0 ? theme.accent : theme.subText }]}>
                                {filterCities.length > 0 ? `🏙️ ${filterCities.length} cities` : '🏙️ City'}
                            </Text>
                            {filterCities.length > 0 && (
                                <TouchableOpacity
                                    onPress={clearCityFilters}
                                    style={styles.clearFilterBtn}
                                >
                                    <Text style={{ color: theme.accent, fontSize: 12 }}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>

                        {/* Stats */}
                        <View style={styles.statsContainer}>
                            <Text style={[styles.statsText, { color: theme.subText }]}>
                                {uniqueCities.length} cities • {uniqueCountries.length} countries
                            </Text>
                        </View>
                    </View>
                )}

                <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                    <Text style={{ color: theme.subText, marginRight: 8 }}>🔍</Text>
                    <TextInput
                        style={[styles.searchInput, { color: theme.inputText }]}
                        placeholder={filterCities.length > 0 ? `Searching in ${filterCities.length} cities` : "Search by name, city or country"}
                        placeholderTextColor={theme.subText}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Text style={{ color: theme.accent, fontSize: 18 }}>✕</Text>
                        </TouchableOpacity>
                    ) : null}
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
                                <>
                                    <Text style={[styles.empty, { color: theme.subText }]}>
                                        {search ? `No results for "${search}"` : 'No contacts found'}
                                    </Text>
                                    {filter === 'all' && filterCities.length > 0 && (
                                        <TouchableOpacity onPress={clearCityFilters}>
                                            <Text style={[styles.clearFilterLink, { color: theme.accent }]}>
                                                Clear city filter ({filterCities.length})
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}
                        </View>
                    }
                />

                {/* City Selection Modal - Multi-select with checkboxes */}
                <Modal
                    visible={showCityPicker}
                    transparent
                    animationType="fade"
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.header, maxHeight: '70%' }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: theme.text }]}>
                                    Select Cities ({filterCities.length} selected)
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowCityPicker(false)}
                                    style={styles.closeModalBtn}
                                >
                                    <Text style={{ color: theme.subText, fontSize: 24 }}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor, marginBottom: 10 }]}
                                value={citySearchQuery}
                                onChangeText={setCitySearchQuery}
                                placeholder="Search city..."
                                placeholderTextColor={theme.subText}
                            />

                            {filterCities.length > 0 && (
                                <TouchableOpacity
                                    onPress={clearCityFilters}
                                    style={[styles.clearAllBtn, { backgroundColor: theme.accent + '20' }]}
                                >
                                    <Text style={[styles.clearAllBtnText, { color: theme.accent }]}>
                                        Clear all ({filterCities.length})
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                                {filteredCities.length === 0 ? (
                                    <Text style={[styles.noResults, { color: theme.subText }]}>
                                        No cities found
                                    </Text>
                                ) : (
                                    filteredCities.map((city: string, index: number) => {
                                        const isSelected = filterCities.includes(city);
                                        const count = allContacts.filter((c: UserContact) => c.city === city).length;
                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.cityItem,
                                                    { borderBottomColor: theme.borderColor },
                                                    isSelected && styles.cityItemSelected
                                                ]}
                                                onPress={() => toggleCityFilter(city)}
                                            >
                                                <View style={styles.cityItemLeft}>
                                                    {/* Checkbox */}
                                                    <View style={[
                                                        styles.checkbox,
                                                        { borderColor: theme.borderColor },
                                                        isSelected && { backgroundColor: theme.accent, borderColor: theme.accent }
                                                    ]}>
                                                        {isSelected && (
                                                            <Text style={styles.checkboxCheck}>✓</Text>
                                                        )}
                                                    </View>
                                                    <Text style={[styles.cityName, { color: theme.text }]}>{city}</Text>
                                                </View>
                                                <Text style={[styles.cityCount, { color: theme.subText, fontSize: 12 }]}>{count}</Text>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </ScrollView>

                            <TouchableOpacity
                                style={[styles.applyBtn, { backgroundColor: theme.accent }]}
                                onPress={() => setShowCityPicker(false)}
                            >
                                <Text style={styles.applyBtnText}>
                                    Apply Filter ({filterCities.length})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </ProtectedScreen>
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
    filtersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 0.5,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent',
        marginRight: 8,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    clearFilterBtn: {
        marginLeft: 4,
    },
    statsContainer: {
        marginLeft: 'auto',
    },
    statsText: {
        fontSize: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 16,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        marginLeft: 4,
    },
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
        fontSize: 16,
    },
    clearFilterLink: {
        textAlign: 'center',
        marginTop: 8,
        fontSize: 14,
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
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    closeModalBtn: {
        padding: 4,
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
    cityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
    },
    cityItemSelected: {
        backgroundColor: '#D67D3E15',
    },
    cityItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxCheck: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cityName: {
        fontSize: 15,
    },
    cityCount: {
        fontSize: 13,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    clearAllBtn: {
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    clearAllBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    noResults: {
        textAlign: 'center',
        padding: 30,
        fontSize: 15,
        fontStyle: 'italic',
    },
    applyBtn: {
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    applyBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    callBtn: {
        padding: 8,
        borderRadius: 20,
        marginRight: 4,
    },
});
