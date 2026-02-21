// Clock Widget - displays current time with iOS-style design
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import { useSettings } from '../../context/SettingsContext';

interface ClockWidgetProps {
    size?: '1x1' | '2x1' | '2x2';
}

const WIDGET_SIZES = {
    '1x1': { width: 80, height: 80, timeSize: 18, dateSize: 9 },
    '2x1': { width: 168, height: 80, timeSize: 32, dateSize: 12 },
    '2x2': { width: 168, height: 168, timeSize: 48, dateSize: 14 },
};

export const ClockWidget: React.FC<ClockWidgetProps> = ({ size = '2x1' }) => {
    const { vTheme, isDarkMode, portalBackgroundType, portalIconStyle } = useSettings();
    const [time, setTime] = useState(new Date());
    const colonOpacity = useSharedValue(1);

    const sizeConfig = WIDGET_SIZES[size];
    const isPhotoBg = portalBackgroundType === 'image';
    const isVedaMatch = portalIconStyle === 'vedamatch';

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        // Blinking colon animation
        colonOpacity.value = withRepeat(
            withTiming(0.3, { duration: 500, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );

        return () => {
            clearInterval(timer);
            cancelAnimation(colonOpacity);
        };
    }, []);

    const colonStyle = useAnimatedStyle(() => ({
        opacity: colonOpacity.value,
    }));

    const formatTime = () => {
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        return { hours, minutes };
    };

    const formatDate = () => {
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        };
        return time.toLocaleDateString('ru-RU', options);
    };

    const { hours, minutes } = formatTime();

    // Photo-optimized text style
    const textStyle = [
        styles.time,
        { fontSize: sizeConfig.timeSize, color: isVedaMatch ? '#FFDF00' : isPhotoBg ? '#ffffff' : vTheme.colors.text },
        (isPhotoBg || isVedaMatch) && styles.textShadow
    ];

    const dateStyle = [
        styles.date,
        { fontSize: sizeConfig.dateSize, color: isVedaMatch ? '#D4AF37' : isPhotoBg ? 'rgba(255,255,255,0.8)' : vTheme.colors.textSecondary },
        (isPhotoBg || isVedaMatch) && styles.textShadow
    ];

    return (
        <View
            style={[
                styles.container,
                {
                    width: sizeConfig.width,
                    height: sizeConfig.height,
                    backgroundColor: isVedaMatch
                        ? '#121212'
                        : isPhotoBg
                            ? 'transparent'
                            : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                    borderColor: isVedaMatch
                        ? '#D4AF37'
                        : isPhotoBg
                            ? 'rgba(255,255,255,0.3)'
                            : (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
                    borderWidth: isVedaMatch ? 1 : 1,
                    ...(isVedaMatch ? {
                        shadowColor: '#D4AF37',
                        shadowOpacity: 0.5,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 6,
                    } : {}),
                },
            ]}
        >

            {(isPhotoBg || isDarkMode) && !isVedaMatch && (
                <BlurView
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                    blurType={isDarkMode ? "dark" : "light"}
                    blurAmount={10}
                    reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                />
            )}

            <View style={styles.timeContainer}>
                <Text style={textStyle}>
                    {hours}
                </Text>
                <Animated.Text
                    style={[
                        ...textStyle,
                        colonStyle,
                        { color: isVedaMatch ? '#D4AF37' : isPhotoBg ? '#ffffff' : vTheme.colors.primary },
                    ]}
                >
                    :
                </Animated.Text>
                <Text style={textStyle}>
                    {minutes}
                </Text>
            </View>
            {size !== '1x1' && (
                <Text style={dateStyle}>
                    {formatDate()}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        margin: 4,
        overflow: 'hidden',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    time: {
        fontWeight: '300',
        fontFamily: 'System',
        letterSpacing: 1,
    },
    date: {
        marginTop: 4,
        textTransform: 'capitalize',
    },
    textShadow: {
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});
