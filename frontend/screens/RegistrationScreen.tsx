import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
    Switch,
    StatusBar,
    TextInput,
    ImageBackground,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import DatePicker from 'react-native-date-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'react-native-image-picker';
import { useUser } from '../context/UserContext';
import { COLORS } from '../components/chat/ChatConstants';
import {
    DATING_TRADITIONS,
    GUNAS,
    YOGA_STYLES,
    IDENTITY_OPTIONS
} from '../constants/DatingConstants';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { API_PATH } from '../config/api.config';
import { contactService } from '../services/contactService';
import DeviceInfo from 'react-native-device-info';
import { RoleSelectionSection } from '../components/roles/RoleSelectionSection';
import { PortalRole } from '../types/portalBlueprint';
import { useSettings as usePortalSettings } from '../context/SettingsContext';
import { useRoleTheme } from '../hooks/useRoleTheme';

// Custom Components & Hooks
import { useLocation } from '../hooks/useLocation';
import { FormInput } from '../components/registration/FormInput';
import { FormSelect } from '../components/registration/FormSelect';
import { PickerContainer } from '../components/registration/PickerContainer';
import { PickerItem } from '../components/registration/PickerItem';
import { AvatarUploader } from '../components/registration/AvatarUploader';
import { RadioGroup } from '../components/registration/RadioGroup';
import { KeyboardAwareContainer } from '../components/ui/KeyboardAwareContainer';

const DIET_OPTIONS = ['Vegan', 'Vegetarian', 'Prasad'];
const GENDER_OPTIONS = ['Male', 'Female'];
type CountryData = { name: { common: string }; capital?: string[] };

type Props = NativeStackScreenProps<RootStackParamList, 'Registration'>;

const RegistrationScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { login } = useUser();
    const params = route.params ?? { isDarkMode: false, phase: 'initial' as const };
    const { phase = 'initial', inviteCode: paramInviteCode } = params;
    const { isDarkMode: isPortalDarkMode, portalBackground, portalBackgroundType } = usePortalSettings();
    const theme = COLORS.dark; // Registration/Profile phase always uses dark glass aesthetic
    // const theme = isPortalDarkMode ? COLORS.dark : COLORS.light;

    const [avatar, setAvatar] = useState<Asset | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [inviteCode, setInviteCode] = useState(paramInviteCode || '');
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
    const [agreement, setAgreement] = useState(false);
    const [loading, setLoading] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [role, setRole] = useState<PortalRole>('user');
    const [godModeEnabled, setGodModeEnabled] = useState(false);

    // Location Hook
    const {
        countriesData,
        citiesData,
        loadingCountries,
        fetchCountries,
        fetchCities,
        autoDetectLocation
    } = useLocation();

    // UI States
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
    const submitInProgressRef = useRef(false);
    const skipInProgressRef = useRef(false);
    const { colors: roleColors, roleTheme } = useRoleTheme(role, true); // Force dark theme colors for text on dark background
    const isSeekerRole = role === 'user';
    const isInGoodnessRole = role === 'in_goodness';
    const isLiteProfileRole = isSeekerRole || isInGoodnessRole;

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            latestSubmitRequestRef.current += 1;
            latestDetectRequestRef.current += 1;
        };
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

    const handleCountrySelect = async (cData: CountryData) => {
        setCountry(cData.name.common);
        // Autofill city with capital if available
        if (cData.capital && cData.capital.length > 0) {
            setCity(cData.capital[0]);
        }
        setShowCountryPicker(false);
        // Fetch cities for selected country
        try {
            await fetchCities(cData.name.common);
        } catch (error) {
            console.error('[CountrySelect] Failed to fetch cities:', error);
            if (isMountedRef.current) {
                Alert.alert(t('common.error'), t('registration.locationDetectionFailed'));
            }
        }
    };

    const handleAutoDetect = async () => {
        const requestId = ++latestDetectRequestRef.current;
        if (isMountedRef.current) {
            setDetectingLocation(true);
        }
        try {
            const detected = await autoDetectLocation();
            if (requestId !== latestDetectRequestRef.current || !isMountedRef.current) {
                return;
            }
            if (detected) {
                setCountry(detected.country);
                if (detected.city) {
                    setCity(detected.city);
                }

                // Fetch cities for detected country if countryData is available
                if (detected.countryData) {
                    await fetchCities(detected.country);
                }

                Alert.alert(
                    t('common.success'),
                    `${t('registration.locationDetected')}: ${detected.city ? `${detected.city}, ` : ''}${detected.country}`,
                    [{ text: t('common.ok') }]
                );
            } else {
                Alert.alert(
                    t('common.error'),
                    t('registration.locationDetectionFailed'),
                    [{ text: t('common.ok') }]
                );
            }
        } catch (error) {
            console.error('[AutoDetect] Error:', error);
            if (requestId === latestDetectRequestRef.current && isMountedRef.current) {
                Alert.alert(
                    t('common.error'),
                    t('registration.locationDetectionFailed'),
                    [{ text: t('common.ok') }]
                );
            }
        } finally {
            if (requestId === latestDetectRequestRef.current && isMountedRef.current) {
                setDetectingLocation(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (submitInProgressRef.current || loading) {
            return;
        }
        if (phase === 'initial') {
            if (!email || !password) {
                Alert.alert(t('error'), 'Email and password are required');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert(t('error'), 'Passwords do not match');
                return;
            }
        } else {
            if (!karmicName) {
                Alert.alert(
                    t('registration.required'),
                    isSeekerRole ? t('registration.nameRequired') : t('registration.karmicNameRequired')
                );
                return;
            }
        }

        if (!agreement && phase === 'initial') {
            Alert.alert(t('registration.required'), t('registration.agreementRequired'));
            return;
        }
        const requestId = ++latestSubmitRequestRef.current;
        submitInProgressRef.current = true;

        if (isMountedRef.current) {
            setLoading(true);
        }

        try {
            if (phase === 'initial') {
                // Phase 1: Registration
                const deviceId = await DeviceInfo.getUniqueId();
                const response = await axios.post(`${API_PATH}/register`, {
                    email,
                    password,
                    invite_code: inviteCode,
                    role,
                    godModeEnabled,
                    deviceId
                });
                const user = response.data.user;
                const token = response.data.token;

                await AsyncStorage.setItem('user', JSON.stringify(user));
                if (token) {
                    await AsyncStorage.setItem('token', token);
                }
                if (requestId !== latestSubmitRequestRef.current || !isMountedRef.current) {
                    return;
                }

                // Move to phase 2
                navigation.setParams({ phase: 'profile' });
            } else {
                // Phase 2: Profile Update
                const userStr = await AsyncStorage.getItem('user');
                const user = (userStr && userStr !== 'undefined' && userStr !== 'null') ? JSON.parse(userStr) : null;
                if (!user?.ID) {
                    throw new Error('User session is missing. Please sign in again.');
                }

                const profileData = {
                    country,
                    city,
                    karmicName,
                    spiritualName: isLiteProfileRole ? '' : spiritualName,
                    dob: dob.toISOString(),
                    madh: isLiteProfileRole ? '' : madh,
                    mentor: isLiteProfileRole ? '' : mentor,
                    gender,
                    identity: isLiteProfileRole ? '' : identity,
                    yogaStyle: isLiteProfileRole ? '' : yogaStyle,
                    guna: isLiteProfileRole ? '' : guna,
                    diet: isSeekerRole ? '' : diet,
                    role,
                    godModeEnabled,
                };

                console.log('Sending profile data:', JSON.stringify(profileData, null, 2));
                const token = await AsyncStorage.getItem('token');
                if (!token || token === 'undefined' || token === 'null') {
                    throw new Error('Auth token is missing. Please sign in again.');
                }
                const response = await axios.put(`${API_PATH}/update-profile`, profileData, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const updatedUser = response.data.user;

                // Upload avatar if selected
                if (avatar) {
                    if (!avatar.uri) {
                        throw new Error('Selected avatar is invalid.');
                    }
                    const formData = new FormData();
                    formData.append('avatar', {
                        uri: Platform.OS === 'android' ? avatar.uri : avatar.uri.replace('file://', ''),
                        type: avatar.type || 'image/jpeg',
                        name: avatar.fileName || `avatar_${user.ID}.jpg`,
                    } as any);

                    try {
                        const avatarRes = await contactService.uploadAvatar(user.ID, formData);
                        updatedUser.avatarUrl = avatarRes.avatarUrl;
                    } catch (avatarErr) {
                        console.error('Avatar upload failed:', avatarErr);
                        // Don't block registration if only avatar fails
                    }
                }

                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                if (requestId !== latestSubmitRequestRef.current || !isMountedRef.current) {
                    return;
                }
                await login(updatedUser);
            }
        } catch (error: unknown) {
            console.error('Registration/Update error:', error);
            if (requestId !== latestSubmitRequestRef.current || !isMountedRef.current) {
                return;
            }
            const errorMessage =
                typeof error === 'object' && error !== null
                    ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error ||
                        (error as { message?: string }).message)
                    : '';
            Alert.alert(
                'Error',
                errorMessage || 'Operation failed. Please try again.'
            );
        } finally {
            if (requestId === latestSubmitRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
            submitInProgressRef.current = false;
        }
    };

    const handleSkip = () => {
        Alert.alert(
            'Incomplete Profile',
            'If you skip this, some Portal services will be locked until you complete your profile. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Skip',
                    onPress: async () => {
                        if (skipInProgressRef.current) {
                            return;
                        }
                        skipInProgressRef.current = true;
                        try {
                            const userStr = await AsyncStorage.getItem('user');
                            if (userStr && userStr !== 'undefined' && userStr !== 'null') {
                                await login(JSON.parse(userStr));
                            }
                        } catch (error) {
                            console.error('Skip flow failed:', error);
                            if (isMountedRef.current) {
                                Alert.alert('Error', 'Operation failed. Please try again.');
                            }
                        } finally {
                            skipInProgressRef.current = false;
                        }
                    }
                }
            ]
        );
    };



    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {portalBackgroundType === 'image' && portalBackground && (
                <ImageBackground source={{ uri: portalBackground }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: roleColors.overlay }]}>
                <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

                <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
                    {portalBackgroundType === 'image' && (
                        <BlurView
                            style={StyleSheet.absoluteFill}
                            blurType="dark"
                            blurAmount={15}
                            reducedTransparencyFallbackColor="rgba(0,0,0,0.8)"
                        />
                    )}
                    <TouchableOpacity
                        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')}
                        style={styles.backButton}
                    >
                        <Text style={[styles.backText, { color: roleColors.textPrimary }]}>← {t('registration.back')}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: roleColors.textPrimary }]}>
                        {phase === 'initial' ? 'Sign Up' : t('registration.title')}
                    </Text>
                    {phase === 'profile' ? (
                        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                            <Text style={[styles.skipText, { color: roleColors.accent }]}>Skip</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 60 }} />
                    )}
                </View>

                <KeyboardAwareContainer style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.logoHeaderContainer}>
                        <View style={styles.logoWrapper}>
                            <Image
                                source={require('../assets/logo_tilak.png')}
                                style={[styles.logoImage, { tintColor: roleColors.accent }]}
                                resizeMode="contain"
                            />
                        </View>
                    </View>

                    {phase === 'initial' ? (
                        <>
                            <FormInput
                                label="Email"
                                theme={theme}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholder="email@example.com"
                            />
                            <FormInput
                                label="Password"
                                theme={theme}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={true}
                                placeholder="••••••••"
                            />
                            <FormInput
                                label="Confirm Password"
                                theme={theme}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={true}
                                placeholder="••••••••"
                            />
                            <FormInput
                                label={t('registration.inviteCode') + " (Optional)"}
                                theme={theme}
                                value={inviteCode}
                                onChangeText={setInviteCode}
                                placeholder="Enter code if you have one"
                                autoCapitalize="characters"
                            />
                        </>
                    ) : (
                        <>
                            <RoleSelectionSection
                                selectedRole={role}
                                onSelectRole={setRole}
                            />

                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { marginTop: 0 }]}>{t('settings.proMode')}</Text>
                                    <Text style={styles.helperText}>
                                        {t('settings.proModeDesc')}
                                    </Text>
                                </View>
                                <Switch
                                    value={godModeEnabled}
                                    onValueChange={setGodModeEnabled}
                                    trackColor={{ false: roleColors.border, true: roleColors.accentSoft }}
                                    thumbColor={godModeEnabled ? '#fff' : '#f4f3f4'}
                                />
                            </View>

                            {/* Avatar */}
                            <AvatarUploader
                                avatar={avatar}
                                onAvatarChange={setAvatar}
                                theme={theme}
                            />

                            {/* Gender */}
                            <RadioGroup
                                label={t('registration.gender')}
                                options={GENDER_OPTIONS}
                                value={gender}
                                onChange={setGender}
                                theme={theme}
                                layout="row"
                            />

                            {/* Name Fields */}
                            <FormInput
                                label={isSeekerRole ? t('registration.name') : t('registration.karmicName')}
                                theme={theme}
                                value={karmicName}
                                onChangeText={setKarmicName}
                                placeholder="e.g., Ivan Ivanov"
                            />

                            {!isLiteProfileRole && (
                                <FormInput
                                    label={t('registration.spiritualName')}
                                    theme={theme}
                                    value={spiritualName}
                                    onChangeText={setSpiritualName}
                                    placeholder="e.g., Das Anu Das"
                                />
                            )}


                            {/* Date of Birth */}
                            <FormSelect
                                label={t('registration.dob')}
                                value={dob.toLocaleString()}
                                placeholder=""
                                theme={theme}
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
                                onCancel={() => {
                                    setOpenDatePicker(false);
                                }}
                            />

                            {/* Country */}
                            <FormSelect
                                label={t('registration.country')}
                                value={country}
                                placeholder={t('registration.selectCountry')}
                                theme={theme}
                                onPress={() => {
                                    if (loadingCountries) {
                                        Alert.alert('Loading', 'Please wait, countries are being loaded...');
                                        return;
                                    }
                                    if (countriesData.length === 0) {
                                        Alert.alert('Error', 'No countries available. Please check your internet connection.');
                                        fetchCountries(); // Retry
                                        return;
                                    }
                                    setShowCountryPicker(!showCountryPicker);
                                }}
                                loading={loadingCountries}
                                loadingText={t('registration.loadingCountries')}
                            />

                            {/* Auto-detect Location Button */}
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

                            {showCountryPicker && countriesData.length > 0 && (
                                <PickerContainer theme={theme}>
                                    {countriesData.map((c: any) => (
                                        <PickerItem
                                            key={c.name.common}
                                            label={c.name.common}
                                            theme={theme}
                                            onPress={() => handleCountrySelect(c)}
                                        />
                                    ))}
                                </PickerContainer>
                            )}
                            {showCountryPicker && countriesData.length === 0 && !loadingCountries && (
                                <PickerContainer theme={theme}>
                                    <Text style={{ color: theme.subText, padding: 12 }}>No countries available. Tap to retry.</Text>
                                </PickerContainer>
                            )}

                            {/* City */}
                            <Text style={[styles.label, { color: theme.text }]}>{t('registration.city')}</Text>
                            {!cityInputMode ? (
                                <>
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity
                                            style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                                            onPress={() => {
                                                if (country) {
                                                    setShowCityPicker(!showCityPicker);
                                                } else {
                                                    Alert.alert('Select Country First', 'Please select a country before choosing a city.');
                                                }
                                            }}
                                            disabled={!country}
                                        >
                                            <Text style={{ color: city ? theme.inputText : theme.subText }}>{city || (country ? t('registration.selectCity') : t('registration.selectCountry'))}</Text>
                                        </TouchableOpacity>
                                        {country && (
                                            <TouchableOpacity
                                                style={[styles.input, { width: 50, backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center', alignItems: 'center' }]}
                                                onPress={() => setCityInputMode(true)}
                                            >
                                                <Text style={{ color: roleColors.accent, fontSize: 18 }}>✎</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {showCityPicker && citiesData.length > 0 && (
                                        <PickerContainer theme={theme}>
                                            <PickerItem
                                                label="Clear"
                                                theme={theme}
                                                onPress={() => { setCity(''); setShowCityPicker(false); }}
                                            />
                                            {citiesData.map((cityName: string) => (
                                                <PickerItem
                                                    key={cityName}
                                                    label={cityName}
                                                    theme={theme}
                                                    onPress={() => { setCity(cityName); setShowCityPicker(false); }}
                                                />
                                            ))}
                                        </PickerContainer>
                                    )}
                                    {showCityPicker && citiesData.length === 0 && country && (
                                        <PickerContainer theme={theme}>
                                            <Text style={{ color: theme.subText, padding: 12 }}>Loading cities...</Text>
                                        </PickerContainer>
                                    )}
                                </>
                            ) : (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                                        value={city}
                                        onChangeText={setCity}
                                        placeholder="Enter City Name"
                                        placeholderTextColor={theme.subText}
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={[styles.input, { width: 50, backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center', alignItems: 'center' }]}
                                        onPress={() => setCityInputMode(false)}
                                    >
                                        <Text style={{ color: theme.accent, fontSize: 18 }}>✓</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {!isLiteProfileRole && (
                                <>
                                    {/* Madh */}
                                    <FormSelect
                                        label={t('registration.madh')}
                                        value={madh}
                                        placeholder="Select Tradition"
                                        theme={theme}
                                        onPress={() => setShowMadhPicker(!showMadhPicker)}
                                    />
                                    {showMadhPicker && (
                                        <PickerContainer theme={theme}>
                                            <PickerItem label="None" theme={theme} onPress={() => { setMadh(''); setShowMadhPicker(false); }} />
                                            {DATING_TRADITIONS.map((m) => (
                                                <PickerItem key={m} label={m} theme={theme} onPress={() => { setMadh(m); setShowMadhPicker(false); }} />
                                            ))}
                                        </PickerContainer>
                                    )}
                                </>
                            )}

                            {!isLiteProfileRole && (
                                <FormInput
                                    label={t('registration.mentor')}
                                    theme={theme}
                                    value={mentor}
                                    onChangeText={setMentor}
                                    placeholder="Current Shiksha/Diksha Guru"
                                />
                            )}

                            {!isLiteProfileRole && (
                                <RadioGroup
                                    label={t('registration.identity')}
                                    options={IDENTITY_OPTIONS}
                                    value={identity}
                                    onChange={setIdentity}
                                    theme={theme}
                                    layout="row"
                                />
                            )}

                            {!isLiteProfileRole && (
                                <>
                                    {/* Yoga Style */}
                                    <FormSelect
                                        label="Yoga Style"
                                        value={yogaStyle}
                                        placeholder="Select Yoga Style"
                                        theme={theme}
                                        onPress={() => setShowYogaPicker(!showYogaPicker)}
                                    />
                                    {showYogaPicker && (
                                        <PickerContainer theme={theme}>
                                            {YOGA_STYLES.map((y) => (
                                                <PickerItem key={y} label={y} theme={theme} onPress={() => { setYogaStyle(y); setShowYogaPicker(false); }} />
                                            ))}
                                        </PickerContainer>
                                    )}
                                </>
                            )}

                            {!isLiteProfileRole && (
                                <>
                                    <FormSelect
                                        label="Mode of Nature (Guna)"
                                        value={guna}
                                        placeholder="Select Guna"
                                        theme={theme}
                                        onPress={() => setShowGunaPicker(!showGunaPicker)}
                                    />
                                    {showGunaPicker && (
                                        <PickerContainer theme={theme}>
                                            {GUNAS.map((g) => (
                                                <PickerItem key={g} label={g} theme={theme} onPress={() => { setGuna(g); setShowGunaPicker(false); }} />
                                            ))}
                                        </PickerContainer>
                                    )}
                                </>
                            )}

                            {!isSeekerRole && (
                                <RadioGroup
                                    label={t('registration.diet')}
                                    options={DIET_OPTIONS}
                                    value={diet}
                                    onChange={setDiet}
                                    theme={theme}
                                    layout="row"
                                />
                            )}
                        </>
                    )}

                    {/* Terms */}
                    <View style={styles.checkboxContainer}>
                        <Switch
                            value={agreement}
                            onValueChange={setAgreement}
                            trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#FFB74D' }}
                            thumbColor={agreement ? '#fff' : '#f4f3f4'}
                        />
                        <Text style={[styles.checkboxLabel, { color: '#F8FAFC' }]}>
                            {t('registration.agreement')}
                        </Text>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[roleTheme.accent, roleTheme.accentStrong]}
                            style={[styles.submitButton, { opacity: loading ? 0.7 : 1 }]}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>{phase === 'initial' ? 'Next' : (phase === 'profile' ? 'Update Profile' : t('registration.submit'))}</Text>}
                        </LinearGradient>
                    </TouchableOpacity>

                    {phase === 'initial' && (
                        <TouchableOpacity
                            style={{ marginTop: 24, alignItems: 'center' }}
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={{ color: 'rgba(248,250,252,0.7)' }}>
                                Already have an account? <Text style={{ color: roleColors.accent, fontWeight: 'bold' }}>Login</Text>
                            </Text>
                        </TouchableOpacity>
                    )}

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
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 44,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
    },
    backText: {
        fontSize: 16,
        fontWeight: '500',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    skipButton: {
        padding: 8,
    },
    skipText: {
        fontSize: 15,
        fontWeight: '700',
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    logoHeaderContainer: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 10,
    },
    logoWrapper: {
        width: 84,
        height: 84,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 42,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    logoImage: {
        width: 50,
        height: 50,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        marginTop: 16,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    helperText: {
        fontSize: 12,
        color: 'rgba(248,250,252,0.6)',
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
    input: {
        borderWidth: 1.5,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        height: 54,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.15)',
        color: '#F8FAFC',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    checkboxLabel: {
        flex: 1,
        marginLeft: 12,
        fontSize: 13,
        lineHeight: 18,
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
});

export default RegistrationScreen;
