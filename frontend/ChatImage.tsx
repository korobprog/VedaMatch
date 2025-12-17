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
    ViewStyle,
} from 'react-native';

interface ChatImageProps {
    imageUrl: string;
    altText: string;
    onDownload: (url: string, fileName?: string) => void;
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
    theme,
}) => {
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (!imageUrl) {
            setLoading(false);
            setError(true);
            return;
        }

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
                console.error('Failed to load image size', err);
                if (isMounted) {
                    setLoading(false);
                    setError(true);
                }
            }
        );

        return () => {
            isMounted = false;
        };
    }, [imageUrl]);

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { borderColor: theme.borderColor }]}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={[styles.loadingText, { color: theme.text }]}>Загрузка изображения...</Text>
            </View>
        );
    }

    if (error || !size) {
        return (
            <View style={[styles.errorContainer, { borderColor: theme.borderColor }]}>
                <Text style={[styles.errorText, { color: theme.text }]}>Не удалось загрузить изображение</Text>
                <TouchableOpacity onPress={() => onDownload(imageUrl, altText)}>
                    <Text style={[styles.linkText, { color: theme.accent }]}>Скачать по ссылке</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Calculate generic aspect ratio
    const aspectRatio = size.width / size.height;

    return (
        <View style={styles.container}>
            <Image
                source={{ uri: imageUrl }}
                style={[
                    styles.image,
                    {
                        aspectRatio: aspectRatio,
                    } as StyleProp<ImageStyle>,
                ]}
                resizeMode="contain"
            />
            <TouchableOpacity
                style={[styles.downloadButton, { backgroundColor: theme.accent }]}
                onPress={() => onDownload(imageUrl, altText)}
                disabled={loading}
            >
                <Text style={styles.downloadButtonText}>📥 Скачать</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
        alignItems: 'center',
        width: '100%',
    },
    loadingContainer: {
        height: 150,
        width: '100%',
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
        width: '100%',
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
        width: '100%',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: 'rgba(0,0,0,0.05)' // Subtle placeholder bg
    },
    downloadButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    downloadButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
