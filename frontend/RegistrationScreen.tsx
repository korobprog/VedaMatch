import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
    Switch,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DatePicker from 'react-native-date-picker';
import axios from 'axios';
import { submitProfileToN8n } from './services/n8nService';

// Reusing the theme from App.tsx for consistency
const COLORS = {
    dark: {
        background: '#121212',
        header: '#1E1E1E',
        inputBackground: '#2C2C2C',
        inputText: '#E0E0E0',
        text: '#E0E0E0',
        subText: '#9E9E9E',
        borderColor: '#333333',
        accent: '#FFB74D',
        button: '#5D4037',
        buttonText: '#D7CCC8',
    },
    light: {
        background: '#F5F5F0',
        header: '#FFFFFF',
        inputBackground: '#FFFFFF',
        inputText: '#212121',
        text: '#212121',
        subText: '#757575',
        borderColor: '#E0E0E0',
        accent: '#A1887F',
        button: '#8D6E63',
        buttonText: '#FFFFFF',
    },
};

const MADH_OPTIONS = [
    'Gaudiya Vaishnava (ISKCON)',
    'Gaudiya Vaishnava (Gaudiya Math)',
    'Sri Vaishnava',
    'Madhva Sampradaya',
    'Nimbarka Sampradaya',
    'Other',
];

const DIET_OPTIONS = ['Vegan', 'Vegetarian', 'Prasad'];
const IDENTITY_OPTIONS = ['Yogi', 'In Goodness'];
const GENDER_OPTIONS = ['Male', 'Female'];

interface RegistrationScreenProps {
    isDarkMode: boolean;
    onBack: () => void;
}

