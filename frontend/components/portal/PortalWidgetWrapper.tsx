import React, { useEffect } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Text,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    cancelAnimation,
} from 'react-native-reanimated';

interface PortalWidgetWrapperProps {
    children: React.ReactNode;
    isEditMode: boolean;
    onRemove: () => void;
}

export const PortalWidgetWrapper: React.FC<PortalWidgetWrapperProps> = ({
    children,
    isEditMode,
    onRemove,
}) => {
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);

    useEffect(() => {
        if (isEditMode) {
            rotation.value = withRepeat(
                withSequence(
                    withTiming(-0.5, { duration: 90 }),
                    withTiming(0.5, { duration: 90 }),
                ),
                -1,
                true
            );
            scale.value = withRepeat(
                withSequence(
                    withTiming(0.99, { duration: 110 }),
                    withTiming(1.01, { duration: 110 }),
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

        return () => {
            cancelAnimation(rotation);
            cancelAnimation(scale);
        };
    }, [isEditMode]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate: `${rotation.value}deg` },
            { scale: scale.value },
        ],
    }));

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            {children}
            {isEditMode && (
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={onRemove}
                    activeOpacity={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <View style={styles.deleteIcon}>
                        <Text style={styles.deleteText}>−</Text>
                    </View>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        margin: 4,
    },
    deleteButton: {
        position: 'absolute',
        top: -4,
        left: -4,
        zIndex: 100,
    },
    deleteIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    deleteText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: -2,
    },
});
