import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    FlatList,
    ActivityIndicator,
    Text,
    Image,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Alert,
    AlertButton,
    Linking,
    Platform,
    Keyboard,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { FileText, File, Download, Music, Video, Image as ImageIcon, MapPin, ExternalLink } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from 'react-i18next';
import { ChatImage } from '../ChatImage';
import { Message, AssistantSource } from './ChatConstants';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { WebView } from 'react-native-webview';
import { mediaService } from '../../services/mediaService';
import { AudioPlayer } from './AudioPlayer';
import { ragService } from '../../services/ragService';
import peacockAssistant from '../../assets/peacockAssistant.png';
import krishnaAssistant from '../../assets/krishnaAssistant.png';
import nanoBanano from '../../assets/nano_banano.png';

interface MessageListProps {
    onDownloadImage: (imageUrl: string, imageName?: string) => void;
    onShareImage: (url: string) => void;
    onNavigateToTab: (tab: any) => void;
    onNavigateToMap?: (mapData: Message['mapData']) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const MessageList: React.FC<MessageListProps> = ({
    onDownloadImage,
    onShareImage,
    onNavigateToTab,
    onNavigateToMap,
}) => {
    const { t, i18n } = useTranslation();
    const { messages, isLoading, isTyping, recipientUser, deleteMessage, isUploading } = useChat();
    const { user } = useUser();
    const { assistantType, isDarkMode, portalBackgroundType } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const isPhotoBg = portalBackgroundType === 'image';
    const theme = {
        accent: colors.accent,
        primary: colors.accent,
        text: isPhotoBg ? '#F8FAFC' : colors.textPrimary,
        subText: isPhotoBg ? 'rgba(248,250,252,0.78)' : colors.textSecondary,
        borderColor: isPhotoBg ? 'rgba(255,255,255,0.26)' : colors.border,
        botBubble: isPhotoBg ? 'rgba(255,255,255,0.16)' : colors.surfaceElevated,
    };
    const flatListRef = useRef<FlatList>(null);
    const lastContentHeightRef = useRef(0);
    const autoScrollFrameRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (autoScrollFrameRef.current !== null) {
                cancelAnimationFrame(autoScrollFrameRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const sub = Keyboard.addListener(showEvent, () => {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });
        return () => sub.remove();
    }, []);

    const formatMessageTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
    };

    // Flatten messages with date headers
    const messagesWithHeaders = (() => {
        const result: (Message | { type: 'header', title: string, id: string })[] = [];
        let lastDate = '';

        messages.forEach((msg, index) => {
            const date = msg.createdAt ? new Date(msg.createdAt) : new Date();
            const dateStr = date.toDateString();
            if (dateStr !== lastDate) {
                const today = new Date().toDateString();
                const yesterday = new Date(Date.now() - 86400000).toDateString();
                let title = date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' });
                if (dateStr === today) title = t('chat.today');
                else if (dateStr === yesterday) title = t('chat.yesterday');

                result.push({ type: 'header', title, id: `header-${dateStr}-${index}` });
                lastDate = dateStr;
            }
            result.push(msg);
        });
        return result;
    })();

