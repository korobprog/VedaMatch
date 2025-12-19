import React, { useRef } from 'react';
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
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from 'react-i18next';
import { ChatImage } from '../../ChatImage';
import { Message, COLORS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';

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
    const { messages, isLoading } = useChat();
    const { imageSize } = useSettings();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const flatListRef = useRef<FlatList>(null);

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

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        // Проверяем, является ли сообщение только изображением (формат ![alt](url))
        const isImageOnly = !isUser && item.text.trim().startsWith('![') && item.text.trim().endsWith(')') && !item.text.trim().includes('\n', 2);

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
                                backgroundColor: isDarkMode ? 'transparent' : '#FFF', // Белый или прозрачный фон для картинки
                                borderColor: theme.borderColor,
                                borderWidth: 0, // Убираем границу для лучшего вида с фото
                                marginBottom: isImageOnly ? 6 : 0,
                                marginRight: isImageOnly ? 0 : 8,
                                overflow: 'hidden', // Чтобы скругление работало для Image
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
                                // Ширина бокса пузыря = размер картинки + отступы, но не больше чем (экран - 40)
                                width: isImageOnly ? Math.min(imageSize + 14, SCREEN_WIDTH - 40) : undefined,
                                maxWidth: '100%',
                            }
                        ]}>
                            <Markdown
                                style={markdownStyles}
                                rules={markdownRules}
                            >
                                {item.text}
                            </Markdown>

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
});
