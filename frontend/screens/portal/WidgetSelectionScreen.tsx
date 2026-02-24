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
import { ChevronLeft, Film, Gift, LayoutGrid, List, MessageSquare, Pencil, Settings } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { usePortalLayout } from '../../context/PortalLayoutContext';
import { useSettings } from '../../context/SettingsContext';
import { WidgetCanvasGrid } from '../../components/portal/widgets/WidgetCanvasGrid';
import { WidgetPickerSheet } from '../../components/portal/widgets/WidgetPickerSheet';
import { BellButton } from '../../components/portal/BellButton';
import { BalancePill } from '../../components/wallet/BalancePill';

type Props = NativeStackScreenProps<RootStackParamList, 'WidgetSelection'>;

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
    } = useSettings();

    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const openSource = route.params?.source || 'unknown';
    const isPhotoBg = portalBackgroundType === 'image' && Boolean(portalBackground);
    const useLightIcons = isPhotoBg || portalIconStyle === 'vedamatch';
    const accentIconColor = portalIconStyle === 'vedamatch' ? '#FFDF00' : (useLightIcons ? '#ffffff' : vTheme.colors.primary);
    const secondaryIconColor = portalIconStyle === 'vedamatch' ? '#FFDF00' : (useLightIcons ? '#ffffff' : vTheme.colors.textSecondary);
    const widgets = useMemo(() => layout.widgetCanvas?.widgets || [], [layout.widgetCanvas?.widgets]);

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
                        {portalIconStyle !== 'vedamatch' && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={12}
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
                        {portalIconStyle !== 'vedamatch' && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={12}
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
                        {portalIconStyle !== 'vedamatch' && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={12}
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
                        {portalIconStyle !== 'vedamatch' && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={12}
                                reducedTransparencyFallbackColor="rgba(255,255,255,0.5)"
                            />
                        )}
                        <LayoutGrid size={16} color={accentIconColor} />
                    </TouchableOpacity>
                    <BalancePill size="small" lightMode={useLightIcons} />
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
                        {portalIconStyle !== 'vedamatch' && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={12}
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
                        {portalIconStyle !== 'vedamatch' && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={12}
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
                        {portalIconStyle !== 'vedamatch' && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType="light"
                                blurAmount={12}
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

            <View
                style={[
                    styles.toolbar,
                    {
                        backgroundColor: isPhotoBg ? 'rgba(15,23,42,0.78)' : vTheme.colors.backgroundSecondary,
                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.24)' : vTheme.colors.divider,
                    },
                ]}
            >
                {(isPhotoBg || isDarkMode) && (
                    <BlurView
                        style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                        blurType={isDarkMode ? 'dark' : 'light'}
                        blurAmount={10}
                        reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.86)' : vTheme.colors.backgroundSecondary}
                    />
                )}

                <TouchableOpacity
                    onPress={handleBackToPortal}
                    style={[styles.toolbarButton, { borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : vTheme.colors.divider }]}
                    activeOpacity={0.86}
                >
                    <ChevronLeft size={18} color={isPhotoBg ? '#FFFFFF' : vTheme.colors.text} />
                    <Text style={[styles.toolbarButtonText, { color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>Портал</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        setEditMode(true);
                        setIsPickerOpen(true);
                    }}
                    style={[styles.toolbarButton, { borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : vTheme.colors.divider }]}
                    activeOpacity={0.86}
                >
                    <LayoutGrid size={18} color={isPhotoBg ? '#FFFFFF' : vTheme.colors.text} />
                    <Text style={[styles.toolbarButtonText, { color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>Виджет</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setEditMode(!isEditMode)}
                    style={[
                        styles.toolbarPrimaryButton,
                        { backgroundColor: vTheme.colors.primary },
                    ]}
                    activeOpacity={0.88}
                >
                    <Pencil size={16} color="#FFFFFF" />
                    <Text style={styles.toolbarPrimaryButtonText}>{isEditMode ? 'Готово' : 'Редакт.'}</Text>
                </TouchableOpacity>
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
        left: 12,
        right: 12,
        bottom: 40,
        borderRadius: 24,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        overflow: 'hidden',
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
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    toolbarPrimaryButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
});

export default WidgetSelectionScreen;