    const openImage = (uri: string) => {
        Alert.alert(
            t('chat.viewImage'),
            t('chat.viewImagePrompt'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('chat.download'), onPress: () => onDownloadImage(uri) },
                { text: t('chat.share'), onPress: () => onShareImage(uri) },
            ]
        );
    };

    const openDocument = (url: string, fileName?: string) => {
        Alert.alert(
            t('chat.document'),
            t('chat.downloadFilePrompt', { fileName: fileName || t('chat.document') }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('chat.download'), onPress: () => Linking.openURL(url) },
            ]
        );
    };

    const handleSourcePress = async (source: AssistantSource) => {
        try {
            const details = await ragService.getSourceById(source.id);
            const previewText = (details.content || source.snippet || '').trim();
            const shortPreview = previewText.length > 700 ? `${previewText.slice(0, 700)}...` : previewText;
            const header = source.domain
                ? t('chat.sourceDomain', { domain: source.domain, defaultValue: `Домен: ${source.domain}` })
                : '';
            const alertBody = [header, shortPreview].filter(Boolean).join('\n\n') || t('chat.sourceDetailsUnavailable', 'Детали источника недоступны');

            const buttons: AlertButton[] = [
                {
                    text: t('common.close'),
                    style: 'cancel' as const,
                },
            ];

            if (details.sourceUrl) {
                buttons.unshift({
                    text: t('chat.openSource', 'Открыть источник'),
                    onPress: () => Linking.openURL(details.sourceUrl || '').catch((error) => {
                        console.warn('Failed to open source URL:', error);
                    }),
                });
            }

            Alert.alert(details.title || source.title || t('chat.sourceTitle', 'Источник'), alertBody, buttons);
        } catch (error) {
            console.warn('Failed to load source details:', error);
            if (source.sourceUrl) {
                Linking.openURL(source.sourceUrl).catch((openError) => {
                    console.warn('Failed to open source URL:', openError);
                });
                return;
            }

            const fallbackText = source.snippet || t('chat.sourceDetailsUnavailable', 'Детали источника недоступны');
            Alert.alert(source.title || t('chat.sourceTitle', 'Источник'), fallbackText);
        }
    };

    const mdStyles: any = {
        body: { color: theme.text, fontSize: 16, lineHeight: 22 },
        paragraph: { marginTop: 0, marginBottom: 8 },
        imageContainer: { marginVertical: 8, alignItems: 'center' as const },
        markdownImage: { width: '100%', maxWidth: 300, height: 200, borderRadius: 8, marginBottom: 8 },
    };

    const mdRules = {
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

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon size={24} color={theme.primary} />;
        if (['mp3', 'wav', 'm4a', 'aac'].includes(ext || '')) return <Music size={24} color={theme.primary} />;
        if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) return <Video size={24} color={theme.primary} />;
        if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <FileText size={24} color={theme.primary} />;
        return <File size={24} color={theme.primary} />;
    };

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
            <View key={key} style={{ height: 60, width: 220, marginVertical: 5, borderRadius: 12, overflow: 'hidden', backgroundColor: 'transparent' }}>
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

    const formatConfidencePercent = (confidence?: number) => {
        if (typeof confidence !== 'number' || Number.isNaN(confidence)) return null;
        const normalized = Math.max(0, Math.min(1, confidence));
        return `${Math.round(normalized * 100)}%`;
    };

    const handleDeleteMessage = (msg: Message) => {
        if (msg.sender !== 'user') return;
        Alert.alert(
            t('chat.deleteTitle'),
            t('chat.deleteMsg'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('chat.delete'), style: 'destructive', onPress: () => deleteMessage(msg.id) }
            ]
        );
    };

    const renderMessage = ({ item: rawItem }: { item: any }) => {
        if (rawItem.type === 'header') {
            return (
                <View style={styles.dateHeader}>
                    <View style={[styles.dateLine, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : theme.borderColor }]} />
                    <Text style={[styles.dateText, { color: theme.subText }]}>{rawItem.title}</Text>
                    <View style={[styles.dateLine, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : theme.borderColor }]} />
                </View>
            );
        }

        const item = rawItem as Message;
        const isUser = item.sender === 'user';
        const text = item.text || '';
        const time = formatMessageTime(item.createdAt);

        const bubbleStyle = [
            styles.bubble,
            isUser ? styles.userBubble : styles.botBubble,
            {
                backgroundColor: 'transparent',
                borderColor: isUser
                    ? (isPhotoBg ? 'rgba(255,255,255,0.34)' : colors.accent)
                    : theme.borderColor,
                borderWidth: 1.2,
                overflow: 'hidden' as const,
            }
        ];

        const bubbleShadowStyle = isUser ? styles.userGlassShadow : styles.botGlassShadow;
        const glassTint = isUser
            ? (isPhotoBg ? 'rgba(15,23,42,0.44)' : colors.accentSoft)
            : (isPhotoBg ? 'rgba(255,255,255,0.09)' : (isDarkMode ? 'rgba(15,23,42,0.3)' : 'rgba(255,255,255,0.45)'));

        const Content = () => {
            if (item.uploading) {
                return (
                    <View style={bubbleShadowStyle}>
                        <View style={bubbleStyle}>
                            {(isPhotoBg || isDarkMode) && (
                                <BlurView
                                    style={StyleSheet.absoluteFill}
                                    blurType={isDarkMode ? 'dark' : 'light'}
                                    blurAmount={20}
                                    reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.72)' : colors.surfaceElevated}
                                />
                            )}
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: glassTint }]} />
                            <View style={styles.uploadingContainer}>
                                <ActivityIndicator size="small" color={theme.primary} />
                                <Text style={[styles.uploadingText, { color: theme.text }]}>{t('chat.uploading')}</Text>
                            </View>
                        </View>
                    </View>
                );
            }

            const innerContent = (
                <>
                    {item.type === 'image' && item.content ? (
                        <TouchableOpacity onPress={() => openImage(item.content!)}>
                            <Image source={{ uri: item.content }} style={styles.messageImage} />
                        </TouchableOpacity>
                    ) : item.type === 'audio' && item.content ? (
                        <AudioPlayer url={item.content} duration={item.duration} isDarkMode={isDarkMode} />
                    ) : (item.type === 'document' || item.type === 'file') && item.content ? (
                        <TouchableOpacity
                            onPress={() => openDocument(item.content!, item.fileName)}
                            style={[styles.documentCard, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.12)' : colors.surface, borderColor: theme.borderColor }]}
                        >
                            <View style={[styles.documentIconContainer, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : colors.accentSoft }]}>
                                {getFileIcon(item.fileName || '')}
                            </View>
                            <View style={styles.documentInfo}>
                                <Text style={[styles.documentName, { color: theme.text }]} numberOfLines={1}>{item.fileName || t('chat.document')}</Text>
                                <View style={styles.documentMeta}>
                                    <Text style={[styles.documentSize, { color: theme.subText }]}>
                                        {item.fileSize ? mediaService.formatFileSize(item.fileSize) : 'File'}
                                    </Text>
                                    <View style={[styles.extensionBadge, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.18)' : colors.accentSoft }]}>
                                        <Text style={[styles.extensionText, { color: theme.subText }]}>
                                            {(item.fileName?.split('.').pop() || 'FILE').toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <View style={[styles.downloadBtn, { backgroundColor: theme.primary }]}>
                                <Download size={16} color="#FFF" />
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View>
                            {text.split(/(<audio\s+[^>]*src="[^"]+"[^>]*>.*?<\/audio>)/gi).map((part, index) => {
                                const audioMatch = part.match(/<audio\s+[^>]*src="([^"]+)"[^>]*>/i);
                                if (audioMatch) return renderAudioPlayer(audioMatch[1], index);
                                if (!part.trim() && index > 0) return null;
                                return (
                                    <View key={index} style={styles.messageContentRow}>
                                        <View style={styles.markdownWrapper}>
                                            <Markdown style={mdStyles} rules={mdRules}>
                                                {part}
                                            </Markdown>
                                        </View>
                                        <Text style={[styles.timeText, styles.embeddedTime, { color: theme.subText }]}>{time}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {!text && !item.uploading && (
                        <View style={styles.timeOverlay}>
                            <Text style={[styles.timeText, { color: theme.subText }]}>{time}</Text>
                        </View>
                    )}

                    {item.navTab && (
                        <TouchableOpacity
                            style={[styles.navButton, { backgroundColor: theme.primary }]}
                            onPress={() => onNavigateToTab(item.navTab)}
                        >
                            <Text style={[styles.navButtonText, { color: '#FFF' }]}>{t('chat.goToSection')}</Text>
                        </TouchableOpacity>
                    )}

                    {item.mapData && onNavigateToMap && (
                        <TouchableOpacity
                            style={[styles.mapButton, { backgroundColor: '#059669' }]}
                            onPress={() => onNavigateToMap(item.mapData)}
                        >
                            <MapPin size={16} color="#FFF" />
                            <Text style={[styles.navButtonText, { color: '#FFF', marginLeft: 6 }]}>
                                {t('chat.showOnMap', 'Показать на карте')}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {!isUser && item.assistantContext ? (
                        <View style={styles.ragMetaRow}>
                            {item.assistantContext.retrieverPath ? (
                                <View style={[styles.ragBadge, { borderColor: theme.borderColor }]}>
                                    <Text style={[styles.ragBadgeText, { color: theme.subText }]}>
                                        {t('chat.retrieverLabel', 'Поиск')}: {item.assistantContext.retrieverPath}
                                    </Text>
                                </View>
                            ) : null}
                            {formatConfidencePercent(item.assistantContext.confidence) ? (
                                <View style={[styles.ragBadge, { borderColor: theme.borderColor }]}>
                                    <Text style={[styles.ragBadgeText, { color: theme.subText }]}>
                                        {t('chat.confidenceLabel', 'Уверенность')}: {formatConfidencePercent(item.assistantContext.confidence)}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    ) : null}

                    {!isUser && item.assistantContext?.sources?.length ? (
                        <View style={[styles.sourcesContainer, { borderTopColor: theme.borderColor }]}>
                            <Text style={[styles.sourcesTitle, { color: theme.subText }]}>
                                {t('chat.sourcesTitle', 'Источники')}
                            </Text>
                            {item.assistantContext.sources.slice(0, 3).map((source, index) => (
                                <TouchableOpacity
                                    key={`${item.id}_source_${source.id || index}`}
                                    style={[styles.sourceCard, { borderColor: theme.borderColor }]}
                                    onPress={() => handleSourcePress(source)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.sourceHeader}>
                                        <Text style={[styles.sourceTitle, { color: theme.text }]} numberOfLines={1}>
                                            {source.title || `${t('chat.sourceTitle', 'Источник')} ${index + 1}`}
                                        </Text>
                                        {source.sourceUrl ? (
                                            <ExternalLink size={13} color={theme.subText} />
                                        ) : (
                                            <FileText size={13} color={theme.subText} />
                                        )}
                                    </View>
                                    {source.snippet ? (
                                        <Text style={[styles.sourceSnippet, { color: theme.subText }]} numberOfLines={2}>
                                            {source.snippet}
                                        </Text>
                                    ) : null}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : null}
                </>
            );

            return (
                <View style={bubbleShadowStyle}>
                    <View style={bubbleStyle}>
                        {(isPhotoBg || isDarkMode) && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType={isDarkMode ? 'dark' : 'light'}
                                blurAmount={20}
                                reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.72)' : colors.surfaceElevated}
                            />
                        )}
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: glassTint }]} />
                        {innerContent}
                    </View>
                </View>
            );
        };

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onLongPress={() => handleDeleteMessage(item)}
                delayLongPress={500}
                style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}
            >
                {!isUser && (
                    <View style={styles.avatar}>
                        <Image
                            source={assistantType === 'feather2' ? nanoBanano : (assistantType === 'feather' ? peacockAssistant : krishnaAssistant)}
                            style={styles.avatarImage}
                        />
                    </View>
                )}
                <Content />
            </TouchableOpacity>
        );
    };

    const handleContentSizeChange = (_width: number, height: number) => {
        if (Math.abs(height - lastContentHeightRef.current) < 2) return;
        lastContentHeightRef.current = height;

        if (autoScrollFrameRef.current !== null) {
            cancelAnimationFrame(autoScrollFrameRef.current);
        }

        autoScrollFrameRef.current = requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: !isUploading });
        });
    };

    return (
        <View style={styles.chatContainer}>
            <View style={styles.overlay}>
                <FlatList
                    ref={flatListRef}
                    data={messagesWithHeaders}
                    renderItem={renderMessage}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    keyboardDismissMode="none"
                    keyboardShouldPersistTaps="always"
                    onContentSizeChange={handleContentSizeChange}
                />
                {isLoading && (
                    <View style={styles.statusBox}>
                        <ActivityIndicator size="small" color={theme.primary} />
                        <Text style={[styles.statusText, { color: theme.subText }]}>Отправка...</Text>
                    </View>
                )}
                {isTyping && recipientUser && (
                    <View style={styles.statusBox}>
                        <ActivityIndicator size="small" color={theme.primary} />
                        <Text style={[styles.statusText, { color: theme.subText }]}>
                            {recipientUser.spiritualName || recipientUser.karmicName} {t('chat.isTyping')}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    chatContainer: { flex: 1 },
    overlay: { flex: 1 },
    listContent: { paddingTop: 8, paddingHorizontal: 14, paddingBottom: 44 },
    messageRow: { marginBottom: 12, flexDirection: 'row', width: '100%', alignItems: 'flex-end' },
    userRow: { justifyContent: 'flex-end' },
    botRow: { justifyContent: 'flex-start' },
    bubble: {
        borderRadius: 18,
        maxWidth: '85%',
        minWidth: 100, // Ensure enough space for short text + time
        paddingVertical: 10,
        paddingHorizontal: 13,
    },
    userBubble: {
        borderBottomRightRadius: 4,
    },
    userGlassShadow: {
        maxWidth: '85%',
        ...Platform.select({
            ios: { shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
            android: { elevation: 2 },
        }),
    },
    botBubble: { borderBottomLeftRadius: 4 },
    botGlassShadow: {
        maxWidth: '85%',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 6 },
            android: { elevation: 3 },
        }),
    },
    timeText: { fontSize: 10, fontWeight: '500', color: 'rgba(248,250,252,0.6)' },
    timeOverlay: { position: 'absolute', bottom: 6, right: 12 },
    avatar: { width: 34, height: 34, borderRadius: 10, marginRight: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)' },
    avatarImage: { width: '100%', height: '100%' },
    messageText: { fontSize: 16, lineHeight: 22 },
    dateHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, paddingHorizontal: 20 },
    dateLine: { flex: 1, height: 1, borderRadius: 0.5 },
    dateText: { marginHorizontal: 12, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    statusBox: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    statusText: { marginLeft: 8, fontSize: 13 },
    messageImage: { width: 240, height: 240, borderRadius: 12, marginBottom: 4 },
    documentCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 8, marginVertical: 4, width: 250, borderWidth: 1 },
    documentIconContainer: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    documentInfo: { flex: 1, marginRight: 8 },
    documentMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    documentName: { fontSize: 13, fontWeight: '600' },
    documentSize: { fontSize: 11 },
    extensionBadge: { marginLeft: 6, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
    extensionText: { fontSize: 8, fontWeight: 'bold' },
    downloadBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    navButton: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
    navButtonText: { fontSize: 13, fontWeight: 'bold' },
    mapButton: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    ragMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 6,
    },
    ragBadge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    ragBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    sourcesContainer: {
        marginTop: 10,
        borderTopWidth: 1,
        paddingTop: 8,
    },
    sourcesTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sourceCard: {
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 6,
    },
    sourceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sourceTitle: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        marginRight: 8,
    },
    sourceSnippet: {
        fontSize: 12,
        lineHeight: 17,
        marginTop: 4,
    },
    uploadingContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    uploadingText: { marginLeft: 8, fontSize: 14 },
    messageContentRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        maxWidth: '100%',
    },
    markdownWrapper: {
        flexShrink: 1,
        minWidth: 40,
    },
    embeddedTime: {
        marginLeft: 10,
        marginBottom: 2,
        flexShrink: 0,
    },
});
