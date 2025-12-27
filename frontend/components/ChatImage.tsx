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

        // Пытаемся получить размеры через getSize
        Image.getSize(
            imageUrl,
            (width, height) => {
                if (isMounted) {
                    setSize({ width, height });
                    setLoading(false);
                    setError(false);
                }
            },
            (err) => {
                console.error('Failed to load image size via getSize, will use onLoad fallback', err);
                // Не устанавливаем error = true, так как можем получить размеры через onLoad
                if (isMounted) {
                    setLoading(false);
                }
            }
        );

        return () => {
            isMounted = false;
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

    // Используем fallback размеры, если getSize не сработал
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
                {onDownload && (
                    <TouchableOpacity onPress={() => onDownload(imageUrl, altText)}>
                        <Text style={[styles.linkText, { color: theme.accent }]}>Скачать по ссылке</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.container, { alignItems: containerAlign }]}>
            {loading && !imageLoaded && (
                <View style={[styles.loadingContainer, { borderColor: theme.borderColor, width: MAX_WIDTH }]}>
                    <ActivityIndicator size="small" color={theme.accent} />
                    <Text style={[styles.loadingText, { color: theme.text }]}>Загрузка изображения...</Text>
                </View>
            )}
            {(!loading || imageLoaded) && (
                <>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <Image
                            source={{ uri: imageUrl }}
                            style={[
                                styles.image,
                                {
                                    width: finalWidth,
                                    aspectRatio: aspectRatio,
                                    minHeight: 200,
                                    maxHeight: 600,
                                } as StyleProp<ImageStyle>,
                            ]}
                            resizeMode="contain"
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                        />
                    </TouchableWithoutFeedback>
                    <View style={[styles.buttonsContainer, { width: finalWidth }]}>
                        {onDownload && (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.accent, marginRight: 4 }]}
                                onPress={() => onDownload(imageUrl, altText)}
                                disabled={loading}
                            >
                                <Text style={styles.buttonText}>📥 Скачать</Text>
                            </TouchableOpacity>
                        )}
                        {onShare && (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.botBubble, borderWidth: 1, borderColor: theme.accent }]}
                                onPress={() => onShare(imageUrl)}
                                disabled={loading}
                            >
                                <Text style={[styles.buttonText, { color: theme.text }]}>🔗 Поделиться</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </>
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
