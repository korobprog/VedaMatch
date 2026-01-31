
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Image,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
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
import krishnaAssistant from '../assets/krishnaAssistant.png';

const { width } = Dimensions.get('window');

const TOUR_STEPS = [
    { title: 'Харе Кришна!', text: 'Я проведу для вас небольшую экскурсию. Это раздел Портал.', tab: 'portal' },
    { title: 'Контакты', text: 'Здесь вы можете найти преданных и друзей.', tab: 'contacts' },
    { title: 'Чат', text: 'Общайтесь и задавайте вопросы AI помощнику.', tab: 'chat' },
    { title: 'Знакомства', text: 'Для поиска единомышленников.', tab: 'dating' },
    { title: 'Магазины', text: 'Товары для преданных и вегетарианцев.', tab: 'shops' },
    { title: 'Объявления', text: 'Услуги и предложения сообщества.', tab: 'ads' },
    { title: 'Новости', text: 'Будьте в курсе всех событий.', tab: 'news' },
    { title: 'База знаний', text: 'Изучайте священные писания и духовную мудрость.', tab: 'knowledge_base' },
    { title: 'Готово!', text: 'Приятного использования! Вы всегда можете позвать меня снова.', tab: 'done' },
];

export const KrishnaAssistant: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { user, setTourCompleted } = useUser();
    const { handleNewChat } = useChat();
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

        // Floating effect
        translateY.value = withRepeat(
            withSequence(
                withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, [isVisible, rollIn]);

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

    const getMessage = () => {
        if (currentStep >= 0 && currentStep < TOUR_STEPS.length) {
            return TOUR_STEPS[currentStep].text;
        }

        switch (currentRoute) {
            case 'Login':
                return "Харе Кришна! Чтобы начать наше общение, пожалуйста, войдите в свой профиль или создайте новый.";
            case 'Registration':
                if (currentParams?.phase === 'initial') {
                    return "Харе Кришна! Регистрация поможет мне лучше понимать ваши потребности и давать более точные советы.";
                } else {
                    return "Заполнение профиля откроет вам доступ ко всем сервисам Портала и сделает наши беседы более персонализированными.";
                }
            default:
                return "Харе Кришна! Чем я могу вам служить сегодня?";
        }
    }

    const handlePress = async () => {
        // Allow interaction on auth screens too
        if (currentStep >= 0) {
            if (currentStep < TOUR_STEPS.length - 1) {
                const nextStep = currentStep + 1;
                setCurrentStep(nextStep);
                const tab = TOUR_STEPS[nextStep].tab;
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

    if (!isVisible && !isRollingOut) {
        return (
            <TouchableOpacity
                style={styles.callButton}
                onPress={() => {
                    handleNewChat();
                    navigation.navigate('Chat');
                }}
            >
                <Image source={krishnaAssistant} style={styles.miniIcon} />
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
                    <View style={[
                        styles.bubble,
                        isAuthScreen ? {
                            marginBottom: 10,
                            marginRight: 20,
                            width: 150, // Narrower for auth screens
                            backgroundColor: '#FFD700' // Solid color for better shadow perf
                        } : { marginBottom: 10 }
                    ]}>
                        <TouchableOpacity style={styles.closeBtn} onPress={rollOut}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                        <Text style={styles.bubbleTitle}>
                            {currentStep >= 0 ? TOUR_STEPS[currentStep].title : "Кришна Дас"}
                        </Text>
                        <Text style={styles.bubbleText}>{getMessage()}</Text>
                        {currentStep >= 0 && (
                            <Text style={styles.stepText}>{currentStep + 1} / {TOUR_STEPS.length}</Text>
                        )}
                        <View style={[
                            styles.bubbleArrow,
                            isAuthScreen ? {
                                bottom: -12,
                                right: 30,
                            } : { bottom: -12, right: 40 }
                        ]} />
                    </View>

                    <View style={styles.imageContainer}>
                        <View style={styles.glow} />
                        <Image
                            source={krishnaAssistant}
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
        backgroundColor: '#FFD700',
        opacity: 0.4, // Move transparency to opacity to keep BG solid for shadow calculation
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 10,
    },
    bubble: {
        backgroundColor: '#FFD700', // 70% opacity
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        marginBottom: 10,
        marginRight: 20,
        borderWidth: 2,
        borderColor: '#FF9933',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        width: 200,
        position: 'relative',
    },
    bubbleTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#497e49ff',
        marginBottom: 4,
    },
    bubbleText: {
        color: '#4E342E',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: 'bold',
    },
    bubbleArrow: {
        position: 'absolute',
        bottom: -12,
        right: 40, // Arrow on the right
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 12,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#FF9933',
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
        color: '#999',
        fontWeight: 'bold',
    },
    stepText: {
        fontSize: 10,
        color: '#999',
        marginTop: 6,
        textAlign: 'right',
    },
    miniIcon: {
        width: 30,
        height: 30,
    },
    callButton: {
        position: 'absolute',
        top: '50%',
        marginTop: -30,
        right: 0,
        backgroundColor: '#FF9933',
        opacity: 0.9,
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderTopLeftRadius: 30,
        borderBottomLeftRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        zIndex: 9999,
        width: 45,
        alignItems: 'center',
    },
});
