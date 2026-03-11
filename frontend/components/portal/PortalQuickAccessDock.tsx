import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import { PortalIcon } from './PortalIcon';
import { useSettings } from '../../context/SettingsContext';
import { usePortalLayout } from '../../context/PortalLayoutContext';
import { DEFAULT_SERVICES } from '../../types/portal';
import { getAndroidVisualPolicy, getBlurAmountForPolicy, resolveEffectivePerformanceMode } from '../../utils/androidVisualPolicy';
import { WORKSPACE_DOCK_BOTTOM } from './portalWorkspaceConstants';

interface PortalQuickAccessDockProps {
    onServicePress: (serviceId: string) => void;
    hidden?: boolean;
    roleHighlights?: string[];
    serviceBadges?: Record<string, number>;
    orgMathBadge?: string;
    forceReadOnly?: boolean;
}

export const PortalQuickAccessDock: React.FC<PortalQuickAccessDockProps> = ({
    onServicePress,
    hidden = false,
    roleHighlights = [],
    serviceBadges = {},
    orgMathBadge,
    forceReadOnly = false,
}) => {
    const { t } = useTranslation();
    const { layout, isEditMode, isServiceVisible } = usePortalLayout();
    const { isDarkMode, portalBackgroundType, performanceMode, runtimePerformanceState } = useSettings();
    const androidVisualPolicy = useMemo(
        () => getAndroidVisualPolicy(performanceMode, runtimePerformanceState),
        [performanceMode, runtimePerformanceState],
    );
    const effectivePerformanceMode = useMemo(
        () => resolveEffectivePerformanceMode(performanceMode, runtimePerformanceState),
        [performanceMode, runtimePerformanceState],
    );
    const isAndroidPortalFastPath = Platform.OS === 'android';
    const isAndroidReducedEffects = Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality';
    const allowHeavyPortalEffects = !isAndroidPortalFastPath && !isAndroidReducedEffects;
    const showDecorativeDockLayers = allowHeavyPortalEffects;

    const dockEdgeMaskColor = portalBackgroundType === 'image'
        ? (isDarkMode ? 'rgba(8,13,20,0.25)' : 'rgba(34,48,69,0.18)')
        : (isDarkMode ? 'rgba(8,13,20,0.35)' : 'rgba(241,245,251,0.4)');
    const dockInnerStrokeColor = portalBackgroundType === 'image'
        ? 'rgba(255,255,255,0.2)'
        : (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)');
    const compactDockStyle = useMemo(() => (
        isAndroidPortalFastPath
            ? {
                backgroundColor: isDarkMode ? 'rgba(18,22,28,0.96)' : 'rgba(250,252,255,0.98)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(31,41,55,0.08)',
            }
            : {
                backgroundColor: 'transparent',
                borderColor: 'rgba(255,255,255,0.1)',
            }
    ), [isAndroidPortalFastPath, isDarkMode]);
    const emptyDockSlotStyle = useMemo(() => (
        isAndroidPortalFastPath
            ? {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.035)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
            }
            : {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                borderColor: 'rgba(255,255,255,0.1)',
            }
    ), [isAndroidPortalFastPath, isDarkMode]);

    const highlightedServices = useMemo(() => new Set(roleHighlights), [roleHighlights]);
    const quickAccessServices = useMemo(() => {
        const quickItems = [...(layout.quickAccess || [])]
            .sort((a, b) => a.position - b.position)
            .slice(0, 3);

        return quickItems
            .map((item) => DEFAULT_SERVICES.find((service) => service.id === item.serviceId))
            .filter((service): service is NonNullable<typeof service> => Boolean(service && isServiceVisible(service.id)))
            .map((service) => ({
                ...service,
                label: t(`portal.serviceLabels.${service.id}`, { defaultValue: service.label }),
            }));
    }, [isServiceVisible, layout.quickAccess, t]);

    if (hidden) {
        return null;
    }

    const effectiveIsEditMode = forceReadOnly ? false : isEditMode;

    return (
        <>
            {showDecorativeDockLayers && (
                <LinearGradient
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    colors={isDarkMode
                        ? ['transparent', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.08)', 'transparent']
                        : ['transparent', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.02)', 'transparent']}
                    style={styles.dockDivider}
                />
            )}
            <View style={[styles.quickAccessDock, compactDockStyle]}>
                {androidVisualPolicy.enableBlur && allowHeavyPortalEffects && (
                    <BlurView
                        style={styles.dockBlur}
                        blurType={isDarkMode ? 'dark' : 'light'}
                        blurAmount={getBlurAmountForPolicy(androidVisualPolicy, 12)}
                        reducedTransparencyFallbackColor="transparent"
                        pointerEvents="none"
                    />
                )}
                {showDecorativeDockLayers && (
                    <>
                        <View pointerEvents="none" style={[styles.dockInnerBevel, { borderColor: dockInnerStrokeColor }]} />
                        <LinearGradient pointerEvents="none" colors={[dockEdgeMaskColor, 'rgba(0,0,0,0)']} style={styles.dockTopEdgeFade} />
                        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', dockEdgeMaskColor]} style={styles.dockBottomEdgeFade} />
                        <LinearGradient
                            pointerEvents="none"
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            colors={[dockEdgeMaskColor, 'rgba(0,0,0,0)']}
                            style={styles.dockLeftEdgeFade}
                        />
                        <LinearGradient
                            pointerEvents="none"
                            start={{ x: 1, y: 0.5 }}
                            end={{ x: 0, y: 0.5 }}
                            colors={[dockEdgeMaskColor, 'rgba(0,0,0,0)']}
                            style={styles.dockRightEdgeFade}
                        />
                    </>
                )}
                <View style={styles.dockItems}>
                    {quickAccessServices.map((service) => (
                        <View key={service.id} style={styles.dockItemWrapper}>
                            <PortalIcon
                                service={service}
                                isEditMode={effectiveIsEditMode}
                                onPress={() => onServicePress(service.id)}
                                onLongPress={() => undefined}
                                size={layout.iconSize}
                                badge={serviceBadges[service.id] || 0}
                                showLabel={false}
                                roleHighlight={highlightedServices.has(service.id)}
                                mathBadge={orgMathBadge}
                            />
                        </View>
                    ))}
                    {[...Array(Math.max(0, 3 - quickAccessServices.length))].map((_, index) => (
                        <View key={`quick-access-empty-${index}`} style={[styles.emptyDockSlot, emptyDockSlotStyle]} />
                    ))}
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    quickAccessDock: {
        position: 'absolute',
        bottom: WORKSPACE_DOCK_BOTTOM,
        left: 20,
        right: 20,
        height: 76,
        borderRadius: 38,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'transparent',
        zIndex: 18,
        elevation: 18,
    },
    dockBlur: {
        ...StyleSheet.absoluteFillObject,
    },
    dockDivider: {
        position: 'absolute',
        bottom: 110,
        left: 40,
        right: 40,
        height: 1,
        zIndex: 14,
        elevation: 14,
    },
    dockItems: {
        position: 'absolute',
        top: 2,
        bottom: 2,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    dockItemWrapper: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 0,
    },
    dockInnerBevel: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderRadius: 38,
        opacity: 0.9,
    },
    dockTopEdgeFade: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 14,
    },
    dockBottomEdgeFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 14,
    },
    dockLeftEdgeFade: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 14,
    },
    dockRightEdgeFade: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width: 14,
    },
    emptyDockSlot: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderStyle: 'dashed',
    },
});
