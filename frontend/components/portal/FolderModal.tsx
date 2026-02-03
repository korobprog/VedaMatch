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
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
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
    const { vTheme, isDarkMode } = useSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(folder.name);
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
                                    backgroundColor: isDarkMode
                                        ? 'rgba(30, 30, 30, 0.95)'
                                        : 'rgba(255, 255, 255, 0.95)',
                                    borderColor: folder.color,
                                },
                            ]}
                            onPress={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity
                                    onPress={() => setShowColorPicker(!showColorPicker)}
                                    style={[styles.colorButton, { backgroundColor: folder.color }]}
                                >
                                    <Palette size={16} color="#FFF" />
                                </TouchableOpacity>

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
                                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                                        <Text style={[styles.folderName, { color: vTheme.colors.text }]}>
                                            {folder.name}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <X size={20} color={vTheme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

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
                            <ScrollView
                                style={styles.itemsScroll}
                                contentContainerStyle={styles.itemsGrid}
                                showsVerticalScrollIndicator={false}
                            >
                                {folder.items.length > 0 ? (
                                    folder.items.map((item) => {
                                        const service = getServiceForItem(item);
                                        if (!service) return null;
                                        return (
                                            <PortalIcon
                                                key={item.id}
                                                service={service}
                                                isEditMode={false}
                                                onPress={() => onItemPress(item)}
                                                onLongPress={() => onRemoveItem(item.id)}
                                                size="medium"
                                            />
                                        );
                                    })
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Text style={[styles.emptyText, { color: vTheme.colors.textSecondary }]}>
                                            Папка пуста
                                        </Text>
                                        <Text style={[styles.emptyHint, { color: vTheme.colors.textSecondary }]}>
                                            Перетащите сервисы сюда
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
    },
    container: {
        width: 280,
        minHeight: 200,
        maxHeight: 400,
        borderRadius: 24,
        borderWidth: 2,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
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
    folderName: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
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
        padding: 4,
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
    itemsScroll: {
        flex: 1,
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
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
});
