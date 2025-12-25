import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    useColorScheme,
    TouchableOpacity,
    Dimensions,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    TextInput,
    Switch
} from 'react-native';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';

const { width } = Dimensions.get('window');

interface Profile {
    ID: number;
    spiritualName: string;
    age: number; // For demo, might be derived from dob
    city: string;
    bio: string;
    madh: string;
    avatarUrl: string;
}

export const DatingScreen = () => {
    const { t } = useTranslation();
    const { user } = useUser();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const [candidates, setCandidates] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [compatibilityText, setCompatibilityText] = useState('');
    const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
    const [checkingComp, setCheckingComp] = useState(false);
    const [currentCandidateId, setCurrentCandidateId] = useState<number | null>(null);

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [filterCity, setFilterCity] = useState('');
    const [filterMinAge, setFilterMinAge] = useState('');
    const [filterMaxAge, setFilterMaxAge] = useState('');

    // City Selection
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');

    useEffect(() => {
        fetchCandidates();
        fetchCities();
    }, []);

    const filteredCities = availableCities.filter(city =>
        city.toLowerCase().includes(citySearchQuery.toLowerCase())
    );



    const fetchCities = async () => {
        try {
            const response = await axios.get(`${API_PATH}/dating/cities`);
            setAvailableCities(response.data);
        } catch (error) {
            console.error('Failed to fetch cities:', error);
        }
    };

    const fetchCandidates = async () => {
        try {
            const response = await axios.get(`${API_PATH}/dating/candidates`, {
                params: {
                    userId: user?.ID,
                    city: filterCity,
                    minAge: filterMinAge,
                    maxAge: filterMaxAge
                }
            });
            setCandidates(response.data);
        } catch (error) {
            console.error('Failed to fetch candidates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckCompatibility = async (candidateId: number) => {
        setCurrentCandidateId(candidateId);
        setCheckingComp(true);
        setShowCompatibilityModal(true);
        setCompatibilityText('Analyzing compatibility with AI Astro-processor...');
        try {
            const response = await axios.post(`${API_PATH}/dating/compatibility/${user?.ID}/${candidateId}`);
            setCompatibilityText(response.data.compatibility);
        } catch (error) {
            setCompatibilityText('Failed to analyze compatibility. Please try again.');
        } finally {
            setCheckingComp(false);
        }
    };

    const handleSaveFavorite = async () => {
        if (!currentCandidateId || !compatibilityText) return;
        try {
            await axios.post(`${API_PATH}/dating/favorites`, {
                userId: user?.ID,
                candidateId: currentCandidateId,
                compatibilityScore: compatibilityText
            });
            Alert.alert('Saved', 'Added to favorites!');
        } catch (error) {
            Alert.alert('Error', 'Could not save to favorites');
        }
    };

    const renderProfile = ({ item }: { item: Profile }) => (
        <View style={[styles.card, { backgroundColor: theme.header, borderColor: theme.borderColor }]}>
            <View style={[styles.avatarContainer, { backgroundColor: theme.background }]}>
                {item.avatarUrl ? (
                    <Image
                        source={{ uri: `${API_PATH.replace('/api', '')}${item.avatarUrl}` }}
                        style={styles.avatar}
                    />
                ) : (
                    <Text style={{ fontSize: 40 }}>👤</Text>
                )}
            </View>
            <View style={styles.cardInfo}>
                <Text style={[styles.name, { color: theme.text }]}>{item.spiritualName || 'Devotee'}</Text>
                <Text style={[styles.city, { color: theme.subText }]}>{item.city}</Text>
                <Text style={[styles.path, { color: theme.accent }]}>{item.madh}</Text>
                <Text style={[styles.bio, { color: theme.text }]} numberOfLines={3}>{item.bio || 'No bio yet'}</Text>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.button }]}
                        onPress={() => handleCheckCompatibility(item.ID)}
                    >
                        <Text style={{ color: theme.buttonText }}>Check Compatibility</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.topMenu, { borderBottomColor: theme.borderColor, alignItems: 'center' }]}>
                {/* Left Arrow */}
                <Text style={{ fontSize: 18, color: theme.subText, marginRight: 5 }}>‹</Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ alignItems: 'center', paddingVertical: 10, paddingHorizontal: 5 }}
                >
                    <TouchableOpacity
                        style={[styles.menuBtn, { backgroundColor: theme.inputBackground, marginRight: 10 }]}
                        onPress={() => setShowFilters(true)}
                    >
                        <Text style={{ color: theme.text }}>🔍 Filter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.menuBtn, { backgroundColor: theme.inputBackground, marginRight: 10 }]}
                        onPress={() => user?.ID && navigation.navigate('EditDatingProfile', { userId: user.ID })}
                    >
                        <Text style={{ color: theme.text }}>📝 Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.menuBtn, { backgroundColor: theme.inputBackground, marginRight: 10 }]}
                        onPress={() => user?.ID && navigation.navigate('MediaLibrary', { userId: user.ID })}
                    >
                        <Text style={{ color: theme.text }}>🖼️ Media</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.menuBtn, { backgroundColor: theme.inputBackground, marginRight: 10 }]}
                        onPress={() => navigation.navigate('DatingFavorites')}
                    >
                        <Text style={{ color: theme.text }}>❤️ Favorites</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Right Arrow */}
                <Text style={{ fontSize: 18, color: theme.subText, marginLeft: 5 }}>›</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.accent} />
            ) : candidates.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={{ color: theme.subText }}>No candidates found yet.</Text>
                    <Text style={{ color: theme.subText }}>Try updating your profile to join!</Text>
                </View>
            ) : (
                <FlatList
                    data={candidates}
                    keyExtractor={(item) => item.ID.toString()}
                    renderItem={renderProfile}
                    contentContainerStyle={styles.list}
                />
            )}

            <Modal
                visible={showCompatibilityModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header }]}>
                        <Text style={[styles.modalTitle, { color: theme.accent }]}>AI Compatibility Analysis</Text>

                        <View style={{ alignItems: 'center', marginVertical: 10 }}>
                            <Image
                                source={{ uri: `${API_PATH.replace(/\/api\/?$/, '')}/uploads/kolobok_astrologer.png` }}
                                style={{ width: 120, height: 120, borderRadius: 60 }}
                                resizeMode="cover"
                            />
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={true}
                        >
                            {checkingComp ? (
                                <View style={{ paddingVertical: 20 }}>
                                    <ActivityIndicator color={theme.accent} size="large" />
                                    <Text style={[styles.modalText, { color: theme.subText, marginTop: 10 }]}>Exploring the stars...</Text>
                                </View>
                            ) : (
                                <Text style={[styles.modalText, { color: theme.text }]}>{compatibilityText}</Text>
                            )}
                        </ScrollView>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <TouchableOpacity
                                style={[styles.closeBtn, { backgroundColor: theme.header, flex: 1, borderWidth: 1, borderColor: theme.borderColor }]}
                                onPress={handleSaveFavorite}
                            >
                                <Text style={{ color: theme.text }}>❤️ Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.closeBtn, { backgroundColor: theme.button, flex: 1 }]}
                                onPress={() => setShowCompatibilityModal(false)}
                            >
                                <Text style={{ color: theme.buttonText }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Filter Modal */}
            <Modal
                visible={showFilters}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Filters</Text>

                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ color: theme.subText, marginBottom: 5 }}>City</Text>
                            <TouchableOpacity
                                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                                onPress={() => setShowCityPicker(true)}
                            >
                                <Text style={{ color: filterCity ? theme.text : theme.subText }}>
                                    {filterCity || "Select city"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginBottom: 15 }}>
                            <Text style={{ color: theme.subText, marginBottom: 5 }}>Age Range</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
                                    value={filterMinAge}
                                    onChangeText={setFilterMinAge}
                                    placeholder="Min Age"
                                    keyboardType="numeric"
                                    placeholderTextColor={theme.subText}
                                />
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
                                    value={filterMaxAge}
                                    onChangeText={setFilterMaxAge}
                                    placeholder="Max Age"
                                    keyboardType="numeric"
                                    placeholderTextColor={theme.subText}
                                />
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.header, flex: 1, borderWidth: 1, borderColor: theme.borderColor }]}
                                onPress={() => {
                                    setFilterCity('');
                                    setFilterMinAge('');
                                    setFilterMaxAge('');
                                    fetchCandidates();
                                }}
                            >
                                <Text style={{ color: theme.text, textAlign: 'center' }}>Reset</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.button, flex: 1 }]}
                                onPress={() => {
                                    setShowFilters(false);
                                    fetchCandidates();
                                }}
                            >
                                <Text style={{ color: theme.buttonText, textAlign: 'center' }}>Apply</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={{ position: 'absolute', top: 10, right: 10, padding: 5 }}
                            onPress={() => setShowFilters(false)}
                        >
                            <Text style={{ color: theme.subText, fontSize: 18 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* City Selection Modal */}
            <Modal
                visible={showCityPicker}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header, maxHeight: '60%' }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Select City</Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor, marginBottom: 10 }]}
                            value={citySearchQuery}
                            onChangeText={setCitySearchQuery}
                            placeholder="🔍 Search city..."
                            placeholderTextColor={theme.subText}
                        />

                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            <TouchableOpacity
                                style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}
                                onPress={() => {
                                    setFilterCity('');
                                    setShowCityPicker(false);
                                }}
                            >
                                <Text style={{ color: theme.accent, fontWeight: 'bold' }}>All Cities</Text>
                            </TouchableOpacity>
                            {filteredCities.map((city, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}
                                    onPress={() => {
                                        setFilterCity(city);
                                        setShowCityPicker(false);
                                    }}
                                >
                                    <Text style={{ color: theme.text }}>{city}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.closeBtn, { backgroundColor: theme.button, marginTop: 10 }]}
                            onPress={() => setShowCityPicker(false)}
                        >
                            <Text style={{ color: theme.buttonText }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topMenu: {
        flexDirection: 'row',
        padding: 12,
        justifyContent: 'space-around',
        borderBottomWidth: 1,
    },
    menuBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    list: {
        padding: 16,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatarContainer: {
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    cardInfo: {
        padding: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    city: {
        fontSize: 14,
        marginBottom: 4,
    },
    path: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    bio: {
        fontSize: 14,
        lineHeight: 20,
    },
    actions: {
        marginTop: 15,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    actionBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalBody: {
        marginBottom: 10,
        maxHeight: Dimensions.get('window').height * 0.6,
    },
    modalScrollContent: {
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    modalText: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'left',
    },
    closeBtn: {
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        fontSize: 16,
    }
});
