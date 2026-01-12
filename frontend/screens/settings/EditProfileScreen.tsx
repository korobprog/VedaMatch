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
    Switch,
    Modal
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
const INTENTION_OPTIONS = [
    { key: 'family', label: 'Family/Marriage' },
    { key: 'business', label: 'Business/Work' },
    { key: 'friendship', label: 'Friendship' },
    { key: 'seva', label: 'Seva/Service' }
];

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
    const [intentions, setIntentions] = useState<string[]>([]); // Array of selected intentions
    const [skills, setSkills] = useState('');
    const [industry, setIndustry] = useState('');
    const [lookingForBusiness, setLookingForBusiness] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [yatra, setYatra] = useState('');
    const [timezone, setTimezone] = useState('');
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
                setMaritalStatus(userData.maritalStatus || '');
                setBirthTime(userData.birthTime || '');
                setYatra(userData.yatra || '');
                setTimezone(userData.timezone || '');
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
                intentions: intentions.join(','),
                skills,
                industry,
                lookingForBusiness,
                maritalStatus,
                birthTime,
                yatra,
                timezone,
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

    const toggleIntention = (key: string) => {
        if (intentions.includes(key)) {
            setIntentions(intentions.filter(i => i !== key));
        } else {
            setIntentions([...intentions, key]);
        }
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

            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Text style={styles.headerButtonText}>{t('common.cancel') || 'Cancel'}</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile.datingProfile') || 'Dating Profile'}</Text>
                <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                        <Text style={[styles.headerButtonText, { fontWeight: 'bold' }]}>{t('common.save') || 'Save'}</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Enable Toggle */}
                <View style={styles.switchContainer}>
                    <Text style={[styles.label, { marginTop: 0, color: theme.text }]}>
                        {t('dating.enableProfile') || 'Enable Dating Profile'}
                    </Text>
                    <Switch
                        value={datingEnabled}
                        onValueChange={setDatingEnabled}
                        trackColor={{ false: theme.inputBackground, true: '#00897B' }}
                        thumbColor={datingEnabled ? '#fff' : '#f4f3f4'}
                    />
                </View>

                {/* Tip Box */}
                <View style={styles.tipBox}>
                    <Text style={styles.tipText}>
                        💡 {t('profile.photoTip') || 'Загружайте свои лучшие фотографии в галерею, чтобы другие пользователи могли просматривать их в слайд-шоу.'}
                    </Text>
                </View>

                {/* Manage Photos Button */}
                <TouchableOpacity
                    style={styles.managePhotosBtn}
                    onPress={() => user?.ID && navigation.navigate('MediaLibrary', { userId: user.ID })}
                >
                    <Text style={styles.managePhotosText}>📸 Manage Photos / Add New</Text>
                </TouchableOpacity>

                {/* Main Profile Fields */}
                <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.text }]}>{t('registration.city') || 'Current City'}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                        value={city}
                        onChangeText={setCity}
                        placeholder={t('registration.selectCity')}
                        placeholderTextColor={theme.subText}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>Yatra (Community)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                        value={yatra}
                        onChangeText={setYatra}
                        placeholder="e.g. New Vrindavan"
                        placeholderTextColor={theme.subText}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>Timezone</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                        value={timezone}
                        onChangeText={setTimezone}
                        placeholder="e.g. Europe/London"
                        placeholderTextColor={theme.subText}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.bio') || 'About Me (Bio)'}</Text>
                    <TextInput
                        style={[styles.textArea, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                        value={bio}
                        onChangeText={setBio}
                        placeholder={t('dating.bioPlaceholder')}
                        placeholderTextColor={theme.subText}
                        multiline
                        numberOfLines={4}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.interests') || 'Interests'}</Text>
                    <TextInput
                        style={[styles.textArea, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor, minHeight: 80 }]}
                        value={interests}
                        onChangeText={setInterests}
                        placeholder="Yoga, kirtan, cooking..."
                        placeholderTextColor={theme.subText}
                        multiline
                    />

                    {/* Intentions / Goals */}
                    <Text style={[styles.label, { color: theme.text }]}>My Goals (Networking)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                        {INTENTION_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[
                                    styles.chip,
                                    {
                                        backgroundColor: intentions.includes(opt.key) ? '#8D6E63' : theme.inputBackground,
                                        borderColor: theme.borderColor
                                    }
                                ]}
                                onPress={() => toggleIntention(opt.key)}
                            >
                                <Text style={{ color: intentions.includes(opt.key) ? '#fff' : theme.text, fontWeight: '500' }}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Business Section (Conditional) */}
                    {intentions.includes('business') && (
                        <View style={{ marginBottom: 15, padding: 15, backgroundColor: 'rgba(141, 110, 99, 0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(141, 110, 99, 0.2)' }}>
                            <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 5, color: '#8D6E63' }]}>Business Profile</Text>

                            <Text style={[styles.label, { color: theme.text, marginTop: 10 }]}>Skills</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#fff', color: theme.inputText, borderColor: theme.borderColor }]}
                                value={skills}
                                onChangeText={setSkills}
                                placeholder="Go, React, Management..."
                                placeholderTextColor={theme.subText}
                            />

                            <Text style={[styles.label, { color: theme.text }]}>Industry</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#fff', color: theme.inputText, borderColor: theme.borderColor }]}
                                value={industry}
                                onChangeText={setIndustry}
                                placeholder="IT, Wellness, Art..."
                                placeholderTextColor={theme.subText}
                            />
                        </View>
                    )}

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.madh') || 'Tradition (Madh)'}</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setShowMadhPicker(true)}
                    >
                        <Text style={{ color: madh ? theme.inputText : theme.subText }}>
                            {madh || t('dating.selectTradition')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.yogaStyle') || 'Yoga Style'}</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setShowYogaPicker(true)}
                    >
                        <Text style={{ color: yogaStyle ? theme.inputText : theme.subText }}>
                            {yogaStyle || t('dating.selectStyle')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>{t('dating.guna') || 'Mode of Nature (Guna)'}</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setShowGunaPicker(true)}
                    >
                        <Text style={{ color: guna ? theme.inputText : theme.subText }}>
                            {guna || t('dating.selectGuna')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Extra Space */}
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Pickers */}
            {showMadhPicker && (
                <Modal transparent animationType="fade">
                    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowMadhPicker(false)}>
                        <View style={[styles.pickerContainer, { width: '80%', maxHeight: '60%' }]}>
                            <ScrollView>
                                {DATING_TRADITIONS.map(m => (
                                    <TouchableOpacity key={m} style={styles.pickerItem} onPress={() => { setMadh(m); setShowMadhPicker(false); }}>
                                        <Text style={{ color: '#333', fontSize: 16 }}>{m}</Text>
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
                                        <Text style={{ color: '#333', fontSize: 16 }}>{y}</Text>
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
                                        <Text style={{ color: '#333', fontSize: 16 }}>{g}</Text>
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F0' },
    header: {
        height: Platform.OS === 'android' ? 60 + (StatusBar.currentHeight || 0) : 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 40,
    },
    headerButton: { padding: 8 },
    headerButtonText: { fontSize: 17, color: '#8D6E63', fontWeight: '600' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#212121' },
    content: { flex: 1, paddingHorizontal: 16 },
    tipBox: {
        backgroundColor: '#F0F0E8',
        padding: 15,
        borderRadius: 12,
        marginVertical: 15,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    tipText: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    managePhotosBtn: {
        borderWidth: 1,
        borderColor: '#8D6E63',
        borderRadius: 25,
        paddingVertical: 12,
        alignItems: 'center',
        marginVertical: 10,
        backgroundColor: '#fff',
    },
    managePhotosText: {
        color: '#8D6E63',
        fontWeight: '600',
        fontSize: 15,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionContent: {
        paddingTop: 10,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 15,
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        height: 52,
        backgroundColor: '#fff',
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        backgroundColor: '#fff',
    },
    pickerContainer: {
        borderWidth: 1,
        borderRadius: 8,
        marginTop: 8,
        maxHeight: 200,
        backgroundColor: '#fff',
    },
    pickerItem: {
        padding: 12,
        borderBottomWidth: 0.5,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    saveButton: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 10,
    },
});
