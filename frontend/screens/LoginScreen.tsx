import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    Linking,
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
import { VKAuthModal } from '../components/auth/VKAuthModal';
import { ScreenScaffold } from '../components/theme/ScreenScaffold';
import {
    createTelegramAuthSession,
    createVKAuthSession,
    finalizeTelegramSignIn,
    finalizeVKSignIn,
    isTelegramAuthCallbackUrl,
    isVKAuthCallbackUrl,
    signInWithGoogle,
} from '../services/socialAuthService';

const { width, height } = Dimensions.get('window');
const SLOGAN_ROTATION_MS = 4200;
const SLOGAN_FADE_MS = 280;
const ROTATING_SLOGAN_COUNT = 10;
const LOGIN_LANGUAGES = [
    { code: 'en', label: 'EN' },
    { code: 'ru', label: 'RU' },
    { code: 'hi', label: 'हिंदी' },
] as const;

const normalizeLanguageCode = (value?: string): string => {
    const normalized = (value || '').trim().toLowerCase();
    if (!normalized) return 'ru';
    if (normalized.startsWith('hi')) return 'hi';
    if (normalized.startsWith('en')) return 'en';
    return 'ru';
};

const extractDetailedVKError = (rawMessage: string): string => {
    if (rawMessage.startsWith('VK_AUTH_ERROR:')) {
        return decodeURIComponent(rawMessage.replace(/^VK_AUTH_ERROR:[^:]*:?/, '').trim());
    }

    if (rawMessage.startsWith('VK_TOKEN_EXCHANGE_FAILED:')) {
        return decodeURIComponent(rawMessage.replace(/^VK_TOKEN_EXCHANGE_FAILED:?/, '').trim());
    }

    return '';
};

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const { t, i18n } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [socialLoadingProvider, setSocialLoadingProvider] = useState<'google' | 'vk' | 'telegram' | null>(null);
    const [vkAuthUrl, setVKAuthUrl] = useState('');
    const [vkAuthState, setVKAuthState] = useState('');
    const [telegramAuthState, setTelegramAuthState] = useState('');
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [sloganIndex, setSloganIndex] = useState(0);
    const lastHandledVKCallbackRef = React.useRef('');
    const lastHandledTelegramCallbackRef = React.useRef('');

    // Animation values
    const glowValue = useSharedValue(0);
    const floatValue = useSharedValue(0);
    const formOpacity = useSharedValue(0);
    const formTranslateY = useSharedValue(20);
    const sloganOpacity = useSharedValue(1);

    // Input focus animations
    const emailFocusValue = useSharedValue(0);
    const passwordFocusValue = useSharedValue(0);

    const { login } = useUser();
    const activeLanguage = normalizeLanguageCode(i18n.language);
    const loginCopy = useMemo(() => {
        if (activeLanguage === 'hi') {
            return {
                devModeTitle: 'DEV मोड',
                serverUnavailableSignedIn: 'सर्वर उपलब्ध नहीं है। स्थानीय DEV मोड से साइन इन किया गया।',
                devErrorTitle: 'DEV त्रुटि',
                failedToCreateDevUser: 'DEV उपयोगकर्ता बनाना/लॉगिन करना विफल रहा',
                networkError: 'नेटवर्क त्रुटि',
            };
        }
        if (activeLanguage === 'en') {
            return {
                devModeTitle: 'DEV Mode',
                serverUnavailableSignedIn: 'Server unavailable. Signed in with local DEV mode.',
                devErrorTitle: 'Dev Error',
                failedToCreateDevUser: 'Failed to create/login dev user',
                networkError: 'Network Error',
            };
        }
        return {
            devModeTitle: 'DEV-режим',
            serverUnavailableSignedIn: 'Сервер недоступен. Выполнен вход в локальном DEV-режиме.',
            devErrorTitle: 'DEV-ошибка',
            failedToCreateDevUser: 'Не удалось создать DEV-пользователя или выполнить вход',
            networkError: 'Ошибка сети',
        };
    }, [activeLanguage]);
    const rotatingSlogans = useMemo(() => {
        const values = Array.from({ length: ROTATING_SLOGAN_COUNT }, (_, idx) => (
            t(`auth.loginScreen.rotatingSlogans.${idx}`)
        )).map((item) => item.trim()).filter(Boolean);
        return Array.from(new Set(values));
    }, [t]);

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
    }, [floatValue, formOpacity, formTranslateY, glowValue]);

    useEffect(() => {
        emailFocusValue.value = withTiming(emailFocused ? 1 : 0, { duration: 200 });
    }, [emailFocused, emailFocusValue]);

    useEffect(() => {
        passwordFocusValue.value = withTiming(passwordFocused ? 1 : 0, { duration: 200 });
    }, [passwordFocused, passwordFocusValue]);

    useEffect(() => {
        setSloganIndex(0);
        sloganOpacity.value = 1;

        if (rotatingSlogans.length <= 1) return;

        let swapTimer: ReturnType<typeof setTimeout> | null = null;
        const intervalId = setInterval(() => {
            sloganOpacity.value = withTiming(0, { duration: SLOGAN_FADE_MS });
            swapTimer = setTimeout(() => {
                setSloganIndex((prev) => (prev + 1) % rotatingSlogans.length);
                sloganOpacity.value = withTiming(1, { duration: SLOGAN_FADE_MS });
            }, SLOGAN_FADE_MS + 40);
        }, SLOGAN_ROTATION_MS);

        return () => {
            clearInterval(intervalId);
            if (swapTimer) clearTimeout(swapTimer);
        };
    }, [rotatingSlogans.length, sloganOpacity]);

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

    const animatedSloganStyle = useAnimatedStyle(() => ({
        opacity: sloganOpacity.value,
        transform: [{ translateY: interpolate(sloganOpacity.value, [0, 1], [4, 0]) }],
    }));

    const emailInputStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(
            emailFocusValue.value,
            [0, 1],
            ['rgba(255, 232, 196, 0.72)', 'rgba(255, 153, 51, 0.92)']
        ),
        backgroundColor: interpolateColor(
            emailFocusValue.value,
            [0, 1],
            ['rgba(255, 255, 255, 0.54)', 'rgba(255, 255, 255, 0.82)']
        ),
    }));

    const passwordInputStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(
            passwordFocusValue.value,
            [0, 1],
            ['rgba(255, 232, 196, 0.72)', 'rgba(255, 153, 51, 0.92)']
        ),
        backgroundColor: interpolateColor(
            passwordFocusValue.value,
            [0, 1],
            ['rgba(255, 255, 255, 0.54)', 'rgba(255, 255, 255, 0.82)']
        ),
    }));

    const handleLogin = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !password) {
            Alert.alert(t('common.error'), t('auth.loginScreen.errors.fillRequired'));
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
            const msg = error.response?.data?.error || t('auth.loginScreen.errors.loginFailed');
            Alert.alert(
                t('common.error'),
                msg,
                [
                    { text: t('common.close') || 'Close', style: 'cancel' },
                    {
                        text: t('auth.loginScreen.supportCta'),
                        onPress: () => navigation.navigate('SupportHome', { entryPoint: 'login' }),
                    },
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleLanguageChange = useCallback(async (languageCode: 'ru' | 'en' | 'hi') => {
        if (normalizeLanguageCode(i18n.language) === languageCode) return;
        try {
            await i18n.changeLanguage(languageCode);
        } catch (error) {
            console.warn('Failed to change language:', error);
        }
    }, [i18n]);

    const trackSocialClick = useCallback((provider: 'vk' | 'google' | 'telegram') => {
        console.log('[AuthSocialClick]', {
            event: 'auth_social_click_total',
            provider,
            screen: 'login',
            ts: new Date().toISOString(),
        });
    }, []);

    const handleGoogleSignIn = useCallback(async () => {
        trackSocialClick('google');
        setSocialLoadingProvider('google');
        try {
            console.log('[GoogleAuth] handleGoogleSignIn:start');
            const response = await signInWithGoogle();
            console.log('[GoogleAuth] handleGoogleSignIn:signInWithGoogle:done');
            await login(response.user as Parameters<typeof login>[0], response.authPayload);
            console.log('[GoogleAuth] handleGoogleSignIn:login:done');
        } catch (_error: any) {
            console.warn('[GoogleAuth] handleGoogleSignIn:error', _error?.message || _error);
            const backendMessage = _error?.response?.data?.error;
            const fallbackMessage = t('auth.loginScreen.errors.googleFailed');
            Alert.alert(t('common.error'), backendMessage || fallbackMessage);
        } finally {
            console.log('[GoogleAuth] handleGoogleSignIn:finally');
            setSocialLoadingProvider(null);
        }
    }, [login, t, trackSocialClick]);

    const handleVKSignIn = useCallback(async () => {
        trackSocialClick('vk');
        setSocialLoadingProvider('vk');
        try {
            const session = createVKAuthSession();
            setVKAuthState(session.state);
            if (session.presentation === 'external') {
                setVKAuthUrl('');
                try {
                    await Linking.openURL(session.authorizeUrl);
                    setSocialLoadingProvider(null);
                    return;
                } catch (launchError: any) {
                    console.warn(
                        'VK auth external launch failed:',
                        session.authorizeUrl,
                        launchError?.message || launchError,
                    );

                    if (Platform.OS === 'android') {
                        setVKAuthUrl(session.authorizeUrl);
                        setSocialLoadingProvider(null);
                        return;
                    }

                    throw launchError;
                }
            }

            setVKAuthUrl(session.authorizeUrl);
            setSocialLoadingProvider(null);
        } catch (_error: any) {
            const rawMessage = String(_error?.message || '');
            const backendMessage = _error?.response?.data?.error;
            if (rawMessage || backendMessage) {
                console.warn('VK auth start failure:', rawMessage || '<empty>', backendMessage || '');
            }
            const fallbackMessage = t('auth.loginScreen.errors.vkFailed');
            Alert.alert(t('common.error'), backendMessage || fallbackMessage);
            setVKAuthState('');
            setVKAuthUrl('');
            setSocialLoadingProvider(null);
        }
    }, [t, trackSocialClick]);

    const handleTelegramSignIn = useCallback(async () => {
        trackSocialClick('telegram');
        setSocialLoadingProvider('telegram');
        try {
            const session = await createTelegramAuthSession();
            setTelegramAuthState(session.state);
            await Linking.openURL(session.launchUrl);
        } catch (_error: any) {
            const backendMessage = _error?.response?.data?.error;
            const fallbackMessage = t('auth.loginScreen.errors.telegramFailed');
            setTelegramAuthState('');
            Alert.alert(t('common.error'), backendMessage || fallbackMessage);
        } finally {
            setSocialLoadingProvider(null);
        }
    }, [t, trackSocialClick]);

    const closeVKAuthModal = useCallback(() => {
        setVKAuthState('');
        setVKAuthUrl('');
        setSocialLoadingProvider(null);
    }, []);

    const handleVKAuthComplete = useCallback(async (callbackUrl: string) => {
        if (!vkAuthState) {
            closeVKAuthModal();
            return;
        }

        try {
            setSocialLoadingProvider('vk');
            const response = await finalizeVKSignIn(callbackUrl, vkAuthState);
            closeVKAuthModal();
            await login(response.user as Parameters<typeof login>[0], response.authPayload);
        } catch (_error: any) {
            closeVKAuthModal();
            const backendMessage = _error?.response?.data?.error;
            const rawMessage = String(_error?.message || '');
            const detailedVKError = extractDetailedVKError(rawMessage);
            if (rawMessage || backendMessage) {
                console.warn('VK auth failure:', rawMessage || '<empty>', backendMessage || '');
            }
            const fallbackMessage = detailedVKError || backendMessage || t('auth.loginScreen.errors.vkFailed');
            Alert.alert(t('common.error'), fallbackMessage);
        }
    }, [closeVKAuthModal, login, t, vkAuthState]);

    const handleTelegramAuthComplete = useCallback(async (callbackUrl: string) => {
        if (!telegramAuthState) {
            return;
        }

        try {
            setSocialLoadingProvider('telegram');
            const response = await finalizeTelegramSignIn(callbackUrl, telegramAuthState);
            setTelegramAuthState('');
            await login(response.user as Parameters<typeof login>[0], response.authPayload);
        } catch (_error: any) {
            setTelegramAuthState('');
            const backendMessage = _error?.response?.data?.error;
            const fallbackMessage = t('auth.loginScreen.errors.telegramFailed');
            Alert.alert(t('common.error'), backendMessage || fallbackMessage);
        } finally {
            setSocialLoadingProvider(null);
        }
    }, [login, t, telegramAuthState]);

    useEffect(() => {
        if (!vkAuthState) {
            lastHandledVKCallbackRef.current = '';
            return undefined;
        }

        const maybeHandleVKCallback = (url?: string | null) => {
            const nextUrl = String(url || '').trim();
            if (!nextUrl || !isVKAuthCallbackUrl(nextUrl)) {
                return;
            }
            if (lastHandledVKCallbackRef.current === nextUrl) {
                return;
            }

            lastHandledVKCallbackRef.current = nextUrl;
            handleVKAuthComplete(nextUrl).catch(() => undefined);
        };

        Linking.getInitialURL()
            .then((initialUrl) => {
                maybeHandleVKCallback(initialUrl);
            })
            .catch(() => {});

        const subscription = Linking.addEventListener('url', ({ url }) => {
            maybeHandleVKCallback(url);
        });

        return () => {
            subscription.remove();
        };
    }, [handleVKAuthComplete, vkAuthState]);

    useEffect(() => {
        if (!telegramAuthState) {
            lastHandledTelegramCallbackRef.current = '';
            return undefined;
        }

        const maybeHandleTelegramCallback = (url?: string | null) => {
            const nextUrl = String(url || '').trim();
            if (!nextUrl || !isTelegramAuthCallbackUrl(nextUrl)) {
                return;
            }
            if (lastHandledTelegramCallbackRef.current === nextUrl) {
                return;
            }

            lastHandledTelegramCallbackRef.current = nextUrl;
            handleTelegramAuthComplete(nextUrl).catch(() => undefined);
        };

        Linking.getInitialURL()
            .then((initialUrl) => {
                maybeHandleTelegramCallback(initialUrl);
            })
            .catch(() => {});

        const subscription = Linking.addEventListener('url', ({ url }) => {
            maybeHandleTelegramCallback(url);
        });

        return () => {
            subscription.remove();
        };
    }, [handleTelegramAuthComplete, telegramAuthState]);

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

            Alert.alert(loginCopy.devModeTitle, loginCopy.serverUnavailableSignedIn);
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

            throw lastError || new Error(loginCopy.networkError);
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
        } catch {
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
                    Alert.alert(loginCopy.devErrorTitle, `${loginCopy.failedToCreateDevUser}: ${errorMsg}${debugSuffix}`);
                }
            }
        } finally {
            setLoading(false);
        }
    }, [login, loginCopy]);

    return (
        <ScreenScaffold variant="settings" enableAura>
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Background Layers */}
            <View style={StyleSheet.absoluteFill}>
                <LinearGradient
                    colors={['#FAF7F0', '#FFFDF8', '#FDF4E3']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.05, y: 0 }}
                    end={{ x: 0.95, y: 1 }}
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

            <View style={styles.languageSwitchOverlay}>
                <View style={styles.languageSwitchContainer}>
                    {LOGIN_LANGUAGES.map((option, index) => {
                        const isActive = activeLanguage === option.code;
                        return (
                            <TouchableOpacity
                                key={option.code}
                                style={[
                                    styles.languageOption,
                                    isActive && styles.languageOptionActive,
                                    index !== LOGIN_LANGUAGES.length - 1 && styles.languageOptionGap,
                                ]}
                                onPress={() => handleLanguageChange(option.code)}
                                accessibilityRole="button"
                                accessibilityLabel={option.label}
                            >
                                <Text style={[styles.languageOptionText, isActive && styles.languageOptionTextActive]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

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
                                    source={require('../assets/logo_veda_match.png')}
                                    style={styles.logoImage}
                                    resizeMode="contain"
                                />
                            </View>
                            <View style={styles.subtitleSlot}>
                                <Animated.Text
                                    style={[styles.subtitle, animatedSloganStyle]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                >
                                    {rotatingSlogans[sloganIndex] || t('auth.loginScreen.subtitle')}
                                </Animated.Text>
                            </View>
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
                                        <Text style={styles.loginButtonText}>{t('auth.loginScreen.loginButton')}</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.socialSection}>
                                <Text style={styles.socialTitle}>{t('auth.loginScreen.orContinueWith')}</Text>
                                <View style={styles.socialButtonsRow}>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={styles.socialButton}
                                        onPress={handleGoogleSignIn}
                                        disabled={loading || socialLoadingProvider === 'google'}
                                    >
                                        {socialLoadingProvider === 'google' ? (
                                            <ActivityIndicator color={ModernVedicTheme.colors.primary} />
                                        ) : (
                                            <Text style={styles.socialButtonText}>{t('auth.loginScreen.social.google')}</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={styles.socialButton}
                                        onPress={handleVKSignIn}
                                        disabled={loading || socialLoadingProvider !== null}
                                    >
                                        {socialLoadingProvider === 'vk' ? (
                                            <ActivityIndicator color={ModernVedicTheme.colors.primary} />
                                        ) : (
                                            <Text style={styles.socialButtonText}>{t('auth.loginScreen.social.vk')}</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={styles.socialButton}
                                        onPress={handleTelegramSignIn}
                                        disabled={loading || socialLoadingProvider !== null}
                                    >
                                        {socialLoadingProvider === 'telegram' ? (
                                            <ActivityIndicator color={ModernVedicTheme.colors.primary} />
                                        ) : (
                                            <Text style={styles.socialButtonText}>{t('auth.loginScreen.social.telegram')}</Text>
                                        )}
                                    </TouchableOpacity>

                                </View>
                            </View>

                            {APP_ENV !== 'production' && (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.devButton]}
                                    onPress={handleDevLogin}
                                    disabled={loading}
                                >
                                    <Text style={styles.devButtonText}>{t('auth.devLogin')}</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.registerLink}
                                onPress={() => navigation.navigate('Registration', { isDarkMode: false, phase: 'initial' })}
                            >
                                <Text style={styles.registerLinkText}>
                                    {t('auth.loginScreen.createAccountPrefix')}{' '}
                                    <Text style={styles.registerBold}>{t('auth.loginScreen.createAccountCta')}</Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.supportLink}
                                onPress={() => navigation.navigate('SupportHome', { entryPoint: 'login' })}
                            >
                                <Text style={styles.supportLinkText}>
                                    {t('auth.loginScreen.supportPrompt')} <Text style={styles.supportLinkBold}>{t('auth.loginScreen.supportCta')}</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAwareContainer>
        </View>
        <VKAuthModal
            visible={Boolean(vkAuthUrl && vkAuthState)}
            authorizeUrl={vkAuthUrl}
            title={t('auth.loginScreen.social.vk')}
            loadingLabel={t('common.loading')}
            closeLabel={t('common.close')}
            onClose={closeVKAuthModal}
            onComplete={handleVKAuthComplete}
        />
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
        paddingTop: height * 0.14,
        paddingBottom: 40,
    },
    languageSwitchOverlay: {
        position: 'absolute',
        top: 56,
        right: 28,
        zIndex: 80,
        elevation: 10,
    },
    languageSwitchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: ModernVedicTheme.colors.border,
        backgroundColor: 'rgba(255, 253, 248, 0.96)',
        paddingHorizontal: 8,
        paddingVertical: 6,
        zIndex: 40,
        elevation: 6,
    },
    languageOption: {
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 12,
    },
    languageOptionActive: {
        backgroundColor: 'rgba(255, 153, 51, 0.18)',
    },
    languageOptionGap: {
        marginRight: 2,
    },
    languageOptionText: {
        color: ModernVedicTheme.colors.textSecondary,
        fontSize: 11,
        fontWeight: '700',
    },
    languageOptionTextActive: {
        color: ModernVedicTheme.colors.primary,
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
        marginBottom: 30,
    },
    logoWrapper: {
        width: 142,
        height: 142,
        borderRadius: 71,
        backgroundColor: 'rgba(255, 255, 255, 0.72)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: ModernVedicTheme.colors.glassBorder,
        ...ModernVedicTheme.shadows.soft,
        shadowOpacity: 0.22,
        shadowRadius: 22,
        elevation: 7,
    },
    logoImage: {
        width: 112,
        height: 112,
        transform: [{ translateY: -8 }],
    },
    subtitle: {
        fontSize: 15,
        color: ModernVedicTheme.colors.textSecondary,
        fontFamily: Platform.OS === 'ios' ? 'Nunito' : 'sans-serif',
        opacity: 0.92,
        letterSpacing: 0.35,
        textAlign: 'center',
        width: '100%',
        maxWidth: 360,
        alignSelf: 'center',
        lineHeight: 20,
    },
    subtitleSlot: {
        marginTop: 2,
        height: 24,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    formCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 253, 248, 0.84)',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: ModernVedicTheme.colors.border,
        ...ModernVedicTheme.shadows.medium,
        shadowColor: ModernVedicTheme.colors.primary,
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 2,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        borderWidth: 1.2,
        marginBottom: 16,
        height: 60,
        paddingHorizontal: 24,
        shadowColor: 'rgba(244, 197, 66, 0.45)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
        elevation: 3,
    },
    input: {
        flex: 1,
        fontSize: 17,
        color: ModernVedicTheme.colors.text,
        fontWeight: '500',
    },
    loginButtonContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 12,
        ...ModernVedicTheme.shadows.soft,
        shadowColor: ModernVedicTheme.colors.primary,
        shadowOpacity: 0.25,
    },
    loginButton: {
        height: 58,
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
    socialSection: {
        marginTop: 16,
    },
    socialTitle: {
        color: ModernVedicTheme.colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 10,
        opacity: 0.85,
    },
    socialButtonsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
    },
    socialButton: {
        width: '31%',
        minWidth: 84,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 253, 248, 0.95)',
        borderWidth: 1,
        borderColor: ModernVedicTheme.colors.border,
    },
    socialButtonText: {
        color: ModernVedicTheme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
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
        textAlign: 'center',
    },
    supportLinkBold: {
        color: ModernVedicTheme.colors.primary,
        fontWeight: '700',
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
