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
import axios from 'axios';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { datingService } from '../../../services/datingService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { DATING_TRADITIONS, YOGA_STYLES, GUNAS, IDENTITY_OPTIONS } from '../../../constants/DatingConstants';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'EditDatingProfile'>;

const INTENTION_OPTIONS = [
    { key: 'family', labelKey: 'dating.intentions.family' },
    { key: 'business', labelKey: 'dating.intentions.business' },
    { key: 'friendship', labelKey: 'dating.intentions.friendship' },
    { key: 'seva', labelKey: 'dating.intentions.seva' }
];

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
        intentions: [] as string[],
        skills: '',
        industry: '',
        lookingForBusiness: ''
    });

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
            const data = await datingService.getUsers();
            if (requestId !== latestFetchRequestRef.current || !isMountedRef.current) {
                return;
            }
            const me = data.find((u: any) => u.ID === userId);
            if (me) {
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
                    intentions: me.intentions ? me.intentions.split(',').map((i: string) => i.trim()) : [],
                    skills: me.skills || '',
                    industry: me.industry || '',
                    lookingForBusiness: me.lookingForBusiness || ''
                });
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

    const handleSaveProfile = async () => {
        if (saving) return;

        // Validation if dating is enabled
        if (profile.datingEnabled) {
            if (!profile.bio.trim() || !profile.interests.trim() || !profile.lookingFor.trim() ||
                !profile.maritalStatus.trim() || !profile.dob || !profile.birthTime || !profile.birthPlaceLink || !profile.city) {
                Alert.alert(t('common.info'), t('registration.requiredFieldsForDating') || 'Для активации профиля в Союзе необходимо заполнить все поля, включая город и астрологические данные.');
                return;
            }
        }

        const requestId = ++latestSaveRequestRef.current;
        setSaving(true);
        try {
            const profileData = {
                ...profile,
                intentions: profile.intentions.join(',')
            };
            const updatedUser = await datingService.updateProfile(userId, profileData);
            if (requestId !== latestSaveRequestRef.current || !isMountedRef.current) {
                return;
            }
            // Update user in context
            await login(updatedUser);
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

    const performCitySearch = async (query: string) => {
        const requestId = ++latestCitySearchRequestRef.current;
        setIsSearchingCities(true);
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
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
                timeout: 5000 // 5 seconds timeout
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
            setCitySuggestions([]);
            return;
        }

        // Set a new timeout (600ms debounce)
        citySearchTimeoutRef.current = setTimeout(() => {
            performCitySearch(query);
        }, 600);
    };

    const handleCitySelect = (item: any) => {
        if (citySearchType === 'current') {
            setProfile(prev => ({ ...prev, city: item.display_name }));
        } else {
            setProfile(prev => ({ ...prev, birthPlaceLink: item.display_name }));
        }
        setCitySearchModal(false);
        setCityQuery('');
        setCitySuggestions([]);
    };

    const toggleIntention = (key: string) => {
        setProfile(prev => {
            const hasKey = prev.intentions.includes(key);
            return {
                ...prev,
                intentions: hasKey ? prev.intentions.filter(i => i !== key) : [...prev.intentions, key],
            };
        });
    };

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
                        onPress={() => {
                            setCitySearchType('current');
                            setCityQuery(profile.city);
                            setCitySearchModal(true);
                        }}
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

                    {/* Networking Goals */}
                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.goals')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                        {INTENTION_OPTIONS.map((opt) => (
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
                        onPress={() => {
                            setCitySearchType('birth');
                            setCityQuery(profile.birthPlaceLink);
                            setCitySearchModal(true);
                        }}
                    >
                        <Text style={{ color: profile.birthPlaceLink ? theme.text : theme.subText }} numberOfLines={1}>
                            {profile.birthPlaceLink || t('dating.selectCity')}
                        </Text>
                    </TouchableOpacity>
                    
                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
            </KeyboardAwareContainer>

            {/* City Search Modal */}
            <Modal visible={citySearchModal} animationType="slide">
                <KeyboardAwareContainer style={{ flex: 1 }} useTopInset={false}>
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.borderColor }]}>
                        <TouchableOpacity onPress={() => setCitySearchModal(false)}>
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
