
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Image,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { useUser } from '../context/UserContext';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import { resolveEffectivePerformanceMode } from '../utils/androidVisualPolicy';
import { useTranslation } from 'react-i18next';
import peacockAssistant from '../assets/peacockAssistant.png';
import krishnaAssistant from '../assets/krishnaAssistant.png';
import nanoBanano from '../assets/nano_banano.png';

const { width } = Dimensions.get('window');

export const KrishnaAssistant: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { i18n } = useTranslation();
    const { user, setTourCompleted } = useUser();
    const { handleNewChat } = useChat();
    const { assistantType, performanceMode, runtimePerformanceState } = useSettings();
    const [isVisible, setIsVisible] = useState(false);
    const [isRollingOut, setIsRollingOut] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1); // -1 means no tour active

    const navState = useNavigationState(state => state);
    const currentRoute = navState?.routes[navState.index]?.name;
    const currentParams = navState?.routes[navState.index]?.params as any;

    // Animation values
    const translateX = useSharedValue(200); // Start from right
    const rotation = useSharedValue(0);
    const translateY = useSharedValue(0);
    const shimmerX = useSharedValue(-100);
    const effectivePerformanceMode = resolveEffectivePerformanceMode(performanceMode, runtimePerformanceState);
    const isAndroidReducedEffects = Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality';
    const copy =
        i18n.language === 'ru'
            ? {
                  steps: [
                      { title: 'Харе Кришна!', text: 'Я проведу для вас небольшую экскурсию. Это раздел Портал.', tab: 'portal' },
                      { title: 'Контакты', text: 'Здесь вы можете найти преданных и друзей.', tab: 'contacts' },
                      { title: 'Чат', text: 'Общайтесь и задавайте вопросы AI помощнику.', tab: 'chat' },
                      { title: 'Союз', text: 'Для поиска единомышленников.', tab: 'dating' },
                      { title: 'Магазины', text: 'Товары для преданных и вегетарианцев.', tab: 'shops' },
                      { title: 'Объявления', text: 'Услуги и предложения сообщества.', tab: 'ads' },
                      { title: 'Новости', text: 'Будьте в курсе всех событий.', tab: 'news' },
                      { title: 'База знаний', text: 'Изучайте священные писания и духовную мудрость.', tab: 'knowledge_base' },
                      { title: 'Готово!', text: 'Приятного использования! Вы всегда можете позвать меня снова.', tab: 'done' },
                  ],
                  login: 'Харе Кришна! Чтобы начать наше общение, пожалуйста, войдите в свой профиль или создайте новый.',
                  registrationInitial: 'Харе Кришна! Регистрация поможет мне лучше понимать ваши потребности и давать более точные советы.',
                  registrationLater: 'Заполнение профиля откроет вам доступ ко всем сервисам Портала и сделает наши беседы более персонализированными.',
                  default: 'Харе Кришна! Чем я могу вам служить сегодня?',
                  smiley: 'Колобок дас',
                  feather: 'Перо дас',
              }
            : i18n.language === 'hi'
              ? {
                    steps: [
                      { title: 'हरे कृष्ण!', text: 'मैं आपको एक छोटी यात्रा कराऊँगा। यह पोर्टल सेक्शन है।', tab: 'portal' },
                      { title: 'संपर्क', text: 'यहाँ आप भक्तों और मित्रों को खोज सकते हैं।', tab: 'contacts' },
                      { title: 'चैट', text: 'AI सहायक से बात करें और प्रश्न पूछें।', tab: 'chat' },
                      { title: 'यूनियन', text: 'समान विचार वाले लोगों को खोजने के लिए।', tab: 'dating' },
                      { title: 'दुकानें', text: 'भक्तों और शाकाहारियों के लिए वस्तुएँ।', tab: 'shops' },
                      { title: 'घोषणाएँ', text: 'समुदाय की सेवाएँ और प्रस्ताव।', tab: 'ads' },
                      { title: 'समाचार', text: 'सभी घटनाओं से अपडेट रहें।', tab: 'news' },
                      { title: 'ज्ञान आधार', text: 'शास्त्रों और आध्यात्मिक ज्ञान का अध्ययन करें।', tab: 'knowledge_base' },
                      { title: 'हो गया!', text: 'उपयोग का आनंद लें! आप मुझे फिर कभी भी बुला सकते हैं।', tab: 'done' },
                  ],
                  login: 'हरे कृष्ण! बातचीत शुरू करने के लिए कृपया अपने प्रोफाइल में लॉग इन करें या नया प्रोफाइल बनाएं।',
                  registrationInitial: 'हरे कृष्ण! पंजीकरण से मैं आपकी ज़रूरतों को बेहतर समझ पाऊँगा और अधिक सटीक सलाह दे पाऊँगा।',
                  registrationLater: 'प्रोफाइल पूरा करने से आपको पोर्टल की सभी सेवाओं तक पहुंच मिलेगी और हमारी बातचीत अधिक व्यक्तिगत हो जाएगी।',
                  default: 'हरे कृष्ण! आज मैं आपकी किस प्रकार सेवा कर सकता हूँ?',
                  smiley: 'कोलोबोक दास',
                  feather: 'पेरो दास',
                }
              : {
                  steps: [
                      { title: 'Hare Krishna!', text: 'I will give you a short tour. This is the Portal section.', tab: 'portal' },
                      { title: 'Contacts', text: 'Here you can find devotees and friends.', tab: 'contacts' },
                      { title: 'Chat', text: 'Talk and ask questions to the AI assistant.', tab: 'chat' },
                      { title: 'Union', text: 'For finding like-minded people.', tab: 'dating' },
                      { title: 'Shops', text: 'Goods for devotees and vegetarians.', tab: 'shops' },
                      { title: 'Ads', text: 'Community services and offers.', tab: 'ads' },
                      { title: 'News', text: 'Stay up to date with all events.', tab: 'news' },
                      { title: 'Knowledge Base', text: 'Study sacred scriptures and spiritual wisdom.', tab: 'knowledge_base' },
                      { title: 'Done!', text: 'Enjoy using the app! You can always call me again.', tab: 'done' },
                  ],
                  login: 'Hare Krishna! To start our conversation, please sign in to your profile or create a new one.',
                  registrationInitial: 'Hare Krishna! Registration will help me understand your needs better and give more accurate advice.',
                  registrationLater: 'Completing your profile will unlock all Portal services and make our conversations more personalized.',
                  default: 'Hare Krishna! How may I serve you today?',
                  smiley: 'Kolobok das',
                  feather: 'Pero das',
                };

    // Rolling In from right
    const rollIn = useCallback(() => {
        setIsVisible(true);
        setIsRollingOut(false);
        translateX.value = withSpring(-20, { damping: 15 });
        rotation.value = withSpring(-720, { damping: 15 });
    }, []);

    // Rolling Out to right
    const rollOut = useCallback(() => {
        setIsRollingOut(true);
        translateX.value = withTiming(250, { duration: 800, easing: Easing.in(Easing.poly(3)) });
        rotation.value = withTiming(0, { duration: 800, easing: Easing.in(Easing.poly(3)) }, (finished) => {
            if (finished) {
                runOnJS(setIsVisible)(false);
                runOnJS(setIsRollingOut)(false);
            }
        });
    }, []);

    useEffect(() => {
        if (isVisible) {
            rollIn();
        }

        if (isAndroidReducedEffects) {
            translateY.value = withTiming(0, { duration: 120 });
            shimmerX.value = withTiming(-100, { duration: 120 });
            return;
        }

        // Floating effect
        translateY.value = withRepeat(
            withSequence(
                withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Shimmer effect
        shimmerX.value = withRepeat(
            withTiming(200, { duration: 3000, easing: Easing.linear }),
            -1,
            false
        );
    }, [isVisible, rollIn, isAndroidReducedEffects]);

    const prevRoute = React.useRef<string | undefined>(undefined);

    useEffect(() => {
        // Start tour ONLY if tour not completed and we are on Portal
        if (user && !user.isTourCompleted && currentRoute === 'Portal' && currentStep === -1) {
            setCurrentStep(0);
            rollIn();
        } else if (currentRoute === 'Portal' && currentStep === -1 && isVisible && currentRoute !== prevRoute.current) {
            // Collapse by default on Portal if no tour and we just arrived
            rollOut();
        }

        prevRoute.current = currentRoute;
    }, [user, currentRoute, currentStep, isVisible, rollIn, rollOut]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${rotation.value}deg` }
        ],
    }));

    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shimmerX.value }],
    }));

    const getMessage = () => {
        if (currentStep >= 0 && currentStep < copy.steps.length) {
            return copy.steps[currentStep].text;
        }

        switch (currentRoute) {
            case 'Login':
                return copy.login;
            case 'Registration':
                if (currentParams?.phase === 'initial') {
                    return copy.registrationInitial;
                } else {
                    return copy.registrationLater;
                }
            default:
                return copy.default;
        }
    }

    const handlePress = async () => {
        // Allow interaction on auth screens too
        if (currentStep >= 0) {
            if (currentStep < copy.steps.length - 1) {
                const nextStep = currentStep + 1;
                setCurrentStep(nextStep);
                const tab = copy.steps[nextStep].tab;
                if (tab && tab !== 'done' && tab !== 'portal') {
                    navigation.setParams({ initialTab: tab } as any);
                }
            } else {
                setCurrentStep(-1);
                await setTourCompleted();
                rollOut();
            }
        } else {
            handleNewChat();
            navigation.navigate('Chat');
        }
    };

    const isAuthScreen = !currentRoute || currentRoute === 'Login' || currentRoute === 'Registration';

    if (currentRoute === 'Chat' && currentStep === -1) return null;
    // Hide floating button on Portal - assistant call is now in the header
    if (currentRoute === 'Portal' && currentStep === -1) return null;

    if (!isVisible && !isRollingOut) {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                style={styles.callButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => {
                    handleNewChat();
                    navigation.navigate('Chat');
                }}
            >
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.callButtonGradient}
                >
                    {!isAndroidReducedEffects && (
                        <Animated.View style={[styles.shimmer, shimmerStyle]}>
                            <LinearGradient
                                colors={['transparent', 'rgba(255, 255, 255, 0.2)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    )}
                    <Image
                        source={assistantType === 'feather2' ? nanoBanano : (assistantType === 'feather' ? peacockAssistant : krishnaAssistant)}
                        style={styles.miniIcon}
                        resizeMode="contain"
                    />
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container} pointerEvents="box-none">
            <Animated.View style={[
                styles.wrapper,
                isAuthScreen ? { top: 100, bottom: undefined } : { top: '50%', bottom: undefined, marginTop: -50 },
                animatedStyle
            ]}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handlePress}
                    style={[
                        styles.touchArea,
                        isAuthScreen ? { flexDirection: 'column', alignItems: 'flex-end' } : { alignItems: 'center' }
                    ]}
                >
                    <View style={[styles.shadowWrapper, isAndroidReducedEffects && styles.shadowWrapperReduced]}>
                        <View style={styles.bubbleContainer}>
                            {!isAndroidReducedEffects && (
                                <BlurView
                                    style={StyleSheet.absoluteFill}
                                    blurType="dark"
                                    blurAmount={15}
                                    reducedTransparencyFallbackColor="rgba(15, 15, 25, 0.9)"
                                />
                            )}
                            {!isAndroidReducedEffects && (
                                <LinearGradient
                                    colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.03)']}
                                    style={StyleSheet.absoluteFill}
                                />
                            )}
                            <TouchableOpacity style={styles.closeBtn} onPress={rollOut}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                            <Text style={styles.bubbleTitle}>
                                {currentStep >= 0 ? copy.steps[currentStep].title : (assistantType === 'smiley' ? copy.smiley : copy.feather)}
                            </Text>
                            <Text style={styles.bubbleText}>{getMessage()}</Text>
                            {currentStep >= 0 && (
                                <Text style={styles.stepText}>{currentStep + 1} / {copy.steps.length}</Text>
                            )}
                            <View style={styles.bubbleArrow} />
                        </View>
                    </View>

                    <View style={styles.imageContainer}>
                        {!isAndroidReducedEffects && <View style={styles.glow} />}
                        <Image
                            source={assistantType === 'feather2' ? nanoBanano : (assistantType === 'feather' ? peacockAssistant : krishnaAssistant)}
                            style={styles.image}
                            resizeMode="contain"
                        />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        elevation: 9999,
    },
    wrapper: {
        position: 'absolute',
        bottom: 40,
        right: 0,
    },
    touchArea: {
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    imageContainer: {
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: 90,
        height: 90,
        zIndex: 2,
    },
    glow: {
        position: 'absolute',
        bottom: 0,
        width: 80,
        height: 30,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        opacity: 0.2,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    },
    miniIcon: {
        width: 34,
        height: 34,
    },
    callButton: {
        position: 'absolute',
        top: '75%',
        marginTop: -28,
        right: 0,
        zIndex: 9999,
        width: 56,
        height: 56,
        borderTopLeftRadius: 28,
        borderBottomLeftRadius: 28,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 12,
    },
    callButtonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 4,
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 100,
        left: -50,
    },
    shadowWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 15,
        marginBottom: 10,
        marginRight: 20,
    },
    shadowWrapperReduced: {
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    bubbleContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        backgroundColor: 'rgba(15, 15, 25, 0.4)',
        width: 250,
        position: 'relative',
        overflow: 'hidden',
    },
    bubbleTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#F59E0B', // Saffron/Gold for title readability
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    bubbleText: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    bubbleArrow: {
        position: 'absolute',
        bottom: -8,
        right: 40,
        width: 16,
        height: 16,
        backgroundColor: 'rgba(15, 15, 25, 0.85)',
        transform: [{ rotate: '45deg' }],
        borderRightWidth: 1.5,
        borderBottomWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        zIndex: -1,
    },
    closeBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    closeBtnText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: 'bold',
    },
    stepText: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.4)',
        marginTop: 6,
        textAlign: 'right',
    },
});
