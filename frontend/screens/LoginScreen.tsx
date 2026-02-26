import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform,
    ActivityIndicator,
    Image,
    StatusBar,
    ScrollView,
    Alert,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    interpolate,
    interpolateColor,
    withSpring,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { API_PATH, APP_ENV } from '../config/api.config';
import { ModernVedicTheme } from '../theme/ModernVedicTheme';
import DeviceInfo from 'react-native-device-info';
import { KeyboardAwareContainer } from '../components/ui/KeyboardAwareContainer';
import apiClient from '../lib/apiClient';
import { ScreenScaffold } from '../components/theme/ScreenScaffold';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);

    // Animation values
    const glowValue = useSharedValue(0);
    const floatValue = useSharedValue(0);
    const formOpacity = useSharedValue(0);
    const formTranslateY = useSharedValue(20);

    // Input focus animations
    const emailFocusValue = useSharedValue(0);
    const passwordFocusValue = useSharedValue(0);

    const { login } = useUser();

    useEffect(() => {
        // Initial entrance
        formOpacity.value = withTiming(1, { duration: 800 });
        formTranslateY.value = withSpring(0);

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

    useEffect(() => {
        emailFocusValue.value = withTiming(emailFocused ? 1 : 0, { duration: 200 });
    }, [emailFocused]);

    useEffect(() => {
        passwordFocusValue.value = withTiming(passwordFocused ? 1 : 0, { duration: 200 });
    }, [passwordFocused]);

    const animatedGlowStyle = useAnimatedStyle(() => {
        const opacity = interpolate(glowValue.value, [0, 1], [0.3, 0.6]);
        const scale = interpolate(glowValue.value, [0, 1], [1, 1.2]);
        return {
            opacity,
            transform: [{ scale }],
        };
    });

    const animatedFloatStyle = useAnimatedStyle(() => {
        const translateY = interpolate(floatValue.value, [0, 1], [0, -15]);
        return {
            transform: [{ translateY }],
        };
    });

    const animatedFormStyle = useAnimatedStyle(() => ({
        opacity: formOpacity.value,
        transform: [{ translateY: formTranslateY.value }],
    }));

    const emailInputStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(
            emailFocusValue.value,
            [0, 1],
            ['rgba(255, 255, 255, 0.4)', ModernVedicTheme.colors.primary]
        ),
        backgroundColor: interpolateColor(
            emailFocusValue.value,
            [0, 1],
            ['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.95)']
        ),
    }));

    const passwordInputStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(
            passwordFocusValue.value,
            [0, 1],
            ['rgba(255, 255, 255, 0.4)', ModernVedicTheme.colors.primary]
        ),
        backgroundColor: interpolateColor(
            passwordFocusValue.value,
            [0, 1],
            ['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.95)']
        ),
    }));

    const handleLogin = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !password) {
            Alert.alert(t('error'), t('fill_all_fields'));
            return;
        }

        setLoading(true);
        try {
            const deviceId = await DeviceInfo.getUniqueId();
            const response = await apiClient.post('/login', {
                email: normalizedEmail,
                password,
                deviceId
            }, {
                ...({ __skipAuthSession: true } as any),
            });

            const { user } = response.data;
            await login(user, response.data);
        } catch (error: any) {
            console.warn('Login failure:', error.message);
            const msg = error.response?.data?.error || t('login_failed');
            Alert.alert(
                t('error'),
                msg,
                [
                    { text: t('common.close') || 'Закрыть', style: 'cancel' },
                    {
                        text: 'Поддержка',
                        onPress: () => navigation.navigate('SupportHome', { entryPoint: 'login' }),
                    },
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDevLogin = useCallback(async () => {
        const devEmail = 'dev_admin_yatra@example.com';
        const devPassword = 'password123';
        const fallbackDevEmail = `dev_admin_yatra_${Date.now()}@example.com`;
        const devAuthBases = Array.from(new Set([
            API_PATH.replace(/\/+$/, ''),
            'https://api.vedamatch.ru/api',
        ]));
        const isLikelyNetworkFailure = (error: any): boolean => {
            const status = error?.status || error?.response?.status;
            if (typeof status === 'number' && Number.isFinite(status)) {
                return false;
            }

            const message = String(error?.message || '').toLowerCase();
            return (
                message.includes('network request failed') ||
                message.includes('network error') ||
                message.includes('failed to fetch') ||
                message.includes('load failed') ||
                message.includes('timed out')
            );
        };
        const doLocalDevLogin = async () => {
            const localDevProfile = {
                ID: 999999,
                email: fallbackDevEmail,
                karmicName: 'Super Admin',
                spiritualName: 'Servant of Servants',
                isProfileComplete: true,
                isTourCompleted: true,
                city: 'Mayapur',
                madh: 'Gaudiya',
                identity: 'Admin',
                role: 'admin',
                latitude: 23.4193,
                longitude: 88.3885,
                godModeEnabled: true,
            };

            await login(localDevProfile, {
                accessToken: 'dev-offline-access-token',
                token: 'dev-offline-access-token',
            });

            Alert.alert('DEV Mode', 'Сервер недоступен. Вход выполнен в локальном DEV-режиме.');
        };

        const devRequest = async <T,>(
            method: 'POST' | 'PUT',
            path: string,
            payload: Record<string, any>,
            token?: string,
        ): Promise<T> => {
            let lastError: any;

            for (const base of devAuthBases) {
                const url = `${base}${path}`;
                try {
                    const response = await fetch(url, {
                        method,
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify(payload),
                    });

                    const raw = await response.text();
                    let data: any = {};
                    try {
                        data = raw ? JSON.parse(raw) : {};
                    } catch {
                        data = { error: raw };
                    }

                    if (!response.ok) {
                        const error: any = new Error(data?.error || data?.message || `HTTP ${response.status}`);
                        error.status = response.status;
                        error.url = url;
                        error.response = { data, status: response.status };
                        throw error;
                    }

                    return data as T;
                } catch (error: any) {
                    lastError = error;
                    const status = error?.status || error?.response?.status;
                    if (status && status >= 400 && status < 500) {
                        throw error;
                    }
                }
            }

            throw lastError || new Error('Network Error');
        };

        const devUser = {
            email: devEmail,
            password: devPassword,
            karmicName: 'Super Admin',
            spiritualName: 'Servant of Servants',
            gender: 'Male',
            country: 'India',
            city: 'Mayapur',
            identity: 'Dev',
            diet: 'Vegetarian',
            madh: 'Gaudiya',
            mentor: 'Srila Prabhupada',
            dob: '1980-01-01',
            isProfileComplete: true,
            role: 'user'
        };

        setLoading(true);

        try {
            const deviceId = await DeviceInfo.getUniqueId();
            // 1. Try Login
            const response = await devRequest<{
                user: any;
                accessToken?: string;
                token?: string;
            }>('POST', '/login', {
                email: devEmail,
                password: devPassword,
                deviceId
            });

            let user = response.user;
            const token = response.accessToken || response.token;

            // Update profile if inconsistent
            if (!user.isProfileComplete) {
                const profile = await devRequest<{ user: any }>(
                    'PUT',
                    '/update-profile',
                    { ...devUser },
                    token,
                );
                user = profile.user;
            }

            await login(user, response);
        } catch (error: any) {
            // 2. If Login fails, try register static dev user, then fallback to unique email
            try {
                const deviceId = await DeviceInfo.getUniqueId();
                // Register
                await devRequest('POST', '/register', { ...devUser, email: devEmail, deviceId });

                // Login after register
                const loginRes = await devRequest<{ user: any }>('POST', '/login', {
                    email: devEmail,
                    password: devPassword,
                    deviceId
                });

                const user = loginRes.user;
                await login(user, loginRes);
            } catch (regError: any) {
                try {
                    const deviceId = await DeviceInfo.getUniqueId();
                    const fallbackUser = { ...devUser, email: fallbackDevEmail };
                    await devRequest('POST', '/register', { ...fallbackUser, deviceId });
                    const fallbackLoginRes = await devRequest<{ user: any }>('POST', '/login', {
                        email: fallbackDevEmail,
                        password: devPassword,
                        deviceId
                    });
                    await login(fallbackLoginRes.user, fallbackLoginRes);
                } catch (fallbackError: any) {
                    if (isLikelyNetworkFailure(fallbackError) || isLikelyNetworkFailure(regError)) {
                        await doLocalDevLogin();
                        return;
                    }

                    const errorMsg =
                        fallbackError.response?.data?.error ||
                        regError.response?.data?.error ||
                        fallbackError.message ||
                        regError.message;
                    const failedUrl = fallbackError?.url || regError?.url;
                    const attemptedBases = devAuthBases.join('\n');
                    const debugSuffix = `${failedUrl ? `\nURL: ${failedUrl}` : ''}\nBases:\n${attemptedBases}`;
                    Alert.alert('Dev Error', `Failed to create/login dev user: ${errorMsg}${debugSuffix}`);
                }
            }
        } finally {
            setLoading(false);
        }
    }, [login]);

    return (
        <ScreenScaffold variant="settings" enableAura>
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Background Layers */}
            <View style={StyleSheet.absoluteFill}>
                <LinearGradient
                    colors={[ModernVedicTheme.colors.background, '#FFE8D6', '#FFF8F0']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </View>

            {/* Decorative Om Glow in Background */}
            <Animated.View style={[styles.glow, animatedGlowStyle]}>
                <LinearGradient
                    colors={['rgba(214, 125, 62, 0.15)', 'transparent']}
                    style={styles.glowGradient}
                />
            </Animated.View>

            <Animated.View style={[styles.glowBottom, animatedGlowStyle]}>
                <LinearGradient
                    colors={['rgba(255, 179, 0, 0.1)', 'transparent']}
                    style={styles.glowGradient}
                />
            </Animated.View>

            <KeyboardAwareContainer style={styles.keyboardView}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={[styles.content, animatedFormStyle]}>
                        <Animated.View style={[styles.headerContainer, animatedFloatStyle]}>
                            <View style={styles.logoWrapper}>
                                <Image
                                    source={require('../assets/logo_tilak.png')}
                                    style={styles.logoImage}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text style={styles.title}>VedaMatch</Text>
                            <Text style={styles.subtitle}>Connect Your Soul • Discover Your Match</Text>
                        </Animated.View>

                        <View style={styles.formCard}>
                            <Animated.View style={[styles.inputContainer, emailInputStyle]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('auth.emailPlaceholder')}
                                    placeholderTextColor="rgba(107, 91, 83, 0.6)"
                                    value={email}
                                    onChangeText={setEmail}
                                    onFocus={() => setEmailFocused(true)}
                                    onBlur={() => setEmailFocused(false)}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </Animated.View>

                            <Animated.View style={[styles.inputContainer, passwordInputStyle]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('auth.passwordPlaceholder')}
                                    placeholderTextColor="rgba(107, 91, 83, 0.6)"
                                    value={password}
                                    onChangeText={setPassword}
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => setPasswordFocused(false)}
                                    secureTextEntry={!passwordVisible}
                                />
                                <TouchableOpacity
                                    onPress={() => setPasswordVisible(!passwordVisible)}
                                    style={styles.eyeButton}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <View style={styles.eyeIconContainer}>
                                        {passwordVisible ? (
                                            <View style={styles.eyeIconBox}>
                                                <View style={styles.eyeBase} />
                                                <View style={styles.eyePupil} />
                                                <View style={styles.eyeSlash} />
                                            </View>
                                        ) : (
                                            <View style={styles.eyeIconBox}>
                                                <View style={styles.eyeBase} />
                                                <View style={styles.eyePupil} />
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>

                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={handleLogin}
                                disabled={loading}
                                style={styles.loginButtonContainer}
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
                                    activeOpacity={0.8}
                                    style={[styles.devButton]}
                                    onPress={handleDevLogin}
                                    disabled={loading}
                                >
                                    <Text style={styles.devButtonText}>Быстрый вход (DEV)</Text>
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

                            <TouchableOpacity
                                style={styles.supportLink}
                                onPress={() => navigation.navigate('SupportHome', { entryPoint: 'login' })}
                            >
                                <Text style={styles.supportLinkText}>
                                    Не получается войти? Связаться с поддержкой
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAwareContainer>
        </View>
        </ScreenScaffold>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ModernVedicTheme.colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 28,
        paddingTop: height * 0.10,
        paddingBottom: 40,
    },
    scrollContent: {
        flexGrow: 1,
    },
    glow: {
        position: 'absolute',
        top: -width * 0.3,
        right: -width * 0.3,
        width: width,
        height: width,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowBottom: {
        position: 'absolute',
        bottom: -width * 0.4,
        left: -width * 0.4,
        width: width * 1.2,
        height: width * 1.2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowGradient: {
        width: '100%',
        height: '100%',
        borderRadius: width / 2,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        ...ModernVedicTheme.shadows.soft,
        shadowOpacity: 0.1,
    },
    logoImage: {
        width: 85,
        height: 85,
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
        color: ModernVedicTheme.colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Playfair Display' : 'serif',
        letterSpacing: 1.5,
        textShadowColor: '#8B0000',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 3,
    },
    subtitle: {
        fontSize: 14,
        color: ModernVedicTheme.colors.textSecondary,
        marginTop: 6,
        fontFamily: Platform.OS === 'ios' ? 'Nunito' : 'sans-serif',
        opacity: 0.8,
        letterSpacing: 0.5,
    },
    formCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
        borderRadius: 40,
        padding: 24,
        borderWidth: 0,
        ...ModernVedicTheme.shadows.medium,
        shadowColor: ModernVedicTheme.colors.primary,
        shadowOpacity: 0.08,
        shadowRadius: 25,
        elevation: 0,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        borderWidth: 0.8,
        marginBottom: 16,
        height: 60,
        paddingHorizontal: 24,
    },
    input: {
        flex: 1,
        fontSize: 17,
        color: ModernVedicTheme.colors.text,
        fontWeight: '500',
    },
    loginButtonContainer: {
        borderRadius: 24,
        overflow: 'hidden',
        marginTop: 12,
        ...ModernVedicTheme.shadows.soft,
        shadowColor: ModernVedicTheme.colors.primary,
        shadowOpacity: 0.25,
    },
    loginButton: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    devButton: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 24,
        marginTop: 12,
        borderWidth: 0,
    },
    devButtonText: {
        color: ModernVedicTheme.colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    registerLink: {
        marginTop: 28,
        alignItems: 'center',
    },
    registerLinkText: {
        color: ModernVedicTheme.colors.textSecondary,
        fontSize: 15,
        opacity: 0.9,
    },
    registerBold: {
        color: ModernVedicTheme.colors.primary,
        fontWeight: '700',
    },
    supportLink: {
        marginTop: 14,
        alignItems: 'center',
    },
    supportLinkText: {
        color: ModernVedicTheme.colors.textSecondary,
        fontSize: 13,
        opacity: 0.85,
    },
    eyeButton: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eyeIconContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eyeIconBox: {
        width: 20,
        height: 14,
        borderWidth: 1.5,
        borderColor: ModernVedicTheme.colors.textSecondary,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    eyeBase: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    eyePupil: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: ModernVedicTheme.colors.textSecondary,
    },
    eyeSlash: {
        width: 2,
        height: 22,
        backgroundColor: ModernVedicTheme.colors.textSecondary,
        position: 'absolute',
        transform: [{ rotate: '45deg' }],
    },
});

export default LoginScreen;
