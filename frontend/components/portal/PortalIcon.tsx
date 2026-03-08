// Portal Icon Component - service icon with iOS-style wiggle animation
import React, { useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    Platform,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    cancelAnimation,
} from 'react-native-reanimated';
import {
    Users,
    MessageCircle,
    Phone,
    Sparkles,
    ShoppingBag,
    Megaphone,
    Book,
    GraduationCap,
    Newspaper,
    Settings,
    MessageSquare,
    Map,
    Coffee,
    Utensils,
    Music,
    Film,
    Compass,
    Briefcase,
    Heart,
    Contact,
    PlayCircle,
    Clapperboard,
    Radio,
    LifeBuoy,
    Sun,
    Bot,
    Flame,
    Landmark,
} from 'lucide-react-native';
import { ServiceDefinition } from '../../types/portal';
import { useSettings } from '../../context/SettingsContext';
import { resolveEffectivePerformanceMode } from '../../utils/androidVisualPolicy';

interface PortalIconProps {
    service: ServiceDefinition;
    isEditMode: boolean;
    onPress: () => void;
    onLongPress: () => void;
    size?: 'small' | 'medium' | 'large';
    badge?: number;
    onLayout?: (event: any) => void;
    showLabel?: boolean;
    roleHighlight?: boolean;
    mathBadge?: string;
    onSecondaryLongPress?: () => void;
    onRemove?: () => void;
}

const ICON_SIZES = {
    small: { container: 52, icon: 24, fontSize: 10 },
    medium: { container: 64, icon: 28, fontSize: 11 },
    large: { container: 76, icon: 32, fontSize: 12 },
};

const IconComponents: Record<string, any> = {
    Users,
    MessageCircle,
    Phone,
    Sparkles,
    ShoppingBag,
    Megaphone,
    Book,
    GraduationCap,
    Newspaper,
    Settings,
    MessageSquare,
    Map,
    Coffee,
    Utensils,
    Music,
    Film,
    Compass,
    Briefcase,
    Heart,
    Contact,
    PlayCircle,
    Clapperboard,
    Radio,
    LifeBuoy,
    Sun,
    Bot,
    Flame,
    Landmark,
};

const SERVICE_EMOJIS: Record<string, string> = {
    'path_tracker': '🧭',
    'contacts': '📇',
    'chat': '💬',
    'rooms': '👥',
    'calls': '📞',
    'dating': '💍',
    'cafe': '☕️',
    'shops': '🛍️',
    'ads': '📢',
    'library': '📚',
    'education': '🎓',
    'multimedia': '🎵',
    'video_circles': '📹',
    'channels': '📻',
    'sadhu_sanga': '🪔',
    'feed': '📰',
    'news': '📰',
    'map': '🗺️',
    'support': '🛟',
    'history': '🕰️',
    'settings': '⚙️',
    'travel': '✈️',
    'services': '🤖',
    'services_catalog': '🧰',
    'seva': '🤲',
};

