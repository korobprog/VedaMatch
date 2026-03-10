// Portal Icon Component - service icon with iOS-style wiggle animation
import React, { useEffect, useMemo } from 'react';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    Platform,
    View,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    cancelAnimation,
} from 'react-native-reanimated';
import { ServiceDefinition } from '../../types/portal';
import { useSettings } from '../../context/SettingsContext';
import { resolveEffectivePerformanceMode } from '../../utils/androidVisualPolicy';
import {
    getPortalIconChrome,
    getPortalLabelVisuals,
    getPortalSurfaceRadius,
    PortalServiceGlyph,
    PortalVedaMatchRings,
    PORTAL_ICON_SIZES,
} from './portalIconShared';

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
    labelNumberOfLines?: number;
    labelMaxWidth?: number;
}

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
    labelNumberOfLines = 1,
    labelMaxWidth = 70,
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
    const sizeConfig = PORTAL_ICON_SIZES[size];
    const iconChrome = useMemo(
        () => getPortalIconChrome({
            accentColor: service.color,
            portalIconStyle,
            portalBackgroundType,
            isDarkMode,
            reducedEffects: isAndroidReducedEffects,
            roleHighlight,
        }),
        [isAndroidReducedEffects, isDarkMode, portalBackgroundType, portalIconStyle, roleHighlight, service.color],
    );
    const labelVisuals = useMemo(
        () => getPortalLabelVisuals(portalBackgroundType, isDarkMode, vTheme.colors.text),
        [isDarkMode, portalBackgroundType, vTheme.colors.text],
    );
    const iconRadius = getPortalSurfaceRadius(sizeConfig.container);

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
                            borderRadius: iconRadius,
                            marginBottom: showLabel ? 6 : 0,
                        },
                        iconChrome.containerStyle,
                    ]}
                >
                    {iconChrome.shouldRenderVedaGlow && <PortalVedaMatchRings borderRadius={iconRadius} />}
                    <PortalServiceGlyph
                        service={service}
                        iconSize={sizeConfig.icon}
                        portalIconStyle={portalIconStyle}
                        portalBackgroundType={portalBackgroundType}
                        chrome={iconChrome}
                    />
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
                        <View style={labelVisuals.pillStyle ? [styles.labelPillBase, labelVisuals.pillStyle] : undefined}>
                            <Text
                                style={[
                                    styles.label,
                                    {
                                        fontSize: sizeConfig.fontSize,
                                        fontWeight: roleHighlight ? '700' : '600',
                                        maxWidth: labelMaxWidth,
                                    },
                                    labelVisuals.textStyle,
                                ]}
                                numberOfLines={labelNumberOfLines}
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
    },
    labelPillBase: {
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
