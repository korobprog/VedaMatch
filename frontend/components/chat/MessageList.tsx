import React, { useRef, useState } from 'react';
import {
    View,
    FlatList,
    ActivityIndicator,
    Text,
    Image,
    ImageBackground,
    Keyboard,
    StyleSheet,
    useColorScheme,
    Dimensions,
    TouchableOpacity,
    Alert,
    Linking,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from 'react-i18next';
import { ChatImage } from '../ChatImage';
import { Message, COLORS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import { WebView } from 'react-native-webview';
import { mediaService } from '../../services/mediaService';
import { AudioPlayer } from './AudioPlayer';

interface MessageListProps {
    onDownloadImage: (imageUrl: string, imageName?: string) => void;
    onShareImage: (url: string) => void;
    onNavigateToTab: (tab: any) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const MessageList: React.FC<MessageListProps> = ({
    onDownloadImage,
    onShareImage,
    onNavigateToTab,
}) => {
    const { t } = useTranslation();
    const { messages, isLoading, isTyping, recipientUser } = useChat();
    const { imageSize } = useSettings();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const flatListRef = useRef<FlatList>(null);

    const openImage = (uri: string) => {
        Alert.alert(
            'Просмотр изображения',
            'Что вы хотите сделать с изображением?',
            [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Скачать', onPress: () => onDownloadImage(uri) },
                { text: 'Поделиться', onPress: () => onShareImage(uri) },
            ]
        );
    };

    const openDocument = (url: string, fileName?: string) => {
        Alert.alert(
            'Документ',
            `Скачать файл: ${fileName || 'Документ'}?`,
            [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Скачать', onPress: () => Linking.openURL(url) },
            ]
        );
    };

    const markdownStyles: any = {
        body: {
            color: theme.text,
            fontSize: 16,
            lineHeight: 22,
        },
        paragraph: {
            marginTop: 0,
            marginBottom: 8,
        },
        imageContainer: {
            marginVertical: 8,
            alignItems: 'center' as const,
        },
        markdownImage: {
            width: '100%',
            maxWidth: 300,
            height: 200,
            borderRadius: 8,
            marginBottom: 8,
        },
    };

    const markdownRules = {
        image: (node: any) => {
            const imageUrl = node.attributes?.src || '';
            const altText = node.attributes?.alt || 'Изображение';

            return (
                <ChatImage
                    key={node.key}
                    imageUrl={imageUrl}
                    altText={altText}
                    onDownload={onDownloadImage}
                    onShare={onShareImage}
                    theme={theme}
                />
            );
        },
    };

    // Helper to render audio player using WebView
    const renderAudioPlayer = (url: string, key: string | number) => {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>
                    body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                    audio { width: 95%; max-width: 400px; height: 40px; border-radius: 20px; }
                </style>
            </head>
            <body>
                <audio controls controlsList="nodownload">
                    <source src="${url}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </body>
            </html>
        `;

        return (
            <View key={key} style={{ height: 60, width: 260, marginVertical: 5, borderRadius: 12, overflow: 'hidden', backgroundColor: 'transparent' }}>
                <WebView
                    originWhitelist={['*']}
                    source={{ html }}
                    style={{ backgroundColor: 'transparent' }}
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    scalesPageToFit={false}
                    androidLayerType="hardware"
                    mediaPlaybackRequiresUserAction={false}
                    allowsInlineMediaPlayback={true}
                    javaScriptEnabled={true}
                />
            </View>
        );
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        const isImageOnly = !isUser && item.text.trim().startsWith('![') && item.text.trim().endsWith(')') && !item.text.trim().includes('\n', 2);

        // Handle uploading state
        if (item.uploading) {
            return (
                <View style={[styles.messageRow, styles.userRow]}>
                    <View style={[styles.bubble, styles.textBubble, { backgroundColor: theme.userBubble }]}>
                        <View style={styles.uploadingContainer}>
                            <ActivityIndicator size="small" color={theme.iconColor} />
                            <Text style={[styles.uploadingText, { color: isDarkMode ? '#FFF' : '#3E2723' }]}>
                                Загрузка...
                            </Text>
                        </View>
                    </View>
                </View>
            );
        }

        // Handle media messages
        if (item.type === 'image' && item.content) {
            const content = item.content;
            return (
                <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
                    {!isUser && (
                        <View style={styles.avatar}>
                            <Image
                                source={require('../../assets/krishnaAssistant.png')}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        </View>
                    )}
                    <TouchableOpacity onPress={() => openImage(content)}>
                        <Image
                            source={{ uri: content }}
                            style={styles.messageImage}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                </View>
            );
        }

        if (item.type === 'audio' && item.content) {
            const content = item.content;
            return (
                <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
                    {!isUser && (
                        <View style={styles.avatar}>
                            <Image
                                source={require('../../assets/krishnaAssistant.png')}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        </View>
                    )}
                    <View style={[styles.bubble, styles.textBubble, { backgroundColor: isUser ? theme.userBubble : theme.botBubble }]}>
                        <AudioPlayer
                            url={content}
                            duration={item.duration}
                            isDarkMode={isDarkMode}
                            onError={() => Alert.alert('Ошибка', 'Не удалось воспроизвести аудио')}
                        />
                    </View>
                </View>
            );
        }

        if (item.type === 'document' && item.content) {
            const content = item.content;
            return (
                <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
                    {!isUser && (
                        <View style={styles.avatar}>
                            <Image
                                source={require('../../assets/krishnaAssistant.png')}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        </View>
                    )}
                    <TouchableOpacity
                        style={[styles.bubble, styles.textBubble, { backgroundColor: isUser ? theme.userBubble : theme.botBubble }]}
                        onPress={() => openDocument(content, item.fileName)}
                    >
                        <View style={styles.documentContainer}>
                            <Text style={styles.documentIcon}>📎</Text>
                            <View style={styles.documentInfo}>
                                <Text style={[styles.documentName, { color: isDarkMode ? '#FFF' : '#3E2723' }]} numberOfLines={1}>
                                    {item.fileName}
                                </Text>
                                <Text style={[styles.documentSize, { color: isDarkMode ? '#CCC' : '#757575' }]}>
                                    {item.fileSize ? mediaService.formatFileSize(item.fileSize) : '0 B'}
                                </Text>
                            </View>
                            <Text style={styles.downloadIcon}>⬇</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            );
        }

        // Parse content looking for <audio> tags
        // Regex finds <audio ... src="...">...</audio> or just open tag if it's not closed properly (though usually LLM closes it)
        // We assume valid HTML <audio ...></audio>
        const parts = item.text.split(/(<audio\s+[^>]*src="[^"]+"[^>]*>.*?<\/audio>)/gi);

        return (
            <View
                style={[
                    styles.messageRow,
                    isUser ? styles.userRow : styles.botRow,
                ]}
            >
                {isUser ? (
                    <View style={[styles.bubble, styles.textBubble, { backgroundColor: theme.userBubble }]}>
                        <Text style={[styles.messageText, { color: isDarkMode ? '#FFF' : '#3E2723' }]}>{item.text}</Text>
                    </View>
                ) : (
                    <View style={[
                        { width: '100%', alignItems: 'flex-start' },
                        isImageOnly ? { flexDirection: 'column' } : { flexDirection: 'row', paddingHorizontal: 16 }
                    ]}>
                        <View style={[
                            styles.avatar,
                            {
                                backgroundColor: isDarkMode ? 'transparent' : '#FFF',
                                borderColor: theme.borderColor,
                                borderWidth: 0,
                                marginBottom: isImageOnly ? 6 : 0,
                                marginRight: isImageOnly ? 0 : 8,
                                overflow: 'hidden',
                            }
                        ]}>
                            <Image
                                source={require('../../assets/krishnaAssistant.png')}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        </View>
                        <View style={[
                            styles.bubble,
                            isImageOnly ? styles.imageOnlyBubble : styles.textBubble,
                            {
                                backgroundColor: theme.botBubble,
                                borderColor: theme.borderColor,
                                borderWidth: isDarkMode ? 0 : 1,
                                width: isImageOnly ? Math.min(imageSize + 14, SCREEN_WIDTH - 40) : undefined,
                                maxWidth: '100%',
                            }
                        ]}>
                            {parts.map((part, index) => {
                                // Check if this part is an audio tag
                                const audioMatch = part.match(/<audio\s+[^>]*src="([^"]+)"[^>]*>/i);
                                if (audioMatch) {
                                    return renderAudioPlayer(audioMatch[1], index);
                                }

                                // Skip empty strings resulting from split
                                if (!part.trim() && parts.length > 1) return null;

                                return (
                                    <Markdown
                                        key={index}
                                        style={markdownStyles}
                                        rules={markdownRules}
                                    >
                                        {part}
                                    </Markdown>
                                );
                            })}

                            {item.navTab && (
                                <TouchableOpacity
                                    style={[styles.navButton, { backgroundColor: theme.button }]}
                                    onPress={() => onNavigateToTab(item.navTab)}
                                >
                                    <Text style={[styles.navButtonText, { color: theme.buttonText }]}>
                                        {t('chat.goToSection')}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: theme.buttonText, marginLeft: 8 }}>→</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.chatContainer, { backgroundColor: theme.background }]}>
            <ImageBackground
                source={require('../../assets/krishna_bg.png')}
                style={{ flex: 1, justifyContent: "center" }}
                resizeMode="cover"
            >
                <View style={{ flex: 1, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.6)' }}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onScrollBeginDrag={() => Keyboard.dismiss()}
                        keyboardShouldPersistTaps="handled"
                    />
                    {isLoading && (
                        <View style={styles.loadingIndicator}>
                            <ActivityIndicator size="small" color={theme.iconColor} />
                            <Text style={[styles.loadingText, { color: theme.subText }]}>
                                Отправка...
                            </Text>
                        </View>
                    )}
                    {isTyping && recipientUser && (
                        <View style={styles.typingIndicator}>
                            <ActivityIndicator size="small" color={theme.iconColor} />
                            <Text style={[styles.typingText, { color: theme.subText }]}>
                                {recipientUser.spiritualName || recipientUser.karmicName} печатает...
                            </Text>
                        </View>
                    )}
                </View>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    chatContainer: {
        flex: 1,
    },
    listContent: {
        paddingVertical: 20,
        paddingHorizontal: 0, // Убираем общий паддинг, будем задавать его строкам
        paddingBottom: 40,
        flexGrow: 1,
    },
    messageRow: {
        marginBottom: 16,
        width: '100%',
    },
    userRow: {
        alignItems: 'flex-end',
    },
    botRow: {
        alignItems: 'flex-start',
        paddingRight: 20, // Add padding to prevent clipping on the right
    },
    bubble: {
        borderRadius: 18,
        maxWidth: '85%',
    },
    textBubble: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginRight: 10, // Extra margin to ensure no overlap/clip
    },
    imageOnlyBubble: {
        paddingVertical: 6,
        paddingHorizontal: 6,
        borderRadius: 20,
        // Shadow and elevation for the "box" effect
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    loadingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    typingText: {
        marginLeft: 8,
        fontSize: 14,
    },
    navButton: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    navButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
    },
    documentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    documentIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    documentInfo: {
        flex: 1,
    },
    documentName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    documentSize: {
        fontSize: 12,
    },
    downloadIcon: {
        fontSize: 18,
        marginLeft: 8,
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    uploadingText: {
        marginLeft: 8,
        fontSize: 14,
    },
});
