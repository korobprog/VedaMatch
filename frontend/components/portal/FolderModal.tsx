// Folder Modal - opens when folder is tapped, shows contents
import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet as RNStyleSheet,
    useWindowDimensions,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    useSharedValue,
    cancelAnimation,
} from 'react-native-reanimated';
import { X, Check, Palette } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PortalFolder, PortalItem, DEFAULT_SERVICES, FOLDER_COLORS } from '../../types/portal';
import { PortalIcon } from './PortalIcon';
import { useSettings } from '../../context/SettingsContext';
import { getAndroidVisualPolicy, getBlurAmountForPolicy, resolveEffectivePerformanceMode } from '../../utils/androidVisualPolicy';

interface FolderModalProps {
    visible: boolean;
    folder: PortalFolder;
    onClose: () => void;
    onRename: (newName: string) => void;
    onChangeColor: (newColor: string) => void;
    onItemPress: (item: PortalItem) => void;
    onRemoveItem: (itemId: string) => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
    visible,
    folder,
    onClose,
    onRename,
    onChangeColor,
    onItemPress,
    onRemoveItem,
}) => {
    const { t } = useTranslation();
    const { vTheme, isDarkMode, portalBackgroundType, performanceMode, runtimePerformanceState } = useSettings();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(folder.name);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const isPhotoBg = portalBackgroundType === 'image';
    const androidVisualPolicy = getAndroidVisualPolicy(performanceMode, runtimePerformanceState);
    const effectivePerformanceMode = resolveEffectivePerformanceMode(performanceMode, runtimePerformanceState);
    const isAndroidReducedEffects = Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality';
    const allowModalBlur = androidVisualPolicy.enableBlur && !isAndroidReducedEffects;
    const translateY = useSharedValue(48);
    const opacity = useSharedValue(0);

    React.useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0, { damping: 18, stiffness: 170 });
            opacity.value = withTiming(1, { duration: 220 });
            setEditName(folder.name);
        } else {
            translateY.value = withTiming(48, { duration: 160 });
            opacity.value = withTiming(0, { duration: 160 });
            setIsEditing(false);
            setShowColorPicker(false);
        }

        return () => {
            cancelAnimation(translateY);
            cancelAnimation(opacity);
        };
    }, [folder.name, opacity, translateY, visible]);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    const handleSaveName = () => {
        const trimmed = editName.trim();
        if (trimmed) {
            onRename(trimmed);
        }
        setIsEditing(false);
    };

    const displayItems = useMemo(
        () => folder.items.reduce<Array<{ item: PortalItem; service: typeof DEFAULT_SERVICES[number] }>>((acc, item) => {
            const service = DEFAULT_SERVICES.find((entry) => entry.id === item.serviceId);
            if (!service || acc.some((entry) => entry.item.serviceId === item.serviceId)) {
                return acc;
            }
            acc.push({
                item,
                service: {
                    ...service,
                    label: t(`portal.serviceLabels.${service.id}`, { defaultValue: service.label }),
                },
            });
            return acc;
        }, []),
        [folder.items, t],
    );

    const modalSurfaceColor = isPhotoBg
        ? 'rgba(15,23,42,0.92)'
        : isDarkMode
            ? 'rgba(28,28,30,0.96)'
            : 'rgba(250,247,240,0.97)';
    const modalBorderColor = isPhotoBg
        ? 'rgba(255,255,255,0.18)'
        : isDarkMode
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(255,153,51,0.18)';
    const secondaryTextColor = isPhotoBg ? 'rgba(255,255,255,0.72)' : vTheme.colors.textSecondary;
    const emptyHintColor = isPhotoBg ? 'rgba(255,255,255,0.65)' : vTheme.colors.textSecondary;
    const isCompactScreen = windowHeight < 780;
    const gridRowCount = Math.max(1, Math.ceil(displayItems.length / 3));
    const colorPickerHeight = showColorPicker ? 52 : 0;
    const bottomDockGap = Platform.OS === 'android'
        ? (isCompactScreen ? 110 : 124)
        : (isCompactScreen ? 74 : 85);
    const rowLiftBonus = gridRowCount > 1
        ? (Platform.OS === 'android' ? (isCompactScreen ? 14 : 20) : (isCompactScreen ? 0 : 5))
        : 0;
    const sheetBottomOffset = bottomDockGap + Math.max(insets.bottom, 8) + rowLiftBonus;
    const availableVerticalSpace = Math.max(
        360,
        windowHeight - sheetBottomOffset - Math.max(insets.top + 28, 88),
    );
    const maxSheetHeight = Math.min(
        availableVerticalSpace,
        Math.round(windowHeight * (Platform.OS === 'android' ? (isCompactScreen ? 0.78 : 0.76) : (isCompactScreen ? 0.68 : 0.65))),
    );
    const estimatedContentHeight = displayItems.length > 0
        ? (isCompactScreen ? 172 : 186) + gridRowCount * (isCompactScreen ? 138 : 146)
        : (isCompactScreen ? 300 : 320);
    const targetSheetHeight = Math.min(
        maxSheetHeight,
        estimatedContentHeight + colorPickerHeight + Math.max(insets.bottom, 10),
    );
    const contentBottomPadding = isCompactScreen ? 10 : 18;
    const gridBottomPadding = isCompactScreen ? 4 : 8;
    const iconRowGap = isCompactScreen ? 10 : 14;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                >
                    <Animated.View
                        style={[
                            styles.sheetWrapper,
                            animatedContainerStyle,
                            { paddingBottom: sheetBottomOffset },
                        ]}
                    >
                        <Pressable
                            style={[
                                styles.container,
                                {
                                    backgroundColor: modalSurfaceColor,
                                    borderColor: modalBorderColor,
                                    maxHeight: maxSheetHeight,
                                    minHeight: Math.max(isCompactScreen ? 260 : 280, targetSheetHeight),
                                },
                            ]}
                            onPress={(event) => event.stopPropagation()}
                        >
                            {(isPhotoBg || isDarkMode) && allowModalBlur && (
                                <BlurView
                                    style={[RNStyleSheet.absoluteFill, { borderRadius: 30 }]}
                                    blurType={isDarkMode ? 'dark' : 'light'}
                                    blurAmount={getBlurAmountForPolicy(androidVisualPolicy, 16)}
                                    reducedTransparencyFallbackColor={modalSurfaceColor}
                                />
                            )}

                            <View style={styles.handle} />

                            <View style={styles.headerRow}>
                                <View style={styles.titleBlock}>
                                    <View
                                        style={[
                                            styles.folderAccent,
                                            {
                                                backgroundColor: `${folder.color}20`,
                                                borderColor: `${folder.color}55`,
                                            },
                                        ]}
                                    />
                                    <View style={styles.titleTextBlock}>
                                        {isEditing ? (
                                            <View style={styles.editContainer}>
                                                <TextInput
                                                    style={[
                                                        styles.nameInput,
                                                        {
                                                            color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text,
                                                            borderColor: folder.color,
                                                            backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                                                        },
                                                    ]}
                                                    value={editName}
                                                    onChangeText={setEditName}
                                                    autoFocus
                                                    selectTextOnFocus
                                                    onSubmitEditing={handleSaveName}
                                                />
                                                <TouchableOpacity
                                                    onPress={handleSaveName}
                                                    style={[styles.saveButton, { backgroundColor: folder.color }]}
                                                >
                                                    <Check size={14} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity onPress={() => setIsEditing(true)} activeOpacity={0.82}>
                                                <Text style={[styles.folderName, { color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>
                                                    {folder.name}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        <Text style={[styles.folderMeta, { color: secondaryTextColor }]}>
                                            {t('portal.grid.folder')} · {displayItems.length}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.headerActions}>
                                    <TouchableOpacity
                                        onPress={() => setShowColorPicker((prev) => !prev)}
                                        style={[
                                            styles.actionButton,
                                            { backgroundColor: `${folder.color}20`, borderColor: `${folder.color}55` },
                                        ]}
                                    >
                                        <Palette size={16} color={folder.color} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={onClose}
                                        style={[
                                            styles.actionButton,
                                            {
                                                backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.06)',
                                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.08)',
                                            },
                                        ]}
                                    >
                                        <X size={18} color={isPhotoBg ? '#FFFFFF' : vTheme.colors.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {showColorPicker && (
                                <View style={styles.colorPicker}>
                                    {FOLDER_COLORS.map((color) => (
                                        <TouchableOpacity
                                            key={color}
                                            onPress={() => {
                                                onChangeColor(color);
                                                setShowColorPicker(false);
                                            }}
                                            style={[
                                                styles.colorOption,
                                                { backgroundColor: color },
                                                color === folder.color && styles.selectedColor,
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}

                            <ScrollView
                                style={styles.scrollArea}
                                contentContainerStyle={[styles.scrollContent, { paddingBottom: contentBottomPadding }]}
                                showsVerticalScrollIndicator={false}
                            >
                                {displayItems.length > 0 ? (
                                    <View style={[styles.itemsGrid, { paddingBottom: gridBottomPadding }]}>
                                        {displayItems.map(({ item, service }) => (
                                            <View style={[styles.iconWrapper, { marginBottom: iconRowGap }]} key={item.id}>
                                                <PortalIcon
                                                    service={service}
                                                    isEditMode={false}
                                                    onPress={() => onItemPress(item)}
                                                    onLongPress={() => onRemoveItem(item.id)}
                                                    size="medium"
                                                    showLabel
                                                    labelNumberOfLines={2}
                                                    labelMaxWidth={92}
                                                />
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Text style={[styles.emptyText, { color: isPhotoBg ? '#FFFFFF' : vTheme.colors.text }]}>
                                            {t('portal.folderModal.empty')}
                                        </Text>
                                        <Text style={[styles.emptyHint, { color: emptyHintColor }]}>
                                            {t('portal.folderModal.hint')}
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>
                        </Pressable>
                    </Animated.View>
                </KeyboardAvoidingView>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(10,12,18,0.42)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        width: '100%',
        justifyContent: 'flex-end',
    },
    sheetWrapper: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    container: {
        width: '100%',
        maxWidth: 520,
        minHeight: 260,
        borderRadius: 30,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
        elevation: 18,
    },
    handle: {
        alignSelf: 'center',
        width: 42,
        height: 5,
        borderRadius: 999,
        backgroundColor: 'rgba(148,163,184,0.45)',
        marginBottom: 14,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 14,
    },
    titleBlock: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    folderAccent: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1,
        marginTop: 5,
    },
    titleTextBlock: {
        flex: 1,
    },
    folderName: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.7,
    },
    folderMeta: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: '600',
    },
    editContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    nameInput: {
        flex: 1,
        fontSize: 17,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    },
    saveButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingTop: 2,
        paddingBottom: 14,
    },
    colorOption: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    selectedColor: {
        borderWidth: 3,
        borderColor: '#FFF',
    },
    scrollArea: {
        flexGrow: 0,
    },
    scrollContent: {},
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    iconWrapper: {
        width: '33.333%',
        paddingHorizontal: 4,
        alignItems: 'center',
    },
    emptyState: {
        minHeight: 180,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 17,
        fontWeight: '700',
    },
    emptyHint: {
        fontSize: 13,
        marginTop: 6,
        textAlign: 'center',
    },
});
