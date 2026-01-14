import React, { useState } from 'react';
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
    TextInput
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Custom Components & Hooks
import { useLocation } from '../hooks/useLocation';
import { FormInput } from '../components/registration/FormInput';
import { FormSelect } from '../components/registration/FormSelect';
import { PickerContainer } from '../components/registration/PickerContainer';
import { PickerItem } from '../components/registration/PickerItem';
import { AvatarUploader } from '../components/registration/AvatarUploader';
import { RadioGroup } from '../components/registration/RadioGroup';

const DIET_OPTIONS = ['Vegan', 'Vegetarian', 'Prasad'];
const GENDER_OPTIONS = ['Male', 'Female'];

type Props = NativeStackScreenProps<RootStackParamList, 'Registration'>;

const RegistrationScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { login } = useUser();
    const { isDarkMode, phase = 'initial' } = route.params;
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const [avatar, setAvatar] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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

    // Location Hook
    const {
        countriesData,
        citiesData,
        loadingCountries,
        fetchCountries,
        fetchCities,
        setCitiesData,
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

    const handleCountrySelect = async (cData: any) => {
        setCountry(cData.name.common);
        // Autofill city with capital if available
        if (cData.capital && cData.capital.length > 0) {
            setCity(cData.capital[0]);
        }
        setShowCountryPicker(false);
        // Fetch cities for selected country
        await fetchCities(cData.name.common);
    };

    const handleAutoDetect = async () => {
        setDetectingLocation(true);
        try {
            const detected = await autoDetectLocation();
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
            Alert.alert(
                t('common.error'),
                t('registration.locationDetectionFailed'),
                [{ text: t('common.ok') }]
            );
        } finally {
            setDetectingLocation(false);
        }
    };

    const handleSubmit = async () => {
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
                Alert.alert(t('registration.required'), t('registration.karmicNameRequired'));
                return;
            }
        }

        if (!agreement && phase === 'initial') {
            Alert.alert(t('registration.required'), t('registration.agreementRequired'));
            return;
        }

        setLoading(true);

        try {
            if (phase === 'initial') {
                // Phase 1: Registration
                const response = await axios.post(`${API_PATH}/register`, {
                    email,
                    password,
                });
                const user = response.data.user;
                const token = response.data.token;

                await AsyncStorage.setItem('user', JSON.stringify(user));
                if (token) {
                    await AsyncStorage.setItem('token', token);
                }

                // Move to phase 2
                navigation.setParams({ phase: 'profile' });
            } else {
                // Phase 2: Profile Update
                const userStr = await AsyncStorage.getItem('user');
                const user = (userStr && userStr !== 'undefined' && userStr !== 'null') ? JSON.parse(userStr) : null;

                const profileData = {
                    country,
                    city,
                    karmicName,
                    spiritualName,
                    dob: dob.toISOString(),
                    madh,
                    mentor,
                    gender,
                    identity,
                    yogaStyle,
                    guna,
                    diet,
                };

                console.log('Sending profile data:', JSON.stringify(profileData, null, 2));
                const token = await AsyncStorage.getItem('token');
                const response = await axios.put(`${API_PATH}/update-profile`, profileData, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const updatedUser = response.data.user;

                // Upload avatar if selected
                if (avatar) {
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
                await login(updatedUser);
            }
        } catch (error: any) {
            console.error('Registration/Update error:', error);
            Alert.alert(
                'Error',
                error.response?.data?.error || 'Operation failed. Please try again.'
            );
        } finally {
            setLoading(false);
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
                        const userStr = await AsyncStorage.getItem('user');
                        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
                            await login(JSON.parse(userStr));
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity
                    onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')}
                    style={styles.backButton}
                >
                    <Text style={[styles.backText, { color: theme.text }]}>← {t('registration.back')}</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    {phase === 'initial' ? 'Sign Up' : t('registration.title')}
                </Text>
                {phase === 'profile' ? (
                    <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                        <Text style={[styles.skipText, { color: theme.accent }]}>Skip</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 60 }} />
                )}
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.logoHeaderContainer}>
                    <View style={styles.logoWrapper}>
                        <Image
                            source={require('../assets/logo_tilak.png')}
                            style={styles.logoImage}
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
                    </>
                ) : (
                    <>
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
                            label={t('registration.karmicName')}
                            theme={theme}
                            value={karmicName}
                            onChangeText={setKarmicName}
                            placeholder="e.g., Ivan Ivanov"
                        />

                        <FormInput
                            label={t('registration.spiritualName')}
                            theme={theme}
                            value={spiritualName}
                            onChangeText={setSpiritualName}
                            placeholder="e.g., Das Anu Das"
                        />


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
                            style={[
                                styles.autoDetectButton,
                                { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }
                            ]}
                            onPress={handleAutoDetect}
                            disabled={detectingLocation}
                        >
                            {detectingLocation ? (
                                <ActivityIndicator size="small" color={theme.button} />
                            ) : (
                                <Text style={[styles.autoDetectText, { color: theme.button }]}>
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
                                            <Text style={{ color: theme.accent, fontSize: 18 }}>✎</Text>
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

                        {/* Mentor */}
                        <FormInput
                            label={t('registration.mentor')}
                            theme={theme}
                            value={mentor}
                            onChangeText={setMentor}
                            placeholder="Current Shiksha/Diksha Guru"
                        />

                        {/* Identity */}
                        <RadioGroup
                            label={t('registration.identity')}
                            options={IDENTITY_OPTIONS}
                            value={identity}
                            onChange={setIdentity}
                            theme={theme}
                            layout="row"
                        />

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

                        {/* Guna */}
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

                        {/* Diet */}
                        <RadioGroup
                            label={t('registration.diet')}
                            options={DIET_OPTIONS}
                            value={diet}
                            onChange={setDiet}
                            theme={theme}
                            layout="row"
                        />
                    </>
                )}

                {/* Terms */}
                <View style={styles.checkboxContainer}>
                    <Switch
                        value={agreement}
                        onValueChange={setAgreement}
                        trackColor={{ false: '#767577', true: theme.accent }}
                        thumbColor={agreement ? theme.button : '#f4f3f4'}
                    />
                    <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                        {t('registration.agreement')}
                    </Text>
                </View>

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.button, opacity: loading ? 0.7 : 1 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.submitButtonText, { color: theme.buttonText }]}>{phase === 'initial' ? 'Next' : (phase === 'profile' ? 'Update Profile' : t('registration.submit'))}</Text>}
                </TouchableOpacity>

                {phase === 'initial' && (
                    <TouchableOpacity
                        style={{ marginTop: 20, alignItems: 'center' }}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={{ color: theme.subText }}>
                            Already have an account? <Text style={{ color: theme.accent, fontWeight: 'bold' }}>Login</Text>
                        </Text>
                    </TouchableOpacity>
                )}

            </ScrollView>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: Platform.OS === 'android' ? 60 + (StatusBar.currentHeight || 0) : 80,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 20,
    },
    backButton: {
        padding: 10,
    },
    backText: {
        fontSize: 16,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
    },
    skipButton: {
        padding: 10,
    },
    skipText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
        paddingBottom: 50,
    },
    logoHeaderContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoWrapper: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoImage: {
        width: 60,
        height: 60,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        marginTop: 12,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        height: 50,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    checkboxLabel: {
        flex: 1,
        marginLeft: 10,
    },
    submitButton: {
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    autoDetectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 10,
        marginBottom: 5,
        gap: 8,
    },
    autoDetectText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default RegistrationScreen;
