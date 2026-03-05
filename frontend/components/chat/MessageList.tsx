import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    FlatList,
    ActivityIndicator,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Alert,
    AlertButton,
    Linking,
    Platform,
    Keyboard,
} from 'react-native';
import type { AxiosError } from 'axios';
import { BlurView } from '@react-native-community/blur';
import { FileText, File, Download, Music, Video, Image as ImageIcon, MapPin, ExternalLink, PlayCircle, UserRound } from 'lucide-react-native';
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
import { messageService, type MessageTranscriptionBilling } from '../../services/messageService';
import { AudioPlayer } from './AudioPlayer';
import { ragService } from '../../services/ragService';
import { getMediaUrl } from '../../utils/url';
import { isColorLight, isGradientLight } from '../../utils/chatBackgroundContrast';
import peacockAssistant from '../../assets/peacockAssistant.png';
import krishnaAssistant from '../../assets/krishnaAssistant.png';
import nanoBanano from '../../assets/nano_banano.png';

interface MessageListProps {
    onDownloadImage: (imageUrl: string, imageName?: string) => void;
    onShareImage: (url: string) => void;
    onNavigateToTab: (tab: any) => void;
    onNavigateToMap?: (mapData: Message['mapData']) => void;
}

const CDN_AUDIO_PREFIX = 'https://cdn.vedamatch.ru/messages/audio/';
const S3_AUDIO_FALLBACK_PREFIX = 'https://s3.firstvds.ru/05859cbd-c4799b8f-c25d-417d-b8a3-7c54ac14c436/messages/audio/';

