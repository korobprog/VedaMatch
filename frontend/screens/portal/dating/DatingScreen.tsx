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
    Switch,
    Animated
} from 'react-native';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { useChat } from '../../../context/ChatContext';
import { datingService } from '../../../services/datingService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import LinearGradient from 'react-native-linear-gradient';
import { DATING_TRADITIONS, YOGA_STYLES, GUNAS, IDENTITY_OPTIONS } from '../../../constants/DatingConstants';
import { ProtectedScreen } from '../../../components/ProtectedScreen';

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
    industry?: string;
    skills?: string;
    lookingForBusiness?: string;
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
    const [mode, setMode] = useState<'family' | 'business' | 'friendship' | 'seva'>('family');

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [filterCity, setFilterCity] = useState('');
    const [filterMinAge, setFilterMinAge] = useState('');
    const [filterMaxAge, setFilterMaxAge] = useState('');
    const [filterMadh, setFilterMadh] = useState('');
    const [filterYogaStyle, setFilterYogaStyle] = useState('');
    const [filterGuna, setFilterGuna] = useState('');
    const [filterIdentity, setFilterIdentity] = useState('');

    const [showMadhPicker, setShowMadhPicker] = useState(false);
    const [showYogaPicker, setShowYogaPicker] = useState(false);
    const [showGunaPicker, setShowGunaPicker] = useState(false);
    const [showIdentityPicker, setShowIdentityPicker] = useState(false);

    // City Selection
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [friendIds, setFriendIds] = useState<number[]>([]);

    // Preview Profile State
    const [showPreview, setShowPreview] = useState(false);
    const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, city: 0, new: 0 });
    const [showStats, setShowStats] = useState(false);
    const [filterNew, setFilterNew] = useState(false);

    useEffect(() => {
        if (user?.ID) {
            fetchFriends();
            // Sync filters with user profile to ensure they find people like themselves by default
            const u = user as any;
            setFilterMadh(u.madh || u.sampradaya || '');
            setFilterYogaStyle(u.yogaStyle || '');
            setFilterGuna(u.guna || '');
            setFilterIdentity(u.identity || '');
        }
    }, [user]);

    const fetchFriends = async () => {
        try {
            const data = await datingService.getFriends();
            const ids = data.map((f: any) => f.ID);
            setFriendIds(ids);
        } catch (error) {
            console.error('Failed to fetch friends:', error);
        }
    };

    useEffect(() => {
        fetchCandidates();
        fetchCities();
        fetchStats();
    }, []);

    useEffect(() => {
        fetchCandidates();
    }, [mode]);

    useEffect(() => {
        if (user?.city) {
            fetchStats();
        }
    }, [user?.city]);

    const fetchStats = async () => {
        try {
            const data = await datingService.getStats(user?.city);
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const filteredCities = availableCities.filter(city =>
        city.toLowerCase().includes(citySearchQuery.toLowerCase())
    );



    const fetchCities = async () => {
        try {
            const data = await datingService.getCities();
            setAvailableCities(data);
        } catch (error) {
            console.error('Failed to fetch cities:', error);
        }
    };

    const fetchCandidates = async () => {
        if (!user?.ID) {
            setLoading(false);
            return;
        }

        try {
            const data = await datingService.getCandidates({
                userId: user.ID,
                mode: mode,
                city: filterCity,
                minAge: filterMinAge,
                maxAge: filterMaxAge,
                madh: filterMadh,
                yogaStyle: filterYogaStyle,
                guna: filterGuna,
                identity: filterIdentity
            });
            setCandidates(data);
        } catch (error) {
            console.error('Failed to fetch candidates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckCompatibility = async (candidateId: number) => {
        if (!user?.ID) return;
        setCurrentCandidateId(candidateId);
        setCheckingComp(true);
        setShowCompatibilityModal(true);
        setCompatibilityText('Analyzing compatibility with AI Astro-processor...');
        try {
            const data = await datingService.checkCompatibility(user.ID, candidateId);
            setCompatibilityText(data.compatibility);
        } catch (error) {
            setCompatibilityText('Failed to analyze compatibility. Please try again.');
        } finally {
            setCheckingComp(false);
        }
    };

    const handleSaveFavorite = async () => {
        if (!currentCandidateId || !compatibilityText || !user?.ID) return;
        try {
            await datingService.addToFavorites({
                userId: user.ID,
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
            await datingService.addFriend(user.ID, currentCandidateId);
            setFriendIds([...friendIds, currentCandidateId]);
            Alert.alert('Success', 'Request sent! You can now chat.');
        } catch (error) {
            Alert.alert('Error', 'Could not connect.');
        }
    };

    const fetchPreviewProfile = async () => {
        if (!user?.ID) return;
        setPreviewLoading(true);
        try {
            const data = await datingService.getProfile(user.ID);
            console.log('Preview profile data:', data);

            // Map response to Profile interface
            const mappedProfile: Profile = {
                ID: data.ID || user.ID,
                spiritualName: data.spiritual_name || data.spiritualName || user.spiritualName || 'Me',
                age: data.age || 0,
                city: data.city || '',
                bio: data.bio || '',
                madh: data.sampradaya || data.madh || '',
                avatarUrl: data.avatar_url || data.avatarUrl || user.avatar || '',
                photos: data.photos || []
            };
            setPreviewProfile(mappedProfile);
            setShowPreview(true);
        } catch (error) {
            console.error('Failed to fetch preview:', error);
            Alert.alert('Error', 'Could not load profile preview');
        } finally {
            setPreviewLoading(false);
        }
    };

    const DatingCard = ({ item, isPreview = false }: { item: Profile, isPreview?: boolean }) => {
        const allPhotos = item.photos || [];
        const displayPhotos = allPhotos.length > 0 ? allPhotos : (item.avatarUrl ? [{ url: item.avatarUrl }] : []);

        const [activeIndex, setActiveIndex] = useState(0);
        const fadeAnim = React.useRef(new Animated.Value(1)).current;
        const [isPaused, setIsPaused] = useState(false);

        // Auto-change slides logic
        useEffect(() => {
            if (displayPhotos.length <= 1 || isPaused) return;

            const interval = setInterval(() => {
                Animated.sequence([
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    })
                ]).start();

                // Change index in the middle of fade
                setTimeout(() => {
                    setActiveIndex((prev) => (prev + 1) % displayPhotos.length);
                }, 500);

            }, 5000); // Change every 5 seconds

            return () => clearInterval(interval);
        }, [displayPhotos.length, isPaused]);

        const handleTap = (event: any) => {
            const x = event.nativeEvent.locationX;
            const cardWidth = width - 34;

            setIsPaused(true); // Pause auto-rotation on manual interaction
            // Resume after 10s
            // setTimeout(() => setIsPaused(false), 10000); // Optional: resume later

            if (x < cardWidth * 0.3) {
                // Tap left
                if (activeIndex > 0) {
                    setActiveIndex(activeIndex - 1);
                }
            } else if (x > cardWidth * 0.7) {
                // Tap right
                if (activeIndex < displayPhotos.length - 1) {
                    setActiveIndex(activeIndex + 1);
                } else if (!isPreview) {
                    navigation.navigate('MediaLibrary', { userId: item.ID, readOnly: true });
                }
            } else {
                // Tap middle
                if (!isPreview) {
                    navigation.navigate('MediaLibrary', { userId: item.ID, readOnly: true });
                }
            }
        };


        const currentPhotoUrl = displayPhotos[activeIndex]?.url;

        return (
            <View style={[styles.card, { backgroundColor: theme.header, borderColor: theme.borderColor }]}>
                <View style={styles.avatarContainer}>
                    {displayPhotos.length > 0 ? (
                        <View style={{ flex: 1 }}>
                            <TouchableOpacity
                                activeOpacity={1}
                                onPress={handleTap}
                                style={{ width: '100%', height: 350 }}
                            >
                                <Animated.Image
                                    source={{ uri: datingService.getMediaUrl(currentPhotoUrl) }}
                                    style={[styles.avatar, { opacity: fadeAnim }]}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>

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
                                <Text style={styles.tapText}>
                                    {isPaused ? t('dating.tapToSlide') + ' (Paused)' : t('dating.tapToSlide')}
                                </Text>
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
                    <Text style={[styles.name, { color: theme.text }]}>
                        {item.spiritualName || 'Devotee'}
                        {mode === 'family' && item.age ? `, ${item.age}` : ''}
                    </Text>
                    <Text style={[styles.city, { color: theme.subText }]}>{item.city}</Text>
                    
                    {mode === 'business' ? (
                        <View style={{ marginTop: 5 }}>
                            {item.industry && <Text style={[styles.path, { color: theme.accent }]}>💼 {item.industry}</Text>}
                            {item.skills && <Text style={[styles.skillsText, { color: theme.text }]}>🛠️ {item.skills}</Text>}
                        </View>
                    ) : (
                        <Text style={[styles.path, { color: theme.accent }]}>{item.madh}</Text>
                    )}

                    <Text style={[styles.bio, { color: theme.text }]} numberOfLines={3}>
                        {mode === 'business' && item.lookingForBusiness ? item.lookingForBusiness : (item.bio || 'No bio yet')}
                    </Text>

                    {!isPreview && (
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.button }]}
                                onPress={() => handleCheckCompatibility(item.ID)}
                            >
                                <Text style={{ color: theme.buttonText }}>
                                    {mode === 'business' ? 'Connect' : t('dating.checkCompatibility')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View >
        );
    };

    return (
        <ProtectedScreen requireCompleteProfile={true}>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={[styles.topMenu, { borderBottomColor: theme.borderColor, alignItems: 'center' }]}>
                    {/* Left Arrow */}
                    <Text style={{ fontSize: 18, color: theme.subText, marginRight: 5 }}>‹</Text>

                    <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: theme.inputBackground, marginRight: 5 }]}
                        onPress={() => setShowStats(!showStats)}
                    >
                        <Text style={{ fontSize: 14 }}>{showStats ? '📊 ▲' : '📊 ▼'}</Text>
                    </TouchableOpacity>

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
                            onPress={() => fetchPreviewProfile()}
                        >
                            <Text style={{ color: theme.text }}>👁️ {t('settings.tabs.chat').replace('Чат', 'Превью') || 'Preview'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuBtn, { backgroundColor: theme.inputBackground, marginRight: 10 }]}
                            onPress={() => user?.ID && navigation.navigate('MediaLibrary', { userId: user.ID })}
                        >
                            <Text style={{ color: theme.text }}>🖼️ Media</Text>
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

                {/* Mode Switcher */}
                <View style={{ backgroundColor: theme.background, paddingVertical: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
                        {[
                            { key: 'family', label: 'Family', emoji: '💍' },
                            { key: 'business', label: 'Business', emoji: '💼' },
                            { key: 'friendship', label: 'Friends', emoji: '🤝' },
                            { key: 'seva', label: 'Seva', emoji: '🪷' }
                        ].map((m) => (
                            <TouchableOpacity
                                key={m.key}
                                style={[
                                    styles.modeChip,
                                    {
                                        backgroundColor: mode === m.key ? theme.accent : theme.inputBackground,
                                        borderColor: theme.borderColor
                                    }
                                ]}
                                onPress={() => {
                                    setMode(m.key as any);
                                    setLoading(true);
                                }}
                            >
                                <Text style={{ fontSize: 16, marginRight: 5 }}>{m.emoji}</Text>
                                <Text style={{ color: mode === m.key ? '#fff' : theme.text, fontWeight: 'bold' }}>{m.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Statistics Bar */}
                {showStats && (
                    <View style={[styles.statsBar, { borderBottomColor: theme.borderColor }]}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
                            <TouchableOpacity
                                style={[
                                    styles.statItem,
                                    { backgroundColor: (!filterCity && !filterNew) ? theme.accent : theme.inputBackground }
                                ]}
                                onPress={() => {
                                    setFilterCity('');
                                    setFilterNew(false);
                                    fetchCandidates();
                                }}
                            >
                                <Text style={styles.statEmoji}>👥</Text>
                                <View>
                                    <Text style={[styles.statValue, { color: (!filterCity && !filterNew) ? '#fff' : theme.text }]}>{stats.total}</Text>
                                    <Text style={[styles.statLabel, { color: (!filterCity && !filterNew) ? 'rgba(255,255,255,0.8)' : theme.subText }]}>{t('dating.totalProfiles', 'Всего анкет')}</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.statItem,
                                    { backgroundColor: (filterCity === user?.city && filterCity !== '') ? theme.accent : theme.inputBackground }
                                ]}
                                onPress={() => {
                                    if (user?.city) {
                                        if (filterCity === user.city) {
                                            setFilterCity('');
                                        } else {
                                            setFilterCity(user.city);
                                            setFilterNew(false);
                                        }
                                        fetchCandidates();
                                    }
                                }}
                            >
                                <Text style={styles.statEmoji}>📍</Text>
                                <View>
                                    <Text style={[styles.statValue, { color: (filterCity === user?.city && filterCity !== '') ? '#fff' : theme.text }]}>{stats.city}</Text>
                                    <Text style={[styles.statLabel, { color: (filterCity === user?.city && filterCity !== '') ? 'rgba(255,255,255,0.8)' : theme.subText }]}>{t('dating.inYourCity', 'В вашем городе')}</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.statItem,
                                    { backgroundColor: filterNew ? theme.accent : theme.inputBackground }
                                ]}
                                onPress={() => {
                                    setFilterNew(!filterNew);
                                    if (!filterNew) setFilterCity('');
                                    fetchCandidates();
                                }}
                            >
                                <Text style={styles.statEmoji}>✨</Text>
                                <View>
                                    <Text style={[styles.statValue, { color: filterNew ? '#fff' : theme.text }]}>{stats.new}</Text>
                                    <Text style={[styles.statLabel, { color: filterNew ? 'rgba(255,255,255,0.8)' : theme.subText }]}>{t('dating.newLast24h', 'Новые (24ч)')}</Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                )}

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
                        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>{t('dating.filters')}</Text>
                                <TouchableOpacity onPress={() => setShowFilters(false)}>
                                    <Text style={{ fontSize: 24, color: theme.subText }}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* City */}
                                <Text style={[styles.filterLabel, { color: theme.subText }]}>{t('registration.city')}</Text>
                                <TouchableOpacity
                                    style={[styles.filterInput, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                    onPress={() => setShowCityPicker(true)}
                                >
                                    <Text style={{ color: filterCity ? theme.text : theme.subText }}>
                                        {filterCity || t('dating.selectCity')}
                                    </Text>
                                </TouchableOpacity>

                                {/* Age Row */}
                                <Text style={[styles.filterLabel, { color: theme.subText }]}>{t('registration.dob')}</Text>
                                <View style={styles.filterRow}>
                                    <TextInput
                                        style={[styles.filterInput, { flex: 1, backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor, marginBottom: 0 }]}
                                        value={filterMinAge}
                                        onChangeText={setFilterMinAge}
                                        placeholder={t('dating.minAge')}
                                        keyboardType="numeric"
                                        placeholderTextColor={theme.subText}
                                    />
                                    <TextInput
                                        style={[styles.filterInput, { flex: 1, backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor, marginBottom: 0 }]}
                                        value={filterMaxAge}
                                        onChangeText={setFilterMaxAge}
                                        placeholder={t('dating.maxAge')}
                                        keyboardType="numeric"
                                        placeholderTextColor={theme.subText}
                                    />
                                </View>

                                {/* Tradition */}
                                <Text style={[styles.filterLabel, { color: theme.subText }]}>Tradition (Madh)</Text>
                                <TouchableOpacity
                                    style={[styles.filterInput, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                    onPress={() => setShowMadhPicker(true)}
                                >
                                    <Text style={{ color: filterMadh ? theme.text : theme.subText }}>
                                        {filterMadh || "Any"}
                                    </Text>
                                </TouchableOpacity>

                                {/* Yoga Style */}
                                <Text style={[styles.filterLabel, { color: theme.subText }]}>Yoga Style</Text>
                                <TouchableOpacity
                                    style={[styles.filterInput, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                    onPress={() => setShowYogaPicker(true)}
                                >
                                    <Text style={{ color: filterYogaStyle ? theme.text : theme.subText }}>
                                        {filterYogaStyle || "Any"}
                                    </Text>
                                </TouchableOpacity>

                                {/* Guna */}
                                <Text style={[styles.filterLabel, { color: theme.subText }]}>Guna</Text>
                                <TouchableOpacity
                                    style={[styles.filterInput, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                    onPress={() => setShowGunaPicker(true)}
                                >
                                    <Text style={{ color: filterGuna ? theme.text : theme.subText }}>
                                        {filterGuna || "Any"}
                                    </Text>
                                </TouchableOpacity>

                                {/* Identity */}
                                <Text style={[styles.filterLabel, { color: theme.subText }]}>Identity</Text>
                                <TouchableOpacity
                                    style={[styles.filterInput, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                    onPress={() => setShowIdentityPicker(true)}
                                >
                                    <Text style={{ color: filterIdentity ? theme.text : theme.subText }}>
                                        {filterIdentity || "Any"}
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>

                            <View style={styles.filterBtnContainer}>
                                <TouchableOpacity
                                    style={[styles.resetBtn, { borderColor: theme.borderColor }]}
                                    onPress={() => {
                                        setFilterCity('');
                                        setFilterMinAge('');
                                        setFilterMaxAge('');
                                        setFilterMadh('');
                                        setFilterYogaStyle('');
                                        setFilterGuna('');
                                        setFilterIdentity('');
                                        fetchCandidates();
                                    }}
                                >
                                    <Text style={{ color: theme.text, fontWeight: '600' }}>{t('dating.reset')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.applyBtn, { backgroundColor: '#8D6E63' }]} // Brown accent color
                                    onPress={() => {
                                        setShowFilters(false);
                                        fetchCandidates();
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('dating.apply')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Profile Preview Modal */}
                <Modal
                    visible={showPreview}
                    transparent
                    animationType="slide"
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.background, padding: 0, width: '95%', height: '90%', borderRadius: 20 }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.borderColor }}>
                                <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>Profile Preview</Text>
                                <TouchableOpacity onPress={() => setShowPreview(false)} style={{ padding: 5 }}>
                                    <Text style={{ color: theme.subText, fontSize: 20 }}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ padding: 15, flex: 1 }}>
                                {previewLoading ? (
                                    <ActivityIndicator size="large" color={theme.primary} />
                                ) : previewProfile ? (
                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        <DatingCard item={previewProfile} isPreview={true} />
                                        <Text style={{ color: theme.subText, textAlign: 'center', marginTop: 10 }}>
                                            This is how others see your card
                                        </Text>
                                    </ScrollView>
                                ) : (
                                    <Text style={{ color: theme.text, textAlign: 'center' }}>Failed to load profile</Text>
                                )}
                            </View>
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

                {/* Madh Selection Modal */}
                <Modal
                    visible={showMadhPicker}
                    transparent
                    animationType="fade"
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.header, maxHeight: '60%' }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Tradition</Text>

                            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                                <TouchableOpacity
                                    style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}
                                    onPress={() => {
                                        setFilterMadh('');
                                        setShowMadhPicker(false);
                                    }}
                                >
                                    <Text style={{ color: theme.accent, fontWeight: 'bold' }}>Show All</Text>
                                </TouchableOpacity>
                                {DATING_TRADITIONS.map((madh, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}
                                        onPress={() => {
                                            setFilterMadh(madh);
                                            setShowMadhPicker(false);
                                        }}
                                    >
                                        <Text style={{ color: theme.text }}>{madh}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity
                                style={[styles.closeBtn, { backgroundColor: theme.button, marginTop: 10 }]}
                                onPress={() => setShowMadhPicker(false)}
                            >
                                <Text style={{ color: theme.buttonText }}>{t('dating.close')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Yoga Style Picker */}
                <Modal visible={showYogaPicker} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.header, maxHeight: '60%' }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Yoga Style</Text>
                            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                                <TouchableOpacity style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }} onPress={() => { setFilterYogaStyle(''); setShowYogaPicker(false); }}>
                                    <Text style={{ color: theme.accent, fontWeight: 'bold' }}>Show All</Text>
                                </TouchableOpacity>
                                {YOGA_STYLES.map((style, index) => (
                                    <TouchableOpacity key={index} style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }} onPress={() => { setFilterYogaStyle(style); setShowYogaPicker(false); }}>
                                        <Text style={{ color: theme.text }}>{style}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.button, marginTop: 10 }]} onPress={() => setShowYogaPicker(false)}>
                                <Text style={{ color: theme.buttonText }}>{t('dating.close')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Guna Picker */}
                <Modal visible={showGunaPicker} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.header, maxHeight: '60%' }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Guna</Text>
                            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                                <TouchableOpacity style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }} onPress={() => { setFilterGuna(''); setShowGunaPicker(false); }}>
                                    <Text style={{ color: theme.accent, fontWeight: 'bold' }}>Show All</Text>
                                </TouchableOpacity>
                                {GUNAS.map((guna, index) => (
                                    <TouchableOpacity key={index} style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }} onPress={() => { setFilterGuna(guna); setShowGunaPicker(false); }}>
                                        <Text style={{ color: theme.text }}>{guna}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.button, marginTop: 10 }]} onPress={() => setShowGunaPicker(false)}>
                                <Text style={{ color: theme.buttonText }}>{t('dating.close')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Identity Picker */}
                <Modal visible={showIdentityPicker} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.header, maxHeight: '60%' }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Identity</Text>
                            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                                <TouchableOpacity style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }} onPress={() => { setFilterIdentity(''); setShowIdentityPicker(false); }}>
                                    <Text style={{ color: theme.accent, fontWeight: 'bold' }}>Show All</Text>
                                </TouchableOpacity>
                                {IDENTITY_OPTIONS.map((opt, index) => (
                                    <TouchableOpacity key={index} style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }} onPress={() => { setFilterIdentity(opt); setShowIdentityPicker(false); }}>
                                        <Text style={{ color: theme.text }}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.button, marginTop: 10 }]} onPress={() => setShowIdentityPicker(false)}>
                                <Text style={{ color: theme.buttonText }}>{t('dating.close')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </ProtectedScreen>
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
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsBar: {
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 15,
        marginRight: 10,
        minWidth: 100,
    },
    statEmoji: {
        fontSize: 18,
        marginRight: 8,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 10,
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
    modeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 25,
        marginRight: 10,
        borderWidth: 1,
    },
    skillsText: {
        fontSize: 12,
        marginBottom: 4,
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '90%',
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    filterInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        marginBottom: 15,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15,
    },
    filterBtnContainer: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 20,
    },
    resetBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 25,
        alignItems: 'center',
        borderWidth: 1,
    },
    applyBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 25,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
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
