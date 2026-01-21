// Portal Folder Component - folder with preview of icons inside
import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TouchableOpacity,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    cancelAnimation,
} from 'react-native-reanimated';
import {
    Users,
    MessageCircle,
    Phone,
    Sparkles,
    ShoppingBag,
    Megaphone,
    Book,
    GraduationCap,
    Newspaper,
} from 'lucide-react-native';
import { PortalFolder as PortalFolderType, DEFAULT_SERVICES } from '../../types/portal';
import { useSettings } from '../../context/SettingsContext';

interface PortalFolderProps {
    folder: PortalFolderType;
    isEditMode: boolean;
    onPress: () => void;
    onLongPress: () => void;
    size?: 'small' | 'medium' | 'large';
    onLayout?: (event: any) => void;
}

const FOLDER_SIZES = {
    small: { container: 52, preview: 12, fontSize: 10 },
    medium: { container: 64, preview: 14, fontSize: 11 },
    large: { container: 76, preview: 16, fontSize: 12 },
};

const IconComponents: Record<string, any> = {
    Users,
    MessageCircle,
    Phone,
    Sparkles,
    ShoppingBag,
    Megaphone,
    Book,
    GraduationCap,
    Newspaper,
};

export const PortalFolderComponent: React.FC<PortalFolderProps> = ({
    folder,
    isEditMode,
    onPress,
    onLongPress,
    size = 'medium',
    onLayout,
}) => {
    const { vTheme, isDarkMode } = useSettings();
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);

    const sizeConfig = FOLDER_SIZES[size];

    // iOS-style wiggle animation
    useEffect(() => {
        if (isEditMode) {
            rotation.value = withRepeat(
                withSequence(
                    withTiming(-2, { duration: 80 }),
                    withTiming(2, { duration: 80 }),
                ),
                -1,
                true
            );
            scale.value = withRepeat(
                withSequence(
                    withTiming(0.98, { duration: 100 }),
                    withTiming(1.02, { duration: 100 }),
                ),
                -1,
                true
            );
        } else {
            cancelAnimation(rotation);
            cancelAnimation(scale);
            rotation.value = withTiming(0, { duration: 100 });
            scale.value = withTiming(1, { duration: 100 });
        }
    }, [isEditMode]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate: `${rotation.value}deg` },
            { scale: scale.value },
        ],
    }));

    // Get preview icons (max 4)
    const previewItems = folder.items.slice(0, 4);
    const previewIcons = previewItems.map(item => {
        const service = DEFAULT_SERVICES.find(s => s.id === item.serviceId);
        return service;
    }).filter(Boolean);

    const renderPreviewIcon = (iconName: string, color: string, index: number) => {
        const IconComponent = IconComponents[iconName] || Users;
        return (
            <View key={index} style={styles.previewIconWrapper}>
                <IconComponent
                    size={sizeConfig.preview}
                    color={color}
                    strokeWidth={2}
                />
            </View>
        );
    };

    return (
        <Animated.View
            style={[styles.container, animatedStyle]}
            onLayout={onLayout}
        >
            <Pressable
                onPress={onPress}
                onLongPress={onLongPress}
                delayLongPress={500}
                style={({ pressed }) => [
                    styles.pressable,
                    pressed && !isEditMode && styles.pressed,
                ]}
            >
                <View
                    style={[
                        styles.folderContainer,
                        {
                            width: sizeConfig.container,
                            height: sizeConfig.container,
                            backgroundColor: isDarkMode
                                ? `${folder.color}30`
                                : `${folder.color}20`,
                            borderColor: `${folder.color}50`,
                        },
                    ]}
                >
                    <View style={styles.previewGrid}>
                        {previewIcons.map((service, index) =>
                            service && renderPreviewIcon(service.icon, service.color, index)
                        )}
                        {/* Fill empty slots */}
                        {Array(4 - previewIcons.length).fill(null).map((_, index) => (
                            <View
                                key={`empty-${index}`}
                                style={[
                                    styles.previewIconWrapper,
                                    styles.emptySlot,
                                    { backgroundColor: isDarkMode ? '#333' : '#E0E0E0' }
                                ]}
                            />
                        ))}
                    </View>
                </View>
                <Text
                    style={[
                        styles.label,
                        {
                            fontSize: sizeConfig.fontSize,
                            color: vTheme.colors.text,
                        },
                    ]}
                    numberOfLines={1}
                >
                    {folder.name}
                </Text>

                {/* Delete button in edit mode */}
                {isEditMode && (
                    <TouchableOpacity style={styles.deleteButton}>
                        <View style={styles.deleteIcon}>
                            <Text style={styles.deleteText}>−</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Item count badge */}
                {folder.items.length > 0 && (
                    <View style={[styles.countBadge, { backgroundColor: folder.color }]}>
                        <Text style={styles.countText}>{folder.items.length}</Text>
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        margin: 8,
    },
    pressable: {
        alignItems: 'center',
    },
    pressed: {
        opacity: 0.7,
        transform: [{ scale: 0.95 }],
    },
    folderContainer: {
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        padding: 6,
    },
    previewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewIconWrapper: {
        width: '45%',
        height: '45%',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 1,
    },
    emptySlot: {
        borderRadius: 4,
        opacity: 0.3,
    },
    label: {
        fontWeight: '500',
        textAlign: 'center',
        maxWidth: 70,
    },
    deleteButton: {
        position: 'absolute',
        top: -6,
        left: -6,
        zIndex: 10,
    },
    deleteIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: -2,
    },
    countBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    countText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
