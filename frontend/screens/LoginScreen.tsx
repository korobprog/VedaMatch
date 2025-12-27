import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    interpolate,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_PATH, APP_ENV } from '../config/api.config';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Animation values
    const glowValue = useSharedValue(0);
    const floatValue = useSharedValue(0);
    const { login } = useUser();

    useEffect(() => {
        glowValue.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 3000 }),
                withTiming(0, { duration: 3000 })
            ),
            -1,
            true
        );
        floatValue.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 4000 }),
                withTiming(0, { duration: 4000 })
            ),
            -1,
            true
        );
    }, []);

    const animatedGlowStyle = useAnimatedStyle(() => {
        const opacity = interpolate(glowValue.value, [0, 1], [0.3, 0.7]);
        const scale = interpolate(glowValue.value, [0, 1], [1, 1.2]);
        return {
            opacity,
            transform: [{ scale }],
        };
    });

    const animatedFloatStyle = useAnimatedStyle(() => {
        const translateY = interpolate(floatValue.value, [0, 1], [0, -20]);
        return {
            transform: [{ translateY }],
        };
    });

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert(t('error'), t('fill_all_fields'));
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_PATH}/login`, {
                email,
                password,
            });

            const { user } = response.data;
            await login(user);
        } catch (error: any) {
            console.warn('Login failure:', error.message);
            const msg = error.response?.data?.error || t('login_failed');
            Alert.alert(t('error'), msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDevLogin = async () => {
        const devEmail = 'test_dev_yogi@example.com';
        const devPassword = 'password';
        const devProfile = {
            email: devEmail,
            password: devPassword,
            karmicName: 'Dev Yogi',
            spiritualName: 'Dasa dasa',
            gender: 'Male',
            country: 'India',
            city: 'Vrindavan',
            identity: 'Devotee',
            diet: 'Vegetarian',
            madh: 'Gaudiya',
            mentor: 'Srila Prabhupada',
            dob: '1970-01-01',
            isProfileComplete: true,
        };

        setLoading(true);
        try {
            console.log('Dev Login: Attempting login...');
            const loginRes = await axios.post(`${API_PATH}/login`, {
                email: devEmail,
                password: devPassword,
            });

            let { user } = loginRes.data;

            // If user exists but profile is not complete, update it automatically
            if (!user.isProfileComplete) {
                console.log('Dev Login: Profile incomplete, auto-completing...');
                const updateRes = await axios.put(`${API_PATH}/update-profile/${user.ID}`, {
                    ...devProfile
                });
                user = updateRes.data.user;
            }

            await login(user);

        } catch (error: any) {
            console.log('Dev Login: Login failed, attempting registration...');
            try {
                await axios.post(`${API_PATH}/register`, devProfile);

                const retryLoginRes = await axios.post(`${API_PATH}/login`, {
                    email: devEmail,
                    password: devPassword,
                });
                const { user } = retryLoginRes.data;
                await login(user);
            } catch (regError: any) {
                console.error('Dev Login Error:', regError.response?.data || regError.message);
                const errorMsg = regError.response?.data?.error || regError.message;
                Alert.alert('Dev Error', `Failed: ${errorMsg}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Background Layers */}
            <LinearGradient
                colors={['#FF9933', '#FFCC00', '#FF9933']}
                style={StyleSheet.absoluteFill}
            />

            {/* Animated Spiritual Glow */}
            <Animated.View style={[styles.glow, animatedGlowStyle]}>
                <LinearGradient
                    colors={['rgba(255,255,255,0.8)', 'transparent']}
                    style={styles.glowGradient}
                />
            </Animated.View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <Animated.View style={[styles.headerContainer, animatedFloatStyle]}>
                    <Text style={styles.title}>VedaMatch AI</Text>
                    <Text style={styles.subtitle}>Spiritual Connection Awaits</Text>
                </Animated.View>

                <View style={styles.formCard}>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.loginButtonText}>Login</Text>
                        )}
                    </TouchableOpacity>

                    {APP_ENV !== 'production' && (
                        <TouchableOpacity
                            style={[styles.loginButton, { backgroundColor: '#4CAF50', marginTop: 10 }]}
                            onPress={handleDevLogin}
                            disabled={loading}
                        >
                            <Text style={styles.loginButtonText}>{t('auth.devLogin')}</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.registerLink}
                        onPress={() => navigation.navigate('Registration', { isDarkMode: false, phase: 'initial' })}
                    >
                        <Text style={styles.registerLinkText}>
                            Don't have an account? <Text style={styles.registerBold}>Register</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    glow: {
        position: 'absolute',
        top: -height * 0.2,
        left: -width * 0.2,
        width: width * 1.4,
        height: width * 1.4,
        borderRadius: width * 0.7,
        overflow: 'hidden',
    },
    glowGradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 50,
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#FFF',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#FFF',
        marginTop: 10,
        fontStyle: 'italic',
    },
    formCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 30,
        borderRadius: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    input: {
        height: 55,
        borderBottomWidth: 1,
        borderBottomColor: '#FFCC00',
        marginBottom: 20,
        fontSize: 16,
        color: '#333',
    },
    loginButton: {
        height: 55,
        backgroundColor: '#FF9933',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    loginButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    registerLink: {
        marginTop: 25,
        alignItems: 'center',
    },
    registerLinkText: {
        color: '#666',
        fontSize: 14,
    },
    registerBold: {
        color: '#FF9933',
        fontWeight: 'bold',
    },
});

export default LoginScreen;
