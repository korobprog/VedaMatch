// Folder Modal - opens when folder is tapped, shows contents
import React, { useState } from 'react';
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
    StyleSheet as RNStyleSheet,
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
import { PortalFolder, PortalItem, DEFAULT_SERVICES, FOLDER_COLORS } from '../../types/portal';
import { PortalIcon } from './PortalIcon';
import { useSettings } from '../../context/SettingsContext';

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
    const { vTheme, isDarkMode, portalBackgroundType } = useSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(folder.name);
    const isPhotoBg = portalBackgroundType === 'image';
    const [showColorPicker, setShowColorPicker] = useState(false);

    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);

    React.useEffect(() => {
        if (visible) {
            scale.value = withSpring(1, { damping: 15 });
            opacity.value = withTiming(1, { duration: 200 });
            setEditName(folder.name);
        } else {
            scale.value = withTiming(0.8, { duration: 150 });
            opacity.value = withTiming(0, { duration: 150 });
        }

        return () => {
            cancelAnimation(scale);
            cancelAnimation(opacity);
        };
    }, [visible, folder.name]);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handleSaveName = () => {
        if (editName.trim()) {
            onRename(editName.trim());
        }
        setIsEditing(false);
    };

    const getServiceForItem = (item: PortalItem) => {
        return DEFAULT_SERVICES.find(s => s.id === item.serviceId);
    };

    const displayItems = folder.items.reduce<PortalItem[]>((acc, item) => {
        const isValid = !!getServiceForItem(item);
        const duplicate = acc.some((x) => x.serviceId === item.serviceId);
        if (isValid && !duplicate) {
            acc.push(item);
        }
        return acc;
    }, []);

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
                    <Animated.View style={[animatedContainerStyle]}>
                        <Pressable
                            style={[
                                styles.container,
                                {
                                    backgroundColor: isPhotoBg
                                        ? 'transparent'
                                        : (isDarkMode ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)'),
                                    borderWidth: 0,
                                },
                            ]}
                            onPress={(e) => e.stopPropagation()}
                        >
                            {(isPhotoBg || isDarkMode) && (
                                <BlurView
                                    style={[RNStyleSheet.absoluteFill, { borderRadius: 32 }]}
                                    blurType={isDarkMode ? "dark" : "light"}
                                    blurAmount={15}
                                    reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                                />
                            )}
                            {/* Header */}
                            <View style={styles.header}>
                                {isEditing ? (
                                    <View style={styles.editContainer}>
                                        <TextInput
                                            style={[
                                                styles.nameInput,
                                                {
                                                    color: vTheme.colors.text,
                                                    borderColor: folder.color,
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
                                    <TouchableOpacity
                                        onPress={() => setIsEditing(true)}
                                        onLongPress={() => setShowColorPicker(!showColorPicker)}
                                        style={styles.nameContainer}
                                    >
                                        <Text style={[styles.folderName, { color: isPhotoBg ? '#ffffff' : vTheme.colors.text }]}>
                                            {folder.name}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <BlurView
                                    style={RNStyleSheet.absoluteFill}
                                    blurType={isDarkMode ? "light" : "dark"}
                                    blurAmount={10}
                                />
                                <X size={18} color="#ffffff" />
                            </TouchableOpacity>

                            {/* Color picker */}
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

                            {/* Items grid */}
                            <View style={styles.itemsGrid}>
                                {displayItems.length > 0 ? (
                                    displayItems.map((item) => {
                                        const service = getServiceForItem(item);
                                        if (!service) return null;
                                        return (
                                            <View style={styles.iconWrapper} key={item.id}>
                                                <PortalIcon
                                                    service={service}
                                                    isEditMode={false}
                                                    onPress={() => onItemPress(item)}
                                                    onLongPress={() => onRemoveItem(item.id)}
                                                    size="small"
                                                    showLabel={false}
                                                />
                                            </View>
                                        );
                                    })
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Text style={[styles.emptyText, { color: isPhotoBg ? '#ffffff' : vTheme.colors.textSecondary }]}>
                                            Папка пуста
                                        </Text>
                                        <Text style={[styles.emptyHint, { color: isPhotoBg ? 'rgba(255,255,255,0.6)' : vTheme.colors.textSecondary }]}>
                                            Перетащите сервисы сюда
                                        </Text>
                                    </View>
                                )}
                            </View>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
    },
    container: {
        width: 320,
        minHeight: 200,
        borderRadius: 32,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    colorButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nameContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 4,
    },
    folderName: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.6,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    editContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    nameInput: {
        flex: 1,
        fontSize: 16,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 8,
    },
    saveButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: -12,
        right: -12,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderWidth: 1.2,
        borderColor: 'rgba(255,255,255,0.45)',
        overflow: 'hidden',
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 12,
    },
    colorPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 8,
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
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        paddingVertical: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
    },
    emptyHint: {
        fontSize: 12,
        marginTop: 4,
    },
    iconWrapper: {
        width: '20%',
        alignItems: 'center',
        marginBottom: 4,
    },
});
