import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
    onRemoveWidget: (widgetId: string) => void;
    onReorderWidgets: (fromIndex: number, toIndex: number) => void;
}

export const WidgetCanvasGrid: React.FC<WidgetCanvasGridProps> = ({
    widgets,
    isEditMode,
    onSetEditMode,
    onRemoveWidget,
    onReorderWidgets,
}) => {
    const { vTheme, portalBackgroundType } = useSettings();
    const { height: viewportHeight } = useWindowDimensions();
    const isPhotoBg = portalBackgroundType === 'image';
    const [isDraggingItem, setIsDraggingItem] = useState(false);
    const canvasMinHeight = useMemo(() => Math.max(320, viewportHeight - 330), [viewportHeight]);
    const orderedWidgets = useMemo(
        () => [...widgets].sort((a, b) => a.position - b.position),
        [widgets],
    );

    const dnd = useGridReorderDnd({
        items: orderedWidgets,
        onReorder: onReorderWidgets,
    });

    const handleCanvasLongPress = useCallback(() => {
        if (dnd.isDragging || isDraggingItem) return;
        onSetEditMode(true);
    }, [dnd.isDragging, isDraggingItem, onSetEditMode]);

    const handleCanvasPress = useCallback(() => {
        if (isEditMode && !dnd.isDragging && !isDraggingItem) {
            onSetEditMode(false);
        }
    }, [dnd.isDragging, isDraggingItem, isEditMode, onSetEditMode]);

    const handleDragStart = useCallback(() => {
        setIsDraggingItem(true);
        onSetEditMode(true);
        dnd.onDragStart();
    }, [dnd, onSetEditMode]);

    const handleDragEnd = useCallback((id: string, x: number, y: number) => {
        setIsDraggingItem(false);
        dnd.onDragEnd(id, x, y);
    }, [dnd]);

    if (orderedWidgets.length === 0) {
        return (
            <Pressable
                style={[
                    styles.emptyState,
                    {
                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : vTheme.colors.divider,
                        backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.12)' : vTheme.colors.backgroundSecondary,
                    },
                ]}
                onLongPress={handleCanvasLongPress}
                onPress={handleCanvasPress}
            >
                <Text style={[styles.emptyTitle, { color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>
                    Пока нет виджетов
                </Text>
                <Text style={[styles.emptySubtitle, { color: isPhotoBg ? 'rgba(255,255,255,0.8)' : vTheme.colors.textSecondary }]}>
                    Нажмите "+" внизу, чтобы добавить первый виджет
                </Text>
            </Pressable>
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
                onLongPress={handleCanvasLongPress}
                onPress={handleCanvasPress}
                style={[styles.canvasPressable, { minHeight: canvasMinHeight }]}
            >
                <View style={styles.gridWrap}>
                    {orderedWidgets.map((widget) => (
                        <View
                            key={widget.id}
                            style={styles.gridItem}
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
});
