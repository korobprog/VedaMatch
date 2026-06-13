import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Switch,
    ActivityIndicator,
    Alert,
    Modal,
    FlatList,
    SafeAreaView
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { datingService } from '../../../services/datingService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import {
    DATING_INTENTION_OPTIONS,
    DATING_TRADITIONS,
    DatingIntention,
    GUNAS,
    IDENTITY_OPTIONS,
    normalizeDatingIntentions,
    YOGA_STYLES,
} from '../../../constants/DatingConstants';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';
import apiClient from '../../../lib/apiClient';

type Props = NativeStackScreenProps<RootStackParamList, 'EditDatingProfile'>;

const LOVE_LANGUAGE_OPTIONS = ['words_of_affirmation', 'quality_time', 'acts_of_service', 'receiving_gifts', 'physical_touch'];
const ELEMENT_OPTIONS = ['air', 'water', 'earth', 'fire'];
const CHILDREN_OPTIONS = ['want', 'dont_want', 'undecided'];
const MEETING_PREFERENCE_OPTIONS = ['personal', 'bhakti_vriksha', 'temple_sunday_program', 'event', 'public_place'];
const SOCIAL_PLATFORM_OPTIONS = ['vk', 'telegram', 'instagram', 'youtube', 'facebook', 'x'];

