import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { COLORS } from '../components/chat/ChatConstants';
import { LocationPicker } from '../components/chat/LocationPicker';
import { profileService } from '../services/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationData {
    country: string;
    city: string;
    latitude?: number;
    longitude?: number;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Registration'>;

export const RegistrationLocationPhase: React.FC<Props> = ({ navigation, route }) => {
    const { isDarkMode } = route.params;
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [latitude, setLatitude] = useState<number | undefined>();
    const [longitude, setLongitude] = useState<number | undefined>();
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        if (!country) {
            Alert.alert('Required', 'Please select your country');
            return;
        }

        if (!city) {
            Alert.alert('Required', 'Please select or enter your city');
            return;
        }

        try {
            setLoading(true);

            // Получаем текущего пользователя
            const userStr = await AsyncStorage.getItem('user');
            if (!userStr) {
                Alert.alert('Error', 'User not found. Please login first.');
                return;
            }

            const user = (userStr && userStr !== 'undefined' && userStr !== 'null') ? JSON.parse(userStr) : null;
            if (!user) {
                Alert.alert('Error', 'User data is corrupted. Please login again.');
                return;
            }

            // Обновляем только локацию
            const locationData: LocationData = {
                country,
                city,
            };

            if (latitude !== undefined && longitude !== undefined) {
                locationData.latitude = latitude;
                locationData.longitude = longitude;
            }

            const response = await profileService.updateLocation(user.ID, locationData);

            await AsyncStorage.setItem('user', JSON.stringify(response.user));

            // Переходим к следующему этапу (profile или в приложение)
            Alert.alert(
                'Location Saved',
                'Your location has been saved successfully!',
                [
                    {
                        text: 'Continue',
                        onPress: () => navigation.navigate('Registration', { ...route.params, phase: 'profile' }),
                    },
                ]
            );
        } catch (error: any) {
            console.error('Error saving location:', error);
            Alert.alert('Error', 'Failed to save location. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        Alert.alert(
            'Skip Location',
            'You can set your location later in your profile. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Skip',
                    onPress: () => navigation.navigate('Registration', { ...route.params, phase: 'profile' }),
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Step 2: Your Location</Text>
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                    <Text style={[styles.skipText, { color: theme.accent }]}>Skip</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={[styles.subtitle, { color: theme.subText }]}>
                    Select your country and city to connect with devotees near you.
                </Text>

                <LocationPicker
                    country={country}
                    city={city}
                    onCountryChange={setCountry}
                    onCityChange={setCity}
                    onCoordinatesChange={(lat, lon) => {
                        setLatitude(lat);
                        setLongitude(lon);
                    }}
                    theme={theme}
                    showAutoDetect={true}
                />

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.accent }]}
                    onPress={handleContinue}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Continue</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.skipButtonBottom}
                    onPress={handleSkip}
                >
                    <Text style={[styles.skipTextBottom, { color: theme.subText }]}>
                        I'll do this later
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        borderBottomWidth: 0.5,
    },
    backButton: {
        width: 60,
    },
    backText: {
        fontSize: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    skipButton: {
        width: 60,
        alignItems: 'flex-end',
    },
    skipText: {
        fontSize: 16,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 20,
    },
    button: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    skipButtonBottom: {
        marginTop: 20,
        padding: 10,
    },
    skipTextBottom: {
        fontSize: 14,
        textAlign: 'center',
    },
});
