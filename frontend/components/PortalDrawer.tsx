// PortalDrawer - Slide-in drawer for portal services (FROM LEFT)
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Modal,
    Pressable,
    Platform,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    runOnJS,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';
import { PortalLayoutProvider } from '../context/PortalLayoutContext';
import LinearGradient from 'react-native-linear-gradient';
import { PortalGrid } from './portal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.9;

interface PortalDrawerProps {
    isVisible: boolean;
    onClose: () => void;
    onServicePress: (serviceId: string) => void;
}

export const PortalDrawer: React.FC<PortalDrawerProps> = ({
    isVisible,
    onClose,
    onServicePress,
}) => {
    const { vTheme } = useSettings();
    const [showContent, setShowContent] = useState(false);

    // Animation values
    const drawerProgress = useSharedValue(0);
    const contentOpacity = useSharedValue(0);

    useEffect(() => {
        if (isVisible) {
            // Reset content visibility
            setShowContent(true);

            // Drawer slides in first
            drawerProgress.value = withTiming(1, {
                duration: 280,
                easing: Easing.out(Easing.cubic),
            });

            // Content fades in AFTER drawer opens
            contentOpacity.value = withDelay(
                200, // Wait for drawer to mostly finish
                withTiming(1, {
                    duration: 200,
                    easing: Easing.out(Easing.quad),
                })
            );
        } else {
            // Content fades out first
            contentOpacity.value = withTiming(0, {
                duration: 100,
                easing: Easing.in(Easing.quad),
            });

            // Drawer slides out after
            drawerProgress.value = withDelay(
                50,
                withTiming(0, {
                    duration: 220,
                    easing: Easing.in(Easing.cubic),
                })
            );

            // Hide content after animation
            setTimeout(() => setShowContent(false), 350);
        }
    }, [isVisible]);

    // Drawer animation - slides from left
    const drawerAnimatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            drawerProgress.value,
            [0, 1],
            [-DRAWER_WIDTH, 0]
        );
        return {
            transform: [{ translateX }],
        };
    });

    // Backdrop animation
    const backdropAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(drawerProgress.value, [0, 1], [0, 1]),
        };
    });

    // Content fade animation
    const contentAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: contentOpacity.value,
        };
    });

    // Swipe to close gesture
    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            // Only allow swiping to the left (closing)
            if (event.translationX < 0) {
                drawerProgress.value = interpolate(
                    event.translationX,
                    [-DRAWER_WIDTH, 0],
                    [0, 1]
                );
            }
        })
        .onEnd((event) => {
            if (event.translationX < -100 || event.velocityX < -500) {
                runOnJS(onClose)();
            } else {
                // Snap back
                drawerProgress.value = withTiming(1, { duration: 200 });
            }
        });

    const handleServicePress = (serviceId: string) => {
        onClose();
        onServicePress(serviceId);
    };

    if (!isVisible && !showContent) return null;

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <GestureHandlerRootView style={styles.container}>
                {/* Animated Backdrop with Gradient */}
                <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    >
                        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                    </LinearGradient>
                </Animated.View>

                {/* Animated Drawer */}
                <GestureDetector gesture={panGesture}>
                    <Animated.View
                        style={[
                            styles.drawer,
                            drawerAnimatedStyle,
                            {
                                backgroundColor: vTheme.colors.background,
                            },
                        ]}
                    >
                        {/* Header - always visible */}
                        <View style={[styles.header, { borderBottomColor: vTheme.colors.divider }]}>
                            <Text style={[styles.title, { color: vTheme.colors.text }]}>
                                Портал сервисов
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color={vTheme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Content with delayed fade-in */}
                        <Animated.View style={[styles.content, contentAnimatedStyle]}>
                            {showContent && (
                                <PortalGrid
                                    onServicePress={handleServicePress}
                                    onCloseDrawer={onClose}
                                />
                            )}
                        </Animated.View>

                        {/* Hint */}
                        <View style={styles.hintContainer}>
                            <Text style={[styles.hintText, { color: vTheme.colors.textSecondary }]}>
                                ← Свайпните влево для закрытия
                            </Text>
                        </View>
                    </Animated.View>
                </GestureDetector>
            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    drawer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        // Removed borderRightWidth for a cleaner "blur" look
        shadowColor: '#000',
        shadowOffset: { width: 10, height: 0 },
        shadowOpacity: 0.2, // Softer shadow
        shadowRadius: 30, // Much larger radius for a blurred appearance
        elevation: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    hintContainer: {
        padding: 16,
        alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    hintText: {
        fontSize: 12,
        opacity: 0.6,
    },
});
