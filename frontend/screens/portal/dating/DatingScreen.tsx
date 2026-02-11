import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    TextInput,
    Animated,
    Share,
    StatusBar,
    Platform,
    GestureResponderEvent
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { BlurView } from '@react-native-community/blur';
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
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import type { UserContact } from '../../../services/contactService';
import {
    BarChart2,
    Filter,
    UserPen,
    Eye,
    Image as ImageIcon,
    Heart,
    ChevronLeft,
    Briefcase,
    Users,
    Flower2,
    MapPin,
    Sparkles,
    Users2,
    Share2,
    User,
    X
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

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

type MatchMode = 'family' | 'business' | 'friendship' | 'seva';

interface CandidateFilterParams {
    mode: MatchMode;
    isNew: boolean;
    city: string;
    minAge: string;
    maxAge: string;
    madh: string;
    yogaStyle: string;
    guna: string;
    identity: string;
    skills: string;
    industry: string;
}

interface UserProfileFilters {
    madh?: string;
    sampradaya?: string;
    yogaStyle?: string;
    guna?: string;
    identity?: string;
}

interface FriendRef {
    ID: number;
}

interface PreviewProfileApiResponse {
    ID?: number;
    spiritual_name?: string;
    spiritualName?: string;
    age?: number;
    city?: string;
    bio?: string;
    sampradaya?: string;
    madh?: string;
    avatar_url?: string;
    avatarUrl?: string;
    photos?: Array<string | { url?: string | null }>;
}

const parseNumericId = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const buildChatRecipient = (candidate: Profile): UserContact => ({
    ID: candidate.ID,
    spiritualName: candidate.spiritualName,
    avatarUrl: candidate.avatarUrl,
    karmicName: '',
    city: candidate.city,
    country: '',
    email: '',
    identity: '',
    lastSeen: '',
});

const MODE_OPTIONS: Array<{ key: MatchMode; label: string; icon: LucideIcon }> = [
    { key: 'family', label: 'Family', icon: Heart },
    { key: 'business', label: 'Business', icon: Briefcase },
    { key: 'friendship', label: 'Friends', icon: Users },
    { key: 'seva', label: 'Seva', icon: Flower2 },
];

interface DatingCandidateCardProps {
    item: Profile;
    isPreview?: boolean;
    mode: MatchMode;
    userId?: number;
    roleColors: { accent: string };
    roleTheme: { accent: string; accentStrong: string };
    t: TFunction<'translation', undefined>;
    navigation: NativeStackNavigationProp<RootStackParamList>;
    onCheckCompatibility: (candidateId: number) => void;
}

const DatingCandidateCard = ({
    item,
    isPreview = false,
    mode,
    userId,
    roleColors,
    roleTheme,
    t,
    navigation,
    onCheckCompatibility,
}: DatingCandidateCardProps) => {
    const allPhotos = item.photos || [];
    const displayPhotos = allPhotos.length > 0 ? allPhotos : (item.avatarUrl ? [{ url: item.avatarUrl }] : []);
    const [activeIndex, setActiveIndex] = useState(0);
    const fadeAnim = React.useRef(new Animated.Value(1)).current;
    const [isPaused, setIsPaused] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [favoritingInProgress, setFavoritingInProgress] = useState(false);
    const animatedCardImageStyle = useMemo(() => [styles.fullCardImage, { opacity: fadeAnim }], [fadeAnim]);
    const placeholderAnimatedWrapperStyle = useMemo(() => [styles.photoPlaceholderAnimatedWrapper, { opacity: fadeAnim }], [fadeAnim]);
    const activePaginationBarStyle = useMemo(() => ({ backgroundColor: roleColors.accent }), [roleColors.accent]);

    useEffect(() => {
        if (!isPreview && userId && item.ID) {
            datingService.checkIsFavorited(userId, item.ID)
                .then((res) => setIsFavorited(res.isFavorited))
                .catch(() => { });
        }
    }, [isPreview, userId, item.ID]);

    const handleToggleFavorite = async () => {
        if (!userId || favoritingInProgress) return;

        setFavoritingInProgress(true);
        try {
            if (isFavorited) {
                await datingService.removeFavoriteByCandidate(userId, item.ID);
                Alert.alert(t('common.info'), t('dating.removedFromFavorites'));
                setIsFavorited(false);
            } else {
                await datingService.addToFavorites({
                    userId,
                    candidateId: item.ID,
                    compatibilityScore: ''
                });
                setIsFavorited(true);
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

        let rotateTimeout: ReturnType<typeof setTimeout> | null = null;
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

            rotateTimeout = setTimeout(() => {
                setActiveIndex((prev) => (prev + 1) % displayPhotos.length);
            }, 500);

        }, 5000);

        return () => {
            clearInterval(interval);
            if (rotateTimeout) {
                clearTimeout(rotateTimeout);
            }
        };
    }, [displayPhotos.length, isPaused, fadeAnim]);

    useEffect(() => {
        setActiveIndex((prev) => {
            if (displayPhotos.length === 0) {
                return 0;
            }
            return Math.min(prev, displayPhotos.length - 1);
        });
    }, [displayPhotos.length]);

    const handleTap = (event: GestureResponderEvent) => {
        const x = event.nativeEvent.locationX;
        const cardWidth = width - 40;

        setIsPaused(true);

        if (x < cardWidth * 0.3) {
            if (activeIndex > 0) {
                setActiveIndex((prev) => Math.max(prev - 1, 0));
            }
        } else if (x > cardWidth * 0.7) {
            if (activeIndex < displayPhotos.length - 1) {
                setActiveIndex((prev) => Math.min(prev + 1, displayPhotos.length - 1));
            } else if (!isPreview) {
                navigation.navigate('MediaLibrary', { userId: item.ID, readOnly: true });
            }
        } else if (!isPreview) {
            navigation.navigate('MediaLibrary', { userId: item.ID, readOnly: true });
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
                        style={animatedCardImageStyle}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient
                        colors={['rgba(15,15,26,1)', 'rgba(26,26,46,1)', 'rgba(15,15,26,1)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardImagePlaceholder}
                    >
                        <Animated.View style={placeholderAnimatedWrapperStyle}>
                            <View style={styles.photoPlaceholderAvatarShell}>
                                <User size={80} color="rgba(245, 158, 11, 0.15)" strokeWidth={0.5} />
                            </View>
                            <Text style={styles.photoPlaceholderLabel}>
                                {t('dating.noPhoto')}
                            </Text>
                        </Animated.View>
                    </LinearGradient>
                )}

                <View style={styles.cardTopActions}>
                    {!isPreview && (
                        <TouchableOpacity style={styles.cardActionCircle} onPress={handleShare}>
                            <Share2 size={18} color="rgba(255,255,255,1)" />
                        </TouchableOpacity>
                    )}
                    {!isPreview && (
                        <TouchableOpacity
                            style={styles.cardActionCircleRight}
                            onPress={handleToggleFavorite}
                        >
                            <Heart
                                size={20}
                                color={isFavorited ? roleColors.accent : 'rgba(255,255,255,1)'}
                                fill={isFavorited ? roleColors.accent : 'transparent'}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                {displayPhotos.length > 1 && (
                    <View style={styles.cardPagination}>
                        {displayPhotos.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.cardPaginationBar,
                                    styles.cardPaginationBarFlex,
                                    i === activeIndex ? activePaginationBarStyle : styles.cardPaginationBarInactive
                                ]}
                            />
                        ))}
                    </View>
                )}

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
                            <MapPin size={12} color={roleColors.accent} style={styles.cardLocationIcon} />
                            <Text style={styles.cardLocationText}>{item.city}</Text>
                        </View>

                        <View style={styles.cardTagRow}>
                            {mode === 'business' ? (
                                <>
                                    {item.industry && (
                                        <View style={styles.cardTag}>
                                            <Briefcase size={10} color={roleColors.accent} />
                                            <Text style={styles.cardTagText}>{item.industry}</Text>
                                        </View>
                                    )}
                                </>
                            ) : (
                                <View style={styles.cardTag}>
                                    <Sparkles size={10} color={roleColors.accent} />
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
                                    onPress={() => onCheckCompatibility(item.ID)}
                                >
                                    <LinearGradient
                                        colors={[roleTheme.accent, roleTheme.accentStrong]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.cardCompatibilityGradient}
                                    >
                                        <Text style={styles.cardCompatibilityBtnText}>
                                            {mode === 'business' ? 'Connect' : 'Astrological Analysis'}
                                        </Text>
                                        <Sparkles size={16} color="rgba(0,0,0,1)" />
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

const normalizeAgeRange = (minAgeRaw: string, maxAgeRaw: string): { minAge: string; maxAge: string } => {
    const minAge = minAgeRaw.trim();
    const maxAge = maxAgeRaw.trim();
    const min = Number.parseInt(minAge, 10);
    const max = Number.parseInt(maxAge, 10);

    if (Number.isNaN(min) && Number.isNaN(max)) {
        return { minAge: '', maxAge: '' };
    }
    if (Number.isNaN(min)) {
        return { minAge: '', maxAge: `${max}` };
    }
    if (Number.isNaN(max)) {
        return { minAge: `${min}`, maxAge: '' };
    }
    if (min > max) {
        return { minAge: `${max}`, maxAge: `${min}` };
    }
    return { minAge: `${min}`, maxAge: `${max}` };
};

const normalizeProfilePhotos = (photos: PreviewProfileApiResponse['photos']): Photo[] => {
    if (!Array.isArray(photos)) {
        return [];
    }
    return photos
        .map((photo) => {
            if (typeof photo === 'string') {
                return { url: photo };
            }
            const url = typeof photo?.url === 'string' ? photo.url : '';
            return { url };
        })
        .filter((photo) => photo.url.trim() !== '');
};

export const DatingScreen = ({ onBack }: { onBack?: () => void }) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { setChatRecipient } = useChat();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { isDarkMode } = useSettings();
    const { colors: roleColors, roleTheme } = useRoleTheme(user?.role, isDarkMode);

    const [candidates, setCandidates] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [compatibilityText, setCompatibilityText] = useState('');
    const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
    const [checkingComp, setCheckingComp] = useState(false);
    const [currentCandidateId, setCurrentCandidateId] = useState<number | null>(null);
    const [mode, setMode] = useState<MatchMode>('family');

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
    const modalAccentTextStyle = useMemo(() => ({ color: roleColors.accent }), [roleColors.accent]);
    const filterCityTextStyle = filterCity ? styles.filterValueTextActive : styles.filterValueTextPlaceholder;
    const filterMadhTextStyle = filterMadh ? styles.filterValueTextActive : styles.filterValueTextPlaceholder;
    const filterYogaStyleTextStyle = filterYogaStyle ? styles.filterValueTextActive : styles.filterValueTextPlaceholder;
    const filterGunaTextStyle = filterGuna ? styles.filterValueTextActive : styles.filterValueTextPlaceholder;
    const filterIdentityTextStyle = filterIdentity ? styles.filterValueTextActive : styles.filterValueTextPlaceholder;
    const filtersRef = useRef<CandidateFilterParams>({
        mode: 'family',
        isNew: false,
        city: '',
        minAge: '',
        maxAge: '',
        madh: '',
        yogaStyle: '',
        guna: '',
        identity: '',
        skills: '',
        industry: ''
    });
    const candidatesRequestRef = useRef(0);

    useEffect(() => {
        if (user?.ID) {
            fetchFriends();
            // Sync filters with user profile to ensure they find people like themselves by default
            const u = user as UserProfileFilters;
            const nextMadh = u.madh || u.sampradaya || '';
            if (nextMadh) setFilterMadh(nextMadh);
            if (u.yogaStyle) setFilterYogaStyle(u.yogaStyle);
            if (u.guna) setFilterGuna(u.guna);
            if (u.identity) setFilterIdentity(u.identity);
        }
    }, [user]);

    const fetchFriends = async () => {
        try {
            const data = await datingService.getFriends();
            const ids = Array.isArray(data)
                ? data
                    .map((f: FriendRef) => parseNumericId(f.ID))
                    .filter((id): id is number => id !== null)
                : [];
            setFriendIds(ids);
        } catch (error) {
            console.error('Failed to fetch friends:', error);
        }
    };

    useEffect(() => {
        filtersRef.current = {
            mode,
            isNew: filterNew,
            city: filterCity,
            minAge: filterMinAge,
            maxAge: filterMaxAge,
            madh: filterMadh,
            yogaStyle: filterYogaStyle,
            guna: filterGuna,
            identity: filterIdentity,
            skills: filterSkills,
            industry: filterIndustry
        };
    }, [mode, filterNew, filterCity, filterMinAge, filterMaxAge, filterMadh, filterYogaStyle, filterGuna, filterIdentity, filterSkills, filterIndustry]);

    const fetchStats = useCallback(async (city?: string) => {
        try {
            const data = await datingService.getStats(city);
            setStats({
                total: Number(data?.total) || 0,
                city: Number(data?.city) || 0,
                new: Number(data?.new) || 0
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    const filteredCities = useMemo(() => {
        const query = citySearchQuery.toLowerCase();
        return availableCities.filter((city) => city.toLowerCase().includes(query));
    }, [availableCities, citySearchQuery]);

    const closeAllPickers = () => {
        setShowMadhPicker(false);
        setShowYogaPicker(false);
        setShowGunaPicker(false);
        setShowIdentityPicker(false);
    };

    const resetAllFilters = () => {
        setFilterNew(false);
        setFilterCity('');
        setFilterMinAge('');
        setFilterMaxAge('');
        setFilterMadh('');
        setFilterYogaStyle('');
        setFilterGuna('');
        setFilterIdentity('');
        setFilterSkills('');
        setFilterIndustry('');
    };

    const fetchCities = useCallback(async () => {
        try {
            const data = await datingService.getCities();
            setAvailableCities(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch cities:', error);
        }
    }, []);

    const fetchCandidates = useCallback(async (overrides: Partial<CandidateFilterParams> = {}) => {
        const requestId = ++candidatesRequestRef.current;
        if (!user?.ID) {
            if (requestId === candidatesRequestRef.current) {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        const params: CandidateFilterParams = {
            ...filtersRef.current,
            ...overrides,
        };
        const normalizedAges = normalizeAgeRange(params.minAge, params.maxAge);
        params.minAge = normalizedAges.minAge;
        params.maxAge = normalizedAges.maxAge;

        try {
            const data = await datingService.getCandidates({ userId: user.ID, ...params });
            if (requestId !== candidatesRequestRef.current) {
                return;
            }
            setCandidates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch candidates:', error);
            if (requestId === candidatesRequestRef.current) {
                setCandidates([]);
            }
        } finally {
            if (requestId === candidatesRequestRef.current) {
                setLoading(false);
            }
        }
    }, [user?.ID]);

    useEffect(() => {
        fetchCandidates();
        fetchCities();
    }, [fetchCandidates, fetchCities]);

    useEffect(() => {
        fetchStats(user?.city);
    }, [fetchStats, user?.city]);

    const handleCheckCompatibility = async (candidateId: number) => {
        if (!user?.ID) return;
        setCurrentCandidateId(candidateId);
        setCheckingComp(true);
        setShowCompatibilityModal(true);
        setCompatibilityText('Analyzing compatibility with AI Astro-processor...');
        try {
            const data = await datingService.checkCompatibility(user.ID, candidateId);
            setCompatibilityText(data.compatibility);
        } catch {
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
        } catch {
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
                setChatRecipient(buildChatRecipient(candidate));
                navigation.navigate('Chat');
            }
            return;
        }

        // Else add friend (request)
        try {
            await datingService.addFriend(user.ID, currentCandidateId);
            setFriendIds((prev) => (prev.includes(currentCandidateId) ? prev : [...prev, currentCandidateId]));
            Alert.alert('Success', 'Request sent! You can now chat.');
        } catch {
            Alert.alert('Error', 'Could not connect.');
        }
    };

    const fetchPreviewProfile = async () => {
        if (!user?.ID) return;
        setPreviewLoading(true);
        try {
            const data = await datingService.getProfile(user.ID) as PreviewProfileApiResponse;

            // Map response to Profile interface
            const mappedProfile: Profile = {
                ID: data.ID || user.ID,
                spiritualName: data.spiritual_name || data.spiritualName || user.spiritualName || 'Me',
                age: data.age || 0,
                city: data.city || '',
                bio: data.bio || '',
                madh: data.sampradaya || data.madh || '',
                avatarUrl: data.avatar_url || data.avatarUrl || user.avatar || '',
                photos: normalizeProfilePhotos(data.photos)
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

    return (
        <ProtectedScreen requireCompleteProfile={true}>
            <LinearGradient colors={roleTheme.gradient} style={styles.fullGradient}>
                <StatusBar barStyle="light-content" />
                <View style={styles.containerTransparent}>
                    <View style={styles.premiumHeader}>
                        <TouchableOpacity
                            style={styles.headerIconButton}
                            onPress={() => onBack ? onBack() : (navigation.canGoBack() ? navigation.goBack() : null)}
                        >
                            <ChevronLeft size={24} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>Union</Text>

                        <TouchableOpacity
                            style={[styles.headerIconButton, showStats && styles.headerIconButtonActive]}
                            onPress={() => setShowStats(!showStats)}
                        >
                            <BarChart2 size={20} color={showStats ? roleColors.accent : 'rgba(255,255,255,0.7)'} />
                        </TouchableOpacity>
                    </View>
                    <GodModeStatusBanner />

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
                                <Filter size={16} color={roleColors.accent} />
                                <Text style={styles.glassActionText}>{t('dating.filter')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.glassActionBtn}
                                onPress={() => user?.ID && navigation.navigate('EditDatingProfile', { userId: user.ID })}
                            >
                                <UserPen size={16} color={roleColors.accent} />
                                <Text style={styles.glassActionText}>{t('dating.editProfile')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.glassActionBtn}
                                onPress={() => fetchPreviewProfile()}
                            >
                                <Eye size={16} color={roleColors.accent} />
                                <Text style={styles.glassActionText}>Preview</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.glassActionBtn}
                                onPress={() => user?.ID && navigation.navigate('MediaLibrary', { userId: user.ID })}
                            >
                                <ImageIcon size={16} color={roleColors.accent} />
                                <Text style={styles.glassActionText}>Media</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.glassActionBtn}
                                onPress={() => navigation.navigate('DatingFavorites')}
                            >
                                <Heart size={16} color={roleColors.accent} />
                                <Text style={styles.glassActionText}>{t('dating.favorites')}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* Mode Switcher */}
                    <View style={styles.modeSwitcherContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeScrollContent}>
                            {MODE_OPTIONS.map((m) => (
                                <TouchableOpacity
                                    key={m.key}
                                    style={[
                                        styles.modeGlassChip,
                                        mode === m.key && styles.modeGlassChipActive
                                    ]}
                                    onPress={() => {
                                        setMode(m.key);
                                        fetchCandidates({ mode: m.key });
                                    }}
                                >
                                    <m.icon
                                        color={mode === m.key ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,0.4)'}
                                        size={14}
                                    />
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
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent}>
                                <TouchableOpacity
                                    style={styles.statItem}
                                    onPress={() => {
                                        setFilterCity('');
                                        setFilterNew(false);
                                        fetchCandidates({ city: '', isNew: false });
                                    }}
                                >
                                    <Users2 size={20} color={roleColors.accent} style={styles.statIcon} />
                                    <View>
                                        <Text style={styles.statValue}>{stats.total}</Text>
                                        <Text style={styles.statLabel}>Total</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.statItem}
                                    onPress={() => {
                                        if (user?.city) {
                                            setFilterCity(user.city);
                                            setFilterNew(false);
                                            fetchCandidates({ city: user.city, isNew: false });
                                        }
                                    }}
                                >
                                    <MapPin size={20} color={roleColors.accent} style={styles.statIcon} />
                                    <View>
                                        <Text style={styles.statValue}>{stats.city}</Text>
                                        <Text style={styles.statLabel}>In {user?.city}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.statItem}
                                    onPress={() => {
                                        const nextFilterNew = !filterNew;
                                        setFilterNew(nextFilterNew);
                                        if (nextFilterNew) {
                                            setFilterCity('');
                                            fetchCandidates({ city: '', isNew: true });
                                            return;
                                        }
                                        fetchCandidates({ isNew: false });
                                    }}
                                >
                                    <Sparkles size={20} color={roleColors.accent} style={styles.statIcon} />
                                    <View>
                                        <Text style={styles.statValue}>{stats.new}</Text>
                                        <Text style={styles.statLabel}>New (24h)</Text>
                                    </View>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    )}

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={roleColors.accent} />
                        </View>
                    ) : candidates.length === 0 ? (
                        <View style={styles.empty}>
                            <Sparkles size={40} color="rgba(255,255,255,0.1)" style={styles.emptyIcon} />
                            <Text style={styles.emptyText}>{t('dating.noCandidates')}</Text>
                        </View>
                    ) : (
                        <FlatList<Profile>
                            data={candidates}
                            keyExtractor={(item) => item.ID.toString()}
                            renderItem={({ item }) => (
                                <DatingCandidateCard
                                    item={item}
                                    mode={mode}
                                    userId={user?.ID}
                                    roleColors={roleColors}
                                    roleTheme={roleTheme}
                                    t={t}
                                    navigation={navigation}
                                    onCheckCompatibility={handleCheckCompatibility}
                                />
                            )}
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

                                <View style={styles.modalAvatarContainer}>
                                    <View style={styles.avatarGlowContainer}>
                                        <Image
                                            source={{ uri: `${API_PATH.replace(/\/api\/?$/, '')}/uploads/kolobok_astrologer.png` }}
                                            style={styles.astrologerImage}
                                            resizeMode="cover"
                                        />
                                    </View>
                                </View>

                                <ScrollView style={styles.modalContentScroll} showsVerticalScrollIndicator={false}>
                                    {checkingComp ? (
                                        <View style={styles.modalCheckingContainer}>
                                            <ActivityIndicator color={roleColors.accent} size="large" />
                                            <Text style={[styles.modalText, styles.modalCheckingText]}>{t('dating.exploringStars')}</Text>
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
                                        <LinearGradient colors={[roleTheme.accent, roleTheme.accentStrong]} style={styles.buttonGradient}>
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
                            <LinearGradient colors={['rgba(30,30,50,0.8)', 'rgba(15,15,25,0.95)']} style={[styles.modalContent, styles.modalContentMax85]}>
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
                                        <Text style={filterCityTextStyle}>
                                            {filterCity || t('dating.selectCity')}
                                        </Text>
                                    </TouchableOpacity>

                                    <Text style={styles.filterLabel}>{t('registration.dob')}</Text>
                                    <View style={styles.filterRow}>
                                        <TextInput
                                            style={[styles.filterInput, styles.filterInputHalf]}
                                            value={filterMinAge}
                                            onChangeText={setFilterMinAge}
                                            placeholder={t('dating.minAge')}
                                            keyboardType="numeric"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                        />
                                        <TextInput
                                            style={[styles.filterInput, styles.filterInputHalf]}
                                            value={filterMaxAge}
                                            onChangeText={setFilterMaxAge}
                                            placeholder={t('dating.maxAge')}
                                            keyboardType="numeric"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                        />
                                    </View>

                                    <Text style={styles.filterLabel}>Tradition</Text>
                                    <TouchableOpacity style={styles.filterInput} onPress={() => setShowMadhPicker(true)}>
                                        <Text style={filterMadhTextStyle}>
                                            {filterMadh || "Any"}
                                        </Text>
                                    </TouchableOpacity>

                                    <Text style={styles.filterLabel}>Yoga Style</Text>
                                    <TouchableOpacity style={styles.filterInput} onPress={() => setShowYogaPicker(true)}>
                                        <Text style={filterYogaStyleTextStyle}>
                                            {filterYogaStyle || "Any"}
                                        </Text>
                                    </TouchableOpacity>

                                    <Text style={styles.filterLabel}>Guna</Text>
                                    <TouchableOpacity style={styles.filterInput} onPress={() => setShowGunaPicker(true)}>
                                        <Text style={filterGunaTextStyle}>
                                            {filterGuna || "Any"}
                                        </Text>
                                    </TouchableOpacity>

                                    <Text style={styles.filterLabel}>Identity</Text>
                                    <TouchableOpacity style={styles.filterInput} onPress={() => setShowIdentityPicker(true)}>
                                        <Text style={filterIdentityTextStyle}>
                                            {filterIdentity || "Any"}
                                        </Text>
                                    </TouchableOpacity>
                                </ScrollView>

                                <View style={styles.filterBtnContainer}>
                                    <TouchableOpacity
                                        style={styles.glassButtonSecondary}
                                        onPress={() => {
                                            resetAllFilters();
                                            fetchCandidates({
                                                isNew: false,
                                                city: '',
                                                minAge: '',
                                                maxAge: '',
                                                madh: '',
                                                yogaStyle: '',
                                                guna: '',
                                                identity: '',
                                                skills: '',
                                                industry: ''
                                            });
                                        }}
                                    >
                                        <Text style={styles.glassButtonText}>{t('dating.reset')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.premiumButtonPrimary}
                                        onPress={() => { setShowFilters(false); fetchCandidates(); }}
                                    >
                                        <LinearGradient colors={[roleTheme.accent, roleTheme.accentStrong]} style={styles.buttonGradient}>
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
                            <LinearGradient colors={['rgba(30,30,50,0.8)', 'rgba(15,15,25,0.95)']} style={[styles.modalContent, styles.modalContentPreview]}>
                                <View style={styles.modalHeaderPremium}>
                                    <Text style={styles.headerTitleSmall}>Profile Preview</Text>
                                    <TouchableOpacity onPress={() => setShowPreview(false)}>
                                        <X size={24} color="rgba(255,255,255,1)" />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.previewScrollContent}>
                                    {previewLoading ? (
                                        <ActivityIndicator size="large" color={roleColors.accent} />
                                    ) : previewProfile ? (
                                        <>
                                            <DatingCandidateCard
                                                item={previewProfile}
                                                isPreview={true}
                                                mode={mode}
                                                userId={user?.ID}
                                                roleColors={roleColors}
                                                roleTheme={roleTheme}
                                                t={t}
                                                navigation={navigation}
                                                onCheckCompatibility={handleCheckCompatibility}
                                            />
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
                            <LinearGradient colors={['rgba(30,30,50,0.8)', 'rgba(15,15,25,0.95)']} style={[styles.modalContent, styles.modalContentMax80]}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{t('dating.selectCity')}</Text>
                                </View>

                                <TextInput
                                    style={[styles.filterInput, styles.citySearchInput]}
                                    value={citySearchQuery}
                                    onChangeText={setCitySearchQuery}
                                    placeholder={t('dating.searchCity')}
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                />

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pickerScrollContent}>
                                    <TouchableOpacity
                                        style={styles.pickerOptionRow}
                                        onPress={() => { setFilterCity(''); setCitySearchQuery(''); setShowCityPicker(false); }}
                                    >
                                        <Text style={[styles.pickerAccentText, modalAccentTextStyle]}>{t('dating.allCities')}</Text>
                                    </TouchableOpacity>
                                    {filteredCities.map((city, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.pickerOptionRow}
                                            onPress={() => { setFilterCity(city); setCitySearchQuery(''); setShowCityPicker(false); }}
                                        >
                                            <Text style={styles.pickerOptionText}>{city}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <TouchableOpacity style={styles.modalCloseLink} onPress={() => { setCitySearchQuery(''); setShowCityPicker(false); }}>
                                    <Text style={styles.modalCloseLinkText}>{t('dating.close')}</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    </Modal>

                    {/* Generic Selection Modal (Madh, Yoga, Guna, Identity) */}
                    <Modal visible={showMadhPicker || showYogaPicker || showGunaPicker || showIdentityPicker} transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={20} />
                            <LinearGradient colors={['rgba(30,30,50,0.8)', 'rgba(15,15,25,0.95)']} style={[styles.modalContent, styles.modalContentMax80]}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>
                                        {showMadhPicker ? "Tradition" : showYogaPicker ? "Yoga Style" : showGunaPicker ? "Guna" : "Identity"}
                                    </Text>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pickerScrollContent}>
                                    <TouchableOpacity
                                        style={styles.pickerOptionRow}
                                        onPress={() => {
                                            if (showMadhPicker) setFilterMadh('');
                                            if (showYogaPicker) setFilterYogaStyle('');
                                            if (showGunaPicker) setFilterGuna('');
                                            if (showIdentityPicker) setFilterIdentity('');
                                            closeAllPickers();
                                        }}
                                    >
                                        <Text style={[styles.pickerAccentText, modalAccentTextStyle]}>Show All</Text>
                                    </TouchableOpacity>
                                    {(showMadhPicker ? DATING_TRADITIONS : showYogaPicker ? YOGA_STYLES : showGunaPicker ? GUNAS : IDENTITY_OPTIONS).map((opt, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.pickerOptionRow}
                                            onPress={() => {
                                                if (showMadhPicker) { setFilterMadh(opt); setShowMadhPicker(false); }
                                                if (showYogaPicker) { setFilterYogaStyle(opt); setShowYogaPicker(false); }
                                                if (showGunaPicker) { setFilterGuna(opt); setShowGunaPicker(false); }
                                                if (showIdentityPicker) { setFilterIdentity(opt); setShowIdentityPicker(false); }
                                            }}
                                        >
                                            <Text style={styles.pickerOptionText}>{opt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <TouchableOpacity
                                    style={styles.modalCloseLink}
                                    onPress={closeAllPickers}
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
    containerTransparent: {
        flex: 1,
        backgroundColor: 'transparent',
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
        color: 'rgba(255,255,255,1)',
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
        backgroundColor: 'rgba(245,158,11,1)',
        borderColor: 'rgba(245,158,11,1)',
    },
    modeGlassText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 15,
        fontFamily: 'Cinzel-Regular',
    },
    modeGlassTextActive: {
        color: 'rgba(0,0,0,1)',
        fontWeight: '700',
    },
    statsBar: {
        paddingBottom: 20,
    },
    statsScrollContent: {
        paddingHorizontal: 20,
    },
    statIcon: {
        marginRight: 8,
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
        color: 'rgba(255,255,255,1)',
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
    photoPlaceholderAnimatedWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoPlaceholderAvatarShell: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    photoPlaceholderLabel: {
        color: 'rgba(255,255,255,0.2)',
        marginTop: 20,
        fontSize: 12,
        letterSpacing: 2,
        fontFamily: 'Cinzel-Regular',
    },
    fullCardImage: {
        width: '100%',
        height: '100%',
    },
    cardImagePlaceholder: {
        flex: 1,
        backgroundColor: 'rgba(10,10,20,1)',
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
    cardPaginationBarFlex: {
        flex: 1,
        height: 2,
    },
    cardPaginationBarInactive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
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
    cardActionCircleRight: {
        marginLeft: 'auto',
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
        color: 'rgba(255,255,255,1)',
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
    cardLocationIcon: {
        marginRight: 6,
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
        color: 'rgba(245,158,11,1)',
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
        color: 'rgba(0,0,0,1)',
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
    emptyIcon: {
        marginBottom: 15,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
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
    modalContentMax85: {
        maxHeight: '85%',
    },
    modalContentMax80: {
        maxHeight: '80%',
    },
    modalContentPreview: {
        height: '90%',
        padding: 0,
    },
    modalAvatarContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    modalContentScroll: {
        maxHeight: 300,
    },
    modalCheckingContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    modalCheckingText: {
        textAlign: 'center',
        marginTop: 15,
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
        color: 'rgba(245,158,11,1)',
        textAlign: 'center',
        letterSpacing: 1,
    },
    headerTitleSmall: {
        fontSize: 18,
        fontFamily: 'Cinzel-Regular',
        color: 'rgba(255,255,255,1)',
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
        color: 'rgba(255,255,255,1)',
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
        color: 'rgba(0,0,0,1)',
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
        color: 'rgba(255,255,255,1)',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    filterInputHalf: {
        flex: 1,
    },
    filterValueTextActive: {
        color: 'rgba(255,255,255,1)',
    },
    filterValueTextPlaceholder: {
        color: 'rgba(255,255,255,0.3)',
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
    previewScrollContent: {
        padding: 20,
    },
    citySearchInput: {
        marginBottom: 20,
    },
    pickerScrollContent: {
        paddingBottom: 20,
    },
    pickerOptionRow: {
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    pickerAccentText: {
        fontWeight: 'bold',
    },
    pickerOptionText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 16,
    },
    errorText: {
        color: 'rgba(239,68,68,1)',
        textAlign: 'center',
    },
    // Picker specific styles (keeping compatible names if used)
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 12,
        color: 'rgba(255,255,255,1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    closeBtn: {
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
    },
});
