import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTranslation } from 'react-i18next';
import { usePortalLayout } from '../../../context/PortalLayoutContext';
import { useSettings } from '../../../context/SettingsContext';
import { getAndroidVisualPolicy, getBlurAmountForPolicy, resolveEffectivePerformanceMode } from '../../../utils/androidVisualPolicy';
import { WidgetCanvasGrid } from './WidgetCanvasGrid';
import { WidgetPickerSheet } from './WidgetPickerSheet';
import { WORKSPACE_DOCK_BOTTOM, WORKSPACE_DOCK_GAP, WORKSPACE_DOCK_HEIGHT } from '../portalWorkspaceConstants';

interface WidgetPageContentProps {
    isPickerOpen: boolean;
    onSetPickerOpen: (value: boolean) => void;
    onDraggingChange?: (value: boolean) => void;
    onPageReady?: () => void;
}

export const WidgetPageContent: React.FC<WidgetPageContentProps> = ({
    isPickerOpen,
    onSetPickerOpen,
    onDraggingChange,
    onPageReady,
}) => {
    const { t } = useTranslation();
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
        screenVisualStyle,
        portalBackgroundType,
        performanceMode,
        runtimePerformanceState,
    } = useSettings();

    const readyNotifiedRef = useRef(false);
    const widgets = useMemo(() => layout.widgetCanvas?.widgets || [], [layout.widgetCanvas?.widgets]);
    const isPhotoBg = screenVisualStyle === 'classic' && portalBackgroundType === 'image' && isDarkMode;
    const androidVisualPolicy = useMemo(
        () => getAndroidVisualPolicy(performanceMode, runtimePerformanceState),
        [performanceMode, runtimePerformanceState],
    );
    const effectivePerformanceMode = useMemo(
        () => resolveEffectivePerformanceMode(performanceMode, runtimePerformanceState),
        [performanceMode, runtimePerformanceState],
    );
    const allowWidgetBlur = androidVisualPolicy.enableBlur && !(Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality');
    const toolbarBlurAmount = getBlurAmountForPolicy(androidVisualPolicy, 10);
    const toolbarSurfaceColor = isPhotoBg
        ? 'rgba(15,23,42,0.78)'
        : isDarkMode
            ? vTheme.colors.backgroundSecondary
            : 'rgba(255,255,255,0.96)';
    const toolbarBorderColor = isPhotoBg
        ? 'rgba(255,255,255,0.24)'
        : isDarkMode
            ? vTheme.colors.divider
            : 'rgba(15,23,42,0.14)';

    useEffect(() => {
        onDraggingChange?.(false);
        return () => onDraggingChange?.(false);
    }, [onDraggingChange]);

    const notifyPageReady = useCallback(() => {
        if (readyNotifiedRef.current) {
            return;
        }
        readyNotifiedRef.current = true;
        onPageReady?.();
    }, [onPageReady]);

    const openWidgetMenu = useCallback(() => {
        setEditMode(true);
        onSetPickerOpen(true);
    }, [onSetPickerOpen, setEditMode]);

    const handleAddWidget = useCallback((widget: { type: 'clock' | 'calendar' | 'circles_quick' | 'circles_panel' | 'feed_quick' | 'feed_mix'; size: '1x1' | '2x1' | '2x2' }) => {
        const result = addWidget(widget);
        if (!result.ok && result.reason === 'duplicate') {
            Alert.alert(t('portal.widgets.duplicateTitle'), t('portal.widgets.duplicateMessage'));
        }
        return result;
    }, [addWidget, t]);

    const handleRemoveWidget = useCallback((widgetId: string) => {
        const isRemovingLastWidget = widgets.length === 1 && widgets[0]?.id === widgetId;
        removeWidget(widgetId);
        if (isRemovingLastWidget) {
            openWidgetMenu();
        }
    }, [openWidgetMenu, removeWidget, widgets]);

    return (
        <View style={styles.container} onLayout={notifyPageReady}>
            <WidgetCanvasGrid
                widgets={widgets}
                isEditMode={isEditMode}
                onSetEditMode={setEditMode}
                onRequestWidgetMenu={openWidgetMenu}
                onRemoveWidget={handleRemoveWidget}
                onReorderWidgets={reorderWidgets}
                onDragStateChange={onDraggingChange}
                onInitialLayoutReady={notifyPageReady}
            />

            {isEditMode && (
                <View
                    style={[
                        styles.toolbar,
                        {
                            backgroundColor: toolbarSurfaceColor,
                            borderColor: toolbarBorderColor,
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
                        onPress={() => setEditMode(false)}
                        style={[
                            styles.toolbarPrimaryButton,
                            { backgroundColor: vTheme.colors.primary },
                        ]}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.toolbarPrimaryButtonText}>{t('common.done')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <WidgetPickerSheet
                visible={isPickerOpen}
                widgets={widgets}
                onClose={() => onSetPickerOpen(false)}
                onAddWidget={handleAddWidget}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    toolbar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: WORKSPACE_DOCK_BOTTOM + WORKSPACE_DOCK_HEIGHT + WORKSPACE_DOCK_GAP,
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
});
