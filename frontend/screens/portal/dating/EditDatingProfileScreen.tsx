import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Switch,
    ActivityIndicator,
    useColorScheme,
    Alert,
    Modal,
    FlatList,
    SafeAreaView
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import axios from 'axios';
import { API_PATH } from '../../../config/api.config';
import { COLORS } from '../../../components/chat/ChatConstants';
import { useUser } from '../../../context/UserContext';
import { datingService } from '../../../services/datingService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { DATING_TRADITIONS, YOGA_STYLES, GUNAS, IDENTITY_OPTIONS } from '../../../constants/DatingConstants';

type Props = NativeStackScreenProps<RootStackParamList, 'EditDatingProfile'>;

export const EditDatingProfileScreen: React.FC<Props> = ({ navigation, route }) => {
    const { userId } = route.params;
    const { user: currentUser, login } = useUser();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

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
        datingEnabled: false
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

    // Debounce timer
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await datingService.getUsers();
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
                    datingEnabled: me.datingEnabled || false
                });
                if (me.birthTime) {
                    const today = new Date();
                    const [hours, minutes] = me.birthTime.split(':');
                    today.setHours(parseInt(hours), parseInt(minutes));
                    setTempDate(today);
                }
                if (me.dob) {
                    const date = new Date(me.dob);
                    if (!isNaN(date.getTime())) {
                        setTempDob(date);
                        // Updating profile state again to ensure dob is set if missed in initial batch
                        setProfile(prev => ({ ...prev, dob: me.dob }));
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (saving) return;

        // Validation if dating is enabled
        if (profile.datingEnabled) {
            if (!profile.bio.trim() || !profile.interests.trim() || !profile.lookingFor.trim() ||
                !profile.maritalStatus.trim() || !profile.dob || !profile.birthTime || !profile.birthPlaceLink || !profile.city) {
                Alert.alert('Внимание', 'Для активации профиля в знакомствах необходимо заполнить все поля, включая город и астрологические данные.');
                return;
            }
        }

        setSaving(true);
        try {
            const updatedUser = await datingService.updateProfile(userId, profile);
            // Update user in context
            await login(updatedUser);
            Alert.alert('Success', 'Profile updated successfully');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
            console.error('Save profile error:', error);
        } finally {
            setSaving(false);
        }
    };

    const performCitySearch = async (query: string) => {
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
            setCitySuggestions(response.data);
        } catch (error: any) {
            console.error('City search failed:', error.message);
            if (error.response?.status === 403) {
                console.warn('Nominatim blocked the request (403). Check User-Agent or usage policy.');
            }
        } finally {
            setIsSearchingCities(false);
        }
    };

    const searchCities = (query: string) => {
        setCityQuery(query);

        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        if (query.length < 3) {
            setCitySuggestions([]);
            return;
        }

        // Set a new timeout (600ms debounce)
        const timeout = setTimeout(() => {
            performCitySearch(query);
        }, 600);

        setSearchTimeout(timeout);
    };

    const handleCitySelect = (item: any) => {
        if (citySearchType === 'current') {
            setProfile({ ...profile, city: item.display_name });
        } else {
            setProfile({ ...profile, birthPlaceLink: item.display_name });
        }
        setCitySearchModal(false);
        setCityQuery('');
        setCitySuggestions([]);
    };

    if (loading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.accent} />;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
                <View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={{ color: theme.text, fontSize: 18 }}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.text }]}>Dating Profile</Text>
                    <TouchableOpacity onPress={handleSaveProfile} disabled={saving}>
                        {saving ? (
                            <ActivityIndicator color={theme.accent} />
                        ) : (
                            <Text style={{ color: theme.accent, fontSize: 18, fontWeight: 'bold' }}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.switchRow}>
                        <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>Enable Dating Profile</Text>
                        <Switch
                            value={profile.datingEnabled}
                            onValueChange={(val) => setProfile({ ...profile, datingEnabled: val })}
                            trackColor={{ false: '#767577', true: theme.accent }}
                        />
                    </View>

                    <Text style={[styles.infoText, { color: theme.subText, marginBottom: 15 }]}>
                        💡 Загружайте свои лучшие фотографии в галерею, чтобы другие пользователи могли просматривать их в слайд-шоу.
                    </Text>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.inputBackground, borderColor: theme.accent, borderWidth: 1, marginBottom: 20, alignItems: 'center' }]}
                        onPress={() => navigation.navigate('MediaLibrary', { userId })}
                    >
                        <Text style={{ color: theme.accent, fontWeight: 'bold' }}>📸 Manage Photos / Add New</Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>Current City</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => {
                            setCitySearchType('current');
                            setCityQuery(profile.city);
                            setCitySearchModal(true);
                        }}
                    >
                        <Text style={{ color: profile.city ? theme.text : theme.subText }} numberOfLines={1}>
                            {profile.city || "Select current city..."}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>About Me (Bio)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
                        multiline
                        numberOfLines={4}
                        value={profile.bio}
                        onChangeText={(val) => setProfile({ ...profile, bio: val })}
                        placeholder="Tell others about yourself..."
                        placeholderTextColor={theme.subText}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>Interests</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
                        value={profile.interests}
                        onChangeText={(val) => setProfile({ ...profile, interests: val })}
                        placeholder="Yoga, kirtan, cooking..."
                        placeholderTextColor={theme.subText}
                    />



                    <Text style={[styles.label, { color: theme.text }]}>Tradition (Madh)</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setMadhSelectionModal(true)}
                    >
                        <Text style={{ color: profile.madh ? theme.text : theme.subText }}>
                            {profile.madh || "Select Tradition"}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>Yoga Style</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setYogaSelectionModal(true)}
                    >
                        <Text style={{ color: profile.yogaStyle ? theme.text : theme.subText }}>
                            {profile.yogaStyle || "Select Yoga Style"}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>Mode of Nature (Guna)</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setGunaSelectionModal(true)}
                    >
                        <Text style={{ color: profile.guna ? theme.text : theme.subText }}>
                            {profile.guna || "Select Guna"}
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: theme.text }]}>Identity</Text>
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

                    <Text style={[styles.label, { color: theme.text }]}>Looking For</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
                        value={profile.lookingFor}
                        onChangeText={(val) => setProfile({ ...profile, lookingFor: val })}
                        placeholder="Serious relationship, friendship..."
                        placeholderTextColor={theme.subText}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>Marital Status</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
                        value={profile.maritalStatus}
                        onChangeText={(val) => setProfile({ ...profile, maritalStatus: val })}
                        placeholder="Single, Divorced, etc."
                        placeholderTextColor={theme.subText}
                    />

                    <View style={styles.divider} />
                    <Text style={[styles.sectionTitle, { color: theme.accent }]}>Astro Details</Text>

                    <Text style={[styles.label, { color: theme.text }]}>Date of Birth</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setOpenDobPicker(true)}
                    >
                        <Text style={{ color: profile.dob ? theme.text : theme.subText }}>
                            {profile.dob || "Select date of birth"}
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

                    <Text style={[styles.label, { color: theme.text }]}>Birth Time</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => setOpenTimePicker(true)}
                    >
                        <Text style={{ color: profile.birthTime ? theme.text : theme.subText }}>
                            {profile.birthTime || "Select birth time"}
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

                    <Text style={[styles.label, { color: theme.text }]}>Birth Place (для астрологии)</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                        onPress={() => {
                            setCitySearchType('birth');
                            setCityQuery(profile.birthPlaceLink);
                            setCitySearchModal(true);
                        }}
                    >
                        <Text style={{ color: profile.birthPlaceLink ? theme.text : theme.subText }} numberOfLines={1}>
                            {profile.birthPlaceLink || "Select city..."}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* City Search Modal */}
            <Modal visible={citySearchModal} animationType="slide">
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.borderColor }]}>
                        <TouchableOpacity onPress={() => setCitySearchModal(false)}>
                            <Text style={{ color: theme.accent, fontSize: 16 }}>Close</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>
                            {citySearchType === 'current' ? 'Search Current City' : 'Search Birth Place'}
                        </Text>
                        <View style={{ width: 50 }} />
                    </View>
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={[styles.searchInput, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                            placeholder="Start typing city name..."
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
            </Modal>
            {/* Madh Selection Modal */}
            <Modal
                visible={madhSelectionModal}
                transparent
                animationType="fade"
            >
                <View style={[styles.modalOverlay, { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header, borderRadius: 20, maxHeight: '60%', padding: 20 }]}>
                        <Text style={[styles.modalTitle, { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }]}>Select Tradition</Text>

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
                            <Text style={{ color: theme.buttonText }}>Close</Text>
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
                        <Text style={[styles.modalTitle, { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }]}>Select Yoga Style</Text>

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
                            <Text style={{ color: theme.buttonText }}>Close</Text>
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
                        <Text style={[styles.modalTitle, { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }]}>Select Guna</Text>

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
                            <Text style={{ color: theme.buttonText }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
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
        borderBottomColor: '#eee',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 10,
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 50,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
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
    }
});
