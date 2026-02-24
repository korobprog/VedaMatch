import React, { useMemo } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { PortalWidget } from '../../../types/portal';
import { useSettings } from '../../../context/SettingsContext';
import { WIDGET_CATALOG, canAddWidget, getWidgetKey } from './widgetCatalog';
import { renderPortalWidget } from './renderPortalWidget';

interface WidgetPickerSheetProps {
    visible: boolean;
    widgets: PortalWidget[];
    onClose: () => void;
    onAddWidget: (widget: Omit<PortalWidget, 'id' | 'position'>) => { ok: boolean; reason?: 'duplicate' };
}

export const WidgetPickerSheet: React.FC<WidgetPickerSheetProps> = ({
    visible,
    widgets,
    onClose,
    onAddWidget,
}) => {
    const { vTheme, portalBackgroundType } = useSettings();
    const isPhotoBg = portalBackgroundType === 'image';

    const activeKeys = useMemo(() => new Set(widgets.map((widget) => getWidgetKey(widget))), [widgets]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <Pressable style={styles.backdropTapArea} onPress={onClose} />
                <View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: isPhotoBg ? 'rgba(15,23,42,0.95)' : vTheme.colors.backgroundSecondary,
                            borderColor: isPhotoBg ? 'rgba(255,255,255,0.24)' : vTheme.colors.border,
                        },
                    ]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>Добавить виджет</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.85}>
                            <X size={18} color={isPhotoBg ? '#FFFFFF' : vTheme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.listScroll}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        bounces
                    >
                        {WIDGET_CATALOG.map((entry) => {
                            const key = getWidgetKey(entry);
                            const isActive = activeKeys.has(key);
                            const allowed = canAddWidget(widgets, entry);
                            return (
                                <View
                                    key={key}
                                    style={[
                                        styles.card,
                                        {
                                            borderColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : vTheme.colors.border,
                                            backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.1)' : vTheme.colors.background,
                                        },
                                    ]}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardTitleWrap}>
                                            <Text style={[styles.cardTitle, { color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>{entry.title}</Text>
                                            <Text style={[styles.cardMeta, { color: isPhotoBg ? 'rgba(255,255,255,0.78)' : vTheme.colors.textSecondary }]}>
                                                {entry.size} · {entry.description}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            disabled={!allowed}
                                            onPress={() => {
                                                onAddWidget({ type: entry.type, size: entry.size });
                                            }}
                                            style={[
                                                styles.addButton,
                                                {
                                                    backgroundColor: allowed ? vTheme.colors.primary : 'rgba(107,114,128,0.5)',
                                                    opacity: allowed ? 1 : 0.7,
                                                },
                                            ]}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.addButtonText}>{isActive ? 'Добавлен' : 'Добавить'}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.previewWrap} pointerEvents="none">
                                        {renderPortalWidget({ type: entry.type, size: entry.size })}
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.48)',
        justifyContent: 'flex-end',
    },
    backdropTapArea: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        paddingTop: 12,
        paddingHorizontal: 14,
        maxHeight: '82%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        paddingBottom: 24,
        flexGrow: 1,
    },
    listScroll: {
        maxHeight: 520,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        marginTop: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        gap: 10,
    },
    cardTitleWrap: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    cardMeta: {
        fontSize: 12,
        fontWeight: '500',
    },
    addButton: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    previewWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
    },
});
