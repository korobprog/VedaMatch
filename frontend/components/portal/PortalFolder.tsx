// Portal Folder Component - folder with preview of icons inside
import React, { useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TouchableOpacity,
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
import { useTranslation } from 'react-i18next';
import { PortalFolder as PortalFolderType, DEFAULT_SERVICES } from '../../types/portal';
import { useSettings } from '../../context/SettingsContext';
import { resolveEffectivePerformanceMode } from '../../utils/androidVisualPolicy';
import {
    getPortalIconChrome,
    getPortalLabelVisuals,
    getPortalSurfaceRadius,
    PORTAL_ICON_SIZES,
    PortalServiceGlyph,
    PortalVedaMatchRings,
} from './portalIconShared';
import { resolvePortalFolderName } from './resolvePortalFolderName';

interface PortalFolderProps {
    folder: PortalFolderType;
    isEditMode: boolean;
    onPress: () => void;
    onLongPress: () => void;
    size?: 'small' | 'medium' | 'large';
    onLayout?: (event: any) => void;
    onRemove?: () => void;
}

export const PortalFolderComponent: React.FC<PortalFolderProps> = ({
    folder,
    isEditMode,
    onPress,
    onLongPress,
    size = 'medium',
    onLayout,
    onRemove,
}) => {
    const { t } = useTranslation();
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
    const folderChrome = useMemo(
        () => getPortalIconChrome({
            accentColor: folder.color,
            portalIconStyle,
            portalBackgroundType,
            isDarkMode,
            reducedEffects: isAndroidReducedEffects,
        }),
        [folder.color, isAndroidReducedEffects, isDarkMode, portalBackgroundType, portalIconStyle],
    );
    const labelVisuals = useMemo(
        () => getPortalLabelVisuals(portalBackgroundType, isDarkMode, vTheme.colors.text),
        [isDarkMode, portalBackgroundType, vTheme.colors.text],
    );
    const folderRadius = getPortalSurfaceRadius(sizeConfig.container);
    const previewTileSize = size === 'small' ? 16 : size === 'large' ? 22 : 18;

    useEffect(() => {
        if (isEditMode && allowEditWiggle) {
            rotation.value = withRepeat(
                withSequence(
                    withTiming(-2, { duration: 80 }),
                    withTiming(2, { duration: 80 }),
                ),
                -1,
                true,
            );
            scale.value = withRepeat(
                withSequence(
                    withTiming(0.98, { duration: 100 }),
                    withTiming(1.02, { duration: 100 }),
                ),
                -1,
                true,
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

    const validItems = folder.items.filter((item) =>
        DEFAULT_SERVICES.some((service) => service.id === item.serviceId),
    );

    const previewServices = validItems
        .slice(0, 4)
        .map((item) => DEFAULT_SERVICES.find((service) => service.id === item.serviceId))
        .filter((service): service is NonNullable<typeof service> => Boolean(service));
    const folderDisplayName = resolvePortalFolderName(folder, t);

    return (
        <Animated.View
            style={[styles.container, animatedStyle]}
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
                        styles.folderContainer,
                        {
                            width: sizeConfig.container,
                            height: sizeConfig.container,
                            borderRadius: folderRadius,
                        },
                        folderChrome.containerStyle,
                    ]}
                >
                    {folderChrome.shouldRenderVedaGlow && <PortalVedaMatchRings borderRadius={folderRadius} />}

                    <View style={styles.previewGrid}>
                        {previewServices.map((service) => {
                            const previewChrome = getPortalIconChrome({
                                accentColor: service.color,
                                portalIconStyle,
                                portalBackgroundType,
                                isDarkMode,
                                reducedEffects: isAndroidReducedEffects,
                            });
                            const previewRadius = getPortalSurfaceRadius(previewTileSize);
                            return (
                                <View
                                    key={service.id}
                                    style={[
                                        styles.previewIconWrapper,
                                        {
                                            width: previewTileSize,
                                            height: previewTileSize,
                                            borderRadius: previewRadius,
                                        },
                                        previewChrome.containerStyle,
                                    ]}
                                >
                                    {previewChrome.shouldRenderVedaGlow && <PortalVedaMatchRings borderRadius={previewRadius} />}
                                    <PortalServiceGlyph
                                        service={service}
                                        iconSize={Math.max(10, previewTileSize - 8)}
                                        portalIconStyle={portalIconStyle}
                                        portalBackgroundType={portalBackgroundType}
                                        chrome={previewChrome}
                                    />
                                </View>
                            );
                        })}
                        {Array(4 - previewServices.length).fill(null).map((_, index) => (
                            <View
                                key={`empty-${index}`}
                                style={[
                                    styles.previewIconWrapper,
                                    styles.emptySlot,
                                    {
                                        width: previewTileSize,
                                        height: previewTileSize,
                                        borderRadius: getPortalSurfaceRadius(previewTileSize),
                                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)',
                                        borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
                                    },
                                ]}
                            />
                        ))}
                    </View>
                </View>

                <View style={labelVisuals.pillStyle ? [styles.labelPillBase, labelVisuals.pillStyle] : undefined}>
                    <Text
                        style={[
                            styles.label,
                            { fontSize: sizeConfig.fontSize, fontWeight: '600' },
                            labelVisuals.textStyle,
                        ]}
                        numberOfLines={1}
                    >
                        {folderDisplayName}
                    </Text>
                </View>

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

                {validItems.length > 0 && (
                    <View style={[styles.countBadge, { backgroundColor: folder.color }]}>
                        <Text style={styles.countText}>{validItems.length}</Text>
                    </View>
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
    pressable: {
        alignItems: 'center',
    },
    pressed: {
        opacity: 0.7,
        transform: [{ scale: 0.95 }],
    },
    folderContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        padding: 6,
        overflow: 'hidden',
    },
    previewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    previewIconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    emptySlot: {
        borderWidth: 1,
        opacity: 0.9,
    },
    label: {
        fontWeight: '500',
        textAlign: 'center',
        maxWidth: 74,
    },
    labelPillBase: {
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 1,
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
    countBadge: {
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
    countText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
