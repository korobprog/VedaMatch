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
import { ModernVedicTheme } from '../theme/ModernVedicTheme';

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
        const opacity = interpolate(glowValue.value, [0, 1], [0.3, 0.6]);
        const scale = interpolate(glowValue.value, [0, 1], [1, 1.1]);
        return {
            opacity,
            transform: [{ scale }],
        };
    });

    const animatedFloatStyle = useAnimatedStyle(() => {
        const translateY = interpolate(floatValue.value, [0, 1], [0, -10]);
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
            <View style={[StyleSheet.absoluteFill, { backgroundColor: ModernVedicTheme.colors.background }]}>
                {/* Subtle Radial Gradient Simulation using LinearGradient with different angles/opacity if needed, 
                 but for now just a soft Vertical gradient to give depth */}
                <LinearGradient
                    colors={[ModernVedicTheme.colors.background, '#FFF0E0', '#FFE5CC']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </View>

            {/* Decorative Mandala Glow (Top Center) */}
            <Animated.View style={[styles.glow, animatedGlowStyle]}>
                <LinearGradient
                    colors={[ModernVedicTheme.colors.secondary, 'transparent']}
                    style={styles.glowGradient}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />
            </Animated.View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <Animated.View style={[styles.headerContainer, animatedFloatStyle]}>
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoIcon}>🕉️</Text>
                    </View>
                    <Text style={styles.title}>VedaMatch</Text>
                    <Text style={styles.subtitle}>Connect Your Soul. Discover Your Match.</Text>
                </Animated.View>

                <View style={styles.formCard}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputIcon}>📧</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor={ModernVedicTheme.colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputIcon}>🔒</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={ModernVedicTheme.colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleLogin}
                        disabled={loading}
                        style={styles.loginButtonWrapper}
                    >
                        <LinearGradient
                            colors={[ModernVedicTheme.colors.gradientStart, ModernVedicTheme.colors.gradientEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.loginButton}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.loginButtonText}>Login with Saffron</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {APP_ENV !== 'production' && (
                        <TouchableOpacity
                            style={[styles.loginButtonWrapper, { marginTop: 10 }]}
                            onPress={handleDevLogin}
                            disabled={loading}
                        >
                            <View style={[styles.loginButton, { backgroundColor: '#4CAF50' }]}>
                                <Text style={styles.loginButtonText}>{t('auth.devLogin')}</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.registerLink}
                        onPress={() => navigation.navigate('Registration', { isDarkMode: false, phase: 'initial' })}
                    >
                        <Text style={styles.registerLinkText}>
                            New to VedaMatch? <Text style={styles.registerBold}>Create Account</Text>
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
        top: -height * 0.15,
        left: 0,
        right: 0,
        height: height * 0.5,
        opacity: 0.3,
        alignItems: 'center',
    },
    glowGradient: {
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width * 0.75,
        opacity: 0.15,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: ModernVedicTheme.colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        ...ModernVedicTheme.shadows.soft,
    },
    logoIcon: {
        fontSize: 40,
    },
    title: {
        fontSize: ModernVedicTheme.typography.header.fontSize,
        fontWeight: 'bold', // Playfair fallback
        color: ModernVedicTheme.colors.primary,
        marginBottom: 8,
        fontFamily: ModernVedicTheme.typography.header.fontFamily,
    },
    subtitle: {
        fontSize: ModernVedicTheme.typography.body.fontSize,
        color: ModernVedicTheme.colors.textSecondary,
        fontFamily: ModernVedicTheme.typography.body.fontFamily,
        textAlign: 'center',
    },
    formCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.4)', // Glassmorphism base
        borderRadius: ModernVedicTheme.layout.borderRadius.lg,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        // Shadow is subtle for glass
        shadowColor: ModernVedicTheme.colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: ModernVedicTheme.colors.glass,
        borderRadius: ModernVedicTheme.layout.borderRadius.md,
        borderWidth: 1,
        borderColor: ModernVedicTheme.colors.glassBorder,
        marginBottom: 16,
        height: 56,
        paddingHorizontal: 16,
    },
    inputIcon: {
        fontSize: 18,
        marginRight: 12,
        opacity: 0.7,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: ModernVedicTheme.colors.text,
        height: '100%',
    },
    loginButtonWrapper: {
        borderRadius: ModernVedicTheme.layout.borderRadius.md,
        overflow: 'hidden',
        marginTop: 8,
        ...ModernVedicTheme.shadows.soft,
    },
    loginButton: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonText: {
        color: ModernVedicTheme.colors.textLight,
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    registerLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    registerLinkText: {
        color: ModernVedicTheme.colors.textSecondary,
        fontSize: 14,
    },
    registerBold: {
        color: ModernVedicTheme.colors.primary,
        fontWeight: 'bold',
    },
});

export default LoginScreen;