const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ isDarkMode, onBack }) => {
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const [avatar, setAvatar] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [karmicName, setKarmicName] = useState('');
    const [spiritualName, setSpiritualName] = useState('');
    const [dob, setDob] = useState(new Date());
    const [madh, setMadh] = useState(''); // Optional now
    const [mentor, setMentor] = useState('');
    const [gender, setGender] = useState(GENDER_OPTIONS[0]);
    const [identity, setIdentity] = useState(IDENTITY_OPTIONS[0]);
    const [diet, setDiet] = useState(DIET_OPTIONS[2]);
    const [agreement, setAgreement] = useState(false);
    const [loading, setLoading] = useState(false);

    // Store full country objects to get capital
    const [countriesData, setCountriesData] = useState<any[]>([]);
    const [citiesData, setCitiesData] = useState<string[]>([]);
    const [loadingCountries, setLoadingCountries] = useState(true);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [cityInputMode, setCityInputMode] = useState(false);
    const [showMadhPicker, setShowMadhPicker] = useState(false);
    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [showIdentityPicker, setShowIdentityPicker] = useState(false);
    const [showDietPicker, setShowDietPicker] = useState(false);
    const [openDatePicker, setOpenDatePicker] = useState(false);

    useEffect(() => {
        fetchCountries();
    }, []);

    const fetchCountries = async () => {
        setLoadingCountries(true);
        try {
            const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,capital', {
                timeout: 10000,
            });
            const data = response.data.sort((a: any, b: any) => a.name.common.localeCompare(b.name.common));
            setCountriesData(data);
            console.log('Countries loaded:', data.length);
        } catch (error: any) {
            console.error('Error fetching countries:', error);
            // Fallback: use a basic list of popular countries
            const fallbackCountries = [
                { name: { common: 'Russia' }, capital: ['Moscow'] },
                { name: { common: 'United States' }, capital: ['Washington, D.C.'] },
                { name: { common: 'India' }, capital: ['New Delhi'] },
                { name: { common: 'United Kingdom' }, capital: ['London'] },
                { name: { common: 'Germany' }, capital: ['Berlin'] },
                { name: { common: 'France' }, capital: ['Paris'] },
                { name: { common: 'Spain' }, capital: ['Madrid'] },
                { name: { common: 'Italy' }, capital: ['Rome'] },
                { name: { common: 'Brazil' }, capital: ['Brasília'] },
                { name: { common: 'China' }, capital: ['Beijing'] },
                { name: { common: 'Japan' }, capital: ['Tokyo'] },
                { name: { common: 'Canada' }, capital: ['Ottawa'] },
                { name: { common: 'Australia' }, capital: ['Canberra'] },
                { name: { common: 'Mexico' }, capital: ['Mexico City'] },
                { name: { common: 'Argentina' }, capital: ['Buenos Aires'] },
            ];
            setCountriesData(fallbackCountries);
            Alert.alert('Network Error', 'Could not load full country list. Showing popular countries only.');
        } finally {
            setLoadingCountries(false);
        }
    };

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

    const fetchCities = async (countryName: string) => {
        try {
            // Using GeoNames API to get cities
            // First, get country code
            const countryResponse = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fields=cca2`);
            if (countryResponse.data && countryResponse.data.length > 0) {
                const countryCode = countryResponse.data[0].cca2;
                // Get cities from GeoNames (free tier: 1000 requests/hour)
                const citiesResponse = await axios.get(
                    `https://secure.geonames.org/searchJSON?country=${countryCode}&featureClass=P&maxRows=100&username=demo`
                );
                if (citiesResponse.data && citiesResponse.data.geonames) {
                    const cities = citiesResponse.data.geonames
                        .map((city: any) => city.name)
                        .filter((name: string, index: number, self: string[]) => self.indexOf(name) === index)
                        .sort();
                    setCitiesData(cities);
                } else {
                    // Fallback: use capital and major cities
                    const countryData = countriesData.find(c => c.name.common === countryName);
                    if (countryData && countryData.capital) {
                        setCitiesData([countryData.capital[0], ...getMajorCities(countryName)]);
                    } else {
                        setCitiesData(getMajorCities(countryName));
                    }
                }
            } else {
                // Fallback to major cities
                setCitiesData(getMajorCities(countryName));
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
            // Fallback to major cities
            setCitiesData(getMajorCities(countryName));
        }
    };

    const getMajorCities = (countryName: string): string[] => {
        // Popular cities by country (fallback)
        const majorCities: { [key: string]: string[] } = {
            'Russia': ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Nizhny Novgorod'],
            'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'],
            'India': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata'],
            'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Edinburgh'],
            'Germany': ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt', 'Stuttgart'],
            'France': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes'],
            'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Malaga'],
            'Italy': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa'],
            'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte'],
            'China': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou'],
        };
        return majorCities[countryName] || [];
    };

    const handleChooseAvatar = () => {
        Alert.alert(
            'Upload Avatar',
            'Choose an option',
            [
                {
                    text: 'Camera (Front)',
                    onPress: () => {
                        launchCamera({ mediaType: 'photo', cameraType: 'front', saveToPhotos: true }, (response) => {
                            if (response.assets && response.assets.length > 0) {
                                setAvatar(response.assets[0]);
                            }
                        });
                    },
                },
                {
                    text: 'Gallery',
                    onPress: () => {
                        launchImageLibrary({ mediaType: 'photo' }, (response) => {
                            if (response.assets && response.assets.length > 0) {
                                setAvatar(response.assets[0]);
                            }
                        });
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSubmit = async () => {
        if (!karmicName) {
            Alert.alert('Required', 'Karmic Name is required.');
            return;
        }
        if (!agreement) {
            Alert.alert('Required', 'You must agree to the data processing policy.');
            return;
        }

        setLoading(true);

        try {
            // Подготавливаем данные профиля для отправки в n8n
            const profileData = {
                email: email || undefined,
                country,
                city,
                karmicName,
                spiritualName: spiritualName || undefined,
                dob: dob.toISOString(),
                madh: madh || undefined,
                mentor: mentor || undefined,
                gender,
                identity,
                diet,
            };

            // Отправляем данные в n8n webhook
            // n8n workflow сохранит данные в PostgreSQL и обработает их для RAG системы
            await submitProfileToN8n(profileData);
            
            Alert.alert(
                'Success', 
                'Профиль успешно зарегистрирован! Данные сохранены в базе данных и будут обработаны ИИ системой.'
            );
            onBack();
        } catch (error: any) {
            console.error('Registration error:', error);
            Alert.alert(
                'Error', 
                error.message || 'Ошибка при регистрации профиля. Попробуйте позже.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Profile Registration</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Avatar */}
                <TouchableOpacity onPress={handleChooseAvatar} style={[styles.avatarContainer, { borderColor: theme.accent }]}>
                    {avatar ? (
                        <Image source={{ uri: avatar.uri }} style={styles.avatarImage} />
                    ) : (
                        <Text style={{ color: theme.subText }}>Add Photo</Text>
                    )}
                </TouchableOpacity>

                {/* Gender */}
                <Text style={[styles.label, { color: theme.text }]}>Gender</Text>
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                    {GENDER_OPTIONS.map((g) => (
                        <TouchableOpacity
                            key={g}
                            style={[
                                styles.radioBtn,
                                { borderColor: theme.borderColor, backgroundColor: gender === g ? theme.button : 'transparent' }
                            ]}
                            onPress={() => setGender(g)}
                        >
                            <Text style={{ color: gender === g ? theme.buttonText : theme.text }}>{g}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Name Fields */}
                <Text style={[styles.label, { color: theme.text }]}>Karmic Name (Required)</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                    value={karmicName}
                    onChangeText={setKarmicName}
                    placeholder="e.g., Ivan Ivanov"
                    placeholderTextColor={theme.subText}
                />

                <Text style={[styles.label, { color: theme.text }]}>Spiritual Name (Optional)</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                    value={spiritualName}
                    onChangeText={setSpiritualName}
                    placeholder="e.g., Das Anu Das"
                    placeholderTextColor={theme.subText}
                />

                {/* Email */}
                <Text style={[styles.label, { color: theme.text }]}>Email</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="email@example.com"
                    placeholderTextColor={theme.subText}
                />

                {/* Date of Birth */}
                <Text style={[styles.label, { color: theme.text }]}>Date of Birth</Text>
                <TouchableOpacity
                    style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                    onPress={() => setOpenDatePicker(true)}
                >
                    <Text style={{ color: theme.inputText }}>{dob.toLocaleString()}</Text>
                </TouchableOpacity>
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
                <Text style={[styles.label, { color: theme.text }]}>Country</Text>
                <TouchableOpacity
                    style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
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
                    disabled={loadingCountries}
                >
                    <Text style={{ color: country ? theme.inputText : theme.subText }}>
                        {loadingCountries ? 'Loading countries...' : (country || 'Select Country')}
                    </Text>
                </TouchableOpacity>
                {showCountryPicker && countriesData.length > 0 && (
                    <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, zIndex: 1000 }]}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            {countriesData.map((c: any) => (
                                <TouchableOpacity 
                                    key={c.name.common} 
                                    style={styles.pickerItem} 
                                    onPress={() => handleCountrySelect(c)}
                                >
                                    <Text style={{ color: theme.inputText }}>{c.name.common}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
                {showCountryPicker && countriesData.length === 0 && !loadingCountries && (
                    <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                        <Text style={{ color: theme.subText, padding: 12 }}>No countries available. Tap to retry.</Text>
                    </View>
                )}

                {/* City */}
                <Text style={[styles.label, { color: theme.text }]}>City</Text>
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
                                <Text style={{ color: city ? theme.inputText : theme.subText }}>{city || (country ? 'Select City' : 'Select Country First')}</Text>
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
                            <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                    <TouchableOpacity style={styles.pickerItem} onPress={() => { setCity(''); setShowCityPicker(false); }}>
                                        <Text style={{ color: theme.subText }}>Clear</Text>
                                    </TouchableOpacity>
                                    {citiesData.map((cityName: string) => (
                                        <TouchableOpacity key={cityName} style={styles.pickerItem} onPress={() => { setCity(cityName); setShowCityPicker(false); }}>
                                            <Text style={{ color: theme.inputText }}>{cityName}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                        {showCityPicker && citiesData.length === 0 && country && (
                            <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                                <Text style={{ color: theme.subText, padding: 12 }}>Loading cities...</Text>
                            </View>
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
                <Text style={[styles.label, { color: theme.text }]}>Madh (Optional)</Text>
                <TouchableOpacity
                    style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor, justifyContent: 'center' }]}
                    onPress={() => setShowMadhPicker(!showMadhPicker)}
                >
                    <Text style={{ color: madh ? theme.inputText : theme.subText }}>{madh || 'Select Tradition'}</Text>
                </TouchableOpacity>
                {showMadhPicker && (
                    <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                        <TouchableOpacity style={styles.pickerItem} onPress={() => { setMadh(''); setShowMadhPicker(false); }}>
                            <Text style={{ color: theme.subText }}>None</Text>
                        </TouchableOpacity>
                        {MADH_OPTIONS.map((m) => (
                            <TouchableOpacity key={m} style={styles.pickerItem} onPress={() => { setMadh(m); setShowMadhPicker(false); }}>
                                <Text style={{ color: theme.inputText }}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Mentor */}
                <Text style={[styles.label, { color: theme.text }]}>Mentor</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
                    value={mentor}
                    onChangeText={setMentor}
                    placeholder="Current Shiksha/Diksha Guru"
                    placeholderTextColor={theme.subText}
                />

                {/* Identity */}
                <Text style={[styles.label, { color: theme.text }]}>Self Identity</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {IDENTITY_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.radioBtn, { borderColor: theme.borderColor, backgroundColor: identity === opt ? theme.button : 'transparent' }]}
                            onPress={() => setIdentity(opt)}
                        >
                            <Text style={{ color: identity === opt ? theme.buttonText : theme.text }}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Diet */}
                <Text style={[styles.label, { color: theme.text }]}>Diet Principles</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {DIET_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.radioBtn, { borderColor: theme.borderColor, backgroundColor: diet === opt ? theme.button : 'transparent' }]}
                            onPress={() => setDiet(opt)}
                        >
                            <Text style={{ color: diet === opt ? theme.buttonText : theme.text }}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Terms */}
                <View style={styles.checkboxContainer}>
                    <Switch
                        value={agreement}
                        onValueChange={setAgreement}
                        trackColor={{ false: '#767577', true: theme.accent }}
                        thumbColor={agreement ? theme.button : '#f4f3f4'}
                    />
                    <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                        I agree that my data will be stored in the database and accessible to users and administration.
                    </Text>
                </View>

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.button, opacity: loading ? 0.7 : 1 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.submitButtonText, { color: theme.buttonText }]}>Register Profile</Text>}
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
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
    content: {
        padding: 20,
        paddingBottom: 50,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        overflow: 'hidden',
        borderStyle: 'dashed',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
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
    pickerContainer: {
        borderWidth: 1,
        borderRadius: 8,
        marginTop: 5,
        maxHeight: 200,
        overflow: 'hidden',
    },
    pickerItem: {
        padding: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
    },
    radioBtn: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 20,
        marginRight: 10,
        marginBottom: 10,
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
        fontSize: 13,
    },
    submitButton: {
        paddingVertical: 15,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default RegistrationScreen;
