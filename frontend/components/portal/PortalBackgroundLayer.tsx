import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Image,
    ImageBackground,
    StyleSheet,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const deriveEffectivePortalBackground = (
    portalBackgroundType: string,
    portalBackground: string,
    activeWallpaper: string,
    isSlideshowEnabled: boolean,
) => {
    if (isSlideshowEnabled) {
        return {
            effectiveBackground: activeWallpaper,
            effectiveBackgroundType: 'image',
        };
    }
    return {
        effectiveBackground: portalBackground,
        effectiveBackgroundType: portalBackgroundType,
    };
};

interface PortalBackgroundLayerProps {
    portalBackgroundType: string;
    portalBackground: string;
    activeWallpaper: string;
    isSlideshowEnabled: boolean;
    fallbackColor: string;
    children: React.ReactNode;
    isAppActive?: boolean;
    allowCrossfade?: boolean;
    crossfadeDurationMs?: number;
    overlayColor?: string;
    pauseTransitions?: boolean;
    onBackgroundLoadError?: (failedUri?: string | null) => void;
}

export const PortalBackgroundLayer: React.FC<PortalBackgroundLayerProps> = ({
    portalBackgroundType,
    portalBackground,
    activeWallpaper,
    isSlideshowEnabled,
    fallbackColor,
    children,
    isAppActive = true,
    allowCrossfade = true,
    crossfadeDurationMs = 600,
    overlayColor,
    pauseTransitions = false,
    onBackgroundLoadError,
}) => {
    const { effectiveBackground, effectiveBackgroundType } = useMemo(
        () => deriveEffectivePortalBackground(portalBackgroundType, portalBackground, activeWallpaper, isSlideshowEnabled),
        [portalBackgroundType, portalBackground, activeWallpaper, isSlideshowEnabled],
    );

    const isImageBackground = effectiveBackgroundType === 'image' && Boolean(effectiveBackground);
    const isGradientBackground = effectiveBackgroundType === 'gradient' && Boolean(effectiveBackground);

    const [displayedBg, setDisplayedBg] = useState(effectiveBackground);
    const [nextBg, setNextBg] = useState<string | null>(null);
    const [displayedImageFailed, setDisplayedImageFailed] = useState(false);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const isTransitioning = useRef(false);

    useEffect(() => {
        setDisplayedImageFailed(false);
    }, [displayedBg]);

    useEffect(() => {
        if (pauseTransitions) {
            isTransitioning.current = false;
            setDisplayedBg(effectiveBackground);
            setNextBg(null);
            fadeAnim.setValue(1);
            return;
        }

        if (!isAppActive) {
            isTransitioning.current = false;
            setDisplayedBg(effectiveBackground);
            setNextBg(null);
            fadeAnim.setValue(1);
            return;
        }

        if (!isSlideshowEnabled || effectiveBackground === displayedBg || isTransitioning.current) {
            return;
        }

        if (!allowCrossfade) {
            setDisplayedBg(effectiveBackground);
            setNextBg(null);
            fadeAnim.setValue(1);
            isTransitioning.current = false;
            return;
        }

        const startTransition = () => {
            isTransitioning.current = true;
            setNextBg(effectiveBackground);
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: crossfadeDurationMs,
                useNativeDriver: true,
            }).start(() => {
                setDisplayedBg(effectiveBackground);
                requestAnimationFrame(() => {
                    setNextBg(null);
                    fadeAnim.setValue(1);
                    isTransitioning.current = false;
                });
            });
        };

        if (effectiveBackground && /^https?:\/\//i.test(effectiveBackground)) {
            Image.prefetch(effectiveBackground).then(startTransition).catch(startTransition);
            return;
        }
        startTransition();
    }, [
        effectiveBackground,
        isSlideshowEnabled,
        displayedBg,
        fadeAnim,
        allowCrossfade,
        crossfadeDurationMs,
        isAppActive,
        pauseTransitions,
    ]);

    useEffect(() => {
        if (!isSlideshowEnabled) {
            isTransitioning.current = false;
            setDisplayedBg(effectiveBackground);
            setNextBg(null);
            fadeAnim.setValue(1);
        }
    }, [isSlideshowEnabled, effectiveBackground, fadeAnim]);

    const backgroundImageSource = useMemo(() => {
        if (!isImageBackground || !displayedBg) {
            return undefined;
        }
        if (/^https?:\/\//i.test(displayedBg)) {
            return { uri: displayedBg, cache: 'force-cache' as const };
        }
        return { uri: displayedBg };
    }, [isImageBackground, displayedBg]);

    const nextBgSource = useMemo(() => {
        if (!nextBg) {
            return undefined;
        }
        if (/^https?:\/\//i.test(nextBg)) {
            return { uri: nextBg, cache: 'force-cache' as const };
        }
        return { uri: nextBg };
    }, [nextBg]);

    const gradientColors = useMemo(() => {
        if (!isGradientBackground || !effectiveBackground) {
            return [];
        }
        return effectiveBackground.split('|').filter(Boolean);
    }, [isGradientBackground, effectiveBackground]);

    if (isImageBackground && backgroundImageSource && !displayedImageFailed) {
        return (
            <View style={styles.container}>
                <ImageBackground
                    source={backgroundImageSource}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    fadeDuration={0}
                    onError={() => {
                        setDisplayedImageFailed(true);
                        onBackgroundLoadError?.(displayedBg);
                    }}
                />
                {nextBgSource && (
                    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
                        <ImageBackground
                            source={nextBgSource}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                            fadeDuration={0}
                            onError={() => {
                                onBackgroundLoadError?.(nextBg);
                                setNextBg(null);
                                fadeAnim.setValue(1);
                                isTransitioning.current = false;
                            }}
                        />
                    </Animated.View>
                )}
                <View style={[styles.overlay, overlayColor ? { backgroundColor: overlayColor } : null]}>
                    {children}
                </View>
            </View>
        );
    }

    if (isGradientBackground && gradientColors.length > 0) {
        return (
            <LinearGradient
                colors={gradientColors}
                style={styles.container}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={[styles.overlay, overlayColor ? { backgroundColor: overlayColor } : null]}>
                    {children}
                </View>
            </LinearGradient>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: effectiveBackground || fallbackColor }]}>
            <View style={[styles.overlay, overlayColor ? { backgroundColor: overlayColor } : null]}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        flex: 1,
    },
});

export default PortalBackgroundLayer;
