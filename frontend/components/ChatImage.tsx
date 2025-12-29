import React, { useState, useEffect } from 'react';
import {
    View,
    Image,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    ImageStyle,
    StyleProp,
    TouchableWithoutFeedback,
    Dimensions,
} from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface ChatImageProps {
    imageUrl: string;
    altText: string;
    onDownload?: (url: string, fileName?: string) => void;
    onShare?: (url: string) => void;
    theme: {
        accent: string;
        text: string;
        botBubble: string;
        borderColor: string;
    };
}

export const ChatImage: React.FC<ChatImageProps> = ({
    imageUrl,
    altText,
    onDownload,
    onShare,
    theme,
}) => {
    const { t, i18n } = useTranslation();
    const { imageSize, imagePosition } = useSettings();
    // Default size is square until loaded
    const [size, setSize] = useState<{ width: number; height: number }>({ width: 300, height: 300 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Add timestamp to prevent caching issues
    const [currentUrl, setCurrentUrl] = useState('');

    useEffect(() => {
        if (imageUrl) {
            // Use URL as is to leverage caching and prevent reloading on remounts
            setCurrentUrl(imageUrl);
            setLoading(true);
            setError(false);
        }
    }, [imageUrl]);

    const handleImageLoad = (event: any) => {
        const { width, height } = event.nativeEvent.source;
        if (width && height) {
            setSize({ width, height });
        }
        setLoading(false);
        setError(false);
    };

    const handleImageError = (e: any) => {
        console.warn(`[ChatImage] Image failed to load: ${currentUrl}`, e.nativeEvent.error);
        // If error happens, stop loading spinner
        setLoading(false);
        setError(true);
    };

    const handleRetry = () => {
        setLoading(true);
        setError(false);
        const timestamp = new Date().getTime();
        const char = imageUrl.includes('?') ? '&' : '?';
        setCurrentUrl(`${imageUrl}${char}retry=${timestamp}`);
    }

    // Mahamantra for loading state
    const MANTRA_LINES_EN = [
        "Hare Krishna Hare Krishna",
        "Krishna Krishna Hare Hare",
        "Hare Rama Hare Rama",
        "Rama Rama Hare Hare"
    ];

    const MANTRA_LINES_RU = [
        "Харе Кришна Харе Кришна",
        "Кришна Кришна Харе Харе",
        "Харе Рама Харе Рама",
        "Рама Рама Харе Харе"
    ];

    const MANTRA_LINES = i18n.language === 'ru' ? MANTRA_LINES_RU : MANTRA_LINES_EN;
    const [mantraIndex, setMantraIndex] = useState(0);

    useEffect(() => {
        if (!loading) return;

        const interval = setInterval(() => {
            setMantraIndex((prev) => (prev + 1) % MANTRA_LINES.length);
        }, 1500);

        return () => clearInterval(interval);
    }, [loading, i18n.language]);

    // Calculate display dimensions
    const { width: SCREEN_WIDTH } = Dimensions.get('window');
    const MAX_WIDTH = Math.min(imageSize || 300, SCREEN_WIDTH - 60);

    // Calculate aspect ratio
    const aspectRatio = size.width / size.height;

    // Final width/height calculation
    const finalWidth = Math.min(size.width, MAX_WIDTH);
    const finalHeight = finalWidth / aspectRatio;

    // Alignment
    const containerAlign = imagePosition === 'left' ? 'flex-start' : imagePosition === 'right' ? 'flex-end' : 'center';

    return (
        <View style={[styles.container, { alignItems: containerAlign }]}>
            <View style={{
                width: finalWidth,
                minHeight: 250, // Fixed height placeholder while loading
                height: loading ? 300 : finalHeight,
                backgroundColor: loading || error ? '#F5F5F5' : 'transparent',
                borderRadius: 12,
                overflow: 'hidden', // important for corner radius
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.05)'
            }}>
                {/* Only render Image if we have a URL */}
                {currentUrl !== '' && !error && (
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <Image
                            source={{ uri: currentUrl }}
                            style={[
                                styles.image,
                                {
                                    width: finalWidth,
                                    height: finalHeight,
                                    // Hide image completely until loaded (opacity 0) to avoid ugly partial renders
                                    opacity: loading ? 0 : 1,
                                    backgroundColor: 'transparent',
                                } as StyleProp<ImageStyle>,
                            ]}
                            resizeMode="contain"
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                        />
                    </TouchableWithoutFeedback>
                )}

                {/* Loading State - GPT Style Overlay */}
                {loading && (
                    <View style={[
                        styles.loadingContainer,
                        {
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            top: 0,
                            left: 0,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderColor: 'transparent',
                            backgroundColor: 'rgba(255,255,255,0.8)', // Light overlay
                        }
                    ]}>
                        <ActivityIndicator size="large" color={theme.accent} />
                        <Text style={[styles.loadingText, { color: theme.text, marginTop: 15, fontWeight: 'bold' }]}>
                            Creating image...
                        </Text>
                        <Text style={[styles.loadingText, { color: theme.text, opacity: 0.6, fontSize: 10, marginTop: 5 }]}>
                            {MANTRA_LINES[mantraIndex]}
                        </Text>
                    </View>
                )}

                {/* Error State */}
                {error && (
                    <View style={[styles.errorContainer, { borderColor: theme.borderColor, width: '100%', height: 150 }]}>
                        <Text style={[styles.errorText, { color: theme.text }]}>Не удалось загрузить изображение</Text>
                        <TouchableOpacity onPress={handleRetry} style={{ marginBottom: 10 }}>
                            <Text style={[styles.linkText, { color: theme.accent }]}>🔄 Попробовать снова</Text>
                        </TouchableOpacity>

                        {onDownload && (
                            <TouchableOpacity onPress={() => onDownload(imageUrl, altText)}>
                                <Text style={[styles.linkText, { color: theme.accent }]}>Скачать по ссылке</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {(!loading && !error) && (
                <View style={[styles.buttonsContainer, { width: finalWidth }]}>
                    {onDownload && (
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.accent, marginRight: 4 }]}
                            onPress={() => onDownload(imageUrl, altText)}
                        >
                            <Text style={styles.buttonText}>📥 Скачать</Text>
                        </TouchableOpacity>
                    )}
                    {onShare && (
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.botBubble, borderWidth: 1, borderColor: theme.accent }]}
                            onPress={() => onShare(imageUrl)}
                        >
                            <Text style={[styles.buttonText, { color: theme.text }]}>🔗 Поделиться</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 4,
    },
    loadingContainer: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        borderStyle: 'dashed',
        marginVertical: 8,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 12,
    },
    errorContainer: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        marginVertical: 8,
    },
    errorText: {
        marginBottom: 4,
        fontSize: 12,
    },
    linkText: {
        textDecorationLine: 'underline',
    },
    image: {
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: 'rgba(0,0,0,0.05)', // Subtle placeholder bg
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