export const EditDatingProfileScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { userId } = route.params;
    const { user, login } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const theme = React.useMemo(() => ({
        background: colors.background,
        header: colors.surface,
        borderColor: colors.border,
        text: colors.textPrimary,
        subText: colors.textSecondary,
        accent: colors.accent,
        inputBackground: colors.surfaceElevated,
        button: colors.accent,
        buttonText: colors.textPrimary,
    }), [colors]);
    const styles = React.useMemo(() => createStyles(theme), [theme]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        bio: '',
        interests: '',
        lookingFor: '',
        maritalStatus: '',
        birthTime: '',
        birthPlaceLink: '',
        city: '',
        dob: '',
        madh: '',
        yogaStyle: '',
        guna: '',
        identity: '',
        datingEnabled: false,
        intentions: [] as DatingIntention[],
        skills: '',
        industry: '',
        lookingForBusiness: '',
        childrenIntent: '',
        loveLanguages: [] as string[],
        elementalPrimary: '',
        elementalSecondary: '',
        meetingPreferences: [] as string[],
        socialLinks: [] as Array<{ id?: number; platform: string; url: string; visible: boolean }>,
    });
    const [publication, setPublication] = useState<any>(null);
    const [approvalSummary, setApprovalSummary] = useState<any>(null);
    const [posts, setPosts] = useState<Array<{ id: number; body: string; status: string; moderationReason?: string }>>([]);
    const [newPostBody, setNewPostBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [requestingApprovals, setRequestingApprovals] = useState(false);

    const [openTimePicker, setOpenTimePicker] = useState(false);
    const [citySearchModal, setCitySearchModal] = useState(false);
    const [madhSelectionModal, setMadhSelectionModal] = useState(false);
    const [yogaSelectionModal, setYogaSelectionModal] = useState(false);
    const [gunaSelectionModal, setGunaSelectionModal] = useState(false);
    const [cityQuery, setCityQuery] = useState('');
    const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
    const [isSearchingCities, setIsSearchingCities] = useState(false);
    const [citySearchType, setCitySearchType] = useState<'current' | 'birth'>('current');
    const [tempDate, setTempDate] = useState(new Date());
    const [openDobPicker, setOpenDobPicker] = useState(false);
    const [tempDob, setTempDob] = useState(new Date());
    const citySearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestFetchRequestRef = useRef(0);
    const latestSaveRequestRef = useRef(0);
    const latestCitySearchRequestRef = useRef(0);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestFetchRequestRef.current += 1;
            latestSaveRequestRef.current += 1;
            latestCitySearchRequestRef.current += 1;
            if (citySearchTimeoutRef.current) {
                clearTimeout(citySearchTimeoutRef.current);
                citySearchTimeoutRef.current = null;
            }
        };
    }, []);

    const fetchProfile = useCallback(async () => {
        const requestId = ++latestFetchRequestRef.current;
        try {
            const me = await datingService.getProfile(userId);
            if (requestId !== latestFetchRequestRef.current || !isMountedRef.current) {
                return;
            }
            if (me) {
                const normalizedIntentions = normalizeDatingIntentions(me.intentions);

                setProfile({
                    bio: me.bio || '',
                    interests: me.interests || '',
                    lookingFor: me.lookingFor || '',
                    maritalStatus: me.maritalStatus || '',
                    birthTime: me.birthTime || '',
                    birthPlaceLink: me.birthPlaceLink || '',
                    city: me.city || '',
                    dob: me.dob || '',
                    madh: me.madh || '',
                    yogaStyle: me.yogaStyle || '',
                    guna: me.guna || '',
                    identity: me.identity || IDENTITY_OPTIONS[0],
                    datingEnabled: me.datingEnabled || false,
                    intentions: normalizedIntentions,
                    skills: me.skills || '',
                    industry: me.industry || '',
                    lookingForBusiness: me.lookingForBusiness || '',
                    childrenIntent: me.childrenIntent || '',
                    loveLanguages: datingService.normalizeCsvList(me.loveLanguages),
                    elementalPrimary: me.elementalPrimary || '',
                    elementalSecondary: me.elementalSecondary || '',
                    meetingPreferences: datingService.normalizeCsvList(me.meetingPreferences),
                    socialLinks: Array.isArray(me.datingSocialLinks) ? me.datingSocialLinks.map((link: any) => ({
                        id: link.id || link.ID,
                        platform: link.platform || '',
                        url: link.url || '',
                        visible: link.visible !== false,
                    })) : []
                });
                setPosts(Array.isArray(me.datingPosts) ? me.datingPosts.map((post: any) => ({
                    id: Number(post.id || post.ID),
                    body: String(post.body || ''),
                    status: String(post.status || ''),
                    moderationReason: post.moderationReason ? String(post.moderationReason) : '',
                })) : []);
                if (me.birthTime) {
                    const today = new Date();
                    const [hours, minutes] = me.birthTime.split(':');
                    today.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                    setTempDate(today);
                }
                if (me.dob) {
                    const date = new Date(me.dob);
                    if (!isNaN(date.getTime())) {
                        setTempDob(date);
                    }
                }
            }
        } catch (error) {
            if (requestId !== latestFetchRequestRef.current || !isMountedRef.current) {
                return;
            }
            console.error('Failed to fetch profile:', error);
        } finally {
            if (requestId === latestFetchRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const fetchPublicationState = useCallback(async () => {
        try {
            const [publicationData, approvalsData] = await Promise.all([
                datingService.getPublicationStatus(userId),
                datingService.getApprovals(userId),
            ]);
            if (!isMountedRef.current) {
                return;
            }
            setPublication(publicationData);
            setApprovalSummary(approvalsData);
        } catch (error) {
            console.error('Failed to fetch publication state:', error);
        }
    }, [userId]);

    useEffect(() => {
        fetchPublicationState();
    }, [fetchPublicationState]);

    const handleSaveProfile = async () => {
        if (saving) return;

        // Validation if dating is enabled
        if (profile.datingEnabled) {
            if (!profile.bio.trim() || !profile.interests.trim() || !profile.lookingFor.trim() ||
                !profile.maritalStatus.trim() || !profile.dob || !profile.birthTime || !profile.birthPlaceLink || !profile.city) {
                Alert.alert(t('common.info'), t('registration.requiredFieldsForDating') || 'To enable the profile in Union, fill in all fields including city and astrology data.');
                return;
            }
        }

        const requestId = ++latestSaveRequestRef.current;
        setSaving(true);
        try {
            const profileData = {
                ...profile,
                intentions: profile.intentions.join(','),
                socialLinks: profile.socialLinks.filter((item) => item.url.trim() !== ''),
            };
            const updatedUser = await datingService.updateProfile(userId, profileData);
            if (requestId !== latestSaveRequestRef.current || !isMountedRef.current) {
                return;
            }
            // Update user in context
            await login(updatedUser);
            await fetchPublicationState();
            if (requestId !== latestSaveRequestRef.current || !isMountedRef.current) {
                return;
            }
            Alert.alert(t('common.success'), t('profile.updateSuccess') || 'Profile updated successfully');
            navigation.goBack();
        } catch (error) {
            if (requestId === latestSaveRequestRef.current && isMountedRef.current) {
                Alert.alert(t('common.error'), t('common.errorUpdate') || 'Failed to update profile');
                console.error('Save profile error:', error);
            }
        } finally {
            if (requestId === latestSaveRequestRef.current && isMountedRef.current) {
                setSaving(false);
            }
        }
    };

    const handleSubmitProfile = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            await datingService.submitProfile(userId);
            await fetchProfile();
            await fetchPublicationState();
            Alert.alert(t('common.success'), t('dating.publicationSubmitted'));
        } catch (error) {
            console.error('Submit profile error:', error);
            Alert.alert(t('common.error'), t('dating.publicationSubmitError'));
        } finally {
            if (isMountedRef.current) {
                setSubmitting(false);
            }
        }
    };

    const handleRequestApprovals = async () => {
        if (requestingApprovals) {
            return;
        }
        const approverIds = Array.isArray(approvalSummary?.friends)
            ? approvalSummary.friends
                .map((friend: any) => Number(friend.id || friend.ID))
                .filter((id: number) => Number.isFinite(id) && id > 0)
            : [];
        if (approverIds.length === 0) {
            Alert.alert(t('common.info'), t('dating.approvalsNoFriends'));
            return;
        }
        setRequestingApprovals(true);
        try {
            await datingService.requestApprovals(userId, approverIds);
            await fetchPublicationState();
            Alert.alert(t('common.success'), t('dating.approvalsRequested'));
        } catch (error) {
            console.error('Request approvals error:', error);
            Alert.alert(t('common.error'), t('dating.approvalsRequestError'));
        } finally {
            if (isMountedRef.current) {
                setRequestingApprovals(false);
            }
        }
    };

    const toggleChoice = (field: 'loveLanguages' | 'meetingPreferences', value: string) => {
        setProfile((prev) => {
            const current = prev[field];
            const next = current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value];
            return {
                ...prev,
                [field]: field === 'loveLanguages' ? next.slice(0, 2) : next,
            };
        });
    };

    const addSocialLink = () => {
        setProfile((prev) => ({
            ...prev,
            socialLinks: [...prev.socialLinks, { platform: 'vk', url: '', visible: true }],
        }));
    };

    const updateSocialLink = (index: number, patch: Partial<{ platform: string; url: string; visible: boolean }>) => {
        setProfile((prev) => ({
            ...prev,
            socialLinks: prev.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
        }));
    };

    const removeSocialLink = (index: number) => {
        setProfile((prev) => ({
            ...prev,
            socialLinks: prev.socialLinks.filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    const handleCreatePost = async () => {
        const body = newPostBody.trim();
        if (!body) {
            return;
        }
        try {
            await datingService.createPost({ body });
            setNewPostBody('');
            await fetchProfile();
            await fetchPublicationState();
        } catch (error) {
            console.error('Create post error:', error);
            Alert.alert(t('common.error'), t('dating.postCreateError'));
        }
    };

    const performCitySearch = async (query: string) => {
        const requestId = ++latestCitySearchRequestRef.current;
        setIsSearchingCities(true);
        try {
            const response = await apiClient.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    q: query,
                    format: 'json',
                    addressdetails: 1,
                    limit: 10,
                    'accept-language': 'ru,en'
                },
                headers: {
                    'User-Agent': 'Vedamatch-Mobile-App/1.0 (contact@vedic-ai.com)'
                },
                timeout: 5000, // 5 seconds timeout
                ...({ __skipAuthSession: true } as any),
            });
            if (requestId !== latestCitySearchRequestRef.current || !isMountedRef.current) {
                return;
            }
            setCitySuggestions(response.data);
        } catch (error: any) {
            if (requestId !== latestCitySearchRequestRef.current || !isMountedRef.current) {
                return;
            }
            console.error('City search failed:', error.message);
            if (error.response?.status === 403) {
                console.warn('Nominatim blocked the request (403). Check User-Agent or usage policy.');
            }
        } finally {
            if (requestId === latestCitySearchRequestRef.current && isMountedRef.current) {
                setIsSearchingCities(false);
            }
        }
    };

    const searchCities = (query: string) => {
        setCityQuery(query);

        // Clear previous timeout
        if (citySearchTimeoutRef.current) {
            clearTimeout(citySearchTimeoutRef.current);
            citySearchTimeoutRef.current = null;
        }

        if (query.length < 3) {
            latestCitySearchRequestRef.current += 1;
            setIsSearchingCities(false);
            setCitySuggestions([]);
            return;
        }

        // Set a new timeout (600ms debounce)
        citySearchTimeoutRef.current = setTimeout(() => {
            performCitySearch(query);
        }, 600);
    };

    const openCitySearch = (type: 'current' | 'birth') => {
        latestCitySearchRequestRef.current += 1;
        if (citySearchTimeoutRef.current) {
            clearTimeout(citySearchTimeoutRef.current);
            citySearchTimeoutRef.current = null;
        }
        setCitySearchType(type);
        setCityQuery('');
        setCitySuggestions([]);
        setIsSearchingCities(false);
        setCitySearchModal(true);
    };

    const closeCitySearch = () => {
        latestCitySearchRequestRef.current += 1;
        if (citySearchTimeoutRef.current) {
            clearTimeout(citySearchTimeoutRef.current);
            citySearchTimeoutRef.current = null;
        }
        setCitySearchModal(false);
        setCityQuery('');
        setCitySuggestions([]);
        setIsSearchingCities(false);
    };

    const handleCitySelect = (item: any) => {
        if (citySearchType === 'current') {
            setProfile(prev => ({ ...prev, city: item.display_name }));
        } else {
            setProfile(prev => ({ ...prev, birthPlaceLink: item.display_name }));
        }
        closeCitySearch();
    };

    const toggleIntention = (key: DatingIntention) => {
        setProfile(prev => {
            const hasKey = prev.intentions.includes(key);
            return {
                ...prev,
                intentions: hasKey ? prev.intentions.filter(i => i !== key) : [...prev.intentions, key],
            };
        });
    };

    const approvalStatusByFriendId = React.useMemo(() => {
        const result = new Map<number, string>();
        const approvals = Array.isArray(approvalSummary?.approvals) ? approvalSummary.approvals : [];
        approvals.forEach((approval: any) => {
            const approverId = Number(approval.approverId || approval.ApproverID || approval.approver_id);
            const status = String(approval.status || approval.Status || '').trim();
            if (Number.isFinite(approverId) && approverId > 0 && status) {
                result.set(approverId, status);
            }
        });
        return result;
    }, [approvalSummary]);

    if (loading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.accent} />;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.text, fontSize: 17 }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>{t('dating.profile')}</Text>
                <TouchableOpacity onPress={handleSaveProfile} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator color={theme.accent} />
                    ) : (
                        <Text style={{ color: theme.accent, fontSize: 17, fontWeight: 'bold' }}>{t('common.save')}</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAwareContainer style={{ flex: 1 }}>
            <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
                <View style={styles.content}>
                    <View style={styles.switchRow}>
                        <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>{t('dating.enableProfile')}</Text>
                        <Switch
                            value={profile.datingEnabled}
                            onValueChange={(val) => setProfile(prev => ({ ...prev, datingEnabled: val }))}
                            trackColor={{ false: theme.borderColor, true: theme.accent }}
                        />
                    </View>

                    <View style={[styles.publicationPanel, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                        <Text style={[styles.sectionTitle, { color: theme.accent, marginTop: 0 }]}>{t('dating.publicationTitle')}</Text>
                        <Text style={[styles.infoText, { color: theme.text }]}>{t('dating.publicationStatusLabel')}: {publication?.status || t('dating.status.draft')}</Text>
                        <Text style={[styles.infoText, { color: theme.subText }]}>{publication?.reason || t('dating.publicationHint')}</Text>
                        <Text style={[styles.infoText, { color: theme.subText }]}>
                            {t('dating.approvalsProgress', { approved: publication?.approvedCount || 0, required: publication?.requiredApprovals || 3 })}
                        </Text>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.submitBtn, { backgroundColor: theme.button, borderColor: theme.button }]}
                            onPress={handleSubmitProfile}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color={theme.buttonText} /> : <Text style={{ color: theme.buttonText, fontWeight: '700' }}>{t('dating.submitForPublication')}</Text>}
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.infoText, { color: theme.subText, marginBottom: 15 }]}>
                        💡 {t('profile.photoTip')}
                    </Text>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('MediaLibrary', { userId })}
                    >
                        <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{t('dating.managePhotos')}</Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>{t('registration.city')}</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => openCitySearch('current')}
                    >
                        <Text style={{ color: profile.city ? theme.text : theme.subText }} numberOfLines={1}>
                            {profile.city || t('dating.selectCity')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.bio')}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
                        multiline
                        numberOfLines={4}
                        value={profile.bio}
                        onChangeText={(val) => setProfile({ ...profile, bio: val })}
                        placeholder={t('dating.bioPlaceholder')}
                        placeholderTextColor={theme.subText}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.interests')}</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
                        value={profile.interests}
                        onChangeText={(val) => setProfile({ ...profile, interests: val })}
                        placeholder={t('dating.interestsPlaceholder')}
                        placeholderTextColor={theme.subText}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.childrenIntent')}</Text>
                    <View style={styles.chipWrap}>
                        {CHILDREN_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.chip, { backgroundColor: profile.childrenIntent === option ? theme.accent : theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setProfile((prev) => ({ ...prev, childrenIntent: option }))}
                            >
                                <Text style={{ color: profile.childrenIntent === option ? theme.buttonText : theme.text }}>{t(`dating.childrenOptions.${option}`)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.loveLanguages')}</Text>
                    <View style={styles.chipWrap}>
                        {LOVE_LANGUAGE_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.chip, { backgroundColor: profile.loveLanguages.includes(option) ? theme.accent : theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => toggleChoice('loveLanguages', option)}
                            >
                                <Text style={{ color: profile.loveLanguages.includes(option) ? theme.buttonText : theme.text }}>{t(`dating.loveLanguageOptions.${option}`)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.elementalPrimary')}</Text>
                    <View style={styles.chipWrap}>
                        {ELEMENT_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.chip, { backgroundColor: profile.elementalPrimary === option ? theme.accent : theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setProfile((prev) => ({ ...prev, elementalPrimary: option }))}
                            >
                                <Text style={{ color: profile.elementalPrimary === option ? theme.buttonText : theme.text }}>{t(`dating.elementOptions.${option}`)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.elementalSecondary')}</Text>
                    <View style={styles.chipWrap}>
                        {ELEMENT_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.chip, { backgroundColor: profile.elementalSecondary === option ? theme.accent : theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setProfile((prev) => ({ ...prev, elementalSecondary: option }))}
                            >
                                <Text style={{ color: profile.elementalSecondary === option ? theme.buttonText : theme.text }}>{t(`dating.elementOptions.${option}`)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.meetingPreferences')}</Text>
                    <View style={styles.chipWrap}>
                        {MEETING_PREFERENCE_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.chip, { backgroundColor: profile.meetingPreferences.includes(option) ? theme.accent : theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => toggleChoice('meetingPreferences', option)}
                            >
                                <Text style={{ color: profile.meetingPreferences.includes(option) ? theme.buttonText : theme.text }}>{t(`dating.meetingOptions.${option}`)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Networking Goals */}
                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.goals')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                        {DATING_INTENTION_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[
                                    styles.chip,
                                    { 
                                        backgroundColor: profile.intentions.includes(opt.key) ? theme.accent : theme.inputBackground,
                                        borderColor: theme.borderColor 
                                    }
                                ]}
                                onPress={() => toggleIntention(opt.key)}
                            >
                                <Text style={{ color: profile.intentions.includes(opt.key) ? theme.buttonText : theme.text, fontWeight: '500' }}>
                                    {t(opt.labelKey)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Conditional Business Profile */}
                    {profile.intentions.includes('business') && (
                        <View style={{ marginBottom: 15, padding: 15, backgroundColor: theme.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: theme.accent + '40' }}>
                            <Text style={[styles.sectionTitle, { fontSize: 16, marginTop: 0, marginBottom: 10, color: theme.accent }]}>{t('dating.businessProfile')}</Text>
                            
                            <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>{t('dating.skills')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.borderColor }]}
                                value={profile.skills}
                                onChangeText={(val) => setProfile({ ...profile, skills: val })}
                                placeholder={t('dating.skillsPlaceholder')}
                                placeholderTextColor={theme.subText}
                            />

                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.industry')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.borderColor }]}
                                value={profile.industry}
                                onChangeText={(val) => setProfile({ ...profile, industry: val })}
                                placeholder={t('dating.industryPlaceholder')}
                                placeholderTextColor={theme.subText}
                            />

                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.lookingForBusiness')}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.borderColor, minHeight: 60 }]}
                                value={profile.lookingForBusiness}
                                onChangeText={(val) => setProfile({ ...profile, lookingForBusiness: val })}
                                placeholder={t('dating.lookingForBusinessPlaceholder')}
                                placeholderTextColor={theme.subText}
                                multiline
                            />
                        </View>
                    )}

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.madh')}</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setMadhSelectionModal(true)}
                    >
                        <Text style={{ color: profile.madh ? theme.text : theme.subText }}>
                            {profile.madh || t('dating.selectTradition')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.yogaStyle')}</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setYogaSelectionModal(true)}
                    >
                        <Text style={{ color: profile.yogaStyle ? theme.text : theme.subText }}>
                            {profile.yogaStyle || t('dating.selectStyle')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.guna')}</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setGunaSelectionModal(true)}
                    >
                        <Text style={{ color: profile.guna ? theme.text : theme.subText }}>
                            {profile.guna || t('dating.selectGuna')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.identity')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {IDENTITY_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.radioBtn, {
                                    borderColor: theme.borderColor,
                                    backgroundColor: profile.identity === opt ? theme.button : 'transparent',
                                    padding: 10,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    marginRight: 10,
                                    marginBottom: 10
                                }]}
                                onPress={() => setProfile({ ...profile, identity: opt })}
                            >
                                <Text style={{ color: profile.identity === opt ? theme.buttonText : theme.text }}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.socialLinks')}</Text>
                    {profile.socialLinks.map((link, index) => (
                        <View key={`${link.platform}-${index}`} style={[styles.socialLinkCard, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                            <View style={styles.chipWrap}>
                                {SOCIAL_PLATFORM_OPTIONS.map((platform) => (
                                    <TouchableOpacity
                                        key={platform}
                                        style={[styles.chip, { backgroundColor: link.platform === platform ? theme.accent : theme.background, borderColor: theme.borderColor }]}
                                        onPress={() => updateSocialLink(index, { platform })}
                                    >
                                        <Text style={{ color: link.platform === platform ? theme.buttonText : theme.text }}>{platform}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={[styles.input, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.background }]}
                                value={link.url}
                                onChangeText={(url) => updateSocialLink(index, { url })}
                                placeholder={t('dating.socialLinkPlaceholder')}
                                placeholderTextColor={theme.subText}
                            />
                            <TouchableOpacity onPress={() => removeSocialLink(index)}>
                                <Text style={{ color: theme.accent }}>{t('common.delete')}</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.actionBtn} onPress={addSocialLink}>
                        <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{t('dating.addSocialLink')}</Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.lookingFor')}</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
                        value={profile.lookingFor}
                        onChangeText={(val) => setProfile({ ...profile, lookingFor: val })}
                        placeholder={t('dating.lookingForPlaceholder')}
                        placeholderTextColor={theme.subText}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.maritalStatus')}</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
                        value={profile.maritalStatus}
                        onChangeText={(val) => setProfile({ ...profile, maritalStatus: val })}
                        placeholder={t('dating.maritalStatusPlaceholder')}
                        placeholderTextColor={theme.subText}
                    />

                    <View style={styles.divider} />
                    <Text style={[styles.sectionTitle, { color: theme.accent, marginTop: 0 }]}>{t('dating.astroDetails')}</Text>

                    <Text style={[styles.label, { color: theme.text }]}>{t('registration.dob')}</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setOpenDobPicker(true)}
                    >
                        <Text style={{ color: profile.dob ? theme.text : theme.subText }}>
                            {profile.dob || t('dating.selectDate')}
                        </Text>
                    </TouchableOpacity>
                    <DatePicker
                        modal
                        mode="date"
                        open={openDobPicker}
                        date={tempDob}
                        onConfirm={(date) => {
                            setOpenDobPicker(false);
                            setTempDob(date);
                            // Format YYYY-MM-DD
                            const dateStr = date.toISOString().split('T')[0];
                            setProfile({ ...profile, dob: dateStr });
                        }}
                        onCancel={() => {
                            setOpenDobPicker(false);
                        }}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.birthTime')}</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setOpenTimePicker(true)}
                    >
                        <Text style={{ color: profile.birthTime ? theme.text : theme.subText }}>
                            {profile.birthTime || t('dating.selectTime')}
                        </Text>
                    </TouchableOpacity>
                    <DatePicker
                        modal
                        mode="time"
                        open={openTimePicker}
                        date={tempDate}
                        onConfirm={(date) => {
                            setOpenTimePicker(false);
                            setTempDate(date);
                            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                            setProfile({ ...profile, birthTime: timeStr });
                        }}
                        onCancel={() => {
                            setOpenTimePicker(false);
                        }}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.birthPlace')}</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => openCitySearch('birth')}
                    >
                        <Text style={{ color: profile.birthPlaceLink ? theme.text : theme.subText }} numberOfLines={1}>
                            {profile.birthPlaceLink || t('dating.selectCity')}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />
                    <Text style={[styles.sectionTitle, { color: theme.accent, marginTop: 0 }]}>{t('dating.profilePosts')}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
                        multiline
                        numberOfLines={4}
                        value={newPostBody}
                        onChangeText={setNewPostBody}
                        placeholder={t('dating.postPlaceholder')}
                        placeholderTextColor={theme.subText}
                    />
                    <TouchableOpacity style={styles.actionBtn} onPress={handleCreatePost}>
                        <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{t('dating.addPost')}</Text>
                    </TouchableOpacity>
                    {posts.map((post) => (
                        <View key={post.id} style={[styles.postCard, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>{post.body}</Text>
                            <Text style={{ color: theme.subText }}>{t(`dating.postStatus.${post.status}`)}</Text>
                            {!!post.moderationReason && <Text style={{ color: theme.subText, marginTop: 4 }}>{post.moderationReason}</Text>}
                        </View>
                    ))}

                    {!!approvalSummary?.friends?.length && (
                        <>
                            <View style={styles.divider} />
                            <Text style={[styles.sectionTitle, { color: theme.accent, marginTop: 0 }]}>{t('dating.approvalsTitle')}</Text>
                            <TouchableOpacity
                                style={[
                                    styles.actionBtn,
                                    styles.inlineActionBtn,
                                    { opacity: requestingApprovals ? 0.7 : 1 }
                                ]}
                                onPress={handleRequestApprovals}
                                disabled={requestingApprovals}
                            >
                                {requestingApprovals ? (
                                    <ActivityIndicator color={theme.accent} />
                                ) : (
                                    <Text style={{ color: theme.accent, fontWeight: 'bold' }}>{t('dating.requestApprovals')}</Text>
                                )}
                            </TouchableOpacity>
                            {approvalSummary.friends.map((friend: any) => (
                                <View key={friend.id || friend.ID} style={[styles.friendApprovalRow, { borderBottomColor: theme.borderColor }]}>
                                    <Text style={{ color: theme.text, flex: 1 }}>{friend.spiritualName || friend.karmicName}</Text>
                                    <View style={[styles.approvalStatusBadge, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                                        <Text style={{ color: theme.subText, fontSize: 12, fontWeight: '600' }}>
                                            {t(`dating.approvalStatus.${approvalStatusByFriendId.get(Number(friend.id || friend.ID)) || 'not_requested'}`)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    )}
                    
                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
            </KeyboardAwareContainer>

            {/* City Search Modal */}
            <Modal visible={citySearchModal} animationType="slide">
                <KeyboardAwareContainer style={{ flex: 1 }} useTopInset={false}>
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.borderColor }]}>
                        <TouchableOpacity onPress={closeCitySearch}>
                            <Text style={{ color: theme.accent, fontSize: 16 }}>{t('common.close')}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>
                            {citySearchType === 'current' ? t('dating.searchCity') : t('dating.birthPlace')}
                        </Text>
                        <View style={{ width: 50 }} />
                    </View>
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={[styles.searchInput, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                            placeholder={t('dating.searchCity')}
                            placeholderTextColor={theme.subText}
                            value={cityQuery}
                            onChangeText={searchCities}
                            autoFocus
                        />
                        {isSearchingCities && <ActivityIndicator style={styles.modalLoader} color={theme.accent} />}
                    </View>
                    <FlatList
                        data={citySuggestions}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.cityItem, { borderBottomColor: theme.borderColor }]}
                                onPress={() => handleCitySelect(item)}
                            >
                                <Text style={[styles.cityText, { color: theme.text }]}>{item.display_name}</Text>
                            </TouchableOpacity>
                        )}
                        keyboardShouldPersistTaps="always"
                    />
                </SafeAreaView>
                </KeyboardAwareContainer>
            </Modal>
            {/* Madh Selection Modal */}
            <Modal
                visible={madhSelectionModal}
                transparent
                animationType="fade"
            >
                <View style={[styles.modalOverlay, { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header, borderRadius: 20, maxHeight: '60%', padding: 20 }]}>
                        <Text style={[styles.modalTitle, { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }]}>{t('dating.selectTradition')}</Text>

                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            {DATING_TRADITIONS.map((madh, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}
                                    onPress={() => {
                                        setProfile({ ...profile, madh: madh });
                                        setMadhSelectionModal(false);
                                    }}
                                >
                                    <Text style={{ color: theme.text }}>{madh}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: theme.button, marginTop: 10, alignItems: 'center' }]}
                            onPress={() => setMadhSelectionModal(false)}
                        >
                            <Text style={{ color: theme.buttonText }}>{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Yoga Selection Modal */}
            <Modal
                visible={yogaSelectionModal}
                transparent
                animationType="fade"
            >
                <View style={[styles.modalOverlay, { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header, borderRadius: 20, maxHeight: '60%', padding: 20 }]}>
                        <Text style={[styles.modalTitle, { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }]}>{t('dating.selectStyle')}</Text>

                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            {YOGA_STYLES.map((style, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}
                                    onPress={() => {
                                        setProfile({ ...profile, yogaStyle: style });
                                        setYogaSelectionModal(false);
                                    }}
                                >
                                    <Text style={{ color: theme.text }}>{style}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: theme.button, marginTop: 10, alignItems: 'center' }]}
                            onPress={() => setYogaSelectionModal(false)}
                        >
                            <Text style={{ color: theme.buttonText }}>{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Guna Selection Modal */}
            <Modal
                visible={gunaSelectionModal}
                transparent
                animationType="fade"
            >
                <View style={[styles.modalOverlay, { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header, borderRadius: 20, maxHeight: '60%', padding: 20 }]}>
                        <Text style={[styles.modalTitle, { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }]}>{t('dating.selectGuna')}</Text>

                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            {GUNAS.map((guna, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}
                                    onPress={() => {
                                        setProfile({ ...profile, guna: guna });
                                        setGunaSelectionModal(false);
                                    }}
                                >
                                    <Text style={{ color: theme.text }}>{guna}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: theme.button, marginTop: 10, alignItems: 'center' }]}
                            onPress={() => setGunaSelectionModal(false)}
                        >
                            <Text style={{ color: theme.buttonText }}>{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
};

const createStyles = (theme: {
    background: string;
    header: string;
    borderColor: string;
    text: string;
    subText: string;
    accent: string;
    inputBackground: string;
    button: string;
    buttonText: string;
}) => StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 16,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.borderColor,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 15,
        marginBottom: 8,
        color: theme.text,
    },
    infoText: {
        fontSize: 13,
        lineHeight: 18,
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 25,
        marginBottom: 10,
        color: theme.accent,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        minHeight: 52,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    divider: {
        height: 1,
        backgroundColor: theme.borderColor,
        marginVertical: 20,
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 6,
    },
    publicationPanel: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
    },
    submitBtn: {
        marginTop: 10,
        marginBottom: 0,
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchContainer: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderRadius: 25,
        paddingHorizontal: 20,
        fontSize: 16,
    },
    modalLoader: {
        position: 'absolute',
        right: 30,
    },
    cityItem: {
        padding: 16,
        borderBottomWidth: 1,
    },
    cityText: {
        fontSize: 16,
    },
    actionBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: theme.accent,
        backgroundColor: theme.inputBackground,
        alignItems: 'center',
        marginBottom: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
        width: '100%',
    },
    radioBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 10,
        marginBottom: 10,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 10,
    },
    socialLinkCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    postCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    friendApprovalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    inlineActionBtn: {
        marginBottom: 10,
    },
    approvalStatusBadge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginLeft: 12,
    },
    saveButton: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    saveButtonText: {
        color: theme.buttonText,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
