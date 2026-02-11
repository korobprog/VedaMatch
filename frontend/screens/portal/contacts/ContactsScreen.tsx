import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';

import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../../utils/url';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { COLORS } from '../../../components/chat/ChatConstants';
import { contactService, UserContact } from '../../../services/contactService';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { ProtectedScreen } from '../../../components/ProtectedScreen';

import { useChat } from '../../../context/ChatContext';
import { useSettings } from '../../../context/SettingsContext';
import { Phone, MessageCircle, Search, X, ChevronDown, ChevronRight, Check } from 'lucide-react-native';

export const ContactsScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const { setChatRecipient } = useChat();
    const { vTheme, isDarkMode, portalBackgroundType } = useSettings();
    const isPhotoBg = portalBackgroundType === 'image';
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
    const [now, setNow] = useState(new Date());
    const latestFetchRequestRef = useRef(0);
    const isMountedRef = useRef(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 30000); // Update relative time every 30 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestFetchRequestRef.current += 1;
        };
    }, []);


    const fetchContacts = useCallback(async () => {
        const requestId = ++latestFetchRequestRef.current;
        try {
            if (isMountedRef.current) {
                setLoading(true);
            }
            const contacts = await contactService.getContacts();
            if (requestId !== latestFetchRequestRef.current || !isMountedRef.current) {
                return;
            }
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
                    if (requestId === latestFetchRequestRef.current && isMountedRef.current) {
                        setAvailableCities(response.data);
                    }
                } else {
                    if (requestId === latestFetchRequestRef.current && isMountedRef.current) {
                        setAvailableCities(citiesFromContacts);
                    }
                }
            } catch {
                if (requestId === latestFetchRequestRef.current && isMountedRef.current) {
                    setAvailableCities(citiesFromContacts);
                }
            }

            if (currentUser?.ID) {
                const [userFriends, blocked] = await Promise.all([
                    contactService.getFriends(currentUser.ID),
                    contactService.getBlockedUsers(currentUser.ID),
                ]);
                if (requestId === latestFetchRequestRef.current && isMountedRef.current) {
                    setFriends(userFriends);
                    setBlockedContacts(blocked);
                }
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            if (requestId === latestFetchRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [currentUser?.ID]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

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
        const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
        return diffMinutes < 5; // Online if active in last 5 minutes
    };

    const formatLastSeen = (lastSeen: string) => {
        if (!lastSeen) return '';
        const date = new Date(lastSeen);

        // Simple localization based on user's device settings
        const isToday = new Date().toDateString() === date.toDateString();

        if (isToday) {
            return t('contacts.lastSeenToday', {
                time: date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
            });
        } else {
            return t('contacts.lastSeenDate', {
                date: date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            });
        }
    };


    const friendIdsSet = useMemo(() => new Set(friends.map((friend) => friend.ID)), [friends]);
    const blockedIdsSet = useMemo(() => new Set(blockedContacts.map((blocked) => blocked.ID)), [blockedContacts]);

    const displayedContacts = (
        filter === 'all' ? allContacts :
            filter === 'friends' ? friends : blockedContacts
    ).filter((c: UserContact) => {
        const isSelf = currentUser?.ID && c.ID === currentUser.ID;
        if (isSelf) return false;

        // In All and Friends, don't show anyone who is blocked
        if (filter !== 'blocked') {
            const isBlocked = blockedIdsSet.has(c.ID);
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
            const isFriendA = friendIdsSet.has(a.ID);
            const isFriendB = friendIdsSet.has(b.ID);
            if (isFriendA && !isFriendB) return -1;
            if (!isFriendA && isFriendB) return 1;
        }
        return 0;
    });

    const renderItem = ({ item }: { item: UserContact }) => {
        const avatarUrl = getMediaUrl(item.avatarUrl);
        const online = isOnline(item.lastSeen);
        const lastSeenText = !online ? formatLastSeen(item.lastSeen) : '';
        const isBlocked = filter === 'blocked';
        const isFriend = friendIdsSet.has(item.ID);
        const nameColor = isPhotoBg ? '#ffffff' : vTheme.colors.text;
        const descColor = isPhotoBg ? 'rgba(255,255,255,0.7)' : vTheme.colors.textSecondary;

        return (
            <TouchableOpacity
                style={[styles.contactItem, {
                    backgroundColor: isPhotoBg ? 'transparent' : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'),
                    borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                }]}
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
                {(isPhotoBg || isDarkMode) && (
                    <BlurView
                        style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
                        blurType={isDarkMode ? "dark" : "light"}
                        blurAmount={15}
                        reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                    />
                )}
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
                        <Text style={[styles.contactName, { color: nameColor }]} numberOfLines={1} ellipsizeMode="tail">
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
                    <Text style={[styles.contactDesc, { color: descColor }]} numberOfLines={1}>
                        {online ? (
                            `${item.country && item.city ? `${item.country}, ${item.city}` : (item.country || item.city || '')}`
                        ) : (
                            lastSeenText || `${item.country && item.city ? `${item.country}, ${item.city}` : (item.country || item.city || '')}`
                        )}
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
                                style={[
                                    styles.callBtn,
                                    {
                                        backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'),
                                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : 'transparent',
                                        borderWidth: isPhotoBg ? 1 : 0
                                    }
                                ]}
                                onPress={() => {
                                    navigation.navigate('CallScreen', {
                                        targetId: item.ID,
                                        isIncoming: false,
                                        callerName: item.spiritualName || item.karmicName || 'User'
                                    });
                                }}
                            >
                                <Phone size={18} color={isPhotoBg ? '#ffffff' : theme.primary} />
                            </TouchableOpacity>
                        )}
                        {isFriend && (
                            <TouchableOpacity
                                style={[
                                    styles.callBtn,
                                    {
                                        backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.15)' : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'),
                                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : 'transparent',
                                        borderWidth: isPhotoBg ? 1 : 0
                                    }
                                ]}
                                onPress={() => {
                                    setChatRecipient(item);
                                    navigation.navigate('Chat');
                                }}
                            >
                                <MessageCircle size={18} color={isPhotoBg ? '#ffffff' : theme.primary} />
                            </TouchableOpacity>
                        )}
                        <ChevronRight size={20} color={theme.accent} style={{ marginLeft: 10 }} />
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

    const filteredCities = useMemo(() => availableCities.filter((city: string) =>
        city.toLowerCase().includes(citySearchQuery.toLowerCase())
    ), [availableCities, citySearchQuery]);

    const uniqueCountries = useMemo(
        () => Array.from(new Set(allContacts.map((c: UserContact) => c.country).filter(Boolean))).sort(),
        [allContacts]
    );
    const uniqueCities = availableCities;

    return (
        <ProtectedScreen requireCompleteProfile={false}>
            <View style={[styles.container, { backgroundColor: isPhotoBg ? 'transparent' : vTheme.colors.background }]}>
                <View style={styles.filterBar}>
                    <TouchableOpacity
                        onPress={() => setFilter('all')}
                        style={[styles.filterBtn, filter === 'all' && { borderBottomColor: isPhotoBg ? '#ffffff' : theme.accent }]}
                    >
                        <Text style={[styles.filterText, { color: isPhotoBg ? (filter === 'all' ? '#ffffff' : 'rgba(255,255,255,0.7)') : (filter === 'all' ? theme.text : theme.subText) }]}>
                            {t('contacts.all')} ({displayedContacts.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilter('friends')}
                        style={[styles.filterBtn, filter === 'friends' && { borderBottomColor: isPhotoBg ? '#ffffff' : theme.accent }]}
                    >
                        <Text style={[styles.filterText, { color: isPhotoBg ? (filter === 'friends' ? '#ffffff' : 'rgba(255,255,255,0.7)') : (filter === 'friends' ? theme.text : theme.subText) }]}>
                            {t('contacts.friends')} ({friends.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilter('blocked')}
                        style={[styles.filterBtn, filter === 'blocked' && { borderBottomColor: isPhotoBg ? '#ffffff' : theme.accent }]}
                    >
                        <Text style={[styles.filterText, { color: isPhotoBg ? (filter === 'blocked' ? '#ffffff' : 'rgba(255,255,255,0.7)') : (filter === 'blocked' ? theme.text : theme.subText) }]}>
                            {t('contacts.blocked')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Location Filters */}
                {filter === 'all' && (
                    <View style={[styles.filtersContainer, { backgroundColor: 'transparent', borderBottomColor: vTheme.colors.divider }]}>
                        {/* City Filter */}
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                filterCities.length > 0 && { backgroundColor: theme.accent + '30', borderColor: theme.accent },
                                isPhotoBg && { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }
                            ]}
                            onPress={() => setShowCityPicker(true)}
                        >
                            <Text style={[styles.filterChipText, { color: isPhotoBg ? '#ffffff' : (filterCities.length > 0 ? theme.accent : theme.text) }]}>
                                {filterCities.length > 0 ? `${filterCities.length} ${t('contacts.cities')}` : t('contacts.city')}
                            </Text>
                            <ChevronDown size={14} color={filterCities.length > 0 ? theme.accent : theme.subText} style={{ marginLeft: 6 }} />
                            {filterCities.length > 0 && (
                                <TouchableOpacity
                                    onPress={clearCityFilters}
                                    style={styles.clearFilterBtn}
                                >
                                    <X size={14} color={theme.accent} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>

                        {/* Stats */}
                        <View style={styles.statsContainer}>
                            <Text style={[styles.statsText, { color: isPhotoBg ? 'rgba(255,255,255,0.8)' : theme.subText }]}>
                                {uniqueCities.length} {t('contacts.cities')} • {uniqueCountries.length} {t('contacts.countries')}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={[styles.searchContainer, {
                    backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.15)' : vTheme.colors.backgroundSecondary,
                    borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : vTheme.colors.divider
                }]}>
                    <Search size={18} color={isPhotoBg ? 'rgba(255,255,255,0.7)' : theme.subText} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: isPhotoBg ? '#ffffff' : theme.inputText }]}
                        placeholder={filterCities.length > 0 ? t('contacts.searchingIn', { count: filterCities.length }) : t('contacts.searchBy')}
                        placeholderTextColor={isPhotoBg ? 'rgba(255,255,255,0.6)' : theme.subText}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X size={20} color={isPhotoBg ? '#ffffff' : theme.accent} />
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
                                        {search ? t('contacts.noResults', { search }) : t('contacts.noContacts')}
                                    </Text>
                                    {filter === 'all' && filterCities.length > 0 && (
                                        <TouchableOpacity onPress={clearCityFilters}>
                                            <Text style={[styles.clearFilterLink, { color: theme.accent }]}>
                                                {t('contacts.clearCityFilter', { count: filterCities.length })}
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
                    onRequestClose={() => setShowCityPicker(false)}
                >
                    <View style={styles.modalOverlay}>
                        {(isPhotoBg || isDarkMode) && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="dark"
                                blurAmount={10}
                                reducedTransparencyFallbackColor="rgba(0,0,0,0.7)"
                            />
                        )}
                        <View style={[
                            styles.modalContent,
                            {
                                backgroundColor: isPhotoBg ? 'rgba(0,0,0,0.5)' : (isDarkMode ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.95)'),
                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.1)' : theme.borderColor,
                                borderWidth: 1,
                            }
                        ]}>
                            <TouchableOpacity
                                onPress={() => setShowCityPicker(false)}
                                style={[styles.closeModalBtn, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.1)' : vTheme.colors.backgroundSecondary }]}
                            >
                                <X size={20} color={isPhotoBg ? '#FFF' : theme.subText} />
                            </TouchableOpacity>

                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: isPhotoBg ? '#FFF' : theme.text, fontFamily: 'Cinzel-Bold' }]}>
                                    {t('contacts.selectCities', { count: filterCities.length })}
                                </Text>
                            </View>

                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.1)' : theme.inputBackground,
                                        color: isPhotoBg ? '#FFF' : theme.text,
                                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : theme.borderColor,
                                        marginBottom: 10
                                    }
                                ]}
                                value={citySearchQuery}
                                onChangeText={setCitySearchQuery}
                                placeholder={t('dating.searchCity')}
                                placeholderTextColor={isPhotoBg ? 'rgba(255,255,255,0.6)' : theme.subText}
                            />

                            {filterCities.length > 0 && (
                                <TouchableOpacity
                                    onPress={clearCityFilters}
                                    style={[styles.clearAllBtn, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}
                                >
                                    <Text style={[styles.clearAllBtnText, { color: '#EF4444' }]}>
                                        {t('contacts.clearAll', { count: filterCities.length })}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} indicatorStyle={isDarkMode || isPhotoBg ? 'white' : 'black'}>
                                {filteredCities.length === 0 ? (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={[styles.noResults, { color: isPhotoBg ? 'rgba(255,255,255,0.7)' : theme.subText }]}>
                                            {t('contacts.noCitiesFound')}
                                        </Text>
                                    </View>
                                ) : (
                                    filteredCities.map((city: string, index: number) => {
                                        const isSelected = filterCities.includes(city);
                                        const count = allContacts.filter((c: UserContact) => c.city === city).length;
                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.cityItem,
                                                    { borderBottomColor: isPhotoBg ? 'rgba(255,255,255,0.1)' : theme.borderColor },
                                                    isSelected && styles.cityItemSelected
                                                ]}
                                                onPress={() => toggleCityFilter(city)}
                                            >
                                                <View style={styles.cityItemLeft}>
                                                    {/* Checkbox */}
                                                    <View style={[
                                                        styles.checkbox,
                                                        { borderColor: isPhotoBg ? 'rgba(255,255,255,0.5)' : theme.borderColor },
                                                        isSelected && { backgroundColor: vTheme.colors.primary, borderColor: vTheme.colors.primary }
                                                    ]}>
                                                        {isSelected && (
                                                            <Check size={12} color="#FFF" strokeWidth={3} />
                                                        )}
                                                    </View>
                                                    <Text style={[styles.cityName, { color: isPhotoBg ? '#FFF' : theme.text }]} numberOfLines={1}>
                                                        {city.split(',')[0].trim()}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.cityCount, { color: isPhotoBg ? 'rgba(255,255,255,0.6)' : theme.subText, fontSize: 12 }]}>{count}</Text>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </ScrollView>

                            <TouchableOpacity
                                onPress={() => setShowCityPicker(false)}
                                style={styles.applyBtnContainer}
                            >
                                <LinearGradient
                                    colors={['#3B82F6', '#2DD4BF']} // New Blue-Teal Gradient
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.applyBtnGradient}
                                >
                                    <Text style={[styles.applyBtnText, { color: '#FFF' }]}>
                                        {t('contacts.applyFilter', { count: filterCities.length })}
                                    </Text>
                                </LinearGradient>
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20
    },
    modalContent: {
        width: '100%',
        maxHeight: '80%',
        borderRadius: 24,
        padding: 20,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 20,
        paddingHorizontal: 30, // Added padding to avoid text touching close button area if it was relative
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    closeModalBtn: {
        position: 'absolute',
        top: 10,
        right: 14,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    applyBtnContainer: {
        marginTop: 16,
        borderRadius: 25,
        overflow: 'hidden',
    },
    applyBtnGradient: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    clearAllBtn: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 12,
    },
    clearAllBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    cityItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    cityItemSelected: {
        backgroundColor: 'rgba(255, 215, 0, 0.05)', // Subtle gold tint for selected
    },
    cityItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxCheck: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cityName: {
        fontSize: 16,
        fontWeight: '500',
    },
    cityCount: {
        fontWeight: '600',
    },
    applyBtn: {
        marginTop: 16,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Cinzel-Bold',
    },
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
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
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
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 24,
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
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 22,
        borderWidth: 1,
        overflow: 'hidden',
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
    noResults: {
        textAlign: 'center',
        padding: 30,
        fontSize: 15,
        fontStyle: 'italic',
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
    callBtn: {
        padding: 8,
        borderRadius: 20,
        marginRight: 4,
    },
});
