// Portal Icon Component - service icon with iOS-style wiggle animation
import React, { useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Pressable,
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
    Settings,
    MessageSquare,
    Map,
} from 'lucide-react-native';
import { ServiceDefinition } from '../../types/portal';
import { useSettings } from '../../context/SettingsContext';

interface PortalIconProps {
    service: ServiceDefinition;
    isEditMode: boolean;
    onPress: () => void;
    onLongPress: () => void;
    size?: 'small' | 'medium' | 'large';
    badge?: number;
    onLayout?: (event: any) => void;
}

const ICON_SIZES = {
    small: { container: 52, icon: 24, fontSize: 10 },
    medium: { container: 64, icon: 28, fontSize: 11 },
    large: { container: 76, icon: 32, fontSize: 12 },
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
    Settings,
    MessageSquare,
    Map,
};

export const PortalIcon: React.FC<PortalIconProps> = ({
    service,
    isEditMode,
    onPress,
    onLongPress,
    size = 'medium',
    badge,
    onLayout,
}) => {
    const { vTheme } = useSettings();
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);

    const sizeConfig = ICON_SIZES[size];
    const IconComponent = IconComponents[service.icon] || Users;

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
                        styles.iconContainer,
                        {
                            width: sizeConfig.container,
                            height: sizeConfig.container,
                            backgroundColor: `${service.color}15`,
                            borderColor: `${service.color}30`,
                        },
                    ]}
                >
                    <IconComponent
                        size={sizeConfig.icon}
                        color={service.color}
                        strokeWidth={2}
                    />
                    {badge && badge > 0 && (
                        <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                            <Text style={styles.badgeText}>
                                {badge > 99 ? '99+' : badge}
                            </Text>
                        </View>
                    )}
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
                    {service.label}
                </Text>

                {/* Delete button in edit mode */}
                {isEditMode && (
                    <TouchableOpacity style={styles.deleteButton}>
                        <View style={styles.deleteIcon}>
                            <Text style={styles.deleteText}>−</Text>
                        </View>
                    </TouchableOpacity>
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
    iconContainer: {
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    label: {
        fontWeight: '500',
        textAlign: 'center',
        maxWidth: 70,
    },
    badge: {
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
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
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
});
