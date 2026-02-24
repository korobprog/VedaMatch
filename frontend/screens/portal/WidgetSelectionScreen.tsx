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
import { ChevronLeft, Pencil, Plus } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { usePortalLayout } from '../../context/PortalLayoutContext';
import { useSettings } from '../../context/SettingsContext';
import { WidgetCanvasGrid } from '../../components/portal/widgets/WidgetCanvasGrid';
import { WidgetPickerSheet } from '../../components/portal/widgets/WidgetPickerSheet';

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
        portalBackgroundType,
        portalBackground,
    } = useSettings();

    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const openSource = route.params?.source || 'unknown';
    const isPhotoBg = portalBackgroundType === 'image' && Boolean(portalBackground);
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

            <View
                style={[
                    styles.header,
                    {
                        borderBottomColor: isPhotoBg ? 'rgba(255,255,255,0.24)' : vTheme.colors.border,
                        backgroundColor: isPhotoBg ? 'rgba(15,23,42,0.58)' : vTheme.colors.backgroundSecondary,
                    },
                ]}
            >
                {(isPhotoBg || isDarkMode) && (
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType={isDarkMode ? 'dark' : 'light'}
                        blurAmount={12}
                        reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.72)' : vTheme.colors.backgroundSecondary}
                    />
                )}

                <TouchableOpacity
                    onPress={handleBackToPortal}
                    style={[
                        styles.backButton,
                        {
                            backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.18)' : vTheme.colors.background,
                            borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : vTheme.colors.border,
                        },
                    ]}
                    activeOpacity={0.86}
                >
                    <ChevronLeft size={24} color={isPhotoBg ? '#FFFFFF' : vTheme.colors.text} />
                </TouchableOpacity>

                <View style={styles.titleWrap}>
                    <Text style={[styles.title, { color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>Виджеты</Text>
                    <Text style={[styles.subtitle, { color: isPhotoBg ? 'rgba(255,255,255,0.82)' : vTheme.colors.textSecondary }]}>
                        Отдельный холст виджетов в формате портала
                    </Text>
                </View>

                <View style={styles.headerPlaceholder} />
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
                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.24)' : vTheme.colors.border,
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
                    onPress={() => {
                        setEditMode(true);
                        setIsPickerOpen(true);
                    }}
                    style={[styles.toolbarButton, { borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : vTheme.colors.border }]}
                    activeOpacity={0.86}
                >
                    <Plus size={18} color={isPhotoBg ? '#FFFFFF' : vTheme.colors.text} />
                    <Text style={[styles.toolbarButtonText, { color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>Добавить</Text>
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
                    <Text style={styles.toolbarPrimaryButtonText}>{isEditMode ? 'Готово' : 'Редактировать'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.hintContainer}>
                <Text style={[styles.hintText, { color: isPhotoBg ? 'rgba(255,255,255,0.78)' : vTheme.colors.textSecondary }]}>
                    Удерживайте виджет для редактирования и перетаскивания
                </Text>
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
                <View style={styles.photoOverlay}>{content}</View>
            </ImageBackground>
        );
    }

    return content;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    photoOverlay: {
        flex: 1,
        backgroundColor: 'rgba(7,12,23,0.34)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        overflow: 'hidden',
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    subtitle: {
        marginTop: 2,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    headerPlaceholder: {
        width: 42,
        height: 42,
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
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toolbarButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    toolbarPrimaryButton: {
        minHeight: 42,
        borderRadius: 16,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toolbarPrimaryButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    hintContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 10,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    hintText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default WidgetSelectionScreen;

