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
import { useSettings } from './context/SettingsContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface ChatImageProps {
    imageUrl: string;
    altText: string;
    onDownload: (url: string, fileName?: string) => void;
    onShare: (url: string) => void;
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
    const { t, i18n } = useTranslation(); // Init i18n
    const { imageSize, imagePosition } = useSettings();
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (!imageUrl) {
            setLoading(false);
            setError(true);
            return;
        }

        // Safety timeout: if getSize doesn't respond in 10s, stop loading and use default size
        const safetyTimeout = setTimeout(() => {
            if (isMounted && loading && !imageLoaded) {
                console.warn('ChatImage: getSize safety timeout reached for', imageUrl);
                setLoading(false);
            }
        }, 10000);

        // Пытаемся получить размеры через getSize
        Image.getSize(
            imageUrl,
            (width, height) => {
                clearTimeout(safetyTimeout);
                if (isMounted) {
                    setSize({ width, height });
                    setLoading(false);
                    setError(false);
                }
            },
            (err) => {
                clearTimeout(safetyTimeout);
                console.error('Failed to load image size via getSize, will use onLoad fallback', err);
                // Не устанавливаем error = true, так как можем получить размеры через onLoad
                if (isMounted) {
                    setLoading(false);
                }
            }
        );

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
        };
    }, [imageUrl]);

    // Fallback: получаем размеры через onLoad
    const handleImageLoad = (event: any) => {
        const { width, height } = event.nativeEvent.source || {};
        if (width && height && !size) {
            setSize({ width, height });
        }
        setImageLoaded(true);
        setLoading(false);
    };

    const handleImageError = () => {
        setError(true);
        setLoading(false);
    };

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
        if (!loading && imageLoaded) return; // Stop if loaded

        const interval = setInterval(() => {
            setMantraIndex((prev) => (prev + 1) % MANTRA_LINES.length);
        }, 1500); // Change every 1.5 seconds for a nice flow

        return () => clearInterval(interval);
    }, [loading, imageLoaded, i18n.language]);

    const displaySize = size || { width: 400, height: 400 }; // Fallback размеры
    const aspectRatio = displaySize.width / displaySize.height;

    // Максимальная ширина изображения в чате
    // Максимальная ширина изображения в чате (из настроек)
    const { width: SCREEN_WIDTH } = Dimensions.get('window');
    const MAX_WIDTH = Math.min(imageSize || 220, SCREEN_WIDTH - 60);
    const finalWidth = Math.min(displaySize.width, MAX_WIDTH);

    // Позиционирование (из настроек)
    const containerAlign = imagePosition === 'left' ? 'flex-start' : imagePosition === 'right' ? 'flex-end' : 'center';

    if (error && !imageLoaded) {
        return (
            <View style={[styles.errorContainer, { borderColor: theme.borderColor, width: MAX_WIDTH }]}>
                <Text style={[styles.errorText, { color: theme.text }]}>Не удалось загрузить изображение</Text>
                <TouchableOpacity onPress={() => onDownload(imageUrl, altText)}>
                    <Text style={[styles.linkText, { color: theme.accent }]}>Скачать по ссылке</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { alignItems: containerAlign }]}>
            <View style={{ width: finalWidth, position: 'relative' }}>
                <TouchableWithoutFeedback onPress={() => { }}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={[
                            styles.image,
                            {
                                width: finalWidth,
                                aspectRatio: aspectRatio,
                                minHeight: loading && !imageLoaded ? 200 : 0,
                                maxHeight: 600,
                            } as StyleProp<ImageStyle>,
                        ]}
                        resizeMode="contain"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                    />
                </TouchableWithoutFeedback>

                {loading && !imageLoaded && (
                    <View style={[
                        styles.loadingContainer,
                        {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            borderColor: theme.borderColor,
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            marginVertical: 0, // Reset margin since it's absolute
                        }
                    ]}>
                        <ActivityIndicator size="small" color={theme.accent} />
                        <Text style={[styles.loadingText, { color: theme.text, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 10 }]}>
                            {MANTRA_LINES[mantraIndex]}
                        </Text>
                    </View>
                )}
            </View>

            {(!loading || imageLoaded) && (
                <View style={[styles.buttonsContainer, { width: finalWidth }]}>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.accent, marginRight: 4 }]}
                        onPress={() => onDownload(imageUrl, altText)}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>📥 Скачать</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.botBubble, borderWidth: 1, borderColor: theme.accent }]}
                        onPress={() => onShare(imageUrl)}
                        disabled={loading}
                    >
                        <Text style={[styles.buttonText, { color: theme.text }]}>🔗 Поделиться</Text>
                    </TouchableOpacity>
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
