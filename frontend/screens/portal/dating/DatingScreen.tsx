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
    Animated,
    Share,
    StatusBar,
    Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { BlurView } from '@react-native-community/blur';
import axios from 'axios';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useChat } from '../../../context/ChatContext';
import { datingService } from '../../../services/datingService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import LinearGradient from 'react-native-linear-gradient';
import { DATING_TRADITIONS, YOGA_STYLES, GUNAS, IDENTITY_OPTIONS } from '../../../constants/DatingConstants';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { ModernVedicTheme } from '../../../theme/ModernVedicTheme';
import {
    BarChart2,
    Filter,
    UserPen,
    Eye,
    Image as ImageIcon,
    Heart,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    Briefcase,
    Users,
    Flower2,
    MapPin,
    Sparkles,
    Users2,
    Share2,
    User,
    Wrench,
    CircleHelp,
    X
} from 'lucide-react-native';

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

export const DatingScreen = ({ onBack }: { onBack?: () => void }) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { setChatRecipient } = useChat();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { isDarkMode, theme, vTheme } = useSettings();

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
    const [filterSkills, setFilterSkills] = useState('');
    const [filterIndustry, setFilterIndustry] = useState('');

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
                identity: filterIdentity,
                skills: filterSkills,
                industry: filterIndustry
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

        // Favorites and likes state
        const [isFavorited, setIsFavorited] = useState(false);
        const [likesCount, setLikesCount] = useState(0);
        const [favoritingInProgress, setFavoritingInProgress] = useState(false);

        // Load favorites status and likes count
        useEffect(() => {
            if (!isPreview && user?.ID && item.ID) {
                // Check if favorited
                datingService.checkIsFavorited(user.ID, item.ID)
                    .then(res => setIsFavorited(res.isFavorited))
                    .catch(() => { });

                // Get likes count
                datingService.getLikesCount(item.ID)
                    .then(res => setLikesCount(res.count))
                    .catch(() => { });
            }
        }, [item.ID, user?.ID, isPreview]);

        // Toggle favorite handler
        const handleToggleFavorite = async () => {
            if (!user?.ID || favoritingInProgress) return;

            setFavoritingInProgress(true);
            try {
                if (isFavorited) {
                    Alert.alert(t('common.info'), t('dating.removedFromFavorites'));
                    setIsFavorited(false);
                    setLikesCount(prev => Math.max(0, prev - 1));
                } else {
                    await datingService.addToFavorites({
                        userId: user.ID,
                        candidateId: item.ID,
                        compatibilityScore: ''
                    });
                    setIsFavorited(true);
                    setLikesCount(prev => prev + 1);
                    Alert.alert(t('common.success'), t('dating.addedToFavorites'));
                }
            } catch (error) {
                console.error('Failed to toggle favorite:', error);
            } finally {
                setFavoritingInProgress(false);
            }
        };

        const handleShare = async () => {
            try {
                const shareUrl = datingService.getShareUrl(item.ID);
                const message = t('dating.shareMessage', { name: item.spiritualName || 'devotee' });
                await Share.share({
                    message: `${message}\n${shareUrl}`,
                    title: t('dating.share')
                });
            } catch (error) {
                console.error('Share error:', error);
            }
        };

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

                setTimeout(() => {
                    setActiveIndex((prev) => (prev + 1) % displayPhotos.length);
                }, 500);

            }, 5000);

            return () => clearInterval(interval);
        }, [displayPhotos.length, isPaused]);

        const handleTap = (event: any) => {
            const x = event.nativeEvent.locationX;
            const cardWidth = width - 40;

            setIsPaused(true);

            if (x < cardWidth * 0.3) {
                if (activeIndex > 0) {
                    setActiveIndex(activeIndex - 1);
                }
            } else if (x > cardWidth * 0.7) {
                if (activeIndex < displayPhotos.length - 1) {
                    setActiveIndex(activeIndex + 1);
                } else if (!isPreview) {
                    navigation.navigate('MediaLibrary', { userId: item.ID, readOnly: true });
                }
            } else {
                if (!isPreview) {
                    navigation.navigate('MediaLibrary', { userId: item.ID, readOnly: true });
                }
            }
        };

        const currentPhotoUrl = displayPhotos[activeIndex]?.url;

        return (
            <Animated.View style={styles.cardContainer}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleTap}
                    style={styles.cardImageContainer}
                >
                    {displayPhotos.length > 0 ? (
                        <Animated.Image
                            source={{ uri: datingService.getMediaUrl(currentPhotoUrl) }}
                            style={[styles.fullCardImage, { opacity: fadeAnim }]}
                            resizeMode="cover"
                        />
                    ) : (
                        <LinearGradient
                            colors={['#0f0f1a', '#1a1a2e', '#0f0f1a']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardImagePlaceholder}
                        >
                            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', justifyContent: 'center' }}>
                                <View style={{
                                    width: 140,
                                    height: 140,
                                    borderRadius: 70,
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.05)'
                                }}>
                                    <User size={80} color="rgba(245, 158, 11, 0.15)" strokeWidth={0.5} />
                                </View>
                                <Text style={{
                                    color: 'rgba(255,255,255,0.2)',
                                    marginTop: 20,
                                    fontSize: 12,
                                    letterSpacing: 2,
                                    fontFamily: 'Cinzel-Regular'
                                }}>
                                    {t('dating.noPhoto')}
                                </Text>
                            </Animated.View>
                        </LinearGradient>
                    )}

                    {/* Top Overlay Actions - Moved for better reach/visibility */}
                    <View style={styles.cardTopActions}>
                        {!isPreview && (
                            <TouchableOpacity style={styles.cardActionCircle} onPress={handleShare}>
                                <Share2 size={18} color="#fff" />
                            </TouchableOpacity>
                        )}
                        {!isPreview && (
                            <TouchableOpacity
                                style={[styles.cardActionCircle, { marginLeft: 'auto' }]}
                                onPress={handleToggleFavorite}
                            >
                                <Heart
                                    size={20}
                                    color={isFavorited ? '#F59E0B' : '#fff'}
                                    fill={isFavorited ? '#F59E0B' : 'transparent'}
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Pagination Indicators - Sleeker design */}
                    {displayPhotos.length > 1 && (
                        <View style={styles.cardPagination}>
                            {displayPhotos.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.cardPaginationBar,
                                        {
                                            backgroundColor: i === activeIndex ? '#F59E0B' : 'rgba(255,255,255,0.2)',
                                            flex: 1,
                                            height: 2,
                                        }
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    {/* Info Overlay with stronger Liquid Glass fade */}
                    <LinearGradient
                        colors={['transparent', 'rgba(10, 10, 20, 0.4)', 'rgba(6, 6, 12, 0.98)']}
                        style={styles.cardInfoOverlay}
                    >
                        {Platform.OS === 'ios' && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="dark"
                                blurAmount={15}
                                reducedTransparencyFallbackColor="rgba(0,0,0,0.9)"
                            />
                        )}

                        <View style={styles.cardTextContainer}>
                            <View style={styles.cardNameRow}>
                                <Text style={styles.cardSpiritualName} numberOfLines={1}>
                                    {item.spiritualName || 'Devotee'}
                                </Text>
                                {mode === 'family' && item.age ? (
                                    <Text style={styles.cardAge}>, {item.age}</Text>
                                ) : null}
                            </View>

                            <View style={styles.cardLocationRow}>
                                <MapPin size={12} color="#F59E0B" style={{ marginRight: 6 }} />
                                <Text style={styles.cardLocationText}>{item.city}</Text>
                            </View>

                            <View style={styles.cardTagRow}>
                                {mode === 'business' ? (
                                    <>
                                        {item.industry && (
                                            <View style={styles.cardTag}>
                                                <Briefcase size={10} color="#F59E0B" />
                                                <Text style={styles.cardTagText}>{item.industry}</Text>
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <View style={styles.cardTag}>
                                        <Sparkles size={10} color="#F59E0B" />
                                        <Text style={styles.cardTagText}>{item.madh || 'Vaisnava'}</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.cardBioText} numberOfLines={3}>
                                {mode === 'business' && item.lookingForBusiness ? item.lookingForBusiness : (item.bio || 'Seeking spiritual resonance...')}
                            </Text>

                            {!isPreview && (
                                <View style={styles.cardFooterActions}>
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        style={styles.cardCompatibilityBtn}
                                        onPress={() => handleCheckCompatibility(item.ID)}
                                    >
                                        <LinearGradient
                                            colors={['#F59E0B', '#D67D3E']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.cardCompatibilityGradient}
                                        >
                                            <Text style={styles.cardCompatibilityBtnText}>
                                                {mode === 'business' ? 'Connect' : 'Astrological Analysis'}
                                            </Text>
                                            <Sparkles size={16} color="#000" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <ProtectedScreen requireCompleteProfile={true}>
            <LinearGradient colors={['#06060c', '#12122b', '#06060c']} style={styles.fullGradient}>
                <StatusBar barStyle="light-content" />
                <View style={[styles.container, { backgroundColor: 'transparent' }]}>
                    <View style={styles.premiumHeader}>
                        <TouchableOpacity
                            style={styles.headerIconButton}
                            onPress={() => onBack ? onBack() : (navigation.canGoBack() ? navigation.goBack() : null)}
                        >
                            <ChevronLeft size={24} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>Dating</Text>

                        <TouchableOpacity
                            style={[styles.headerIconButton, showStats && styles.headerIconButtonActive]}
                            onPress={() => setShowStats(!showStats)}
                        >
                            <BarChart2 size={20} color={showStats ? '#F59E0B' : 'rgba(255,255,255,0.7)'} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.topActionScrollContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.topActionScrollContent}
                        >
                            <TouchableOpacity
                                style={styles.glassActionBtn}
                                onPress={() => setShowFilters(true)}
                            >
                                <Filter size={16} color="#F59E0B" />
                                <Text style={styles.glassActionText}>{t('dating.filter')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.glassActionBtn}
                                onPress={() => user?.ID && navigation.navigate('EditDatingProfile', { userId: user.ID })}
                            >
                                <UserPen size={16} color="#F59E0B" />
                                <Text style={styles.glassActionText}>{t('dating.editProfile')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.glassActionBtn}
                                onPress={() => fetchPreviewProfile()}
                            >
                                <Eye size={16} color="#F59E0B" />
                                <Text style={styles.glassActionText}>Preview</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.glassActionBtn}
                                onPress={() => user?.ID && navigation.navigate('MediaLibrary', { userId: user.ID })}
                            >
                                <ImageIcon size={16} color="#F59E0B" />
                                <Text style={styles.glassActionText}>Media</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.glassActionBtn}
                                onPress={() => navigation.navigate('DatingFavorites')}
                            >
                                <Heart size={16} color="#F59E0B" />
                                <Text style={styles.glassActionText}>{t('dating.favorites')}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* Mode Switcher */}
                    <View style={styles.modeSwitcherContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeScrollContent}>
                            {[
                                { key: 'family', label: 'Family', icon: <Heart size={16} /> },
                                { key: 'business', label: 'Business', icon: <Briefcase size={16} /> },
                                { key: 'friendship', label: 'Friends', icon: <Users size={16} /> },
                                { key: 'seva', label: 'Seva', icon: <Flower2 size={16} /> }
                            ].map((m) => (
                                <TouchableOpacity
                                    key={m.key}
                                    style={[
                                        styles.modeGlassChip,
                                        mode === m.key && styles.modeGlassChipActive
                                    ]}
                                    onPress={() => {
                                        setMode(m.key as any);
                                        setLoading(true);
                                    }}
                                >
                                    {React.cloneElement(m.icon as React.ReactElement, {
                                        color: mode === m.key ? '#000' : 'rgba(255,255,255,0.4)',
                                        size: 14
                                    })}
                                    <Text style={[
                                        styles.modeGlassText,
                                        mode === m.key && styles.modeGlassTextActive
                                    ]}>{m.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Statistics Bar */}
                    {showStats && (
                        <View style={styles.statsBar}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                                <TouchableOpacity
                                    style={styles.statItem}
                                    onPress={() => { setFilterCity(''); setFilterNew(false); fetchCandidates(); }}
                                >
                                    <Users2 size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                                    <View>
                                        <Text style={styles.statValue}>{stats.total}</Text>
                                        <Text style={styles.statLabel}>Total</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.statItem}
                                    onPress={() => { if (user?.city) { setFilterCity(user.city); setFilterNew(false); fetchCandidates(); } }}
                                >
                                    <MapPin size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                                    <View>
                                        <Text style={styles.statValue}>{stats.city}</Text>
                                        <Text style={styles.statLabel}>In {user?.city}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.statItem}
                                    onPress={() => { setFilterNew(!filterNew); if (!filterNew) setFilterCity(''); fetchCandidates(); }}
                                >
                                    <Sparkles size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                                    <View>
                                        <Text style={styles.statValue}>{stats.new}</Text>
                                        <Text style={styles.statLabel}>New (24h)</Text>
                                    </View>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    )}

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color="#F59E0B" />
                        </View>
                    ) : candidates.length === 0 ? (
                        <View style={styles.empty}>
                            <Sparkles size={40} color="rgba(255,255,255,0.1)" style={{ marginBottom: 15 }} />
                            <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>{t('dating.noCandidates')}</Text>
                        </View>
                    ) : (
                        <FlatList<Profile>
                            data={candidates}
                            keyExtractor={(item) => item.ID.toString()}
                            renderItem={({ item }) => <DatingCard item={item} />}
                            contentContainerStyle={styles.list}
                            showsVerticalScrollIndicator={false}
                        />
                    )}

                    {/* Compatibility Modal */}
                    <Modal visible={showCompatibilityModal} transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={20} />
                            <LinearGradient colors={['rgba(30,30,50,0.8)', 'rgba(15,15,25,0.95)']} style={styles.modalContent}>
                                <Text style={styles.modalTitle}>{t('dating.compatibilityAnalysis')}</Text>

                                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                                    <View style={styles.avatarGlowContainer}>
                                        <Image
                                            source={{ uri: `${API_PATH.replace(/\/api\/?$/, '')}/uploads/kolobok_astrologer.png` }}
                                            style={styles.astrologerImage}
                                            resizeMode="cover"
                                        />
                                    </View>
                                </View>

                                <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                                    {checkingComp ? (
                                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                            <ActivityIndicator color="#F59E0B" size="large" />
                                            <Text style={[styles.modalText, { textAlign: 'center', marginTop: 15 }]}>{t('dating.exploringStars')}</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.modalText}>{compatibilityText}</Text>
                                    )}
                                </ScrollView>

                                <View style={styles.modalFooter}>
                                    <TouchableOpacity style={styles.glassButtonSecondary} onPress={handleSaveFavorite}>
                                        <Text style={styles.glassButtonText}>{t('dating.save')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.premiumButtonPrimary}
                                        onPress={handleConnect}
                                    >
                                        <LinearGradient colors={['#F59E0B', '#D67D3E']} style={styles.buttonGradient}>
                                            <Text style={styles.premiumButtonText}>
                                                {friendIds.includes(currentCandidateId || 0) ? t('dating.chat') : t('dating.connect')}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity style={styles.modalCloseLink} onPress={() => setShowCompatibilityModal(false)}>
                                    <Text style={styles.modalCloseLinkText}>{t('dating.close')}</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    </Modal>

                    {/* Filter Modal */}
                    <Modal visible={showFilters} transparent animationType="slide">
                        <View style={styles.modalOverlay}>
                            <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={20} />
                            <LinearGradient colors={['rgba(30,30,50,0.8)', 'rgba(15,15,25,0.95)']} style={[styles.modalContent, { maxHeight: '85%' }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{t('dating.filters')}</Text>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {mode === 'business' && (
                                        <>
                                            <Text style={styles.filterLabel}>Skills</Text>
                                            <TextInput
                                                style={styles.filterInput}
                                                value={filterSkills}
                                                onChangeText={setFilterSkills}
                                                placeholder="e.g. Management, Coding..."
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                            />

                                            <Text style={styles.filterLabel}>Industry</Text>
                                            <TextInput
                                                style={styles.filterInput}
                                                value={filterIndustry}
                                                onChangeText={setFilterIndustry}
                                                placeholder="e.g. IT, Wellness..."
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                            />
                                        </>
                                    )}

                                    <Text style={styles.filterLabel}>{t('registration.city')}</Text>
                                    <TouchableOpacity style={styles.filterInput} onPress={() => setShowCityPicker(true)}>
                                        <Text style={{ color: filterCity ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                                            {filterCity || t('dating.selectCity')}
                                        </Text>
                                    </TouchableOpacity>

                                    <Text style={styles.filterLabel}>{t('registration.dob')}</Text>
                                    <View style={styles.filterRow}>
                                        <TextInput
                                            style={[styles.filterInput, { flex: 1 }]}
                                            value={filterMinAge}
                                            onChangeText={setFilterMinAge}
                                            placeholder={t('dating.minAge')}
                                            keyboardType="numeric"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                        />
                                        <TextInput
                                            style={[styles.filterInput, { flex: 1 }]}
                                            value={filterMaxAge}
                                            onChangeText={setFilterMaxAge}
                                            placeholder={t('dating.maxAge')}
                                            keyboardType="numeric"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                        />
                                    </View>

                                    <Text style={styles.filterLabel}>Tradition</Text>
                                    <TouchableOpacity style={styles.filterInput} onPress={() => setShowMadhPicker(true)}>
                                        <Text style={{ color: filterMadh ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                                            {filterMadh || "Any"}
                                        </Text>
                                    </TouchableOpacity>
                                </ScrollView>

                                <View style={styles.filterBtnContainer}>
                                    <TouchableOpacity
                                        style={styles.glassButtonSecondary}
                                        onPress={() => {
                                            setFilterCity(''); setFilterMinAge(''); setFilterMaxAge('');
                                            setFilterMadh(''); setFilterYogaStyle(''); setFilterGuna('');
                                            setFilterIdentity(''); setFilterSkills(''); setFilterIndustry('');
                                            fetchCandidates();
                                        }}
                                    >
                                        <Text style={styles.glassButtonText}>{t('dating.reset')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.premiumButtonPrimary}
                                        onPress={() => { setShowFilters(false); fetchCandidates(); }}
                                    >
                                        <LinearGradient colors={['#F59E0B', '#D67D3E']} style={styles.buttonGradient}>
                                            <Text style={styles.premiumButtonText}>{t('dating.apply')}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity style={styles.modalCloseLink} onPress={() => setShowFilters(false)}>
                                    <Text style={styles.modalCloseLinkText}>{t('dating.close')}</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    </Modal>

                    {/* Profile Preview Modal */}
                    <Modal visible={showPreview} transparent animationType="slide">
                        <View style={styles.modalOverlay}>
                            <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={20} />
                            <LinearGradient colors={['rgba(30,30,50,0.8)', 'rgba(15,15,25,0.95)']} style={[styles.modalContent, { height: '90%', padding: 0 }]}>
                                <View style={styles.modalHeaderPremium}>
                                    <Text style={styles.headerTitleSmall}>Profile Preview</Text>
                                    <TouchableOpacity onPress={() => setShowPreview(false)}>
                                        <X size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                                    {previewLoading ? (
                                        <ActivityIndicator size="large" color="#F59E0B" />
                                    ) : previewProfile ? (
                                        <>
                                            <DatingCard item={previewProfile} isPreview={true} />
                                            <Text style={styles.previewHint}>This is how others see your card</Text>
                                        </>
                                    ) : (
                                        <Text style={styles.errorText}>Failed to load profile</Text>
                                    )}
                                </ScrollView>
                            </LinearGradient>
                        </View>
                    </Modal>

                    {/* City Selection Modal */}
                    <Modal visible={showCityPicker} transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={20} />
                            <LinearGradient colors={['rgba(30,30,50,0.8)', 'rgba(15,15,25,0.95)']} style={[styles.modalContent, { maxHeight: '80%' }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{t('dating.selectCity')}</Text>
                                </View>

                                <TextInput
                                    style={[styles.filterInput, { marginBottom: 20 }]}
                                    value={citySearchQuery}
                                    onChangeText={setCitySearchQuery}
                                    placeholder={t('dating.searchCity')}
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                />

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                    <TouchableOpacity
                                        style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                                        onPress={() => { setFilterCity(''); setShowCityPicker(false); }}
                                    >
                                        <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>{t('dating.allCities')}</Text>
                                    </TouchableOpacity>
                                    {filteredCities.map((city, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                                            onPress={() => { setFilterCity(city); setShowCityPicker(false); }}
                                        >
                                            <Text style={{ color: '#fff', fontSize: 16 }}>{city}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <TouchableOpacity style={styles.modalCloseLink} onPress={() => setShowCityPicker(false)}>
                                    <Text style={styles.modalCloseLinkText}>{t('dating.close')}</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    </Modal>

                    {/* Generic Selection Modal (Madh, Yoga, Guna, Identity) */}
                    <Modal visible={showMadhPicker || showYogaPicker || showGunaPicker || showIdentityPicker} transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={20} />
                            <LinearGradient colors={['rgba(30,30,50,0.8)', 'rgba(15,15,25,0.95)']} style={[styles.modalContent, { maxHeight: '80%' }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>
                                        {showMadhPicker ? "Tradition" : showYogaPicker ? "Yoga Style" : showGunaPicker ? "Guna" : "Identity"}
                                    </Text>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                    <TouchableOpacity
                                        style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                                        onPress={() => {
                                            if (showMadhPicker) setFilterMadh('');
                                            if (showYogaPicker) setFilterYogaStyle('');
                                            if (showGunaPicker) setFilterGuna('');
                                            if (showIdentityPicker) setFilterIdentity('');
                                            setShowMadhPicker(false); setShowYogaPicker(false); setShowGunaPicker(false); setShowIdentityPicker(false);
                                        }}
                                    >
                                        <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>Show All</Text>
                                    </TouchableOpacity>
                                    {(showMadhPicker ? DATING_TRADITIONS : showYogaPicker ? YOGA_STYLES : showGunaPicker ? GUNAS : IDENTITY_OPTIONS).map((opt, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                                            onPress={() => {
                                                if (showMadhPicker) { setFilterMadh(opt); setShowMadhPicker(false); }
                                                if (showYogaPicker) { setFilterYogaStyle(opt); setShowYogaPicker(false); }
                                                if (showGunaPicker) { setFilterGuna(opt); setShowGunaPicker(false); }
                                                if (showIdentityPicker) { setFilterIdentity(opt); setShowIdentityPicker(false); }
                                            }}
                                        >
                                            <Text style={{ color: '#fff', fontSize: 16 }}>{opt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <TouchableOpacity
                                    style={styles.modalCloseLink}
                                    onPress={() => {
                                        setShowMadhPicker(false); setShowYogaPicker(false);
                                        setShowGunaPicker(false); setShowIdentityPicker(false);
                                    }}
                                >
                                    <Text style={styles.modalCloseLinkText}>{t('dating.close')}</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    </Modal>
                </View>
            </LinearGradient>
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    fullGradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    premiumHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 15,
    },
    headerIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    headerIconButtonActive: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
        fontFamily: 'Cinzel-Regular',
        letterSpacing: 3,
    },
    topActionScrollContainer: {
        height: 48,
        marginBottom: 15,
    },
    topActionScrollContent: {
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 12,
    },
    glassActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 8,
    },
    glassActionText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
    },
    modeSwitcherContainer: {
        marginBottom: 20,
    },
    modeScrollContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    modeGlassChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        gap: 10,
    },
    modeGlassChipActive: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    modeGlassText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 15,
        fontFamily: 'Cinzel-Regular',
    },
    modeGlassTextActive: {
        color: '#000',
        fontWeight: '700',
    },
    statsBar: {
        paddingBottom: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginRight: 12,
    },
    statValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    cardContainer: {
        width: width - 36,
        height: 660,
        marginBottom: 24,
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cardImageContainer: {
        flex: 1,
    },
    fullCardImage: {
        width: '100%',
        height: '100%',
    },
    cardImagePlaceholder: {
        flex: 1,
        backgroundColor: '#0a0a14',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardPagination: {
        position: 'absolute',
        top: 20,
        left: 30,
        right: 30,
        flexDirection: 'row',
        gap: 6,
    },
    cardPaginationBar: {
        height: 3,
        borderRadius: 2,
    },
    cardTopActions: {
        position: 'absolute',
        top: 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
    },
    cardActionCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    cardInfoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        minHeight: 280,
        padding: 24,
        paddingBottom: 28,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    cardTextContainer: {
        zIndex: 1,
    },
    cardNameRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    cardSpiritualName: {
        fontSize: 36,
        fontFamily: 'Cinzel-Bold',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    cardAge: {
        fontSize: 22,
        color: 'rgba(255,255,255,0.6)',
        marginLeft: 8,
        fontFamily: 'Cinzel-Regular',
    },
    cardLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    cardLocationText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
    },
    cardTagRow: {
        flexDirection: 'row',
        marginTop: 15,
        gap: 10,
    },
    cardTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        gap: 6,
    },
    cardTagText: {
        color: '#F59E0B',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardBioText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 18,
        lineHeight: 24,
    },
    cardFooterActions: {
        marginTop: 25,
    },
    cardCompatibilityBtn: {
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
    },
    cardCompatibilityGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    cardCompatibilityBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
    },
    modalHeader: {
        marginBottom: 24,
        alignItems: 'center',
    },
    modalHeaderPremium: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    modalTitle: {
        fontSize: 26,
        fontFamily: 'Cinzel-Bold',
        color: '#F59E0B',
        textAlign: 'center',
        letterSpacing: 1,
    },
    headerTitleSmall: {
        fontSize: 18,
        fontFamily: 'Cinzel-Regular',
        color: '#fff',
        letterSpacing: 2,
    },
    modalText: {
        fontSize: 17,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 28,
    },
    avatarGlowContainer: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    astrologerImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    modalFooter: {
        flexDirection: 'row',
        marginTop: 30,
        gap: 12,
    },
    glassButtonSecondary: {
        flex: 1,
        height: 56,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    glassButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    premiumButtonPrimary: {
        flex: 1,
        height: 56,
        borderRadius: 20,
        overflow: 'hidden',
    },
    premiumButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    buttonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseLink: {
        marginTop: 20,
        alignItems: 'center',
    },
    modalCloseLinkText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    filterLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 20,
        marginLeft: 4,
    },
    filterInput: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    filterRow: {
        flexDirection: 'row',
        gap: 15,
    },
    filterBtnContainer: {
        flexDirection: 'row',
        marginTop: 30,
        gap: 12,
    },
    previewHint: {
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
        marginTop: 15,
        fontSize: 13,
    },
    errorText: {
        color: '#EF4444',
        textAlign: 'center',
    },
    // Picker specific styles (keeping compatible names if used)
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 12,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    closeBtn: {
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
    },
});
