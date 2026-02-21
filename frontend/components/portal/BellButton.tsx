import React, { useEffect, useRef } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNotifications } from '../../context/NotificationContext';

interface BellButtonProps {
    color?: string;
    size?: number;
    circularStyle?: boolean;
    containerStyle?: object;
}

export const BellButton: React.FC<BellButtonProps> = ({
    color = '#FFFFFF',
    size = 18,
    circularStyle = false,
    containerStyle,
}) => {
    const { unreadCount, setPanelVisible } = useNotifications();
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const prevCount = useRef(unreadCount);

    // Shake animation when unreadCount increases
    useEffect(() => {
        if (unreadCount > prevCount.current) {
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
            ]).start();
        }
        prevCount.current = unreadCount;
    }, [unreadCount, shakeAnim]);

    const rotation = shakeAnim.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-20deg', '20deg'],
    });

    const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

    return (
        <TouchableOpacity
            onPress={() => setPanelVisible(true)}
            style={[circularStyle ? styles.circular : styles.plain, containerStyle]}
            accessibilityLabel="Уведомления"
            accessibilityRole="button"
        >
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <Bell size={size} color={color} />
            </Animated.View>

            {unreadCount > 0 && (
                <View style={styles.badge} accessibilityLabel={`${unreadCount} непрочитанных`}>
                    <Text style={styles.badgeText} numberOfLines={1}>
                        {badgeLabel}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    plain: {
        padding: 5,
    },
    circular: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#E53E3E',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '700',
        lineHeight: 12,
        textAlign: 'center',
    },
});
