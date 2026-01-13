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
    Image,
    StatusBar,
    Keyboard,
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
    withSpring,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import axios from 'axios';
import { API_PATH, APP_ENV } from '../config/api.config';
import { ModernVedicTheme } from '../theme/ModernVedicTheme';

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
        borderColor: interpolate(emailFocusValue.value, [0, 1], [0, 1]) === 1
            ? ModernVedicTheme.colors.primary
            : 'rgba(255, 255, 255, 0.4)',
        backgroundColor: interpolate(emailFocusValue.value, [0, 1], [0, 1]) === 1
            ? 'rgba(255, 255, 255, 0.95)'
            : 'rgba(255, 255, 255, 0.6)',
    }));

    const passwordInputStyle = useAnimatedStyle(() => ({
        borderColor: interpolate(passwordFocusValue.value, [0, 1], [0, 1]) === 1
            ? ModernVedicTheme.colors.primary
            : 'rgba(255, 255, 255, 0.4)',
        backgroundColor: interpolate(passwordFocusValue.value, [0, 1], [0, 1]) === 1
            ? 'rgba(255, 255, 255, 0.95)'
            : 'rgba(255, 255, 255, 0.6)',
    }));

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

            const { user, token } = response.data;
            await login(user, token);
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
            const loginRes = await axios.post(`${API_PATH}/login`, {
                email: devEmail,
                password: devPassword,
            });

            let { user, token } = loginRes.data;

            if (!user.isProfileComplete) {
                const updateRes = await axios.put(`${API_PATH}/update-profile`, {
                    ...devProfile
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                user = updateRes.data.user;
            }

            await login(user, token);

        } catch (error: any) {
            try {
                await axios.post(`${API_PATH}/register`, devProfile);

                const retryLoginRes = await axios.post(`${API_PATH}/login`, {
                    email: devEmail,
                    password: devPassword,
                });
                const { user, token } = retryLoginRes.data;
                await login(user, token);
            } catch (regError: any) {
                const errorMsg = regError.response?.data?.error || regError.message;
                Alert.alert('Dev Error', `Failed: ${errorMsg}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
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

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
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
                                    placeholder="Email Address"
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
                                    placeholder="Password"
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
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
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