export const MessageList: React.FC<MessageListProps> = ({
    onDownloadImage,
    onShareImage,
    onNavigateToTab,
    onNavigateToMap,
}) => {
    const { t, i18n } = useTranslation();
    const {
        messages,
        isLoading,
        isTyping,
        recipientUser,
        deleteMessage,
        isUploading,
        hasOlderMessages,
        isLoadingOlderMessages,
        loadOlderMessages,
    } = useChat();
    const { user } = useUser();
    const { assistantType, isDarkMode, chatBackgroundType, chatBackground } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const isImageBg = chatBackgroundType === 'image';
    const isLightChatBackground =
        (chatBackgroundType === 'color' && isColorLight(chatBackground)) ||
        (chatBackgroundType === 'gradient' && isGradientLight(chatBackground));
    const shouldUseBubbleBlur = Platform.OS === 'android'
        ? (isImageBg || (!isLightChatBackground && isDarkMode))
        : isImageBg;
    const theme = {
        accent: colors.accent,
        primary: colors.accent,
        text: isImageBg ? '#F8FAFC' : (isLightChatBackground ? '#1F2937' : colors.textPrimary),
        subText: isImageBg ? 'rgba(248,250,252,0.78)' : (isLightChatBackground ? '#64748B' : colors.textSecondary),
        borderColor: isImageBg ? 'rgba(255,255,255,0.26)' : (isLightChatBackground ? 'rgba(15,23,42,0.16)' : colors.border),
        botBubble: isImageBg ? 'rgba(255,255,255,0.16)' : colors.surfaceElevated,
    };
    const flatListRef = useRef<FlatList>(null);
    const autoScrollFrameRef = useRef<number | null>(null);
    const listSnapshotRef = useRef<{ firstId?: string; lastId?: string; length: number }>({ length: 0 });
    const loadingOlderGuardRef = useRef(false);
    const [transcribingIds, setTranscribingIds] = useState<Record<string, boolean>>({});
    const [transcriptOverrides, setTranscriptOverrides] = useState<Record<string, { text?: string; language?: string; model?: string; status?: string }>>({});

    useEffect(() => {
        return () => {
            if (autoScrollFrameRef.current !== null) {
                cancelAnimationFrame(autoScrollFrameRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isLoadingOlderMessages) {
            loadingOlderGuardRef.current = false;
        }
    }, [isLoadingOlderMessages]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const sub = Keyboard.addListener(showEvent, () => {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });
        return () => sub.remove();
    }, []);

    useEffect(() => {
        const nextFirstId = messages[0]?.id;
        const nextLastId = messages[messages.length - 1]?.id;
        const prev = listSnapshotRef.current;

        const isInitialLoad = prev.length === 0 && messages.length > 0;
        const appendedNewMessage =
            messages.length > prev.length &&
            !!prev.lastId &&
            nextLastId !== prev.lastId;

        listSnapshotRef.current = {
            firstId: nextFirstId,
            lastId: nextLastId,
            length: messages.length,
        };

        if (isLoadingOlderMessages || (!isInitialLoad && !appendedNewMessage)) {
            return;
        }

        if (autoScrollFrameRef.current !== null) {
            cancelAnimationFrame(autoScrollFrameRef.current);
        }
        autoScrollFrameRef.current = requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: !isUploading });
        });
    }, [messages, isLoadingOlderMessages, isUploading]);

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

    const hasAudioExtension = (value?: string) => {
        if (!value) return false;
        const normalized = value.toLowerCase().split('?')[0].split('#')[0];
        return normalized.endsWith('.m4a') ||
            normalized.endsWith('.mp3') ||
            normalized.endsWith('.wav') ||
            normalized.endsWith('.aac') ||
            normalized.endsWith('.ogg') ||
            normalized.endsWith('.webm');
    };

    const applyAudioHostFallback = (url: string): string => {
        if (!url.startsWith(CDN_AUDIO_PREFIX)) {
            return url;
        }
        return `${S3_AUDIO_FALLBACK_PREFIX}${url.slice(CDN_AUDIO_PREFIX.length)}`;
    };

    const resolveAudioUrl = (item: Message): string | undefined => {
        const type = (item.type || '').toLowerCase();
        const mimeType = (item.mimeType || '').toLowerCase();
        const content = (item.content || '').trim();
        const textValue = (item.text || '').trim();
        const fileName = (item.fileName || '').toLowerCase();

        const looksLikeAudio =
            type === 'audio' ||
            mimeType.startsWith('audio/') ||
            hasAudioExtension(fileName) ||
            hasAudioExtension(content) ||
            hasAudioExtension(textValue);

        if (!looksLikeAudio) {
            return undefined;
        }

        if (content) {
            return applyAudioHostFallback(content);
        }

        if (
            textValue.startsWith('http://') ||
            textValue.startsWith('https://') ||
            textValue.startsWith('file://') ||
            textValue.startsWith('/uploads/')
        ) {
            return applyAudioHostFallback(textValue);
        }

        return undefined;
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

    const handleTranscribeAudio = async (item: Message) => {
        const messageId = Number(item.id);
        if (!Number.isFinite(messageId) || messageId <= 0) {
            Alert.alert(t('error'), 'Нельзя расшифровать это сообщение');
            return;
        }

        const messageKey = item.id.toString();
        setTranscribingIds(prev => ({ ...prev, [messageKey]: true }));
        try {
            const quote = await messageService.getTranscribeQuote(messageId);
            const shouldContinue = await confirmTranscribeQuote(quote.billing);
            if (!shouldContinue) {
                return;
            }

            const response = await messageService.transcribeMessage(messageId);
            setTranscriptOverrides(prev => ({
                ...prev,
                [messageKey]: response.transcript || {},
            }));
            const chargedLkm = Number(response.billing?.chargedLkm || 0);
            if (chargedLkm > 0) {
                Alert.alert('Расшифровка готова', `Списано ${chargedLkm} LKM`);
            }
        } catch (error) {
            console.error('Failed to transcribe message', error);
            const status = (error as AxiosError)?.response?.status;
            if (status === 402) {
                Alert.alert(t('error'), 'Недостаточно LKM');
            } else {
                Alert.alert(t('error'), 'Не удалось расшифровать аудио');
            }
        } finally {
            setTranscribingIds(prev => ({ ...prev, [messageKey]: false }));
        }
    };

    const confirmTranscribeQuote = async (billing: MessageTranscriptionBilling): Promise<boolean> => {
        const chargedLkm = Number(billing?.chargedLkm || 0);
        if (chargedLkm <= 0) {
            return true;
        }

        return new Promise(resolve => {
            Alert.alert(
                'Расшифровка аудио',
                `Будет списано ${chargedLkm} LKM.\nОстаток бесплатных минут после запуска: ${billing.weeklyQuotaRemaining} из ${billing.weeklyQuotaTotal}.`,
                [
                    { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
                    { text: 'Продолжить', onPress: () => resolve(true) },
                ],
                { cancelable: true, onDismiss: () => resolve(false) }
            );
        });
    };

    const renderMessage = ({ item: rawItem }: { item: any }) => {
        if (rawItem.type === 'header') {
            return (
                <View style={styles.dateHeader}>
                    <View style={[styles.dateLine, { backgroundColor: isImageBg ? 'rgba(255,255,255,0.2)' : theme.borderColor }]} />
                    <Text style={[styles.dateText, { color: theme.subText }]}>{rawItem.title}</Text>
                    <View style={[styles.dateLine, { backgroundColor: isImageBg ? 'rgba(255,255,255,0.2)' : theme.borderColor }]} />
                </View>
            );
        }

        const item = rawItem as Message;
        const isUser = item.sender === 'user';
        const isOtherUser = item.sender === 'other';
        const text = item.text || '';
        const audioUrl = resolveAudioUrl(item);
        const time = formatMessageTime(item.createdAt);
        const recipientAvatarUrl = getMediaUrl(recipientUser?.avatarUrl);
        const recipientName = recipientUser?.spiritualName || recipientUser?.karmicName || '';
        const recipientInitial = recipientName.trim().charAt(0).toUpperCase() || '?';
        const bubbleTextColor = isUser ? '#F8FAFC' : theme.text;
        const bubbleSubTextColor = isUser ? 'rgba(248,250,252,0.78)' : theme.subText;
        const messageKey = item.id?.toString?.() || '';
        const transcriptData = transcriptOverrides[messageKey] || (item.mapData?.transcript as { text?: string; status?: string; language?: string; model?: string } | undefined);
        const transcriptText = (transcriptData?.text || '').trim();
        const isTranscribing = Boolean(transcribingIds[messageKey]);
        const isVideoCircle = (item.type || '').toLowerCase() === 'video_circle';
        const isVideoCircleExpired = (item.mapData?.mediaStatus || '').toString().toLowerCase() === 'expired';
        const contactData = item.mapData?.contact as {
            id?: number;
            spiritualName?: string;
            karmicName?: string;
            nickname?: string;
            city?: string;
            country?: string;
        } | undefined;
        const mdStyles: any = {
            body: { color: bubbleTextColor, fontSize: 16, lineHeight: 22 },
            paragraph: { marginTop: 0, marginBottom: 8 },
            imageContainer: { marginVertical: 8, alignItems: 'center' as const },
            markdownImage: { width: '100%', maxWidth: 300, height: 200, borderRadius: 8, marginBottom: 8 },
        };
        const documentCardBg = isUser
            ? (isImageBg ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.16)')
            : (isImageBg ? 'rgba(255,255,255,0.12)' : (isLightChatBackground ? 'rgba(255,255,255,0.96)' : colors.surface));
        const documentIconBg = isImageBg
            ? 'rgba(255,255,255,0.2)'
            : (isUser ? 'rgba(255,255,255,0.22)' : colors.accentSoft);
        const extensionBadgeBg = isImageBg
            ? 'rgba(255,255,255,0.18)'
            : (isUser ? 'rgba(255,255,255,0.24)' : colors.accentSoft);

        const bubbleStyle = [
            styles.bubble,
            isUser ? styles.userBubble : styles.botBubble,
            {
                backgroundColor: 'transparent',
                borderColor: isUser
                    ? (isImageBg ? 'rgba(255,255,255,0.34)' : colors.accent)
                    : theme.borderColor,
                borderWidth: 1.2,
                overflow: 'hidden' as const,
            }
        ];

        const bubbleShadowStyle = isUser ? styles.userGlassShadow : styles.botGlassShadow;
        const glassTint = isUser
            ? (isImageBg ? 'rgba(15,23,42,0.44)' : (isLightChatBackground ? 'rgba(31,41,55,0.56)' : colors.accentSoft))
            : (isImageBg ? 'rgba(255,255,255,0.09)' : (isLightChatBackground ? 'rgba(255,255,255,0.92)' : (isDarkMode ? 'rgba(15,23,42,0.3)' : 'rgba(255,255,255,0.45)')));

        const Content = () => {
            if (item.uploading) {
                return (
                    <View style={bubbleShadowStyle}>
                        <View style={bubbleStyle}>
                            {shouldUseBubbleBlur && (
                                <BlurView
                                    style={StyleSheet.absoluteFill}
                                    blurType={isDarkMode ? 'dark' : 'light'}
                                    blurAmount={20}
                                    reducedTransparencyFallbackColor={isImageBg ? 'rgba(15,23,42,0.72)' : colors.surfaceElevated}
                                />
                            )}
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: glassTint }]} />
                            <View style={styles.uploadingContainer}>
                                <ActivityIndicator size="small" color={theme.primary} />
                                <Text style={[styles.uploadingText, { color: bubbleTextColor }]}>{t('chat.uploading')}</Text>
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
                    ) : isVideoCircle && item.content ? (
                        <TouchableOpacity
                            style={[styles.videoCircleCard, { borderColor: theme.borderColor, backgroundColor: documentCardBg }]}
                            onPress={() => Linking.openURL(mediaService.getDownloadUrl(item.content || '')).catch(() => {
                                Alert.alert(t('error'), 'Не удалось открыть видеокружок');
                            })}
                        >
                            <View style={[styles.videoCircleIconWrap, { backgroundColor: documentIconBg }]}>
                                <PlayCircle size={26} color={theme.primary} />
                            </View>
                            <View style={styles.videoCircleTextWrap}>
                                <Text style={[styles.videoCircleTitle, { color: bubbleTextColor }]}>
                                    {isVideoCircleExpired ? 'Кружок удален' : 'Видеокружок'}
                                </Text>
                                <Text style={[styles.videoCircleSubTitle, { color: bubbleSubTextColor }]}>
                                    {isVideoCircleExpired
                                        ? 'Срок хранения истек'
                                        : `Длительность: ${item.duration ? mediaService.formatDuration(item.duration) : 'до 60с'}`}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ) : (item.type === 'contact_card' && contactData) ? (
                        <View style={[styles.contactCard, { borderColor: theme.borderColor, backgroundColor: documentCardBg }]}>
                            <View style={[styles.contactIconWrap, { backgroundColor: documentIconBg }]}>
                                <UserRound size={20} color={theme.primary} />
                            </View>
                            <View style={styles.contactMeta}>
                                <Text style={[styles.contactName, { color: bubbleTextColor }]} numberOfLines={1}>
                                    {contactData.spiritualName || contactData.karmicName || contactData.nickname || `ID ${contactData.id || ''}`}
                                </Text>
                                <Text style={[styles.contactDetails, { color: bubbleSubTextColor }]} numberOfLines={1}>
                                    {[contactData.city, contactData.country].filter(Boolean).join(', ') || 'Контакт'}
                                </Text>
                            </View>
                        </View>
                    ) : audioUrl ? (
                        <View>
                            <AudioPlayer url={audioUrl} duration={item.duration} isDarkMode={isDarkMode} />
                            {transcriptText ? (
                                <View style={[styles.transcriptBox, { borderColor: theme.borderColor }]}>
                                    <Text style={[styles.transcriptLabel, { color: bubbleSubTextColor }]}>Расшифровка</Text>
                                    <Text style={[styles.transcriptText, { color: bubbleTextColor }]}>{transcriptText}</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.transcriptButton, { borderColor: theme.borderColor }]}
                                    onPress={() => handleTranscribeAudio(item)}
                                    disabled={isTranscribing}
                                >
                                    {isTranscribing ? (
                                        <ActivityIndicator size="small" color={theme.primary} />
                                    ) : (
                                        <Text style={[styles.transcriptButtonText, { color: bubbleTextColor }]}>Расшифровать</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (item.type === 'document' || item.type === 'file') && item.content ? (
                        <TouchableOpacity
                            onPress={() => openDocument(item.content!, item.fileName)}
                            style={[styles.documentCard, { backgroundColor: documentCardBg, borderColor: theme.borderColor }]}
                        >
                            <View style={[styles.documentIconContainer, { backgroundColor: documentIconBg }]}>
                                {getFileIcon(item.fileName || '')}
                            </View>
                            <View style={styles.documentInfo}>
                                <Text style={[styles.documentName, { color: bubbleTextColor }]} numberOfLines={1}>{item.fileName || t('chat.document')}</Text>
                                <View style={styles.documentMeta}>
                                    <Text style={[styles.documentSize, { color: bubbleSubTextColor }]}>
                                        {item.fileSize ? mediaService.formatFileSize(item.fileSize) : 'File'}
                                    </Text>
                                    <View style={[styles.extensionBadge, { backgroundColor: extensionBadgeBg }]}>
                                        <Text style={[styles.extensionText, { color: bubbleSubTextColor }]}>
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
                                        <Text style={[styles.timeText, styles.embeddedTime, { color: bubbleSubTextColor }]}>{time}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {!text && !item.uploading && (
                        <View style={styles.timeOverlay}>
                            <Text style={[styles.timeText, { color: bubbleSubTextColor }]}>{time}</Text>
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
                                    <Text style={[styles.ragBadgeText, { color: bubbleSubTextColor }]}>
                                        {t('chat.retrieverLabel', 'Поиск')}: {item.assistantContext.retrieverPath}
                                    </Text>
                                </View>
                            ) : null}
                            {formatConfidencePercent(item.assistantContext.confidence) ? (
                                <View style={[styles.ragBadge, { borderColor: theme.borderColor }]}>
                                    <Text style={[styles.ragBadgeText, { color: bubbleSubTextColor }]}>
                                        {t('chat.confidenceLabel', 'Уверенность')}: {formatConfidencePercent(item.assistantContext.confidence)}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    ) : null}

                    {!isUser && item.assistantContext?.sources?.length ? (
                        <View style={[styles.sourcesContainer, { borderTopColor: theme.borderColor }]}>
                            <Text style={[styles.sourcesTitle, { color: bubbleSubTextColor }]}>
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
                                        <Text style={[styles.sourceTitle, { color: bubbleTextColor }]} numberOfLines={1}>
                                            {source.title || `${t('chat.sourceTitle', 'Источник')} ${index + 1}`}
                                        </Text>
                                        {source.sourceUrl ? (
                                            <ExternalLink size={13} color={bubbleSubTextColor} />
                                        ) : (
                                            <FileText size={13} color={bubbleSubTextColor} />
                                        )}
                                    </View>
                                    {source.snippet ? (
                                        <Text style={[styles.sourceSnippet, { color: bubbleSubTextColor }]} numberOfLines={2}>
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
                        {shouldUseBubbleBlur && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType={isDarkMode ? 'dark' : 'light'}
                                blurAmount={20}
                                reducedTransparencyFallbackColor={isImageBg ? 'rgba(15,23,42,0.72)' : colors.surfaceElevated}
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
                        {isOtherUser && recipientAvatarUrl ? (
                            <Image source={{ uri: recipientAvatarUrl }} style={styles.avatarImage} />
                        ) : isOtherUser ? (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarFallbackText}>{recipientInitial}</Text>
                            </View>
                        ) : (
                            <Image
                                source={assistantType === 'feather2' ? nanoBanano : (assistantType === 'feather' ? peacockAssistant : krishnaAssistant)}
                                style={styles.avatarImage}
                            />
                        )}
                    </View>
                )}
                <Content />
            </TouchableOpacity>
        );
    };

    const handleListScroll = ({ nativeEvent }: any) => {
        if (!hasOlderMessages || isLoadingOlderMessages || !recipientUser) {
            return;
        }

        if (nativeEvent?.contentOffset?.y > 80) {
            return;
        }

        if (loadingOlderGuardRef.current) {
            return;
        }

        loadingOlderGuardRef.current = true;
        void loadOlderMessages().finally(() => {
            loadingOlderGuardRef.current = false;
        });
    };

    return (
        <View style={styles.chatContainer}>
            <View style={styles.overlay}>
                <FlatList
                    ref={flatListRef}
                    data={messagesWithHeaders}
                    renderItem={renderMessage}
                    keyExtractor={(item: any, index) => item?.id?.toString?.() || `chat_item_${index}`}
                    extraData={`${messages.length}_${isLoadingOlderMessages ? 'older' : 'idle'}_${recipientUser?.ID || 'none'}`}
                    contentContainerStyle={styles.listContent}
                    keyboardDismissMode="none"
                    keyboardShouldPersistTaps="always"
                    onScroll={handleListScroll}
                    scrollEventThrottle={16}
                    maintainVisibleContentPosition={Platform.OS === 'android' ? { minIndexForVisible: 1 } : undefined}
                    ListHeaderComponent={
                        isLoadingOlderMessages ? (
                            <View style={styles.historyLoader}>
                                <ActivityIndicator size="small" color={theme.primary} />
                                <Text style={[styles.historyLoaderText, { color: theme.subText }]}>
                                    {t('common.loading') || 'Загрузка...'}
                                </Text>
                            </View>
                        ) : null
                    }
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
    historyLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 8,
    },
    historyLoaderText: {
        fontSize: 12,
        fontWeight: '600',
    },
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
    avatarFallback: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,153,51,0.9)',
    },
    avatarFallbackText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
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
    videoCircleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        marginVertical: 4,
        minWidth: 220,
    },
    videoCircleIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    videoCircleTextWrap: {
        flex: 1,
    },
    videoCircleTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    videoCircleSubTitle: {
        fontSize: 12,
        marginTop: 2,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        marginVertical: 4,
        minWidth: 220,
    },
    contactIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    contactMeta: {
        flex: 1,
    },
    contactName: {
        fontSize: 14,
        fontWeight: '700',
    },
    contactDetails: {
        fontSize: 12,
        marginTop: 2,
    },
    transcriptBox: {
        marginTop: 8,
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    transcriptLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    transcriptText: {
        fontSize: 13,
        lineHeight: 18,
    },
    transcriptButton: {
        marginTop: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        minHeight: 32,
        justifyContent: 'center',
    },
    transcriptButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
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
