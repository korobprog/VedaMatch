import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    TextInput,
    StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import DatePicker from 'react-native-date-picker';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { useUser } from '../../context/UserContext';
import { useLocation } from '../../hooks/useLocation';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { COLORS } from '../../components/chat/ChatConstants';
import {
    DATING_TRADITIONS,
    YOGA_STYLES,
    GUNAS,
    IDENTITY_OPTIONS
} from '../../constants/DatingConstants';
import { FormInput } from '../../components/registration/FormInput';
import { FormSelect } from '../../components/registration/FormSelect';
import { PickerContainer } from '../../components/registration/PickerContainer';
import { PickerItem } from '../../components/registration/PickerItem';
import { RadioGroup } from '../../components/registration/RadioGroup';
import { KeyboardAwareContainer } from '../../components/ui/KeyboardAwareContainer';
import apiClient from '../../lib/apiClient';
import { invalidateContactsCaches } from '../../lib/contactCache';
import { queryClient } from '../../lib/queryClient';
import i18n from '../../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleProfileForm'>;

const GENDER_OPTIONS = ['Male', 'Female'];
const DIET_OPTIONS = ['Vegan', 'Vegetarian', 'Prasad'];
type CountryData = { name: { common: string }; capital?: string[] };
type DisplayRole = 'user' | 'in_goodness' | 'yogi' | 'devotee';

const normalizeDisplayRole = (role: string): DisplayRole => {
    if (role === 'in_goodness' || role === 'yogi' || role === 'devotee') {
        return role;
    }
    return 'user';
};

const RoleProfileFormScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const language = i18n.language === 'ru' ? 'ru' : i18n.language === 'hi' ? 'hi' : 'en';
    const insets = useSafeAreaInsets();
    const { role, context, email, password, inviteCode } = route.params;

    const { login } = useUser();
    const {
        countriesData,
        citiesData,
        loadingCountries,
        fetchCountries,
        fetchCities,
        autoDetectLocation
    } = useLocation();

    const { colors, roleTheme } = useRoleTheme(role, true);
    const displayRole = normalizeDisplayRole(role);

    const isSeekerRole = role === 'user';
    const isInGoodnessRole = role === 'in_goodness';
    const isLiteProfileRole = isSeekerRole || isInGoodnessRole;

    const roleNames = useMemo(() => ({
        ru: { user: 'Искатель', in_goodness: 'В благости', yogi: 'Йог', devotee: 'Преданный' },
        hi: { user: 'साधक', in_goodness: 'सत्त्व में', yogi: 'योगी', devotee: 'भक्त' },
        en: { user: 'Seeker', in_goodness: 'In Goodness', yogi: 'Yogi', devotee: 'Devotee' },
    }), []);

    const [_avatar, _setAvatar] = useState<any>(null);
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [karmicName, setKarmicName] = useState('');
    const [spiritualName, setSpiritualName] = useState('');
    const [dob, setDob] = useState(new Date());
    const [madh, setMadh] = useState('');
    const [mentor, setMentor] = useState('');
    const [gender, setGender] = useState(GENDER_OPTIONS[0]);
    const [identity, setIdentity] = useState(IDENTITY_OPTIONS[0]);
    const [yogaStyle, setYogaStyle] = useState('');
    const [guna, setGuna] = useState('');
    const [diet, setDiet] = useState(DIET_OPTIONS[2]);
    const [loading, setLoading] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [godModeEnabled] = useState(false);

    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [cityInputMode, setCityInputMode] = useState(false);
    const [showMadhPicker, setShowMadhPicker] = useState(false);
    const [showYogaPicker, setShowYogaPicker] = useState(false);
    const [showGunaPicker, setShowGunaPicker] = useState(false);
    const [openDatePicker, setOpenDatePicker] = useState(false);

    const isMountedRef = useRef(true);
    const latestSubmitRequestRef = useRef(0);
    const latestDetectRequestRef = useRef(0);

    useEffect(() => {
        isMountedRef.current = true;
        fetchCountries();
        return () => {
            isMountedRef.current = false;
            latestSubmitRequestRef.current += 1;
            latestDetectRequestRef.current += 1;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isLiteProfileRole) {
            return;
        }
        setSpiritualName('');
        setMadh('');
        setYogaStyle('');
        setMentor('');
        setGuna('');
        setIdentity(IDENTITY_OPTIONS[0]);
        if (isSeekerRole) {
            setDiet(DIET_OPTIONS[2]);
        }
    }, [isLiteProfileRole, isSeekerRole]);

    // Load existing profile data for settings context
    useFocusEffect(
        useCallback(() => {
            if (context !== 'settings') return;

            const loadExistingProfile = async () => {
                try {
                    const response = await apiClient.get<any>('/contacts/me');
                    const profile = response.data;
                    if (profile) {
                        setCountry(profile.country || '');
                        setCity(profile.city || '');
                        setKarmicName(profile.karmicName || '');
                        setSpiritualName(profile.spiritualName || '');
                        setMadh(profile.madh || '');
                        setMentor(profile.mentor || '');
                        setGender(profile.gender || GENDER_OPTIONS[0]);
                        setIdentity(profile.identity || IDENTITY_OPTIONS[0]);
                        setYogaStyle(profile.yogaStyle || '');
                        setGuna(profile.guna || '');
                        setDiet(profile.diet || DIET_OPTIONS[2]);

                        if (profile.country) {
                            await fetchCities(profile.country);
                        }

                        if (profile.dob) {
                            const date = new Date(profile.dob);
                            if (!isNaN(date.getTime())) {
                                setDob(date);
                            }
                        }
                    }
                } catch (error) {
                    console.warn('[RoleProfileForm] Failed to load profile:', error);
                }
            };

            loadExistingProfile();
        }, [context, fetchCities])
    );

    const getRequestErrorMessage = useCallback((error: any, fallback: string): string => {
        const payload = error?.response?.data;
        const errorCode = payload?.code || payload?.errorCode;

        // Map backend error codes to translated messages
        const errorMap: Record<string, string> = {
            'profile_update_failed': t('registration.profileUpdateFailed'),
            'profile_conflict': t('registration.profileConflict', { defaultValue: 'Конфликт данных профиля' }),
            'profile_name_required': t('registration.karmicNameRequired'),
            'nickname_invalid': t('registration.nicknameInvalid', { defaultValue: 'Некорректный никнейм' }),
            'nickname_cooldown_active': t('registration.nicknameCooldown', { defaultValue: 'Смена никнейма возможна позже' }),
        };

        if (errorCode && errorMap[errorCode]) {
            return errorMap[errorCode];
        }

        // Map known backend English messages to translations
        if (typeof payload?.error === 'string') {
            const msg = payload.error.trim();
            if (msg === 'Could not update profile') return t('registration.profileUpdateFailed');
            if (msg === 'Karmic name is required') return t('registration.karmicNameRequired');
            if (msg === 'Profile data conflicts with existing account') return t('registration.profileConflict', { defaultValue: 'Конфликт данных профиля' });
            if (msg === 'User not found') return t('registration.userNotFound', { defaultValue: 'Пользователь не найден' });
            if (msg === 'Unauthorized') return t('registration.unauthorized', { defaultValue: 'Необходима авторизация' });
            if (msg.trim()) return msg;
        }
        if (typeof payload?.message === 'string' && payload.message.trim()) {
            return payload.message.trim();
        }
        if (typeof error?.message === 'string' && error.message.trim()) {
            return error.message.trim();
        }
        return fallback;
    }, [t]);

    const handleSubmit = async () => {
        if (!karmicName.trim() || !city.trim()) {
            Alert.alert(
                t('common.error'),
                isSeekerRole ? t('registration.nameRequired') : t('registration.karmicNameRequired')
            );
            return;
        }

        const requestId = ++latestSubmitRequestRef.current;
        if (isMountedRef.current) {
            setLoading(true);
        }

        try {
            if (context === 'registration') {
                // Registration flow
                console.log(`[RoleProfileForm] Submitting registration role=${role}`);
                const response = await apiClient.post<any>('/register', {
                    email: email?.trim() || '',
                    password: password?.trim() || '',
                    karmicName: karmicName.trim(),
                    spiritualName: isLiteProfileRole ? '' : spiritualName.trim(),
                    country: country.trim(),
                    city: city.trim(),
                    dob: dob.toISOString().split('T')[0],
                    madh: isLiteProfileRole ? '' : madh.trim(),
                    mentor: isLiteProfileRole ? '' : mentor.trim(),
                    gender: gender.trim(),
                    identity: isLiteProfileRole ? '' : identity.trim(),
                    yogaStyle: isLiteProfileRole ? '' : yogaStyle.trim(),
                    guna: isLiteProfileRole ? '' : guna.trim(),
                    diet: isSeekerRole ? '' : diet.trim(),
                    role,
                    godModeEnabled,
                    inviteCode: inviteCode?.trim() || '',
                });

                if (requestId !== latestSubmitRequestRef.current || !isMountedRef.current) {
                    return;
                }

                const { user, accessToken, refreshToken } = response.data;
                await invalidateContactsCaches(queryClient);
                await login(user, {
                    accessToken,
                    refreshToken,
                    token: accessToken,
                    user,
                    source: 'email_password',
                    authTimestamp: Date.now(),
                });

                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Portal' }],
                });
            } else {
                // Settings flow - update profile
                console.log(`[RoleProfileForm] Updating profile role=${role}`);
                await apiClient.put<any>('/update-profile', {
                    karmicName: karmicName.trim(),
                    spiritualName: isLiteProfileRole ? '' : spiritualName.trim(),
                    country: country.trim(),
                    city: city.trim(),
                    dob: dob.toISOString().split('T')[0],
                    madh: isLiteProfileRole ? '' : madh.trim(),
                    mentor: isLiteProfileRole ? '' : mentor.trim(),
                    gender: gender.trim(),
                    identity: isLiteProfileRole ? '' : identity.trim(),
                    yogaStyle: isLiteProfileRole ? '' : yogaStyle.trim(),
                    guna: isLiteProfileRole ? '' : guna.trim(),
                    diet: isSeekerRole ? '' : diet.trim(),
                    role,
                });

                if (requestId !== latestSubmitRequestRef.current || !isMountedRef.current) {
                    return;
                }

                await invalidateContactsCaches(queryClient);
                navigation.goBack();
            }
        } catch (error: any) {
            if (requestId === latestSubmitRequestRef.current && isMountedRef.current) {
                const message = getRequestErrorMessage(error, t('registration.profileUpdateFailed'));
                console.warn(`[RoleProfileForm] Error saving profile: ${message}`);
                Alert.alert(t('common.error'), message);
            }
        } finally {
            if (requestId === latestSubmitRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    const handleAutoDetect = async () => {
        setDetectingLocation(true);
        const requestId = ++latestDetectRequestRef.current;
        try {
            const result = await autoDetectLocation();
            if (requestId !== latestDetectRequestRef.current || !isMountedRef.current) {
                return;
            }
            if (result) {
                if (result.country) setCountry(result.country);
                if (result.city) setCity(result.city);
                await fetchCities(result.country || '');
            }
        } catch (error) {
            if (requestId === latestDetectRequestRef.current && isMountedRef.current) {
                console.warn('[RoleProfileForm] Auto-detect failed:', error);
            }
        } finally {
            if (requestId === latestDetectRequestRef.current && isMountedRef.current) {
                setDetectingLocation(false);
            }
        }
    };

    const handleCountrySelect = (c: CountryData) => {
        const countryName = c.name.common;
        setCountry(countryName);
        setShowCountryPicker(false);
        fetchCities(countryName);
        setCity('');
    };

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Portal');
        }
    };

    const screenBackgroundColor = '#0E1525';

    return (
        <View style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
                    >
                        <ArrowLeft size={20} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
                        {t('roleProfile.title', { defaultValue: 'Profile Setup' })}
                    </Text>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={styles.headerButton}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={roleTheme.accent} />
                        ) : (
                            <Text style={[styles.headerButtonText, { color: roleTheme.accent, fontWeight: '800' }]}>
                                {t('common.save', { defaultValue: 'Save' })}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                <KeyboardAwareContainer
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'android' ? 'height' : 'padding'}
                    useTopInset={false}
                >
                    <ScrollView
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
                        {/* Role Badge */}
                        <View style={[styles.roleBadge, { backgroundColor: `${roleTheme.accent}20` }]}>
                                <Text style={[styles.roleBadgeText, { color: roleTheme.accent }]}>
                                {roleNames[language][displayRole] || roleNames.en.user}
                            </Text>
                        </View>

                        {/* Main Fields */}
                        <View style={styles.section}>
                            <Text style={styles.label}>
                                {isSeekerRole ? (t('registration.name') || 'Name') : (t('registration.karmicName') || 'Karmic Name')}
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={karmicName}
                                onChangeText={setKarmicName}
                                placeholder={t('registration.namePlaceholder') || 'Enter your name'}
                                placeholderTextColor="rgba(248,250,252,0.4)"
                            />

                            {!isLiteProfileRole && (
                                <>
                                    <Text style={styles.label}>{t('registration.spiritualName') || 'Spiritual Name'}</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={spiritualName}
                                        onChangeText={setSpiritualName}
                                        placeholder={t('registration.spiritualNamePlaceholder') || 'Enter spiritual name'}
                                        placeholderTextColor="rgba(248,250,252,0.4)"
                                    />
                                </>
                            )}

                            <Text style={styles.label}>{t('registration.city') || 'Current City'}</Text>
                            {!cityInputMode ? (
                                <>
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity
                                            style={[styles.input, { flex: 1, justifyContent: 'center' }]}
                                            onPress={() => {
                                                if (country) {
                                                    setShowCityPicker(!showCityPicker);
                                                } else {
                                                    Alert.alert(
                                                        t('roleProfile.selectCountryFirst', { defaultValue: 'Select Country First' }),
                                                        t('roleProfile.selectCountryBeforeCity', { defaultValue: 'Please select a country before choosing a city.' })
                                                    );
                                                }
                                            }}
                                            disabled={!country}
                                        >
                                            <Text style={{ color: city ? '#F8FAFC' : 'rgba(248,250,252,0.5)' }}>
                                                {city || (country ? t('registration.selectCity') : t('registration.selectCountry'))}
                                            </Text>
                                        </TouchableOpacity>
                                        {!!country && (
                                            <TouchableOpacity
                                                style={[styles.input, { width: 50, justifyContent: 'center', alignItems: 'center' }]}
                                                onPress={() => setCityInputMode(true)}
                                            >
                                                <Text style={{ color: roleTheme.accent, fontSize: 18 }}>✎</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {showCityPicker && citiesData.length > 0 && (
                                        <PickerContainer theme={COLORS.dark}>
                                            <PickerItem
                                                label="Clear"
                                                theme={COLORS.dark}
                                                onPress={() => { setCity(''); setShowCityPicker(false); }}
                                            />
                                            {citiesData.map((cityName: string) => (
                                                <PickerItem
                                                    key={cityName}
                                                    label={cityName}
                                                    theme={COLORS.dark}
                                                    onPress={() => { setCity(cityName); setShowCityPicker(false); }}
                                                />
                                            ))}
                                        </PickerContainer>
                                    )}
                                </>
                            ) : (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        value={city}
                                        onChangeText={setCity}
                                        placeholder={t('registration.enterCityName')}
                                        placeholderTextColor="rgba(248,250,252,0.5)"
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={[styles.input, { width: 50, justifyContent: 'center', alignItems: 'center' }]}
                                        onPress={() => setCityInputMode(false)}
                                    >
                                        <Text style={{ color: roleTheme.accent, fontSize: 18 }}>✓</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.autoDetectButton}
                                onPress={handleAutoDetect}
                                disabled={detectingLocation}
                            >
                                {detectingLocation ? (
                                    <ActivityIndicator size="small" color="#FFB74D" />
                                ) : (
                                    <Text style={styles.autoDetectText}>
                                        {t('registration.detectLocation')}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* Country Picker */}
                            <FormSelect
                                label={t('registration.country')}
                                value={country}
                                placeholder={t('registration.selectCountry')}
                                theme={COLORS.dark}
                                onPress={() => {
                                    if (loadingCountries) {
                                        Alert.alert(t('common.loading'), t('registration.loadingCountriesWait'));
                                        return;
                                    }
                                    if (countriesData.length === 0) {
                                        Alert.alert(t('common.error'), t('registration.noCountriesAvailable'));
                                        fetchCountries();
                                        return;
                                    }
                                    setShowCountryPicker(!showCountryPicker);
                                }}
                                loading={loadingCountries}
                                loadingText={t('registration.loadingCountries')}
                            />
                            {showCountryPicker && countriesData.length > 0 && (
                                <PickerContainer theme={COLORS.dark}>
                                    {countriesData.map((c: any) => (
                                        <PickerItem
                                            key={c.name.common}
                                            label={c.name.common}
                                            theme={COLORS.dark}
                                            onPress={() => handleCountrySelect(c)}
                                        />
                                    ))}
                                </PickerContainer>
                            )}

                            {/* Date of Birth */}
                            <FormSelect
                                label={t('registration.dob')}
                                value={dob.toLocaleString()}
                                placeholder=""
                                theme={COLORS.dark}
                                onPress={() => setOpenDatePicker(true)}
                            />
                            <DatePicker
                                modal
                                open={openDatePicker}
                                date={dob}
                                mode="date"
                                onConfirm={(date) => {
                                    setOpenDatePicker(false);
                                    setDob(date);
                                }}
                                onCancel={() => setOpenDatePicker(false)}
                            />

                            {/* Gender */}
                            <RadioGroup
                                label={t('registration.gender')}
                                options={GENDER_OPTIONS}
                                value={gender}
                                onChange={setGender}
                                theme={COLORS.dark}
                                layout="row"
                            />

                            {/* Lite Profile Fields (Seeker & In Goodness) - End Here */}
                        </View>

                        {/* Full Profile Fields (Yogi & Devotee) */}
                        {!isLiteProfileRole && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    {t('roleProfile.spiritualFields', { defaultValue: 'Spiritual Fields' })}
                                </Text>

                                {/* Madh */}
                                <FormSelect
                                    label={t('registration.madh')}
                                    value={madh}
                                    placeholder={t('registration.selectTradition')}
                                    theme={COLORS.dark}
                                    onPress={() => setShowMadhPicker(!showMadhPicker)}
                                />
                                {showMadhPicker && (
                                    <PickerContainer theme={COLORS.dark}>
                                        <PickerItem label="None" theme={COLORS.dark} onPress={() => { setMadh(''); setShowMadhPicker(false); }} />
                                        {DATING_TRADITIONS.map((m) => (
                                            <PickerItem key={m} label={m} theme={COLORS.dark} onPress={() => { setMadh(m); setShowMadhPicker(false); }} />
                                        ))}
                                    </PickerContainer>
                                )}

                                <FormInput
                                    label={t('registration.mentor')}
                                    theme={COLORS.dark}
                                    value={mentor}
                                    onChangeText={setMentor}
                                    placeholder={t('registration.mentorPlaceholder')}
                                />

                                <RadioGroup
                                    label={t('registration.identity')}
                                    options={IDENTITY_OPTIONS}
                                    value={identity}
                                    onChange={setIdentity}
                                    theme={COLORS.dark}
                                    layout="row"
                                />

                                {/* Yoga Style */}
                                <FormSelect
                                    label="Yoga Style"
                                    value={yogaStyle}
                                    placeholder={t('registration.selectYogaStyle')}
                                    theme={COLORS.dark}
                                    onPress={() => setShowYogaPicker(!showYogaPicker)}
                                />
                                {showYogaPicker && (
                                    <PickerContainer theme={COLORS.dark}>
                                        {YOGA_STYLES.map((y) => (
                                            <PickerItem key={y} label={y} theme={COLORS.dark} onPress={() => { setYogaStyle(y); setShowYogaPicker(false); }} />
                                        ))}
                                    </PickerContainer>
                                )}

                                <FormSelect
                                    label="Mode of Nature (Guna)"
                                    value={guna}
                                    placeholder={t('registration.selectGuna')}
                                    theme={COLORS.dark}
                                    onPress={() => setShowGunaPicker(!showGunaPicker)}
                                />
                                {showGunaPicker && (
                                    <PickerContainer theme={COLORS.dark}>
                                        {GUNAS.map((g) => (
                                            <PickerItem key={g} label={g} theme={COLORS.dark} onPress={() => { setGuna(g); setShowGunaPicker(false); }} />
                                        ))}
                                    </PickerContainer>
                                )}

                                <RadioGroup
                                    label={t('registration.diet')}
                                    options={DIET_OPTIONS}
                                    value={diet}
                                    onChange={setDiet}
                                    theme={COLORS.dark}
                                    layout="row"
                                />
                            </View>
                        )}

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.8}
                            style={{ marginTop: 24 }}
                        >
                            <LinearGradient
                                colors={[roleTheme.accent, roleTheme.accentStrong]}
                                style={[styles.submitButton, { opacity: loading ? 0.7 : 1 }]}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        {t('roleProfile.saveProfile', { defaultValue: 'Save Profile' })}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAwareContainer>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: Platform.OS === 'android' ? 64 + (StatusBar.currentHeight || 0) : 94,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 44,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
    },
    headerButton: {
        padding: 8,
    },
    headerButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    content: {
        padding: 20,
    },
    roleBadge: {
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 24,
    },
    roleBadgeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#F8FAFC',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        marginTop: 16,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        height: 54,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderColor: 'rgba(255,255,255,0.16)',
        color: '#F8FAFC',
    },
    autoDetectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1.5,
        marginTop: 12,
        marginBottom: 8,
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderColor: 'rgba(255,255,255,0.2)',
    },
    autoDetectText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFB74D',
    },
    submitButton: {
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F57C00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitButtonText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
});

export default RoleProfileFormScreen;
