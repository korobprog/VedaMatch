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
    ImageBackground,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSettings as usePortalSettings } from '../../context/SettingsContext';
import DatePicker from 'react-native-date-picker';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { API_PATH } from '../../config/api.config';
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
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RoleSelectionSection } from '../../components/roles/RoleSelectionSection';
import { PortalRole } from '../../types/portalBlueprint';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { KeyboardAwareContainer } from '../../components/ui/KeyboardAwareContainer';

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
    const { t } = useTranslation();
    const { user, login } = useUser();
    const { fetchCountries, fetchCities } = useLocation();
    const { isDarkMode: isPortalDarkMode, portalBackground, portalBackgroundType } = usePortalSettings();

    const isDarkMode = true; // Edit Profile always uses dark glass aesthetic
    const theme = COLORS.dark;
    // const isDarkMode = isPortalDarkMode;
    // const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // const [avatar, setAvatar] = useState<any>(null); // TODO: Implement avatar picker
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

    useEffect(() => {
        loadProfile();
        fetchCountries();
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

    const loadProfile = React.useCallback(async () => {
        if (!user?.ID) return;
        const requestId = ++latestLoadRequestRef.current;

        try {
            if (isMountedRef.current) {
                setLoading(true);
            }
            const token = await AsyncStorage.getItem('token');
            const response = await axios.get(`${API_PATH}/contacts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            const userData = response.data.find((u: any) => u.ID === user.ID);

            if (userData) {
                setCountry(userData.country || '');
                setCity(userData.city || '');
                setKarmicName(userData.karmicName || '');
                setSpiritualName(userData.spiritualName || '');
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
            console.error('[EditProfile] Error loading profile:', error);
        } finally {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [user?.ID, fetchCities]);

    const handleSave = async () => {
        if (!user?.ID || saving) return;

        const requestId = ++latestSaveRequestRef.current;
        if (isMountedRef.current) {
            setSaving(true);
        }
        try {
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
                bio,
                interests,
                lookingFor,
                intentions: intentions.join(','),
                skills,
                industry,
                lookingForBusiness,
                maritalStatus,
                birthTime,
                yatra,
                timezone,
                datingEnabled,
                role,
                godModeEnabled,
                latitude,
                longitude
            };

            const token = await AsyncStorage.getItem('token');
            const response = await axios.put(`${API_PATH}/update-profile`, profileData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (requestId !== latestSaveRequestRef.current || !isMountedRef.current) {
                return;
            }
            const updatedUser = response.data.user;

            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            await login(updatedUser);
            if (requestId !== latestSaveRequestRef.current || !isMountedRef.current) {
                return;
            }

            Alert.alert(
                t('common.success'),
                t('profile.updateSuccess') || 'Profile updated successfully!',
                [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            if (requestId === latestSaveRequestRef.current && isMountedRef.current) {
                console.error('[EditProfile] Error saving:', error);
                Alert.alert(
                    t('common.error'),
                    error.response?.data?.error || 'Failed to update profile'
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
                    console.error('[EditProfile] City search error:', error);
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
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {portalBackgroundType === 'image' && portalBackground && (
                    <ImageBackground source={{ uri: portalBackground }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                )}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: roleColors.overlay, justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={roleColors.accent} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {portalBackgroundType === 'image' && portalBackground && (
                <ImageBackground source={{ uri: portalBackground }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: roleColors.overlay }]}>
                <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

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

                <RoleSelectionSection
                    selectedRole={role}
                    onSelectRole={setRole}
                    autoOpenHint={!user?.isProfileComplete}
                />

                <KeyboardAwareContainer style={styles.content}>
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >


                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>{t('settings.proMode')}</Text>
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

                    {/* Enable Toggle */}
                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>
                                {t('dating.enableProfile') || 'Enable Union Profile'}
                            </Text>
                            <Text style={styles.helperText}>Видимость вашего профиля в Союзе</Text>
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
                                    💡 {t('profile.photoTip') || 'Загружайте свои лучшие фотографии в галерею, чтобы другие пользователи могли просматривать их в слайд-шоу.'}
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

                        <Text style={styles.label}>{t('dating.madh') || 'Tradition (Madh)'}</Text>
                        <TouchableOpacity
                            style={[styles.input, { justifyContent: 'center' }]}
                            onPress={() => setShowMadhPicker(true)}
                        >
                            <Text style={{ color: madh ? roleColors.textPrimary : roleColors.textSecondary, fontSize: 16 }}>
                                {madh || t('dating.selectTradition')}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.label}>{t('dating.yogaStyle') || 'Yoga Style'}</Text>
                        <TouchableOpacity
                            style={[styles.input, { justifyContent: 'center' }]}
                            onPress={() => setShowYogaPicker(true)}
                        >
                            <Text style={{ color: yogaStyle ? roleColors.textPrimary : roleColors.textSecondary, fontSize: 16 }}>
                                {yogaStyle || t('dating.selectStyle')}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.label}>{t('dating.guna') || 'Mode of Nature (Guna)'}</Text>
                        <TouchableOpacity
                            style={[styles.input, { justifyContent: 'center' }]}
                            onPress={() => setShowGunaPicker(true)}
                        >
                            <Text style={{ color: guna ? roleColors.textPrimary : roleColors.textSecondary, fontSize: 16 }}>
                                {guna || t('dating.selectGuna')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Extra Space */}
                    <View style={{ height: 40 }} />
                </ScrollView>
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
        flex: 1,
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
    helperText: {
        fontSize: 12,
        color: 'rgba(248,250,252,0.6)',
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
