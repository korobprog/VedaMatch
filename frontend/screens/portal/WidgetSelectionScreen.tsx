import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Image,
    ImageBackground,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Film, Gift, LayoutGrid, List, MessageSquare, Plus, Settings } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { usePortalLayout } from '../../context/PortalLayoutContext';
import { useSettings } from '../../context/SettingsContext';
import { useWallet } from '../../context/WalletContext';
import { getAndroidVisualPolicy, getBlurAmountForPolicy, resolveEffectivePerformanceMode } from '../../utils/androidVisualPolicy';
import { WidgetCanvasGrid } from '../../components/portal/widgets/WidgetCanvasGrid';
import { WidgetPickerSheet } from '../../components/portal/widgets/WidgetPickerSheet';
import { BellButton } from '../../components/portal/BellButton';
import { DEFAULT_SERVICES } from '../../types/portal';
import { PortalIcon } from '../../components/portal/PortalIcon';

type Props = NativeStackScreenProps<RootStackParamList, 'WidgetSelection'>;
const SERVICE_TABS = new Set([
    'contacts', 'chat', 'rooms', 'dating', 'cafe', 'shops', 'ads', 'news', 'calls', 'multimedia',
    'video_circles', 'knowledge_base', 'library', 'education', 'map', 'travel', 'services', 'path_tracker',
]);

const formatCompactLkm = (value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
        const shortened = (value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1);
        return `${shortened.replace(/\.0$/, '')}M`;
    }
    if (abs >= 1_000) {
        const shortened = (value / 1_000).toFixed(abs >= 10_000 ? 0 : 1);
        return `${shortened.replace(/\.0$/, '')}K`;
    }
    return value.toLocaleString('ru-RU');
};

const WidgetSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
    const {
        layout,
        isEditMode,
        setEditMode,
        addWidget,
        removeWidget,
        reorderWidgets,
    } = usePortalLayout();
    const {
        vTheme,
        isDarkMode,
        setIsMenuOpen,
        portalIconStyle,
        portalBackgroundType,
        portalBackground,
        performanceMode,
        runtimePerformanceState,
    } = useSettings();
    const { regularBalance } = useWallet();

    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const openSource = route.params?.source || 'unknown';
    const isPhotoBg = portalBackgroundType === 'image' && Boolean(portalBackground);
    const useLightIcons = isPhotoBg || portalIconStyle === 'vedamatch';
    const accentIconColor = portalIconStyle === 'vedamatch' ? '#FFDF00' : (useLightIcons ? '#ffffff' : vTheme.colors.primary);
    const secondaryIconColor = portalIconStyle === 'vedamatch' ? '#FFDF00' : (useLightIcons ? '#ffffff' : vTheme.colors.textSecondary);
    const androidVisualPolicy = useMemo(
        () => getAndroidVisualPolicy(performanceMode, runtimePerformanceState),
        [performanceMode, runtimePerformanceState],
    );
    const effectivePerformanceMode = useMemo(
        () => resolveEffectivePerformanceMode(performanceMode, runtimePerformanceState),
        [performanceMode, runtimePerformanceState],
    );
    const allowWidgetBlur = androidVisualPolicy.enableBlur && !(Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality');
    const widgetBlurAmount = getBlurAmountForPolicy(androidVisualPolicy, 12);
    const toolbarBlurAmount = getBlurAmountForPolicy(androidVisualPolicy, 10);
    const widgets = useMemo(() => layout.widgetCanvas?.widgets || [], [layout.widgetCanvas?.widgets]);
    const lkmBalanceLabel = useMemo(() => formatCompactLkm(regularBalance), [regularBalance]);
    const quickAccessServices = useMemo(() => {
        const quickItems = [...(layout.quickAccess || [])].sort((a, b) => a.position - b.position).slice(0, 3);
        return quickItems
            .map((item) => DEFAULT_SERVICES.find((service) => service.id === item.serviceId))
            .filter((service): service is NonNullable<typeof service> => Boolean(service));
    }, [layout.quickAccess]);

    useEffect(() => {
        if (!isPhotoBg || !portalBackground || !portalBackground.startsWith('http')) return;
        Image.prefetch(portalBackground).catch(() => { });
    }, [isPhotoBg, portalBackground]);

    useEffect(() => {
        return () => {
            setEditMode(false);
        };
    }, [setEditMode]);

    const handleBackToPortal = useCallback(() => {
        setEditMode(false);
        console.log(`[portal_widgets_back] source=${openSource}`);
        navigation.navigate('Portal', { resetToGridAt: Date.now() });
    }, [navigation, openSource, setEditMode]);

    const handleQuickAccessPress = useCallback((serviceId: string) => {
        setEditMode(false);
        if (SERVICE_TABS.has(serviceId)) {
            navigation.navigate('Portal', { initialTab: serviceId as any, resetToGridAt: Date.now() });
            return;
        }
        navigation.navigate('Portal', { resetToGridAt: Date.now() });
    }, [navigation, setEditMode]);

    const handleAddWidget = useCallback((widget: { type: 'clock' | 'calendar' | 'circles_quick' | 'circles_panel'; size: '1x1' | '2x1' | '2x2' }) => {
        const result = addWidget(widget);
        if (!result.ok && result.reason === 'duplicate') {
            Alert.alert('Виджет уже добавлен', 'Для каждого вида доступен только один экземпляр.');
        }
        return result;
    }, [addWidget]);

    const content = (
        <View style={[styles.container, { backgroundColor: isPhotoBg ? 'transparent' : vTheme.colors.background }]}>
            <StatusBar barStyle={isPhotoBg || isDarkMode ? 'light-content' : 'dark-content'} />

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={handleBackToPortal}
                        style={[
                            styles.headerCircularButton,
                            {
                                backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                            },
                        ]}
                    >
                        {portalIconStyle !== 'vedamatch' && allowWidgetBlur && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={widgetBlurAmount}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                        )}
                        <List size={18} color={accentIconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('InviteFriends')}
                        style={[
                            styles.headerCircularButton,
                            {
                                backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                            },
                        ]}
                    >
                        {portalIconStyle !== 'vedamatch' && allowWidgetBlur && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={widgetBlurAmount}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                        )}
                        <Gift size={18} color={accentIconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('VideoCirclesScreen')}
                        style={[
                            styles.headerCircularButton,
                            {
                                backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                            },
                        ]}
                    >
                        {portalIconStyle !== 'vedamatch' && allowWidgetBlur && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={widgetBlurAmount}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                        )}
                        <Film size={16} color={accentIconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            setEditMode(true);
                            setIsPickerOpen(true);
                        }}
                        style={[
                            styles.headerCircularButton,
                            {
                                backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                            },
                        ]}
                    >
                        {portalIconStyle !== 'vedamatch' && allowWidgetBlur && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={widgetBlurAmount}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                        )}
                        <LayoutGrid size={16} color={accentIconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Wallet')}
                        style={[
                            styles.headerCircularButton,
                            {
                                backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                            },
                        ]}
                    >
                        {portalIconStyle !== 'vedamatch' && allowWidgetBlur && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={widgetBlurAmount}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                        )}
                        <View style={styles.lkmCircleContent}>
                            <Text style={[styles.lkmLabel, { color: accentIconColor }]}>LKM</Text>
                            <Text style={[styles.lkmAmount, { color: accentIconColor }]} numberOfLines={1}>
                                {lkmBalanceLabel}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        onPress={() => setIsMenuOpen(true)}
                        style={[
                            styles.headerCircularButton,
                            {
                                backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                            },
                        ]}
                    >
                        {portalIconStyle !== 'vedamatch' && allowWidgetBlur && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={widgetBlurAmount}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                        )}
                        <MessageSquare size={18} color={secondaryIconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AppSettings')}
                        style={[
                            styles.headerCircularButton,
                            {
                                backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                            },
                        ]}
                    >
                        {portalIconStyle !== 'vedamatch' && allowWidgetBlur && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={widgetBlurAmount}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                        )}
                        <Settings size={18} color={secondaryIconColor} />
                    </TouchableOpacity>
                    <View
                        style={[
                            styles.headerCircularButton,
                            {
                                backgroundColor: portalIconStyle === 'vedamatch' ? '#121212' : 'rgba(255, 255, 255, 0.25)',
                                borderColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : 'rgba(255, 255, 255, 0.4)',
                            },
                        ]}
                    >
                        {portalIconStyle !== 'vedamatch' && allowWidgetBlur && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={widgetBlurAmount}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                        )}
                        <BellButton
                            size={18}
                            color={secondaryIconColor}
                            circularStyle
                        />
                    </View>
                </View>
            </View>

            <WidgetCanvasGrid
                widgets={widgets}
                isEditMode={isEditMode}
                onSetEditMode={setEditMode}
                onRemoveWidget={removeWidget}
                onReorderWidgets={reorderWidgets}
            />

            {isEditMode && (
                <View
                    style={[
                        styles.toolbar,
                        {
                            backgroundColor: isPhotoBg ? 'rgba(15,23,42,0.78)' : vTheme.colors.backgroundSecondary,
                            borderColor: isPhotoBg ? 'rgba(255,255,255,0.24)' : vTheme.colors.divider,
                        },
                    ]}
                >
                    {(isPhotoBg || isDarkMode) && allowWidgetBlur && (
                        <BlurView
                            style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                            blurType={isDarkMode ? 'dark' : 'light'}
                            blurAmount={toolbarBlurAmount}
                            reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.86)' : vTheme.colors.backgroundSecondary}
                        />
                    )}

                    <TouchableOpacity
                        onPress={() => {
                            setEditMode(true);
                            setIsPickerOpen(true);
                        }}
                        style={[styles.toolbarButton, { borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : vTheme.colors.divider }]}
                        activeOpacity={0.86}
                    >
                        <Plus size={18} color={isPhotoBg ? '#FFFFFF' : vTheme.colors.text} />
                        <Text style={[styles.toolbarButtonText, { color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>Виджет</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setEditMode(false)}
                        style={[
                            styles.toolbarPrimaryButton,
                            { backgroundColor: vTheme.colors.primary },
                        ]}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.toolbarPrimaryButtonText}>Готово</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.quickAccessDock}>
                {(isPhotoBg || isDarkMode) && allowWidgetBlur && (
                    <BlurView
                        style={[StyleSheet.absoluteFill, { borderRadius: 34 }]}
                        blurType={isDarkMode ? 'dark' : 'light'}
                        blurAmount={toolbarBlurAmount}
                        reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.86)' : vTheme.colors.backgroundSecondary}
                    />
                )}
                <View style={[styles.quickAccessInner, {
                    borderColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : vTheme.colors.divider,
                    backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.1)' : vTheme.colors.backgroundSecondary,
                }]}>
                    {quickAccessServices.map((service) => (
                        <View key={service.id} style={styles.quickAccessItem}>
                            <PortalIcon
                                service={service}
                                isEditMode={false}
                                onPress={() => handleQuickAccessPress(service.id)}
                                onLongPress={() => { }}
                                showLabel={false}
                                size={layout.iconSize}
                            />
                        </View>
                    ))}
                    {[...Array(Math.max(0, 3 - quickAccessServices.length))].map((_, index) => (
                        <View key={`widget-dock-empty-${index}`} style={styles.quickAccessEmpty} />
                    ))}
                </View>
            </View>

            <WidgetPickerSheet
                visible={isPickerOpen}
                widgets={widgets}
                onClose={() => setIsPickerOpen(false)}
                onAddWidget={handleAddWidget}
            />
        </View>
    );

    if (isPhotoBg && portalBackground) {
        return (
            <ImageBackground source={{ uri: portalBackground }} style={styles.container} resizeMode="cover" fadeDuration={0}>
                {content}
            </ImageBackground>
        );
    }

    return content;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 10,
        paddingHorizontal: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerCircularButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    toolbar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 146,
        borderRadius: 24,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        overflow: 'hidden',
        gap: 10,
    },
    toolbarButton: {
        minHeight: 42,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    toolbarButtonText: {
        fontSize: 12,
        fontWeight: '700',
    },
    toolbarPrimaryButton: {
        minHeight: 42,
        borderRadius: 16,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    toolbarPrimaryButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    lkmCircleContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    lkmLabel: {
        fontSize: 7,
        fontWeight: '700',
        lineHeight: 9,
        letterSpacing: 0.3,
    },
    lkmAmount: {
        fontSize: 10,
        fontWeight: '800',
        lineHeight: 12,
        maxWidth: 32,
    },
    quickAccessDock: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 28,
        borderRadius: 34,
        overflow: 'hidden',
    },
    quickAccessInner: {
        minHeight: 108,
        borderWidth: 1,
        borderRadius: 34,
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quickAccessItem: {
        width: 86,
        alignItems: 'center',
    },
    quickAccessEmpty: {
        width: 64,
        height: 64,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
});

export default WidgetSelectionScreen;
