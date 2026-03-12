import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    StatusBar,
    TextInput,
    Switch,
    Modal,
    Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import DatePicker from 'react-native-date-picker';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { COLORS } from '../../components/chat/ChatConstants';
import { useUser } from '../../context/UserContext';
import { useLocation } from '../../hooks/useLocation';
import { mapService } from '../../services/mapService';
import {
    DATING_TRADITIONS,
    YOGA_STYLES,
    GUNAS,
    IDENTITY_OPTIONS
} from '../../constants/DatingConstants';
import { RoleSelectionSection } from '../../components/roles/RoleSelectionSection';
import { PortalRole } from '../../types/portalBlueprint';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { KeyboardAwareContainer } from '../../components/ui/KeyboardAwareContainer';
import apiClient from '../../lib/apiClient';
import { proService, ProStatus } from '../../services/proService';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const GENDER_OPTIONS = ['Male', 'Female'];
const DIET_OPTIONS = ['Vegan', 'Vegetarian', 'Prasad'];
const INTENTION_OPTIONS = [
    { key: 'family', label: 'Family/Marriage' },
    { key: 'business', label: 'Business/Work' },
    { key: 'friendship', label: 'Friendship' },
    { key: 'seva', label: 'Seva/Service' }
];

export const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    const { user, updateUserProfile } = useUser();
    const { fetchCountries, fetchCities } = useLocation();

    const theme = COLORS.dark;
    const screenBackgroundColor = '#0E1525';
    // const isDarkMode = isPortalDarkMode;
    // const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // const [avatar, setAvatar] = useState<any>(null); // TODO: Implement avatar picker
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [karmicName, setKarmicName] = useState('');
    const [spiritualName, setSpiritualName] = useState('');
    const [nickname, setNickname] = useState('');
    const [dob, setDob] = useState(new Date());
    const [madh, setMadh] = useState('');
    const [mentor, setMentor] = useState('');
    const [gender, setGender] = useState(GENDER_OPTIONS[0]);
    const [identity, setIdentity] = useState(IDENTITY_OPTIONS[0]);
    const [yogaStyle, setYogaStyle] = useState('');
    const [guna, setGuna] = useState('');
    const [diet, setDiet] = useState(DIET_OPTIONS[2]);
    const [bio, setBio] = useState('');
    const [interests, setInterests] = useState('');
    const [lookingFor, setLookingFor] = useState('');
    const [intentions, setIntentions] = useState<string[]>([]); // Array of selected intentions
    const [skills, setSkills] = useState('');
    const [industry, setIndustry] = useState('');
    const [lookingForBusiness, setLookingForBusiness] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [yatra, setYatra] = useState('');
    const [timezone, setTimezone] = useState('');
    const [datingEnabled, setDatingEnabled] = useState(false);
    const [latitude, setLatitude] = useState<number | undefined>(undefined);
    const [longitude, setLongitude] = useState<number | undefined>(undefined);
    const [role, setRole] = useState<PortalRole>('user');
    const [godModeEnabled, setGodModeEnabled] = useState(false);
    const [proStatus, setProStatus] = useState<ProStatus | null>(null);
    const [proStatusLoading, setProStatusLoading] = useState(false);
    const [nicknameError, setNicknameError] = useState('');
    const [karmicNameError, setKarmicNameError] = useState('');

    // City autocomplete
    const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);

    const [showMadhPicker, setShowMadhPicker] = useState(false);
    const [showYogaPicker, setShowYogaPicker] = useState(false);
    const [showGunaPicker, setShowGunaPicker] = useState(false);
    const [openDatePicker, setOpenDatePicker] = useState(false);
    // const [openTimePicker, setOpenTimePicker] = useState(false);
    const isMountedRef = useRef(true);
    const latestLoadRequestRef = useRef(0);
    const latestSaveRequestRef = useRef(0);
    const latestCitySearchRequestRef = useRef(0);
    const citySearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { colors: roleColors } = useRoleTheme(role, true);
    const canManageProMode = user?.role === 'admin' || user?.role === 'superadmin';
    const effectiveProEnabled = proStatus?.isProEffective ?? godModeEnabled;
    const isSeekerRole = role === 'user';
    const showSpiritualFields = !isSeekerRole;
    const editProfileCopy = React.useMemo(() => {
        const language = String(i18n.language || '').toLowerCase();
        if (language.startsWith('hi')) {
            return {
                chooseCity: 'एक शहर चुनें।',
                karmicNameRequired: 'कर्मिक नाम भरें।',
                fillAboutMe: '"About me" फ़ील्ड भरें।',
                fillInterests: '"Interests" फ़ील्ड भरें।',
                spiritualFieldRequired: 'चयनित भूमिका के लिए कम से कम एक आध्यात्मिक फ़ील्ड भरें: Yatra, Timezone, Tradition, Yoga style या Guna।',
                profileUpdated: 'प्रोफ़ाइल सफलतापूर्वक अपडेट हुई!',
                failedToUpdateProfile: 'प्रोफ़ाइल अपडेट नहीं की जा सकी',
                nicknameLabel: 'Nickname (optional unique ID)',
                nicknameHelper: 'यदि खाली छोड़ दें, मौजूदा या ऑटो-जनरेटेड nickname ही रहेगा।',
                nicknamePlaceholder: '@your_nickname',
                nicknameInvalid: 'В nickname допустимы только латинские буквы, цифры, точка и подчёркивание.',
                nicknameTaken: 'Этот nickname уже занят.',
                nicknameCooldown: 'Nickname пока нельзя изменить из-за cooldown.',
            };
        }
        if (language.startsWith('en')) {
            return {
                chooseCity: 'Choose a city.',
                karmicNameRequired: 'Fill in the Karmic Name field.',
                fillAboutMe: 'Fill in the "About me" field.',
                fillInterests: 'Fill in the "Interests" field.',
                spiritualFieldRequired: 'For the selected role, specify at least one spiritual field: Yatra, Timezone, Tradition, Yoga style, or Guna.',
                profileUpdated: 'Profile updated successfully!',
                failedToUpdateProfile: 'Failed to update profile',
                nicknameLabel: 'Nickname (optional unique ID)',
                nicknameHelper: 'Leave it empty to keep the current or auto-generated nickname.',
                nicknamePlaceholder: '@your_nickname',
                nicknameInvalid: 'Nickname can contain only latin letters, numbers, dots, and underscores.',
                nicknameTaken: 'This nickname is already taken.',
                nicknameCooldown: 'Nickname cannot be changed yet because of cooldown.',
            };
        }
        return {
            chooseCity: 'Выберите город.',
            karmicNameRequired: 'Заполните кармическое имя.',
            fillAboutMe: 'Заполните поле "О себе".',
            fillInterests: 'Заполните поле "Интересы".',
            spiritualFieldRequired: 'Для выбранной роли укажите хотя бы одно духовное поле: Yatra, Timezone, Tradition, Yoga style или Guna.',
            profileUpdated: 'Профиль успешно обновлён!',
            failedToUpdateProfile: 'Не удалось обновить профиль',
            nicknameLabel: 'Nickname (необязательный уникальный ID)',
            nicknameHelper: 'Если оставить пустым, сохранится текущий или автосгенерированный nickname.',
            nicknamePlaceholder: '@your_nickname',
            nicknameInvalid: 'В nickname допустимы только латинские буквы, цифры, точка и подчёркивание.',
            nicknameTaken: 'Этот nickname уже занят.',
            nicknameCooldown: 'Nickname пока нельзя изменить из-за cooldown.',
        };
    }, [i18n.language]);

    useEffect(() => {
        navigation.setOptions({
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
            animationMatchesGesture: false,
        });
    }, [navigation]);

    useEffect(() => {
        loadProfile();
        fetchCountries();
        void loadProStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchCountries]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
            latestSaveRequestRef.current += 1;
            latestCitySearchRequestRef.current += 1;
            if (citySearchTimeoutRef.current) {
                clearTimeout(citySearchTimeoutRef.current);
            }
        };
    }, []);

    const getRequestErrorMessage = React.useCallback((error: any, fallback: string): string => {
        const payload = error?.response?.data;
        if (typeof payload?.error === 'string' && payload.error.trim()) {
            return payload.error.trim();
        }
        if (typeof payload?.message === 'string' && payload.message.trim()) {
            return payload.message.trim();
        }
        if (typeof error?.message === 'string' && error.message.trim()) {
            return error.message.trim();
        }
        return fallback;
    }, []);

    const getRequestStatusTag = React.useCallback((error: any): string => {
        const status = error?.response?.status;
        return typeof status === 'number' ? String(status) : 'n/a';
    }, []);

    const getRequestCode = React.useCallback((error: any): string => {
        const payload = error?.response?.data;
        const code = payload?.code || payload?.errorCode;
        return typeof code === 'string' ? code.trim().toLowerCase() : '';
    }, []);

    const loadProfile = React.useCallback(async () => {
        if (!user?.ID) return;
        const requestId = ++latestLoadRequestRef.current;

        try {
            if (isMountedRef.current) {
                setLoading(true);
            }
            const response = await apiClient.get<any[] | { items?: any[] }>('/contacts');
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            const contacts = Array.isArray(response.data)
                ? response.data
                : (Array.isArray(response.data?.items) ? response.data.items : []);
            const userData = contacts.find((u: any) => u.ID === user.ID);

            if (userData) {
                setCountry(userData.country || '');
                setCity(userData.city || '');
                setKarmicName(userData.karmicName || '');
                setSpiritualName(userData.spiritualName || '');
                setNickname(userData.nickname ? `@${userData.nickname}` : '');
                setMadh(userData.madh || '');
                setMentor(userData.mentor || '');
                setGender(userData.gender || GENDER_OPTIONS[0]);
                setIdentity(userData.identity || IDENTITY_OPTIONS[0]);
                setYogaStyle(userData.yogaStyle || '');
                setGuna(userData.guna || '');
                setDiet(userData.diet || DIET_OPTIONS[2]);
                setBio(userData.bio || '');
                setInterests(userData.interests || '');
                setLookingFor(userData.lookingFor || '');
                setSkills(userData.skills || '');
                setIndustry(userData.industry || '');
                setLookingForBusiness(userData.lookingForBusiness || '');

                // Parse intentions (stored as comma-separated string)
                if (userData.intentions) {
                    setIntentions(userData.intentions.split(',').map((i: string) => i.trim()));
                } else {
                    setIntentions([]);
                }

                setMaritalStatus(userData.maritalStatus || '');
                setBirthTime(userData.birthTime || '');
                setYatra(userData.yatra || '');
                setTimezone(userData.timezone || '');
                setDatingEnabled(userData.datingEnabled || false);
                setRole((userData.role || 'user') as PortalRole);
                setGodModeEnabled(!!userData.godModeEnabled);

                if (userData.dob) {
                    const date = new Date(userData.dob);
                    if (!isNaN(date.getTime())) {
                        setDob(date);
                    }
                }

                if (userData.country) {
                    await fetchCities(userData.country);
                }
            }
        } catch (error) {
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            console.warn('[EditProfile] Error loading profile:', error);
        } finally {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [user?.ID, fetchCities]);

    const loadProStatus = React.useCallback(async () => {
        if (!user?.ID) return;
        try {
            setProStatusLoading(true);
            const status = await proService.getStatus();
            if (!isMountedRef.current) return;
            setProStatus(status);
            setGodModeEnabled(!!status?.isProEffective);
        } catch (error) {
            if (!isMountedRef.current) return;
            console.warn('[EditProfile] Failed to load PRO status:', error);
        } finally {
            if (isMountedRef.current) {
                setProStatusLoading(false);
            }
        }
    }, [user?.ID]);

    const getProfileValidationError = (): string | null => {
        const hasSpiritualContext = [yatra, timezone, madh, yogaStyle, guna].some(value => value.trim().length > 0);

        if (!city.trim()) {
            return editProfileCopy.chooseCity;
        }

        if (!karmicName.trim()) {
            return editProfileCopy.karmicNameRequired;
        }

        if (datingEnabled && !isSeekerRole) {
            if (!bio.trim()) {
                return editProfileCopy.fillAboutMe;
            }
            if (!interests.trim()) {
                return editProfileCopy.fillInterests;
            }
            if (!hasSpiritualContext) {
                return editProfileCopy.spiritualFieldRequired;
            }
        }

        return null;
    };

    const handleSave = async () => {
        if (!user?.ID || saving) return;
        setNicknameError('');
        setKarmicNameError('');
        const validationError = getProfileValidationError();
        if (validationError) {
            if (validationError === editProfileCopy.karmicNameRequired) {
                setKarmicNameError(validationError);
            }
            Alert.alert(t('common.error'), validationError);
            return;
        }

        const requestId = ++latestSaveRequestRef.current;
        if (isMountedRef.current) {
            setSaving(true);
        }
        try {
            console.log(`[EditProfile] Saving profile user=${user.ID} endpoint=/update-profile`);
            const normalizedDob = Number.isNaN(dob.getTime()) ? '' : dob.toISOString().split('T')[0];
            const normalizedNickname = nickname.trim().replace(/^@+/, '').toLowerCase();
            const profileData = {
                country: country.trim(),
                city: city.trim(),
                karmicName: karmicName.trim(),
                spiritualName: spiritualName.trim(),
                dob: normalizedDob,
                madh: madh.trim(),
                mentor: mentor.trim(),
                gender: gender.trim(),
                identity: identity.trim(),
                yogaStyle: yogaStyle.trim(),
                guna: guna.trim(),
                diet: diet.trim(),
                bio: bio.trim(),
                interests: interests.trim(),
                lookingFor: lookingFor.trim(),
                intentions: intentions.join(','),
                skills: skills.trim(),
                industry: industry.trim(),
                lookingForBusiness: lookingForBusiness.trim(),
                maritalStatus: maritalStatus.trim(),
                birthTime: birthTime.trim(),
                yatra: yatra.trim(),
                timezone: timezone.trim(),
                datingEnabled,
                nickname: normalizedNickname || undefined,
                ...(canManageProMode ? { role, godModeEnabled: true } : {}),
                latitude,
                longitude
            };

            const response = await apiClient.put<{ user: any }>('/update-profile', profileData);
            if (requestId !== latestSaveRequestRef.current || !isMountedRef.current) {
                return;
            }
            const updatedUser = response.data.user || {};

            await updateUserProfile(updatedUser);
            if (requestId !== latestSaveRequestRef.current || !isMountedRef.current) {
                return;
            }

            Alert.alert(
                t('common.success'),
                t('profile.updateSuccess') || editProfileCopy.profileUpdated,
                [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            if (requestId === latestSaveRequestRef.current && isMountedRef.current) {
                const requestCode = getRequestCode(error);
                const message = getRequestErrorMessage(error, editProfileCopy.failedToUpdateProfile);
                const statusTag = getRequestStatusTag(error);
                const urlTag = typeof error?.config?.url === 'string' ? error.config.url : '/update-profile';
                console.warn(`[EditProfile] Error saving profile status=${statusTag} url=${urlTag} user=${user?.ID}: ${message}`);
                if (requestCode === 'profile_name_required') {
                    setKarmicNameError(editProfileCopy.karmicNameRequired);
                    Alert.alert(t('common.error'), editProfileCopy.karmicNameRequired);
                    return;
                }
                if (requestCode === 'nickname_invalid') {
                    setNicknameError(editProfileCopy.nicknameInvalid);
                    return;
                }
                if (requestCode === 'nickname_taken') {
                    setNicknameError(editProfileCopy.nicknameTaken);
                    return;
                }
                if (requestCode === 'nickname_cooldown_active') {
                    setNicknameError(editProfileCopy.nicknameCooldown);
                    return;
                }
                Alert.alert(
                    t('common.error'),
                    message
                );
            }
        } finally {
            if (requestId === latestSaveRequestRef.current && isMountedRef.current) {
                setSaving(false);
            }
        }
    };

    // City autocomplete search
    const searchCities = async (query: string) => {
        setCity(query); // Update city as user types

        if (query.length < 2) {
            setCitySuggestions([]);
            setShowCitySuggestions(false);
            return;
        }

        if (citySearchTimeoutRef.current) {
            clearTimeout(citySearchTimeoutRef.current);
        }
        citySearchTimeoutRef.current = setTimeout(async () => {
            const requestId = ++latestCitySearchRequestRef.current;
            try {
                const result = await mapService.autocomplete(query, undefined, undefined, 5);
                if (requestId !== latestCitySearchRequestRef.current || !isMountedRef.current) {
                    return;
                }
                if (result?.features) {
                    // Filter to show only cities/localities
                    const cities = result.features
                        .filter((f: any) => f.properties?.city || f.properties?.name)
                        .map((f: any) => ({
                            city: f.properties.city || f.properties.name,
                            country: f.properties.country,
                            lat: f.properties.lat,
                            lon: f.properties.lon,
                            formatted: f.properties.formatted
                        }));
                    setCitySuggestions(cities);
                    setShowCitySuggestions(cities.length > 0);
                } else {
                    setCitySuggestions([]);
                    setShowCitySuggestions(false);
                }
            } catch (error) {
                if (requestId === latestCitySearchRequestRef.current && isMountedRef.current) {
                    console.warn('[EditProfile] City search error:', error);
                }
            }
        }, 350);
    };

    const handleCitySelect = (suggestion: any) => {
        setCity(suggestion.city);
        setCountry(suggestion.country || country);
        setLatitude(suggestion.lat);
        setLongitude(suggestion.lon);
        setShowCitySuggestions(false);
        console.log('[EditProfile] Selected city:', suggestion.city, 'coords:', suggestion.lat, suggestion.lon);
    };

    const toggleIntention = (key: string) => {
        if (intentions.includes(key)) {
            setIntentions(intentions.filter(i => i !== key));
        } else {
            setIntentions([...intentions, key]);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: roleColors.overlay, justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={roleColors.accent} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: roleColors.overlay }]}>
                <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

                <KeyboardAwareContainer
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'android' ? 'height' : 'padding'}
                    useTopInset={false}
                >
                    <View style={{ flex: 1 }}>
                        {/* Header - Monolithic Design */}
                        <View style={styles.header}>
                            <LinearGradient
                                colors={['rgba(0,0,0,0.5)', 'transparent']}
                                style={StyleSheet.absoluteFill}
                            />
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                                <Text style={[styles.headerButtonText, { color: '#F8FAFC', opacity: 0.8 }]}>{t('common.cancel') || 'Cancel'}</Text>
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>{t('profile.datingProfile')}</Text>
                            <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={saving}>
                                {saving ? (
                                    <ActivityIndicator size="small" color={roleColors.accent} />
                                ) : (
                                    <Text style={[styles.headerButtonText, { color: roleColors.accent, fontWeight: '800' }]}>{t('common.save') || 'Save'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={[
                                styles.content,
                                { paddingBottom: Math.max(insets.bottom + 140, 180) },
                            ]}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="always"
                            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                            nestedScrollEnabled
                            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                        >
                            <RoleSelectionSection
                                selectedRole={role}
                                onSelectRole={setRole}
                                autoOpenHint={!user?.isProfileComplete}
                            />

                            <View style={styles.proCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>{t('settings.proMode')}</Text>
                                    <Text style={styles.helperText}>
                                        {proStatusLoading
                                            ? 'Checking PRO status...'
                                            : (canManageProMode
                                                ? 'Access is enabled by role (free)'
                                                : (effectiveProEnabled
                                                    ? `Active${proStatus?.currentSubscription?.endsAt ? ` until ${new Date(proStatus.currentSubscription.endsAt).toLocaleDateString('en-US')}` : ''}`
                                                    : 'No active PRO access on this account'))}
                                    </Text>
                                </View>
                            </View>

                            {/* Enable Toggle */}
                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>
                                        {t('dating.enableProfile') || 'Enable Union Profile'}
                                    </Text>
                                    <Text style={styles.helperText}>Visibility of your profile in Union</Text>
                                </View>
                                <Switch
                                    value={datingEnabled}
                                    onValueChange={setDatingEnabled}
                                    trackColor={{ false: roleColors.border, true: roleColors.accentSoft }}
                                    thumbColor={datingEnabled ? '#fff' : '#f4f3f4'}
                                />
                            </View>

                            {/* Tip Box & Photo Management - Only shown when dating enabled */}
                            {datingEnabled && (
                                <>
                                    <View style={styles.tipBox}>
                                        <Text style={styles.tipText}>
                                            💡 {t('profile.photoTip') || 'Upload your best photos to the gallery so other users can view them in a slideshow.'}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.managePhotosBtn}
                                        onPress={() => user?.ID && navigation.navigate('MediaLibrary', { userId: user.ID })}
                                    >
                                        <Text style={styles.managePhotosText}>{t('dating.managePhotos')}</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* Main Profile Fields */}
                            <View style={styles.section}>
                                <Text style={styles.label}>
                                    {isSeekerRole ? (t('registration.name') || 'Name') : (t('registration.karmicName') || 'Karmic Name')}
                                </Text>
                                <TextInput
                                    style={[styles.input, karmicNameError ? styles.inputError : null]}
                                    value={karmicName}
                                    onChangeText={(value) => {
                                        setKarmicNameError('');
                                        setKarmicName(value);
                                    }}
                                    placeholder={t('registration.namePlaceholder') || 'Enter your name'}
                                    placeholderTextColor="rgba(248,250,252,0.4)"
                                />
                                <Text style={[styles.helperText, styles.fieldHelper, karmicNameError ? styles.fieldErrorText : null]}>
                                    {karmicNameError || editProfileCopy.karmicNameRequired}
                                </Text>

                                {showSpiritualFields && (
                                    <>
                                        <Text style={styles.label}>{t('registration.spiritualName') || 'Spiritual Name'}</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={spiritualName}
                                            onChangeText={setSpiritualName}
                                            placeholder={t('registration.spiritualNamePlaceholder') || 'Enter your spiritual name'}
                                            placeholderTextColor="rgba(248,250,252,0.4)"
                                        />
                                    </>
                                )}

                                <Text style={styles.label}>{t('registration.city') || 'Current City'}</Text>
                                <View style={{ position: 'relative', zIndex: 100 }}>
                                    <TextInput
                                        style={styles.input}
                                        value={city}
                                        onChangeText={searchCities}
                                        placeholder={t('registration.selectCity')}
                                        placeholderTextColor={theme.subText}
                                        onFocus={() => city.length >= 2 && setShowCitySuggestions(citySuggestions.length > 0)}
                                    />
                                    {showCitySuggestions && (
                                        <View style={styles.suggestionsContainer}>
                                            {citySuggestions.map((suggestion, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={styles.suggestionItem}
                                                    onPress={() => handleCitySelect(suggestion)}
                                                >
                                                    <Text style={{ color: '#F8FAFC', fontSize: 15 }}>{suggestion.city}</Text>
                                                    <Text style={{ color: 'rgba(248,250,252,0.6)', fontSize: 12 }}>{suggestion.country}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.label}>{editProfileCopy.nicknameLabel}</Text>
                                <TextInput
                                    style={[styles.input, nicknameError ? styles.inputError : null]}
                                    value={nickname}
                                    onChangeText={(value) => {
                                        setNicknameError('');
                                        const trimmed = value.trim();
                                        if (!trimmed) {
                                            setNickname('');
                                            return;
                                        }
                                        setNickname(trimmed.startsWith('@') ? trimmed : `@${trimmed}`);
                                    }}
                                    placeholder={editProfileCopy.nicknamePlaceholder}
                                    placeholderTextColor="rgba(248,250,252,0.4)"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <Text style={[styles.helperText, styles.fieldHelper, nicknameError ? styles.fieldErrorText : null]}>
                                    {nicknameError || editProfileCopy.nicknameHelper}
                                </Text>

                                {showSpiritualFields && (
                                    <>
                                        <Text style={styles.label}>{t('dating.yatra')}</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={yatra}
                                            onChangeText={setYatra}
                                            placeholder={t('dating.yatraPlaceholder')}
                                            placeholderTextColor="rgba(248,250,252,0.4)"
                                        />

                                        <Text style={styles.label}>{t('dating.timezone')}</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={timezone}
                                            onChangeText={setTimezone}
                                            placeholder={t('dating.timezonePlaceholder')}
                                            placeholderTextColor="rgba(248,250,252,0.4)"
                                        />
                                    </>
                                )}

                                <Text style={styles.label}>{t('dating.bio') || 'About Me (Bio)'}</Text>
                                <TextInput
                                    style={styles.textArea}
                                    value={bio}
                                    onChangeText={setBio}
                                    placeholder={t('dating.bioPlaceholder')}
                                    placeholderTextColor="rgba(248,250,252,0.4)"
                                    multiline
                                    numberOfLines={4}
                                />

                                <Text style={styles.label}>{t('dating.interests') || 'Interests'}</Text>
                                <TextInput
                                    style={styles.textArea}
                                    value={interests}
                                    onChangeText={setInterests}
                                    placeholder={t('dating.interestsPlaceholder')}
                                    placeholderTextColor="rgba(248,250,252,0.4)"
                                    multiline
                                />

                                {/* Intentions / Goals */}
                                <Text style={styles.label}>{t('dating.goals')}</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                                    {INTENTION_OPTIONS.map((opt) => (
                                        <TouchableOpacity
                                            key={opt.key}
                                            style={[
                                                styles.chip,
                                                intentions.includes(opt.key) && { backgroundColor: roleColors.accentSoft, borderColor: roleColors.accent }
                                            ]}
                                            onPress={() => toggleIntention(opt.key)}
                                        >
                                            <Text style={{ color: intentions.includes(opt.key) ? roleColors.accent : roleColors.textSecondary, fontWeight: '600' }}>
                                                {t(`dating.intentions.${opt.key}`)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Business Section (Conditional) */}
                                {intentions.includes('business') && (
                                    <View style={{ marginBottom: 15, padding: 15, backgroundColor: roleColors.accentSoft, borderRadius: 12, borderWidth: 1, borderColor: roleColors.accent }}>
                                        <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 5, color: roleColors.accent }]}>{t('dating.businessProfile')}</Text>

                                        <Text style={[styles.label, { marginTop: 10 }]}>{t('dating.skills')}</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={skills}
                                            onChangeText={setSkills}
                                            placeholder={t('dating.skillsPlaceholder')}
                                            placeholderTextColor="rgba(248,250,252,0.4)"
                                        />

                                        <Text style={styles.label}>{t('dating.industry')}</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={industry}
                                            onChangeText={setIndustry}
                                            placeholder={t('dating.industryPlaceholder')}
                                            placeholderTextColor="rgba(248,250,252,0.4)"
                                        />
                                    </View>
                                )}

                                {showSpiritualFields && (
                                    <>
                                        <Text style={styles.label}>{t('dating.madh') || 'Tradition (Madh)'}</Text>
                                        <TouchableOpacity
                                            style={[styles.input, { justifyContent: 'center' }]}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setShowMadhPicker(true);
                                            }}
                                        >
                                            <Text style={{ color: madh ? roleColors.textPrimary : roleColors.textSecondary, fontSize: 16 }}>
                                                {madh || t('dating.selectTradition')}
                                            </Text>
                                        </TouchableOpacity>

                                        <Text style={styles.label}>{t('dating.yogaStyle') || 'Yoga Style'}</Text>
                                        <TouchableOpacity
                                            style={[styles.input, { justifyContent: 'center' }]}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setShowYogaPicker(true);
                                            }}
                                        >
                                            <Text style={{ color: yogaStyle ? roleColors.textPrimary : roleColors.textSecondary, fontSize: 16 }}>
                                                {yogaStyle || t('dating.selectStyle')}
                                            </Text>
                                        </TouchableOpacity>

                                        <Text style={styles.label}>{t('dating.guna') || 'Mode of Nature (Guna)'}</Text>
                                        <TouchableOpacity
                                            style={[styles.input, { justifyContent: 'center' }]}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setShowGunaPicker(true);
                                            }}
                                        >
                                            <Text style={{ color: guna ? roleColors.textPrimary : roleColors.textSecondary, fontSize: 16 }}>
                                                {guna || t('dating.selectGuna')}
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>

                            {/* Extra Space */}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </KeyboardAwareContainer>
            </View>

            {/* Pickers */}
            {showMadhPicker && (
                <Modal transparent animationType="fade">
                    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowMadhPicker(false)}>
                        <View style={[styles.pickerContainer, { width: '80%', maxHeight: '60%' }]}>
                            <ScrollView>
                                {DATING_TRADITIONS.map(m => (
                                    <TouchableOpacity key={m} style={styles.pickerItem} onPress={() => { setMadh(m); setShowMadhPicker(false); }}>
                                        <Text style={styles.pickerItemText}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}

            {/* Same for other pickers - simplified for this implementation */}
            {/* Yoga Style Picker */}
            {showYogaPicker && (
                <Modal transparent animationType="fade">
                    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowYogaPicker(false)}>
                        <View style={[styles.pickerContainer, { width: '80%', maxHeight: '60%' }]}>
                            <ScrollView>
                                {YOGA_STYLES.map(y => (
                                    <TouchableOpacity key={y} style={styles.pickerItem} onPress={() => { setYogaStyle(y); setShowYogaPicker(false); }}>
                                        <Text style={styles.pickerItemText}>{y}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}

            {/* Guna Picker */}
            {showGunaPicker && (
                <Modal transparent animationType="fade">
                    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowGunaPicker(false)}>
                        <View style={[styles.pickerContainer, { width: '80%', maxHeight: '60%' }]}>
                            <ScrollView>
                                {GUNAS.map(g => (
                                    <TouchableOpacity key={g} style={styles.pickerItem} onPress={() => { setGuna(g); setShowGunaPicker(false); }}>
                                        <Text style={styles.pickerItemText}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
            <DatePicker
                modal
                open={openDatePicker}
                date={dob}
                mode="date"
                onConfirm={(date) => { setDob(date); setOpenDatePicker(false); }}
                onCancel={() => setOpenDatePicker(false)}
                maximumDate={new Date()}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: Platform.OS === 'android' ? 64 + (StatusBar.currentHeight || 0) : 100,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 50,
        zIndex: 10,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '800',
        color: '#F8FAFC',
        letterSpacing: -0.2,
    },
    headerButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        minWidth: 70,
        alignItems: 'center',
    },
    headerButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    section: {
        marginBottom: 30,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        marginTop: 16,
        fontWeight: '700',
        color: '#F8FAFC',
        opacity: 0.9,
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        height: 54,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.12)',
        color: '#F8FAFC',
    },
    inputError: {
        borderColor: '#FF7A7A',
    },
    textArea: {
        borderWidth: 1.5,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.12)',
        color: '#F8FAFC',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.06)',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    proCard: {
        marginBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.06)',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    helperText: {
        fontSize: 12,
        color: 'rgba(248,250,252,0.6)',
    },
    fieldHelper: {
        marginTop: 6,
    },
    fieldErrorText: {
        color: '#FF7A7A',
    },
    tipBox: {
        backgroundColor: 'rgba(255,183,77,0.1)',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,183,77,0.2)',
        marginBottom: 16,
        marginTop: 10,
    },
    tipText: {
        fontSize: 13,
        color: '#FFB74D',
        lineHeight: 18,
    },
    managePhotosBtn: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        marginBottom: 20,
    },
    managePhotosText: {
        color: '#F8FAFC',
        fontWeight: '700',
        fontSize: 15,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.15)',
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        zIndex: 1000,
        maxHeight: 200,
        overflow: 'hidden',
    },
    suggestionItem: {
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    pickerContainer: {
        backgroundColor: 'rgba(15,23,42,0.98)',
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    pickerItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    pickerItemText: {
        color: '#F8FAFC',
        fontSize: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#F8FAFC',
    },
});
