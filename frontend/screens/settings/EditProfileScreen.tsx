import React, { useState, useEffect } from 'react';
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
    SafeAreaView,
    TextInput,
    Switch
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { API_PATH } from '../../config/api.config';
import { COLORS } from '../../components/chat/ChatConstants';
import { useUser } from '../../context/UserContext';
import { useLocation } from '../../hooks/useLocation';
import {
    DATING_TRADITIONS,
    YOGA_STYLES,
    GUNAS,
    IDENTITY_OPTIONS
} from '../../constants/DatingConstants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const GENDER_OPTIONS = ['Male', 'Female'];
const DIET_OPTIONS = ['Vegan', 'Vegetarian', 'Prasad'];

export const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user, login } = useUser();
    const { countriesData, fetchCountries, fetchCities } = useLocation();

    const isDarkMode = Platform.OS === 'ios' ? true : false;
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

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
    const [maritalStatus, setMaritalStatus] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [datingEnabled, setDatingEnabled] = useState(false);

    const [showCountryPicker, setShowCountryPicker] = useState(false);
    // const [showCityPicker, setShowCityPicker] = useState(false);
    const [showMadhPicker, setShowMadhPicker] = useState(false);
    const [showYogaPicker, setShowYogaPicker] = useState(false);
    const [showGunaPicker, setShowGunaPicker] = useState(false);
    const [showIdentityPicker, setShowIdentityPicker] = useState(false);
    const [showDietPicker, setShowDietPicker] = useState(false);
    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [openDatePicker, setOpenDatePicker] = useState(false);
    // const [openTimePicker, setOpenTimePicker] = useState(false);

    const [expandedSections, setExpandedSections] = useState({
        avatar: true,
        location: false,
        personal: false,
        spiritual: false,
        yoga: false,
        dating: false
    });

    useEffect(() => {
        loadProfile();
        fetchCountries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchCountries]);

    const loadProfile = React.useCallback(async () => {
        if (!user?.ID) return;

        try {
            setLoading(true);
            const response = await axios.get(`${API_PATH}/contacts`);
            const userData = response.data.find((u: any) => u.ID === user.ID);

            if (userData) {
                setCountry(userData.country || '');
                setCity(userData.city || '');
                setKarmicName(userData.karmicName || '');
                setSpiritualName(userData.spiritualName || '');
                setMentor(userData.mentor || '');
                setGender(userData.gender || GENDER_OPTIONS[0]);
                setIdentity(userData.identity || IDENTITY_OPTIONS[0]);
                setYogaStyle(userData.yogaStyle || '');
                setGuna(userData.guna || '');
                setDiet(userData.diet || DIET_OPTIONS[2]);
                setBio(userData.bio || '');
                setInterests(userData.interests || '');
                setLookingFor(userData.lookingFor || '');
                setMaritalStatus(userData.maritalStatus || '');
                setBirthTime(userData.birthTime || '');
                setDatingEnabled(userData.datingEnabled || false);

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
            console.error('[EditProfile] Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.ID, fetchCities]);

    const handleSave = async () => {
        if (!user?.ID) return;

        setSaving(true);
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
                maritalStatus,
                birthTime,
                datingEnabled
            };

            const response = await axios.put(`${API_PATH}/update-profile/${user.ID}`, profileData);
            const updatedUser = response.data.user;

            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            await login(updatedUser);

            Alert.alert(
                t('common.success'),
                t('profile.updateSuccess') || 'Profile updated successfully!',
                [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            console.error('[EditProfile] Error saving:', error);
            Alert.alert(
                t('common.error'),
                error.response?.data?.error || 'Failed to update profile'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleCountrySelect = async (cData: any) => {
        setCountry(cData.name.common);
        setShowCountryPicker(false);
        await fetchCities(cData.name.common);
    };

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const SectionHeader = ({ title, sectionKey, isOpen }: { title: string, sectionKey: keyof typeof expandedSections, isOpen: boolean }) => (
        <TouchableOpacity
            style={[styles.sectionHeader, { borderBottomColor: theme.borderColor, backgroundColor: isOpen ? theme.inputBackground + '40' : 'transparent' }]}
            onPress={() => toggleSection(sectionKey)}
        >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
            <Text style={{ color: theme.text }}>{isOpen ? '▼' : '▶'}</Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={[styles.backText, { color: theme.text }]}>← {t('profile.editProfile') || 'Edit Profile'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {/* Avatar Section */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: theme.borderColor }]}>
                    <SectionHeader title={t('profile.avatar') || 'Avatar'} sectionKey="avatar" isOpen={expandedSections.avatar} />
                    {expandedSections.avatar && (
                        <View style={[styles.sectionContent, styles.avatarContainer]}>
                            <TouchableOpacity
                                style={[styles.avatarButton, { borderColor: theme.borderColor }]}
                                onPress={() => {
                                    // TODO: Implement avatar picker
                                    Alert.alert(t('common.info') || 'Info', 'Avatar upload coming soon');
                                }}
                            >
                                <Text style={{ color: theme.button, fontWeight: '600' }}>
                                    {t('profile.changeAvatar') || 'Change Avatar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Location Section */}
                <View style={styles.section}>
                    <SectionHeader title={t('registration.country') || 'Location'} sectionKey="location" isOpen={expandedSections.location} />
                    {expandedSections.location && (
                        <View style={styles.sectionContent}>
                            <Text style={[styles.label, { color: theme.text }]}>{t('registration.country')}</Text>
                            <TouchableOpacity
                                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setShowCountryPicker(!showCountryPicker)}
                            >
                                <Text style={{ color: country ? theme.inputText : theme.subText }}>
                                    {country || t('registration.selectCountry')}
                                </Text>
                            </TouchableOpacity>

                            {showCountryPicker && countriesData.length > 0 && (
                                <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                                    <ScrollView style={{ maxHeight: 200 }}>
                                        {countriesData.map((c: any) => (
                                            <TouchableOpacity
                                                key={c.name.common}
                                                style={[styles.pickerItem, { borderBottomColor: theme.borderColor }]}
                                                onPress={() => handleCountrySelect(c)}
                                            >
                                                <Text style={{ color: theme.inputText }}>{c.name.common}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <Text style={[styles.label, { color: theme.text }]}>{t('registration.city')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                                value={city}
                                onChangeText={setCity}
                                placeholder={t('registration.selectCity')}
                                placeholderTextColor={theme.subText}
                            />
                        </View>
                    )}
                </View>

                {/* Personal Data Section */}
                <View style={styles.section}>
                    <SectionHeader title={t('profile.personalInfo') || 'Personal Info'} sectionKey="personal" isOpen={expandedSections.personal} />
                    {expandedSections.personal && (
                        <View style={styles.sectionContent}>
                            <Text style={[styles.label, { color: theme.text }]}>{t('registration.karmicName')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                                value={karmicName}
                                onChangeText={setKarmicName}
                                placeholder={t('registration.karmicName')}
                                placeholderTextColor={theme.subText}
                            />

                            <Text style={[styles.label, { color: theme.text }]}>{t('registration.spiritualName')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                                value={spiritualName}
                                onChangeText={setSpiritualName}
                                placeholder={t('registration.spiritualName')}
                                placeholderTextColor={theme.subText}
                            />

                            <Text style={[styles.label, { color: theme.text }]}>{t('registration.gender')}</Text>
                            <TouchableOpacity
                                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setShowGenderPicker(!showGenderPicker)}
                            >
                                <Text style={{ color: theme.inputText }}>{gender}</Text>
                            </TouchableOpacity>

                            {showGenderPicker && (
                                <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                                    {GENDER_OPTIONS.map(g => (
                                        <TouchableOpacity
                                            key={g}
                                            style={[styles.pickerItem, { borderBottomColor: theme.borderColor }]}
                                            onPress={() => { setGender(g); setShowGenderPicker(false); }}
                                        >
                                            <Text style={{ color: theme.inputText }}>{g}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            <Text style={[styles.label, { color: theme.text }]}>{t('registration.dob')}</Text>
                            <TouchableOpacity
                                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setOpenDatePicker(true)}
                            >
                                <Text style={{ color: theme.inputText }}>{dob.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Spiritual Info Section */}
                <View style={styles.section}>
                    <SectionHeader title={t('profile.spiritualInfo') || 'Spiritual Info'} sectionKey="spiritual" isOpen={expandedSections.spiritual} />
                    {expandedSections.spiritual && (
                        <View style={styles.sectionContent}>
                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.madh') || 'Madh'}</Text>
                            <TouchableOpacity
                                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setShowMadhPicker(!showMadhPicker)}
                            >
                                <Text style={{ color: madh ? theme.inputText : theme.subText }}>
                                    {madh || t('dating.selectTradition')}
                                </Text>
                            </TouchableOpacity>

                            {showMadhPicker && (
                                <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                                    <ScrollView style={{ maxHeight: 200 }}>
                                        {DATING_TRADITIONS.map(m => (
                                            <TouchableOpacity
                                                key={m}
                                                style={[styles.pickerItem, { borderBottomColor: theme.borderColor }]}
                                                onPress={() => { setMadh(m); setShowMadhPicker(false); }}
                                            >
                                                <Text style={{ color: theme.inputText }}>{m}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <Text style={[styles.label, { color: theme.text }]}>{t('registration.mentor')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                                value={mentor}
                                onChangeText={setMentor}
                                placeholder={t('registration.mentor')}
                                placeholderTextColor={theme.subText}
                            />

                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.identity')}</Text>
                            <TouchableOpacity
                                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setShowIdentityPicker(!showIdentityPicker)}
                            >
                                <Text style={{ color: theme.inputText }}>{identity}</Text>
                            </TouchableOpacity>

                            {showIdentityPicker && (
                                <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                                    {IDENTITY_OPTIONS.map(i => (
                                        <TouchableOpacity
                                            key={i}
                                            style={[styles.pickerItem, { borderBottomColor: theme.borderColor }]}
                                            onPress={() => { setIdentity(i); setShowIdentityPicker(false); }}
                                        >
                                            <Text style={{ color: theme.inputText }}>{i}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Yoga & Practice Section */}
                <View style={styles.section}>
                    <SectionHeader title={t('profile.yogaPractice') || 'Yoga & Practice'} sectionKey="yoga" isOpen={expandedSections.yoga} />
                    {expandedSections.yoga && (
                        <View style={styles.sectionContent}>
                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.yogaStyle')}</Text>
                            <TouchableOpacity
                                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setShowYogaPicker(!showYogaPicker)}
                            >
                                <Text style={{ color: yogaStyle ? theme.inputText : theme.subText }}>
                                    {yogaStyle || t('dating.selectStyle')}
                                </Text>
                            </TouchableOpacity>

                            {showYogaPicker && (
                                <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                                    <ScrollView style={{ maxHeight: 200 }}>
                                        {YOGA_STYLES.map(y => (
                                            <TouchableOpacity
                                                key={y}
                                                style={[styles.pickerItem, { borderBottomColor: theme.borderColor }]}
                                                onPress={() => { setYogaStyle(y); setShowYogaPicker(false); }}
                                            >
                                                <Text style={{ color: theme.inputText }}>{y}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.guna')}</Text>
                            <TouchableOpacity
                                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setShowGunaPicker(!showGunaPicker)}
                            >
                                <Text style={{ color: guna ? theme.inputText : theme.subText }}>
                                    {guna || t('dating.selectGuna')}
                                </Text>
                            </TouchableOpacity>

                            {showGunaPicker && (
                                <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                                    {GUNAS.map(g => (
                                        <TouchableOpacity
                                            key={g}
                                            style={[styles.pickerItem, { borderBottomColor: theme.borderColor }]}
                                            onPress={() => { setGuna(g); setShowGunaPicker(false); }}
                                        >
                                            <Text style={{ color: theme.inputText }}>{g}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.diet')}</Text>
                            <TouchableOpacity
                                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setShowDietPicker(!showDietPicker)}
                            >
                                <Text style={{ color: theme.inputText }}>{diet}</Text>
                            </TouchableOpacity>

                            {showDietPicker && (
                                <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                                    {DIET_OPTIONS.map(d => (
                                        <TouchableOpacity
                                            key={d}
                                            style={[styles.pickerItem, { borderBottomColor: theme.borderColor }]}
                                            onPress={() => { setDiet(d); setShowDietPicker(false); }}
                                        >
                                            <Text style={{ color: theme.inputText }}>{d}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Dating Profile Section */}
                <View style={styles.section}>
                    <SectionHeader title={t('dating.profile') || 'Dating Profile'} sectionKey="dating" isOpen={expandedSections.dating} />
                    {expandedSections.dating && (
                        <View style={styles.sectionContent}>
                            <View style={styles.switchContainer}>
                                <Text style={[styles.label, { color: theme.text }]}>{t('dating.enableProfile') || 'Enable Dating Profile'}</Text>
                                <Switch
                                    value={datingEnabled}
                                    onValueChange={setDatingEnabled}
                                    trackColor={{ false: theme.inputBackground, true: theme.button }}
                                    thumbColor={datingEnabled ? '#fff' : '#f4f3f4'}
                                />
                            </View>

                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.bio')}</Text>
                            <TextInput
                                style={[styles.textArea, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder={t('dating.bioPlaceholder')}
                                placeholderTextColor={theme.subText}
                                multiline
                                numberOfLines={4}
                            />

                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.interests')}</Text>
                            <TextInput
                                style={[styles.textArea, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                                value={interests}
                                onChangeText={setInterests}
                                placeholder={t('dating.interestsPlaceholder')}
                                placeholderTextColor={theme.subText}
                                multiline
                            />

                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.lookingFor')}</Text>
                            <TextInput
                                style={[styles.textArea, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                                value={lookingFor}
                                onChangeText={setLookingFor}
                                placeholder={t('dating.lookingForPlaceholder')}
                                placeholderTextColor={theme.subText}
                                multiline
                            />

                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.maritalStatus')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                                value={maritalStatus}
                                onChangeText={setMaritalStatus}
                                placeholder={t('dating.maritalStatus')}
                                placeholderTextColor={theme.subText}
                            />

                            <Text style={[styles.label, { color: theme.text }]}>{t('dating.birthTime')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                                value={birthTime}
                                onChangeText={setBirthTime}
                                placeholder="HH:MM"
                                placeholderTextColor={theme.subText}
                            />
                        </View>
                    )}
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.button, opacity: saving ? 0.7 : 1, marginBottom: 30 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <DatePicker
                modal
                open={openDatePicker}
                date={dob}
                mode="date"
                onConfirm={(date) => { setDob(date); setOpenDatePicker(false); }}
                onCancel={() => setOpenDatePicker(false)}
                maximumDate={new Date()}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        height: Platform.OS === 'android' ? 60 + (StatusBar.currentHeight || 0) : 80,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 20,
    },
    backButton: { padding: 8 },
    backText: { fontSize: 18, fontWeight: 'bold' },
    content: { flex: 1 },
    section: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    sectionContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        height: 50,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        borderWidth: 1,
        borderRadius: 8,
        marginTop: 8,
        maxHeight: 200,
    },
    pickerItem: {
        padding: 12,
        borderBottomWidth: 0.5,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    saveButton: {
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    avatarContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    avatarButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 2,
    },
});
