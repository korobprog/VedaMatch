import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PortalWidget } from '../../../types/portal';
import { useSettings } from '../../../context/SettingsContext';
import { DraggablePortalItem } from '../DraggablePortalItem';
import { PortalWidgetWrapper } from '../PortalWidgetWrapper';
import { useGridReorderDnd } from '../hooks/useGridReorderDnd';
import { renderPortalWidget } from './renderPortalWidget';

interface WidgetCanvasGridProps {
    widgets: PortalWidget[];
    isEditMode: boolean;
    onSetEditMode: (value: boolean) => void;
    onRequestWidgetMenu?: () => void;
    onRemoveWidget: (widgetId: string) => void;
    onReorderWidgets: (fromIndex: number, toIndex: number) => void;
}

const WIDGET_GRID_ROW_STEP = 92;
const WIDGET_GRID_COL_STEP = 88;

export const WidgetCanvasGrid: React.FC<WidgetCanvasGridProps> = ({
    widgets,
    isEditMode,
    onSetEditMode,
    onRequestWidgetMenu,
    onRemoveWidget,
    onReorderWidgets,
}) => {
    const { t } = useTranslation();
    const { vTheme, portalBackgroundType, isDarkMode, screenVisualStyle } = useSettings();
    const { height: viewportHeight } = useWindowDimensions();
    const isPhotoBg = screenVisualStyle === 'classic' && portalBackgroundType === 'image' && isDarkMode;
    const [isDraggingItem, setIsDraggingItem] = useState(false);
    const canvasRef = useRef<View | null>(null);
    const canvasBoundsRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
    const canvasMinHeight = useMemo(() => Math.max(320, viewportHeight - 330), [viewportHeight]);
    const orderedWidgets = useMemo(
        () => [...widgets].sort((a, b) => a.position - b.position),
        [widgets],
    );
    const singleWidget = orderedWidgets.length === 1 ? orderedWidgets[0] : null;
    const dnd = useGridReorderDnd({
        items: orderedWidgets,
        onReorder: onReorderWidgets,
    });

    const measureCanvasBounds = useCallback(() => {
        if (!canvasRef.current) return;
        (canvasRef.current as any).measureInWindow((x: number, y: number, width: number, height: number) => {
            if (typeof x !== 'number' || typeof y !== 'number' || width <= 0 || height <= 0) return;
            canvasBoundsRef.current = { x, y, width, height };
        });
    }, []);

    const handleCanvasLayout = useCallback(() => {
        measureCanvasBounds();
    }, [measureCanvasBounds]);

    const handleCanvasLongPress = useCallback(() => {
        if (dnd.isDragging || isDraggingItem) return;
        onSetEditMode(true);
        onRequestWidgetMenu?.();
    }, [dnd.isDragging, isDraggingItem, onRequestWidgetMenu, onSetEditMode]);

    const handleCanvasPress = useCallback(() => {
        if (isEditMode && !dnd.isDragging && !isDraggingItem) {
            onSetEditMode(false);
        }
    }, [dnd.isDragging, isDraggingItem, isEditMode, onSetEditMode]);

    const handleDragStart = useCallback(() => {
        setIsDraggingItem(true);
        onSetEditMode(true);
        measureCanvasBounds();
        dnd.onDragStart();
    }, [dnd, measureCanvasBounds, onSetEditMode]);

    const handleDragEnd = useCallback((id: string, x: number, y: number) => {
        setIsDraggingItem(false);
        if (singleWidget && singleWidget.id === id && canvasBoundsRef.current.width > 0) {
            const bounds = canvasBoundsRef.current;
            const clampedX = Math.max(bounds.x, Math.min(bounds.x + bounds.width - 1, x));
            const clampedY = Math.max(bounds.y, Math.min(bounds.y + bounds.height - 1, y));
            const relX = clampedX - bounds.x;
            const relY = clampedY - bounds.y;
            const maxRows = Math.max(0, Math.floor((canvasMinHeight - 80) / WIDGET_GRID_ROW_STEP));

            let targetPosition = 0;
            if (singleWidget.size === '1x1') {
                const col = relX >= bounds.width / 2 ? 1 : 0;
                const row = Math.max(0, Math.min(maxRows, Math.floor(relY / WIDGET_GRID_ROW_STEP)));
                targetPosition = row * 2 + col;
            } else {
                targetPosition = Math.max(0, Math.min(maxRows, Math.floor(relY / WIDGET_GRID_ROW_STEP)));
            }

            if (targetPosition !== Math.max(0, singleWidget.position)) {
                onReorderWidgets(0, targetPosition);
            }
            return;
        }
        dnd.onDragEnd(id, x, y);
    }, [canvasMinHeight, dnd, onReorderWidgets, singleWidget]);

    const singleWidgetOffsetStyle = useMemo<ViewStyle | undefined>(() => {
        if (!singleWidget) return undefined;
        const normalizedPosition = Math.max(0, singleWidget.position || 0);
        if (singleWidget.size === '1x1') {
            const row = Math.floor(normalizedPosition / 2);
            const col = normalizedPosition % 2;
            return {
                marginTop: row * WIDGET_GRID_ROW_STEP,
                marginLeft: col * WIDGET_GRID_COL_STEP,
            };
        }
        return {
            marginTop: normalizedPosition * WIDGET_GRID_ROW_STEP,
        };
    }, [singleWidget]);

    if (orderedWidgets.length === 0) {
        return (
            <View style={[styles.emptyCanvas, { minHeight: canvasMinHeight }]}>
                <Pressable
                    testID="widget-canvas-empty-zone"
                    ref={canvasRef}
                    style={styles.emptyCanvasPressable}
                    onLayout={handleCanvasLayout}
                    onLongPress={handleCanvasLongPress}
                    onPress={handleCanvasPress}
                >
                    <View
                        style={[
                            styles.emptyState,
                            {
                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : vTheme.colors.divider,
                                backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.12)' : vTheme.colors.backgroundSecondary,
                            },
                        ]}
                    >
                        <Text style={[styles.emptyTitle, { color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>
                            {t('portal.widgets.empty.title')}
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: isPhotoBg ? 'rgba(255,255,255,0.8)' : vTheme.colors.textSecondary }]}>
                            {t('portal.widgets.empty.subtitle')}
                        </Text>
                        <Pressable
                            testID="widget-canvas-empty-add-button"
                            style={[
                                styles.emptyActionButton,
                                {
                                    backgroundColor: vTheme.colors.primary,
                                },
                            ]}
                            onPress={handleCanvasLongPress}
                        >
                            <Text style={styles.emptyActionButtonText}>
                                {t('portal.widgets.addWidget')}
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!dnd.isDragging}
        >
            <Pressable
                ref={canvasRef}
                onLongPress={handleCanvasLongPress}
                onPress={handleCanvasPress}
                onLayout={handleCanvasLayout}
                style={[styles.canvasPressable, { minHeight: canvasMinHeight }]}
            >
                <View style={styles.gridWrap}>
                    {orderedWidgets.map((widget) => (
                        <View
                            key={widget.id}
                            style={[styles.gridItem, singleWidget?.id === widget.id ? singleWidgetOffsetStyle : null]}
                        >
                            <DraggablePortalItem
                                id={widget.id}
                                isEditMode={isEditMode}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onLayout={(event) => dnd.onLayout(widget.id, event)}
                                onPress={() => { }}
                                onSecondaryLongPress={() => onSetEditMode(true)}
                            >
                                <View
                                    ref={(ref) => { dnd.itemRefs.current[widget.id] = ref; }}
                                    pointerEvents="box-none"
                                    collapsable={false}
                                >
                                    <PortalWidgetWrapper
                                        isEditMode={isEditMode}
                                        onRemove={() => onRemoveWidget(widget.id)}
                                    >
                                        <View pointerEvents={isEditMode ? 'none' : 'auto'}>
                                            {renderPortalWidget(widget)}
                                        </View>
                                    </PortalWidgetWrapper>
                                </View>
                            </DraggablePortalItem>
                        </View>
                    ))}
                </View>
            </Pressable>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 240,
    },
    canvasPressable: {
        flex: 1,
    },
    gridWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    gridItem: {
        marginRight: 4,
        marginBottom: 4,
    },
    emptyState: {
        marginHorizontal: 12,
        marginTop: 12,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 22,
        alignItems: 'center',
    },
    emptyCanvas: {
        flex: 1,
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 240,
    },
    emptyCanvasPressable: {
        flex: 1,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 18,
    },
    emptyActionButton: {
        marginTop: 16,
        minHeight: 42,
        borderRadius: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyActionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
