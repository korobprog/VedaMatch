import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence
} from 'react-native-reanimated';
import { useSettings } from '../../context/SettingsContext';

const { width } = Dimensions.get('window');

interface SkeletonIconProps {
    size?: number;
}

export const SkeletonIcon: React.FC<SkeletonIconProps> = ({ size }) => {
    const iconSize = size || (width / 4 - 24);
    const { isDarkMode } = useSettings();
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 1000 }),
                withTiming(0.3, { duration: 1000 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    const baseColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    return (
        <View style={[styles.container, { width: iconSize, height: iconSize + 20 }]}>
            <Animated.View
                style={[
                    styles.iconCircle,
                    {
                        width: iconSize,
                        height: iconSize,
                        borderRadius: iconSize / 2.5,
                        backgroundColor: baseColor,
                    },
                    animatedStyle
                ]}
            />
            <Animated.View
                style={[
                    styles.label,
                    {
                        backgroundColor: baseColor,
                    },
                    animatedStyle
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        margin: 8,
    },
    iconCircle: {
        marginBottom: 8,
    },
    label: {
        width: 60,
        height: 10,
        borderRadius: 5,
    },
});