export const PortalIcon: React.FC<PortalIconProps> = ({
    service,
    isEditMode,
    onPress,
    onLongPress,
    size = 'medium',
    badge,
    onLayout,
    showLabel = true,
    roleHighlight = false,
    mathBadge,
    onRemove,
}) => {
    const { vTheme, isDarkMode, portalBackgroundType, portalIconStyle, performanceMode, runtimePerformanceState } = useSettings();
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);
    const effectivePerformanceMode = useMemo(
        () => resolveEffectivePerformanceMode(performanceMode, runtimePerformanceState),
        [performanceMode, runtimePerformanceState],
    );
    const allowEditWiggle = !(Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality');
    const isAndroidReducedEffects = Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality';
    const isImageOrPremiumSurface = portalBackgroundType === 'image' || portalIconStyle === 'premium3d';
    const iconBackgroundColor = portalIconStyle === 'vedamatch'
        ? '#121212'
        : portalIconStyle === 'solid'
            ? service.color
            : isImageOrPremiumSurface
                ? (isDarkMode ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)')
                : isDarkMode
                    ? 'rgba(30,30,30,0.85)'
                    : 'rgba(255,255,255,0.9)';
    const iconBorderColor = portalIconStyle === 'vedamatch'
        ? '#D4AF37'
        : portalIconStyle === 'solid'
            ? 'rgba(255,255,255,0.25)'
            : isImageOrPremiumSurface
                ? 'rgba(255,255,255,0.3)'
                : `${service.color}30`;
    const iconBorderWidth = portalIconStyle === 'vedamatch'
        ? 1
        : roleHighlight
            ? 2
            : isImageOrPremiumSurface || portalIconStyle === 'solid'
                ? 1.5
                : 1;
    const iconSurfaceHasEfficientShadow = portalIconStyle === 'vedamatch' || portalIconStyle === 'solid';
    const shouldRenderIconShadow = (roleHighlight || portalIconStyle === 'vedamatch')
        && !isAndroidReducedEffects
        && (Platform.OS !== 'ios' || iconSurfaceHasEfficientShadow);

    const sizeConfig = ICON_SIZES[size];
    const IconComponent = IconComponents[service.icon] || Users;

    // iOS-style wiggle animation
    useEffect(() => {
        if (isEditMode && allowEditWiggle) {
            rotation.value = withRepeat(
                withSequence(
                    withTiming(-2, { duration: 80 }),
                    withTiming(2, { duration: 80 }),
                ),
                -1,
                true
            );
            scale.value = withRepeat(
                withSequence(
                    withTiming(0.98, { duration: 100 }),
                    withTiming(1.02, { duration: 100 }),
                ),
                -1,
                true
            );
        } else {
            cancelAnimation(rotation);
            cancelAnimation(scale);
            rotation.value = withTiming(0, { duration: 100 });
            scale.value = withTiming(1, { duration: 100 });
        }

        return () => {
            cancelAnimation(rotation);
            cancelAnimation(scale);
        };
    }, [allowEditWiggle, isEditMode, rotation, scale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate: `${rotation.value}deg` },
            { scale: scale.value },
        ],
    }));

    return (
        <Animated.View
            style={[styles.container, !showLabel && styles.containerCompact, animatedStyle]}
            onLayout={onLayout}
        >
            <Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                delayLongPress={500}
                style={({ pressed }) => [
                    styles.pressable,
                    pressed && !isEditMode && styles.pressed,
                ]}
            >
                <View
                    style={[
                        styles.iconContainer,
                        {
                            width: sizeConfig.container,
                            height: sizeConfig.container,
                            backgroundColor: iconBackgroundColor,
                            borderColor: iconBorderColor,
                            borderWidth: iconBorderWidth,
                            ...(shouldRenderIconShadow ? {
                                shadowColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : service.color,
                                shadowOpacity: portalIconStyle === 'vedamatch' ? 0.5 : 0.35,
                                shadowRadius: portalIconStyle === 'vedamatch' ? 10 : 8,
                                shadowOffset: { width: 0, height: 2 },
                                elevation: 6,
                            } : {}),
                            marginBottom: showLabel ? 6 : 0,
                        },
                    ]}
                >
                    {portalIconStyle === 'vedamatch' && !isAndroidReducedEffects && (
                        <View style={[StyleSheet.absoluteFill, { borderRadius: 22, overflow: 'hidden' }]}>
                            <View style={{ position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderWidth: 1, borderColor: '#FFDF00', borderRadius: 50, opacity: 0.2 }} />
                            <View style={{ position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderWidth: 1, borderColor: '#FFDF00', borderRadius: 50, opacity: 0.3 }} />
                        </View>
                    )}
                    {portalIconStyle === 'premium3d' ? (
                        <Text style={{ fontSize: sizeConfig.icon + 4, lineHeight: sizeConfig.icon + 8, marginTop: 4 }}>
                            {SERVICE_EMOJIS[service.id] || '✨'}
                        </Text>
                    ) : (
                        <IconComponent
                            size={portalIconStyle === 'vedamatch' ? sizeConfig.icon - 2 : sizeConfig.icon}
                            color={portalIconStyle === 'vedamatch' ? '#FFDF00' : portalIconStyle === 'solid' || portalBackgroundType === 'image' ? '#ffffff' : service.color}
                            strokeWidth={portalIconStyle === 'solid' ? 2.5 : 2}
                        />
                    )}
                    {badge != null && badge > 0 && (
                        <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                            <Text style={styles.badgeText}>
                                {badge > 99 ? '99+' : badge}
                            </Text>
                        </View>
                    )}
                    {false && mathBadge ? (
                        <View style={styles.proBadge}>
                            <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                    ) : null}
                </View>
                {showLabel && (
                    <>
                        <View style={
                            portalBackgroundType === 'image'
                                ? styles.labelPill
                                : portalBackgroundType === 'gradient'
                                    ? [styles.labelPillGradient, {
                                        backgroundColor: isDarkMode
                                            ? 'rgba(0,0,0,0.35)'
                                            : 'rgba(255,255,255,0.65)',
                                    }]
                                    : undefined
                        }>
                            <Text
                                style={[
                                    styles.label,
                                    {
                                        fontSize: sizeConfig.fontSize,
                                        fontWeight: roleHighlight ? '700' : '600',
                                        ...(portalBackgroundType === 'image'
                                            ? {
                                                color: '#ffffff',
                                                textShadowColor: 'rgba(0,0,0,0.95)',
                                                textShadowOffset: { width: 0, height: 2 },
                                                textShadowRadius: 6,
                                            }
                                            : portalBackgroundType === 'gradient'
                                                ? {
                                                    color: isDarkMode ? '#ffffff' : vTheme.colors.text,
                                                    textShadowColor: isDarkMode
                                                        ? 'rgba(0,0,0,0.6)'
                                                        : 'rgba(255,255,255,0.8)',
                                                    textShadowOffset: { width: 0, height: 0.5 },
                                                    textShadowRadius: 2,
                                                }
                                                : {
                                                    color: vTheme.colors.text,
                                                    // Clean text, no shadow on solid backgrounds
                                                }),
                                    },
                                ]}
                                numberOfLines={1}
                            >
                                {service.label}
                            </Text>
                        </View>
                    </>
                )}

                {/* Delete button in edit mode */}
                {isEditMode && (
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={onRemove}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <View style={styles.deleteIcon}>
                            <Text style={styles.deleteText}>−</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 8,
    },
    containerCompact: {
        marginVertical: 0,
    },
    pressable: {
        alignItems: 'center',
    },
    pressed: {
        opacity: 0.7,
        transform: [{ scale: 0.95 }],
    },
    iconContainer: {
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        // Убираем отступ, если нет текста под иконкой
        marginBottom: 0,
        paddingTop: Platform.OS === 'android' ? 3 : 0, // Вернули к центру
    },
    label: {
        fontWeight: '500',
        textAlign: 'center',
        maxWidth: 70,
    },
    labelPill: {
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginTop: 4,
    },
    labelPillGradient: {
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginTop: 4,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    mathBadge: {
        marginTop: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.58)',
        maxWidth: 90,
    },
    mathBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        textAlign: 'center',
    },
    proBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 5,
        paddingHorizontal: 3,
        paddingVertical: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    proBadgeText: {
        color: '#FFFFFF',
        fontSize: 6,
        fontWeight: '800',
        letterSpacing: 0.2,
        lineHeight: 10,
    },
    deleteButton: {
        position: 'absolute',
        top: -6,
        left: -6,
        zIndex: 10,
    },
    deleteIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: -2,
    },
});
