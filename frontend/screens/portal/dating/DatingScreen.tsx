import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    useColorScheme,
    TouchableOpacity,
    Dimensions,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    TextInput,
    Switch
} from 'react-native';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { useChat } from '../../../context/ChatContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

interface Photo {
    url: string;
}

interface Profile {
    ID: number;
    spiritualName: string;
    age: number;
    city: string;
    bio: string;
    madh: string;
    avatarUrl: string;
    photos: Photo[];
}

export const DatingScreen = () => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { setChatRecipient } = useChat();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const [candidates, setCandidates] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [compatibilityText, setCompatibilityText] = useState('');
    const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
    const [checkingComp, setCheckingComp] = useState(false);
    const [currentCandidateId, setCurrentCandidateId] = useState<number | null>(null);

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [filterCity, setFilterCity] = useState('');
    const [filterMinAge, setFilterMinAge] = useState('');
    const [filterMaxAge, setFilterMaxAge] = useState('');

    // City Selection
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [friendIds, setFriendIds] = useState<number[]>([]);

    useEffect(() => {
        if (user?.ID) {
            fetchFriends();
        }
    }, [user?.ID]);

    const fetchFriends = async () => {
        try {
            const response = await axios.get(`${API_PATH}/friends/${user?.ID}`);
            const ids = response.data.map((f: any) => f.ID);
            setFriendIds(ids);
        } catch (error) {
            console.error('Failed to fetch friends:', error);
        }
    };

    useEffect(() => {
        fetchCandidates();
        fetchCities();
    }, []);

    const filteredCities = availableCities.filter(city =>
        city.toLowerCase().includes(citySearchQuery.toLowerCase())
    );



    const fetchCities = async () => {
        try {
            const response = await axios.get(`${API_PATH}/dating/cities`);
            setAvailableCities(response.data);
        } catch (error) {
            console.error('Failed to fetch cities:', error);
        }
    };

    const fetchCandidates = async () => {
        try {
            const response = await axios.get(`${API_PATH}/dating/candidates`, {
                params: {
                    userId: user?.ID,
                    city: filterCity,
                    minAge: filterMinAge,
                    maxAge: filterMaxAge
                }
            });
            setCandidates(response.data);
        } catch (error) {
            console.error('Failed to fetch candidates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckCompatibility = async (candidateId: number) => {
        setCurrentCandidateId(candidateId);
        setCheckingComp(true);
        setShowCompatibilityModal(true);
        setCompatibilityText('Analyzing compatibility with AI Astro-processor...');
        try {
            const response = await axios.post(`${API_PATH}/dating/compatibility/${user?.ID}/${candidateId}`);
            setCompatibilityText(response.data.compatibility);
        } catch (error) {
            setCompatibilityText('Failed to analyze compatibility. Please try again.');
        } finally {
            setCheckingComp(false);
        }
    };

    const handleSaveFavorite = async () => {
        if (!currentCandidateId || !compatibilityText) return;
        try {
            await axios.post(`${API_PATH}/dating/favorites`, {
                userId: user?.ID,
                candidateId: currentCandidateId,
                compatibilityScore: compatibilityText
            });
            Alert.alert('Saved', 'Added to favorites!');
        } catch (error) {
            Alert.alert('Error', 'Could not save to favorites');
        }
    };

    const handleConnect = async () => {
        if (!currentCandidateId || !user?.ID) return;

        // If already friend, navigate to chat
        if (friendIds.includes(currentCandidateId)) {
            setShowCompatibilityModal(false);
            const candidate = candidates.find(c => c.ID === currentCandidateId);
            if (candidate) {
                setChatRecipient({
                    ID: candidate.ID,
                    spiritualName: candidate.spiritualName,
                    avatarUrl: candidate.avatarUrl,
                    karmicName: '',
                    city: candidate.city,
                    country: '',
                    email: ''
                } as any);
                navigation.navigate('Chat');
            }
            return;
        }

        // Else add friend (request)
        try {
            await axios.post(`${API_PATH}/friends/add`, {
                userId: user.ID,
                friendId: currentCandidateId
            });
            setFriendIds([...friendIds, currentCandidateId]);
            Alert.alert('Success', 'Request sent! You can now chat.');
            // Optionally navigate to chat immediately? User said "if user accepts". 
            // Since our backend adds friend immediately, we can allow chat or just say "Request Sent".
            // Let's stick to "Request Sent" and maybe allow chat if backend allows it.
            // But for better UX let's just say "Connected! You can now chat." since we know backend adds it immediately.
        } catch (error) {
            Alert.alert('Error', 'Could not connect.');
        }
    };

    const DatingCard = ({ item }: { item: Profile }) => {
        const allPhotos = item.photos || [];
        const displayPhotos = allPhotos.length > 0 ? allPhotos : (item.avatarUrl ? [{ url: item.avatarUrl }] : []);
        const [activeIndex, setActiveIndex] = useState(0);
        const flatListRef = React.useRef<FlatList>(null);

        const handleScroll = (event: any) => {
            const contentOffset = event.nativeEvent.contentOffset.x;
            const index = Math.round(contentOffset / (width - 34));
            if (index !== activeIndex && index >= 0 && index < displayPhotos.length) {
                setActiveIndex(index);
            }
        };

        const handleTap = (event: any) => {
            const x = event.nativeEvent.locationX;
            const cardWidth = width - 34;
            if (x < cardWidth * 0.3) {
                // Tap left
                if (activeIndex > 0) {
                    flatListRef.current?.scrollToIndex({ index: activeIndex - 1, animated: true });
                }
            } else if (x > cardWidth * 0.7) {
                // Tap right
                if (activeIndex < displayPhotos.length - 1) {
                    flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
                } else {
                    navigation.navigate('MediaLibrary', { userId: item.ID, readOnly: true });
                }
            } else {
                // Tap middle
                navigation.navigate('MediaLibrary', { userId: item.ID, readOnly: true });
            }
        };

        return (
            <View style={[styles.card, { backgroundColor: theme.header, borderColor: theme.borderColor }]}>
                <View style={styles.avatarContainer}>
                    {displayPhotos.length > 0 ? (
                        <View style={{ flex: 1 }}>
                            <FlatList
                                ref={flatListRef}
                                data={displayPhotos}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onScroll={handleScroll}
                                scrollEventThrottle={16}
                                keyExtractor={(_, index) => index.toString()}
                                renderItem={({ item: photo }) => (
                                    <TouchableOpacity
                                        activeOpacity={1}
                                        onPress={handleTap}
                                        style={{ width: width - 34, height: 350 }}
                                    >
                                        <Image
                                            source={{ uri: `${API_PATH.replace(/\/api\/?$/, '')}${photo.url}` }}
                                            style={styles.avatar}
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                )}
                            />

                            {/* Gradient Overlay for Top Indicators */}
                            <LinearGradient
                                colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
                                style={styles.topGradient}
                            />

                            {/* Pagination Indicators (Bars) */}
                            {displayPhotos.length > 1 && (
                                <View style={styles.paginationContainer}>
                                    {displayPhotos.map((_, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.paginationBar,
                                                {
                                                    backgroundColor: i === activeIndex ? 'white' : 'rgba(255,255,255,0.4)',
                                                    width: ((width - 60) / displayPhotos.length) - 4
                                                }
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}

                            <View style={styles.tapToView}>
                                <Text style={styles.tapText}>{t('dating.tapToSlide')}</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.background }]}>
                            <Text style={{ fontSize: 60 }}>👤</Text>
                            <Text style={{ color: theme.subText, marginTop: 10 }}>{t('dating.noPhotos')}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.cardInfo}>
                    <Text style={[styles.name, { color: theme.text }]}>{item.spiritualName || 'Devotee'}</Text>
                    <Text style={[styles.city, { color: theme.subText }]}>{item.city}</Text>
                    <Text style={[styles.path, { color: theme.accent }]}>{item.madh}</Text>
                    <Text style={[styles.bio, { color: theme.text }]} numberOfLines={3}>{item.bio || 'No bio yet'}</Text>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: theme.button }]}
                            onPress={() => handleCheckCompatibility(item.ID)}
                        >
                            <Text style={{ color: theme.buttonText }}>{t('dating.checkCompatibility')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View >
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.topMenu, { borderBottomColor: theme.borderColor, alignItems: 'center' }]}>
                {/* Left Arrow */}
                <Text style={{ fontSize: 18, color: theme.subText, marginRight: 5 }}>‹</Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5 }}
                >
                    <TouchableOpacity
                        style={[styles.menuBtn, { backgroundColor: theme.inputBackground, marginRight: 10 }]}
                        onPress={() => setShowFilters(true)}
                    >
                        <Text style={{ color: theme.text }}>{t('dating.filter')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.menuBtn, { backgroundColor: theme.inputBackground, marginRight: 10 }]}
                        onPress={() => user?.ID && navigation.navigate('EditDatingProfile', { userId: user.ID })}
                    >
                        <Text style={{ color: theme.text }}>{t('dating.editProfile')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.menuBtn, { backgroundColor: theme.inputBackground, marginRight: 10 }]}
                        onPress={() => user?.ID && navigation.navigate('MediaLibrary', { userId: user.ID })}
                    >
                        <Text style={{ color: theme.text }}>🖼️ {t('settings.tabs.chat').replace('Чат', 'Медиа')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.menuBtn, { backgroundColor: theme.inputBackground, marginRight: 10 }]}
                        onPress={() => navigation.navigate('DatingFavorites')}
                    >
                        <Text style={{ color: theme.text }}>{t('dating.favorites')}</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Right Arrow */}
                <Text style={{ fontSize: 18, color: theme.subText, marginLeft: 5 }}>›</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.accent} />
            ) : candidates.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={{ color: theme.subText }}>{t('dating.noCandidates')}</Text>
                    <Text style={{ color: theme.subText }}>{t('dating.joinPrompt')}</Text>
                </View>
            ) : (
                <FlatList
                    data={candidates}
                    keyExtractor={(item) => item.ID.toString()}
                    renderItem={({ item }) => <DatingCard item={item} />}
                    contentContainerStyle={styles.list}
                />
            )}

            <Modal
                visible={showCompatibilityModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header }]}>
                        <Text style={[styles.modalTitle, { color: theme.accent }]}>{t('dating.compatibilityAnalysis')}</Text>

                        <View style={{ alignItems: 'center', marginVertical: 10 }}>
                            <Image
                                source={{ uri: `${API_PATH.replace(/\/api\/?$/, '')}/uploads/kolobok_astrologer.png` }}
                                style={{ width: 120, height: 120, borderRadius: 60 }}
                                resizeMode="cover"
                            />
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {checkingComp ? (
                                <View style={{ paddingVertical: 20 }}>
                                    <ActivityIndicator color={theme.accent} size="large" />
                                    <Text style={[styles.modalText, { color: theme.subText, marginTop: 10 }]}>{t('dating.exploringStars')}</Text>
                                </View>
                            ) : (
                                <Text style={[styles.modalText, { color: theme.text }]}>{compatibilityText}</Text>
                            )}
                        </ScrollView>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <TouchableOpacity
                                style={[styles.closeBtn, { backgroundColor: theme.header, flex: 1, borderWidth: 1, borderColor: theme.borderColor }]}
                                onPress={handleSaveFavorite}
                            >
                                <Text style={{ color: theme.text }}>{t('dating.save')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.closeBtn, { backgroundColor: friendIds.includes(currentCandidateId || 0) ? theme.accent : '#4CAF50', flex: 1 }]}
                                onPress={handleConnect}
                            >
                                <Text style={{ color: 'white' }}>
                                    {friendIds.includes(currentCandidateId || 0) ? t('dating.chat') : t('dating.connect')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.closeBtn, { backgroundColor: theme.button, flex: 1 }]}
                                onPress={() => setShowCompatibilityModal(false)}
                            >
                                <Text style={{ color: theme.buttonText }}>{t('dating.close')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Filter Modal */}
            <Modal
                visible={showFilters}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{t('dating.filters')}</Text>

                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ color: theme.subText, marginBottom: 5 }}>{t('registration.city')}</Text>
                            <TouchableOpacity
                                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                                onPress={() => setShowCityPicker(true)}
                            >
                                <Text style={{ color: filterCity ? theme.text : theme.subText }}>
                                    {filterCity || t('dating.selectCity')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ color: theme.subText, marginBottom: 5 }}>{t('registration.dob')}</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
                                    value={filterMinAge}
                                    onChangeText={setFilterMinAge}
                                    placeholder={t('dating.minAge')}
                                    keyboardType="numeric"
                                    placeholderTextColor={theme.subText}
                                />
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
                                    value={filterMaxAge}
                                    onChangeText={setFilterMaxAge}
                                    placeholder={t('dating.maxAge')}
                                    keyboardType="numeric"
                                    placeholderTextColor={theme.subText}
                                />
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.header, flex: 1, borderWidth: 1, borderColor: theme.borderColor }]}
                                onPress={() => {
                                    setFilterCity('');
                                    setFilterMinAge('');
                                    setFilterMaxAge('');
                                    fetchCandidates();
                                }}
                            >
                                <Text style={{ color: theme.text, textAlign: 'center' }}>{t('dating.reset')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.button, flex: 1 }]}
                                onPress={() => {
                                    setShowFilters(false);
                                    fetchCandidates();
                                }}
                            >
                                <Text style={{ color: theme.buttonText, textAlign: 'center' }}>{t('dating.apply')}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={{ position: 'absolute', top: 10, right: 10, padding: 5 }}
                            onPress={() => setShowFilters(false)}
                        >
                            <Text style={{ color: theme.subText, fontSize: 18 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* City Selection Modal */}
            <Modal
                visible={showCityPicker}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header, maxHeight: '60%' }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{t('dating.selectCity')}</Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor, marginBottom: 10 }]}
                            value={citySearchQuery}
                            onChangeText={setCitySearchQuery}
                            placeholder={t('dating.searchCity')}
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
                                <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{t('dating.allCities')}</Text>
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
                            style={[styles.closeBtn, { backgroundColor: theme.button, marginTop: 10 }]}
                            onPress={() => setShowCityPicker(false)}
                        >
                            <Text style={{ color: theme.buttonText }}>{t('dating.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topMenu: {
        flexDirection: 'row',
        padding: 12,
        justifyContent: 'space-around',
        borderBottomWidth: 1,
    },
    menuBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    list: {
        padding: 16,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatarContainer: {
        height: 350,
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 50,
    },
    paginationContainer: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    paginationBar: {
        height: 3,
        borderRadius: 2,
        marginHorizontal: 2,
    },
    tapToView: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    tapText: {
        color: 'white',
        fontSize: 10,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    photoCountBadge: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    photoCountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardInfo: {
        padding: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    city: {
        fontSize: 14,
        marginBottom: 4,
    },
    path: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    bio: {
        fontSize: 14,
        lineHeight: 20,
    },
    actions: {
        marginTop: 15,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    actionBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
    },
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
        padding: 20,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalBody: {
        marginBottom: 10,
        maxHeight: Dimensions.get('window').height * 0.6,
    },
    modalScrollContent: {
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    modalText: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'left',
    },
    closeBtn: {
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        fontSize: 16,
    }
});
