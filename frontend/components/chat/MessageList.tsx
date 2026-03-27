import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
    InteractionManager,
} from 'react-native';
import type { AxiosError } from 'axios';
import { BlurView } from '@react-native-community/blur';
import { FileText, File, Download, Music, Video, Image as ImageIcon, MapPin, ExternalLink, PlayCircle, UserRound } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import type { RootStackParamList } from '../../types/navigation';
import { withAiNavigationMeta } from '../../utils/aiNavigation';
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
const WEB_AUDIO_CONTAINER_STYLE = {
    height: 60,
    width: 220,
    marginVertical: 5,
    borderRadius: 12,
    overflow: 'hidden' as const,
    backgroundColor: 'transparent',
};
const WEB_AUDIO_VIEW_STYLE = {
    backgroundColor: 'transparent',
};
const DATE_LINE_IMAGE_BG_STYLE = {
    backgroundColor: 'rgba(255,255,255,0.2)',
};
const NAV_BUTTON_TEXT_LIGHT_STYLE = {
    color: '#FFF',
};
const MAP_BUTTON_BG_STYLE = {
    backgroundColor: '#059669',
};
const MAP_BUTTON_TEXT_STYLE = {
    color: '#FFF',
    marginLeft: 6,
};
type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type InternalNavigationTarget =
    | { screen: 'LibraryHome'; params: RootStackParamList['LibraryHome'] }
    | { screen: 'BookList'; params: RootStackParamList['BookList'] }
    | { screen: 'Reader'; params: RootStackParamList['Reader'] }
    | { screen: 'ProductDetails'; params: RootStackParamList['ProductDetails'] }
    | { screen: 'ShopDetails'; params: RootStackParamList['ShopDetails'] }
    | { screen: 'ServiceDetail'; params: RootStackParamList['ServiceDetail'] }
    | { screen: 'NewsDetail'; params: RootStackParamList['NewsDetail'] }
    | { screen: 'AdDetail'; params: RootStackParamList['AdDetail'] }
    | { screen: 'CourseDetails'; params: RootStackParamList['CourseDetails'] }
    | { screen: 'YatraDetail'; params: RootStackParamList['YatraDetail'] }
    | { screen: 'ShelterDetail'; params: RootStackParamList['ShelterDetail'] }
    | { screen: 'CafeDetail'; params: RootStackParamList['CafeDetail'] }
    | { screen: 'DishDetail'; params: RootStackParamList['DishDetail'] }
    | { screen: 'ContactProfile'; params: RootStackParamList['ContactProfile'] };

export const MessageList: React.FC<MessageListProps> = ({
    onDownloadImage,
    onShareImage,
    onNavigateToTab,
    onNavigateToMap,
}) => {
    const navigation = useNavigation<RootNavigation>();
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
    const { assistantType, isDarkMode, chatBackgroundType, chatBackground, chatBubbleStyle } = useSettings();
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
    const messageListCopy = i18n.language?.startsWith('ru')
        ? {
            image: 'Изображение',
            transcribeUnavailable: 'Нельзя расшифровать это сообщение',
            transcribeReadyTitle: 'Расшифровка готова',
            charged: 'Списано {{count}} LKM',
            insufficientLkm: 'Недостаточно LKM',
            transcribeFailed: 'Не удалось расшифровать аудио',
            transcribeAudioTitle: 'Расшифровка аудио',
            transcribeAudioBody: 'Будет списано {{charged}} LKM.\nОстаток бесплатных минут после запуска: {{remaining}} из {{total}}.',
            continue: 'Продолжить',
            openVideoFailed: 'Не удалось открыть видеокружок',
            videoDeleted: 'Кружок удален',
            videoCircle: 'Видеокружок',
            mediaExpired: 'Срок хранения истек',
            duration: 'Длительность: {{value}}',
            upTo60: 'до 60с',
            contact: 'Контакт',
            transcript: 'Расшифровка',
            transcribe: 'Расшифровать',
            transcribeShort: 'В текст',
            loading: 'Загрузка...',
            sending: 'Отправка...',
            file: 'Файл',
        }
        : i18n.language?.startsWith('hi')
            ? {
                image: 'इमेज',
                transcribeUnavailable: 'इस संदेश का ट्रांसक्रिप्शन उपलब्ध नहीं है',
                transcribeReadyTitle: 'ट्रांसक्रिप्शन तैयार है',
                charged: '{{count}} LKM काटे गए',
                insufficientLkm: 'पर्याप्त LKM नहीं है',
                transcribeFailed: 'ऑडियो ट्रांसक्राइब नहीं हो सका',
                transcribeAudioTitle: 'ऑडियो ट्रांसक्रिप्शन',
                transcribeAudioBody: '{{charged}} LKM काटे जाएंगे।\nशुरू करने के बाद मुफ्त मिनट शेष: {{remaining}} / {{total}}।',
                continue: 'जारी रखें',
                openVideoFailed: 'वीडियो सर्कल खुल नहीं सका',
                videoDeleted: 'सर्कल हटाया गया',
                videoCircle: 'वीडियो सर्कल',
                mediaExpired: 'स्टोरेज अवधि समाप्त हो गई',
                duration: 'अवधि: {{value}}',
                upTo60: '60 सेकंड तक',
                contact: 'संपर्क',
                transcript: 'ट्रांसक्रिप्शन',
                transcribe: 'ट्रांसक्राइब करें',
                transcribeShort: 'टेक्स्ट',
                loading: 'लोड हो रहा है...',
                sending: 'भेजा जा रहा है...',
                file: 'फ़ाइल',
            }
            : {
                image: 'Image',
                transcribeUnavailable: 'This message cannot be transcribed',
                transcribeReadyTitle: 'Transcription is ready',
                charged: '{{count}} LKM charged',
                insufficientLkm: 'Not enough LKM',
                transcribeFailed: 'Failed to transcribe audio',
                transcribeAudioTitle: 'Audio transcription',
                transcribeAudioBody: '{{charged}} LKM will be charged.\nFree minutes remaining after start: {{remaining}} of {{total}}.',
                continue: 'Continue',
                openVideoFailed: 'Failed to open video circle',
                videoDeleted: 'Circle deleted',
                videoCircle: 'Video circle',
                mediaExpired: 'Storage period expired',
                duration: 'Duration: {{value}}',
                upTo60: 'up to 60s',
                contact: 'Contact',
                transcript: 'Transcription',
                transcribe: 'Transcribe',
                transcribeShort: 'To text',
                loading: 'Loading...',
                sending: 'Sending...',
                file: 'File',
            };
    const bubblePreset = useMemo(() => {
        if (chatBubbleStyle === 'balanced') {
            return {
                outerRadius: 23,
                cornerRadius: 23,
                innerCornerRadius: 21,
                padX: 15,
                padY: 12,
                minWidth: 104,
                highlightLeft: 16,
                highlightRight: 16,
                edgeShadeOpacity: 0.34,
            };
        }

        if (chatBubbleStyle === 'airy') {
            return {
                outerRadius: 38,
                cornerRadius: 28,
                innerCornerRadius: 27,
                padX: 19,
                padY: 15,
                minWidth: 116,
                highlightLeft: 22,
                highlightRight: 22,
                edgeShadeOpacity: 0.24,
            };
        }

        return {
            outerRadius: 32,
            cornerRadius: 10,
            innerCornerRadius: 11,
            padX: 16,
            padY: 13,
            minWidth: 108,
            highlightLeft: 20,
            highlightRight: 16,
            edgeShadeOpacity: 0.4,
        };
    }, [chatBubbleStyle]);
    const flatListRef = useRef<FlatList>(null);
    const autoScrollFrameRef = useRef<number | null>(null);
    const settleScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialSnapIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const initialSnapAttemptsRef = useRef(0);
    const listSnapshotRef = useRef<{ firstId?: string; lastId?: string; length: number }>({ length: 0 });
    const shouldSnapToBottomRef = useRef(true);
    const isUserNearBottomRef = useRef(true);
    const hasUserInteractedRef = useRef(false);
    const initialStickDeadlineRef = useRef(0);
    const loadingOlderGuardRef = useRef(false);
    const [enableMaintainVisiblePosition, setEnableMaintainVisiblePosition] = useState(false);
    const [transcribingIds, setTranscribingIds] = useState<Record<string, boolean>>({});
    const [transcriptOverrides, setTranscriptOverrides] = useState<Record<string, { text?: string; language?: string; model?: string; status?: string }>>({});

    const stopInitialBottomLock = useCallback(() => {
        if (initialSnapIntervalRef.current) {
            clearInterval(initialSnapIntervalRef.current);
            initialSnapIntervalRef.current = null;
        }
    }, []);

    const startInitialBottomLock = useCallback(() => {
        stopInitialBottomLock();
        initialSnapAttemptsRef.current = 0;

        flatListRef.current?.scrollToEnd({ animated: false });

        initialSnapIntervalRef.current = setInterval(() => {
            if (hasUserInteractedRef.current || initialSnapAttemptsRef.current >= 14) {
                stopInitialBottomLock();
                return;
            }
            flatListRef.current?.scrollToEnd({ animated: false });
            initialSnapAttemptsRef.current += 1;
        }, 120);
    }, [stopInitialBottomLock]);

    useEffect(() => {
        return () => {
            if (autoScrollFrameRef.current !== null) {
                cancelAnimationFrame(autoScrollFrameRef.current);
            }
            if (settleScrollTimeoutRef.current) {
                clearTimeout(settleScrollTimeoutRef.current);
            }
            stopInitialBottomLock();
        };
    }, [stopInitialBottomLock]);

    useEffect(() => {
        listSnapshotRef.current = { length: 0 };
        shouldSnapToBottomRef.current = true;
        isUserNearBottomRef.current = true;
        hasUserInteractedRef.current = false;
        initialStickDeadlineRef.current = Date.now() + 2600;
        loadingOlderGuardRef.current = false;
        setEnableMaintainVisiblePosition(false);
        initialSnapAttemptsRef.current = 0;
        stopInitialBottomLock();
        if (autoScrollFrameRef.current !== null) {
            cancelAnimationFrame(autoScrollFrameRef.current);
            autoScrollFrameRef.current = null;
        }
        if (settleScrollTimeoutRef.current) {
            clearTimeout(settleScrollTimeoutRef.current);
            settleScrollTimeoutRef.current = null;
        }
    }, [recipientUser?.ID, stopInitialBottomLock]);

    useEffect(() => {
        if (!isLoadingOlderMessages) {
            loadingOlderGuardRef.current = false;
            return;
        }
        setEnableMaintainVisiblePosition(true);
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
        const shouldAutoScrollForAppend = !hasUserInteractedRef.current || isUserNearBottomRef.current;

        listSnapshotRef.current = {
            firstId: nextFirstId,
            lastId: nextLastId,
            length: messages.length,
        };

        if (
            isLoadingOlderMessages ||
            (!isInitialLoad && !appendedNewMessage) ||
            (appendedNewMessage && !shouldAutoScrollForAppend)
        ) {
            return;
        }

        if (isInitialLoad) {
            startInitialBottomLock();
        }

        if (autoScrollFrameRef.current !== null) {
            cancelAnimationFrame(autoScrollFrameRef.current);
        }
        autoScrollFrameRef.current = requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: !isUploading });
            if (settleScrollTimeoutRef.current) {
                clearTimeout(settleScrollTimeoutRef.current);
            }
            settleScrollTimeoutRef.current = setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
                settleScrollTimeoutRef.current = null;
            }, 140);
        });
    }, [messages, isLoadingOlderMessages, isUploading, startInitialBottomLock]);

    const formatMessageTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
    };

    const formatMessageStatus = (status?: Message['status']) => {
        switch (status) {
            case 'sending':
                return '·';
            case 'seen':
                return '✓✓';
            case 'failed':
                return '!';
            case 'sent':
                return '✓';
            default:
                return '';
        }
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

    const getMetadataRecord = (metadata?: Record<string, unknown> | null): Record<string, unknown> => {
        if (!metadata || typeof metadata !== 'object') {
            return {};
        }
        return metadata;
    };

    const getMetadataString = (metadata: Record<string, unknown>, key: string): string => {
        const value = metadata[key];
        return typeof value === 'string' ? value.trim() : '';
    };

    const getMetadataNumber = (metadata: Record<string, unknown>, key: string): number | undefined => {
        const value = metadata[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
        return undefined;
    };

    const parseLibraryReaderTarget = (
        rawUrl?: string,
        metadata?: Record<string, unknown> | null,
        title?: string,
    ): InternalNavigationTarget | null => {
        const record = getMetadataRecord(metadata);
        let bookCode = getMetadataString(record, 'bookCode');
        let chapter = getMetadataNumber(record, 'chapter');
        let verse = getMetadataString(record, 'verse') || undefined;
        let canto = getMetadataNumber(record, 'canto');

        const trimmedUrl = String(rawUrl || '').trim();
        if (trimmedUrl.startsWith('/library/books/')) {
            const pathCode = trimmedUrl.replace('/library/books/', '').split(/[?#/]/)[0]?.trim();
            if (pathCode) {
                bookCode = bookCode || pathCode;
            }
        }
        if (trimmedUrl === '/library' || trimmedUrl === '/library/books') {
            return {
                screen: 'LibraryHome',
                params: undefined,
            };
        }
        if (trimmedUrl.startsWith('/library/verses')) {
            try {
                const parsedUrl = new URL(trimmedUrl, 'https://vedamatch.local');
                bookCode = bookCode || parsedUrl.searchParams.get('bookCode')?.trim() || '';
                const chapterParam = parsedUrl.searchParams.get('chapter');
                const verseParam = parsedUrl.searchParams.get('verse');
                const cantoParam = parsedUrl.searchParams.get('canto');
                if (!chapter && chapterParam) {
                    const parsedChapter = Number(chapterParam);
                    if (Number.isFinite(parsedChapter) && parsedChapter > 0) {
                        chapter = parsedChapter;
                    }
                }
                if (!verse && verseParam?.trim()) {
                    verse = verseParam.trim();
                }
                if ((canto === undefined || canto === null) && cantoParam) {
                    const parsedCanto = Number(cantoParam);
                    if (Number.isFinite(parsedCanto) && parsedCanto >= 0) {
                        canto = parsedCanto;
                    }
                }
            } catch (error) {
                console.warn('Failed to parse internal library URL:', error);
            }
        }

        if (!bookCode) {
            return null;
        }

        return {
            screen: 'Reader',
            params: {
                bookCode,
                title: String(title || bookCode.toUpperCase()).trim(),
                ...(typeof chapter === 'number' && chapter > 0 ? { chapter } : {}),
                ...(verse ? { verse } : {}),
                ...(typeof canto === 'number' && canto >= 0 ? { canto } : {}),
            },
        };
    };

    const parseInternalAppRoute = (
        rawUrl?: string,
        metadata?: Record<string, unknown> | null,
        title?: string,
    ): InternalNavigationTarget | null => {
        const libraryTarget = parseLibraryReaderTarget(rawUrl, metadata, title);
        if (libraryTarget) {
            return libraryTarget;
        }

        const trimmedUrl = String(rawUrl || '').trim();
        if (!trimmedUrl.startsWith('/')) {
            return null;
        }

        try {
            const parsedUrl = new URL(trimmedUrl, 'https://vedamatch.local');
            const path = parsedUrl.pathname.replace(/\/+$/, '');
            let match = path.match(/^\/library\/categories\/([^/]+)$/);
            if (match) {
                const category = decodeURIComponent(match[1]);
                return {
                    screen: 'BookList',
                    params: {
                        category,
                        title: String(title || category).trim(),
                    },
                };
            }
            match = path.match(/^\/products\/(\d+)$/);
            if (match) {
                return { screen: 'ProductDetails', params: { productId: Number(match[1]) } };
            }
            match = path.match(/^\/shops\/(\d+)$/);
            if (match) {
                return { screen: 'ShopDetails', params: { shopId: Number(match[1]) } };
            }
            match = path.match(/^\/services\/(\d+)(?:\/tariffs|\/schedule)?$/);
            if (match) {
                return { screen: 'ServiceDetail', params: { serviceId: Number(match[1]) } };
            }
            match = path.match(/^\/news\/(\d+)$/);
            if (match) {
                return { screen: 'NewsDetail', params: { newsId: Number(match[1]) } };
            }
            match = path.match(/^\/ads\/(\d+)$/);
            if (match) {
                return { screen: 'AdDetail', params: { adId: Number(match[1]) } };
            }
            match = path.match(/^\/education\/courses\/(\d+)$/);
            if (match) {
                return { screen: 'CourseDetails', params: { courseId: Number(match[1]) } };
            }
            match = path.match(/^\/yatra\/(\d+)$/);
            if (match) {
                return { screen: 'YatraDetail', params: { yatraId: Number(match[1]) } };
            }
            match = path.match(/^\/shelter\/(\d+)$/);
            if (match) {
                return { screen: 'ShelterDetail', params: { shelterId: Number(match[1]) } };
            }
            match = path.match(/^\/cafes\/(\d+)\/dishes\/(\d+)$/);
            if (match) {
                return { screen: 'DishDetail', params: { cafeId: Number(match[1]), dishId: Number(match[2]) } };
            }
            match = path.match(/^\/cafes\/(\d+)$/);
            if (match) {
                return { screen: 'CafeDetail', params: { cafeId: Number(match[1]) } };
            }
            match = path.match(/^\/dating\/profile\/(\d+)$/);
            if (match) {
                return { screen: 'ContactProfile', params: { userId: Number(match[1]) } };
            }
        } catch (error) {
            console.warn('Failed to parse internal app URL:', error);
        }

        return null;
    };

    const openInternalSource = (
        rawUrl?: string,
        metadata?: Record<string, unknown> | null,
        title?: string,
    ): boolean => {
        const navigationTarget = parseInternalAppRoute(rawUrl, metadata, title);
        if (navigationTarget) {
            (navigation as any).navigate(
                navigationTarget.screen,
                withAiNavigationMeta(
                    (navigationTarget.params || undefined) as Record<string, unknown> | undefined,
                    'chat',
                ),
            );
            return true;
        }
        return false;
    };

    const normalizeExternalUrl = (rawUrl?: string): string | null => {
        const trimmed = String(rawUrl || '').trim();
        if (!trimmed) {
            return null;
        }
        if (trimmed.startsWith('/')) {
            return null;
        }
        if (/^https?:\/\//i.test(trimmed)) {
            return trimmed;
        }
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
            return trimmed;
        }
        if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) {
            return `https://${trimmed}`;
        }
        return null;
    };

    const openSourceUrl = async (
        rawUrl?: string,
        metadata?: Record<string, unknown> | null,
        title?: string,
    ) => {
        if (openInternalSource(rawUrl, metadata, title)) {
            return;
        }

        const normalizedUrl = normalizeExternalUrl(rawUrl);
        if (!normalizedUrl) {
            Alert.alert(t('error'), t('chat.sourceDetailsUnavailable'));
            return;
        }

        try {
            const supported = await Linking.canOpenURL(normalizedUrl);
            if (!supported) {
                Alert.alert(t('error'), t('chat.sourceDetailsUnavailable'));
                return;
            }

            InteractionManager.runAfterInteractions(() => {
                Linking.openURL(normalizedUrl).catch((error) => {
                    console.warn('Failed to open source URL:', error);
                    Alert.alert(t('error'), t('chat.sourceDetailsUnavailable'));
                });
            });
        } catch (error) {
            console.warn('Failed to validate source URL:', error);
            Alert.alert(t('error'), t('chat.sourceDetailsUnavailable'));
        }
    };

    const handleSourcePress = async (source: AssistantSource) => {
        try {
            const details = await ragService.getSourceById(source.id);
            const previewText = (details.content || source.snippet || '').trim();
            const shortPreview = previewText.length > 700 ? `${previewText.slice(0, 700)}...` : previewText;
            const header = source.domain
                ? t('chat.sourceDomain', { domain: source.domain })
                : '';
            const alertBody = [header, shortPreview].filter(Boolean).join('\n\n') || t('chat.sourceDetailsUnavailable');

            const buttons: AlertButton[] = [
                {
                    text: t('common.close'),
                    style: 'cancel' as const,
                },
            ];

            if (details.sourceUrl) {
                buttons.unshift({
                    text: t('chat.openSource'),
                    onPress: () => {
                        void openSourceUrl(details.sourceUrl, details.metadata, details.title || source.title);
                    },
                });
            }

            Alert.alert(details.title || source.title || t('chat.sourceTitle'), alertBody, buttons);
        } catch (error) {
            console.warn('Failed to load source details:', error);
            if (source.sourceUrl) {
                void openSourceUrl(source.sourceUrl, source.metadata, source.title);
                return;
            }

            const fallbackText = source.snippet || t('chat.sourceDetailsUnavailable');
            Alert.alert(source.title || t('chat.sourceTitle'), fallbackText);
        }
    };

    const mdRules = {
        // react-native-markdown-display expects render callbacks in the rules map.
        // eslint-disable-next-line react/no-unstable-nested-components
        image: (node: any) => {
            const imageUrl = node.attributes?.src || '';
            const altText = node.attributes?.alt || messageListCopy.image;
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
            const resolved = getMediaUrl(content) || mediaService.getDownloadUrl(content);
            return applyAudioHostFallback(resolved);
        }

        if (
            textValue.startsWith('http://') ||
            textValue.startsWith('https://') ||
            textValue.startsWith('file://') ||
            textValue.startsWith('/uploads/')
        ) {
            const resolved = getMediaUrl(textValue) || mediaService.getDownloadUrl(textValue);
            return applyAudioHostFallback(resolved);
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
            <View key={key} style={WEB_AUDIO_CONTAINER_STYLE}>
                <WebView
                    originWhitelist={['*']}
                    source={{ html }}
                    style={WEB_AUDIO_VIEW_STYLE}
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
            Alert.alert(t('error'), messageListCopy.transcribeUnavailable);
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
                Alert.alert(
                    messageListCopy.transcribeReadyTitle,
                    messageListCopy.charged.replace('{{count}}', String(chargedLkm))
                );
            }
        } catch (error) {
            const status = (error as AxiosError)?.response?.status;
            if (status === 402) {
                Alert.alert(t('error'), messageListCopy.insufficientLkm);
            } else if (status === 404 || status === 405) {
                Alert.alert(t('error'), messageListCopy.transcribeUnavailable);
            } else if (status === 502) {
                Alert.alert(t('error'), messageListCopy.transcribeFailed);
            } else {
                console.warn('Failed to transcribe message', error);
                Alert.alert(t('error'), messageListCopy.transcribeFailed);
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
                messageListCopy.transcribeAudioTitle,
                messageListCopy.transcribeAudioBody
                    .replace('{{charged}}', String(chargedLkm))
                    .replace('{{remaining}}', String(billing.weeklyQuotaRemaining))
                    .replace('{{total}}', String(billing.weeklyQuotaTotal)),
                [
                    { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
                    { text: messageListCopy.continue, onPress: () => resolve(true) },
                ],
                { cancelable: true, onDismiss: () => resolve(false) }
            );
        });
    };

    const renderMessage = ({ item: rawItem }: { item: any }) => {
        if (rawItem.type === 'header') {
            return (
                <View style={styles.dateHeader}>
                    <View style={[styles.dateLine, isImageBg ? DATE_LINE_IMAGE_BG_STYLE : { backgroundColor: theme.borderColor }]} />
                    <Text style={[styles.dateText, { color: theme.subText }]}>{rawItem.title}</Text>
                    <View style={[styles.dateLine, isImageBg ? DATE_LINE_IMAGE_BG_STYLE : { backgroundColor: theme.borderColor }]} />
                </View>
            );
        }

        const item = rawItem as Message;
        const isUser = item.sender === 'user';
        const isOtherUser = item.sender === 'other';
        const text = item.text || '';
        const audioUrl = resolveAudioUrl(item);
        const time = formatMessageTime(item.createdAt);
        const statusLabel = isUser ? formatMessageStatus(item.status) : '';
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
            {
                borderRadius: bubblePreset.outerRadius,
                minWidth: bubblePreset.minWidth,
                paddingVertical: bubblePreset.padY,
                paddingHorizontal: bubblePreset.padX,
                borderTopLeftRadius: bubblePreset.outerRadius,
                borderTopRightRadius: bubblePreset.outerRadius,
                borderBottomLeftRadius: isUser ? bubblePreset.outerRadius : bubblePreset.cornerRadius,
                borderBottomRightRadius: isUser ? bubblePreset.cornerRadius : bubblePreset.outerRadius,
            },
            {
                backgroundColor: 'transparent',
                borderColor: isUser
                    ? (isImageBg ? 'rgba(255,255,255,0.28)' : 'rgba(146, 98, 52, 0.82)')
                    : theme.borderColor,
                borderWidth: isUser ? 1.1 : 1,
                overflow: 'hidden' as const,
            }
        ];

        const bubbleShellStyle = [
            styles.bubbleShell,
            {
                borderRadius: bubblePreset.outerRadius,
                borderTopLeftRadius: bubblePreset.outerRadius,
                borderTopRightRadius: bubblePreset.outerRadius,
                borderBottomLeftRadius: isUser ? bubblePreset.outerRadius : bubblePreset.cornerRadius,
                borderBottomRightRadius: isUser ? bubblePreset.cornerRadius : bubblePreset.outerRadius,
            },
        ];
        const bubbleShadowStyle = isUser ? styles.userGlassShadow : styles.botGlassShadow;
        const glassTint = isUser
            ? (isImageBg ? 'rgba(15,23,42,0.44)' : (isLightChatBackground ? 'rgba(31,41,55,0.56)' : colors.accentSoft))
            : (isImageBg ? 'rgba(255,255,255,0.09)' : (isLightChatBackground ? 'rgba(255,252,247,0.96)' : (isDarkMode ? 'rgba(15,23,42,0.3)' : 'rgba(255,250,243,0.72)')));
        const innerStrokeColor = isUser
            ? (isImageBg ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.14)')
            : (isImageBg ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.45)');
        const edgeShadeColor = isUser
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.04)';
        const showEdgeShade = isImageBg || !isLightChatBackground;

        const innerContent = item.uploading ? (
            <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.uploadingText, { color: bubbleTextColor }]}>{t('chat.uploading')}</Text>
            </View>
        ) : (
                <>
                    {item.type === 'image' && item.content ? (
                        <TouchableOpacity onPress={() => openImage(item.content!)}>
                            <Image source={{ uri: item.content }} style={styles.messageImage} />
                        </TouchableOpacity>
                    ) : isVideoCircle && item.content ? (
                        <TouchableOpacity
                            style={[styles.videoCircleCard, { borderColor: theme.borderColor, backgroundColor: documentCardBg }]}
                            onPress={() => Linking.openURL(mediaService.getDownloadUrl(item.content || '')).catch(() => {
                                Alert.alert(t('error'), messageListCopy.openVideoFailed);
                            })}
                        >
                            <View style={[styles.videoCircleIconWrap, { backgroundColor: documentIconBg }]}>
                                <PlayCircle size={26} color={theme.primary} />
                            </View>
                            <View style={styles.videoCircleTextWrap}>
                                <Text style={[styles.videoCircleTitle, { color: bubbleTextColor }]}>
                                    {isVideoCircleExpired ? messageListCopy.videoDeleted : messageListCopy.videoCircle}
                                </Text>
                                <Text style={[styles.videoCircleSubTitle, { color: bubbleSubTextColor }]}>
                                    {isVideoCircleExpired
                                        ? messageListCopy.mediaExpired
                                        : messageListCopy.duration.replace(
                                            '{{value}}',
                                            item.duration ? mediaService.formatDuration(item.duration) : messageListCopy.upTo60
                                        )}
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
                                    {[contactData.city, contactData.country].filter(Boolean).join(', ') || messageListCopy.contact}
                                </Text>
                            </View>
                        </View>
                    ) : audioUrl ? (
                        <View>
                            <AudioPlayer url={audioUrl} duration={item.duration} isDarkMode={isDarkMode} />
                            {transcriptText ? (
                                <View style={[styles.transcriptBox, { borderColor: theme.borderColor }]}>
                                    <Text style={[styles.transcriptLabel, { color: bubbleSubTextColor }]}>{messageListCopy.transcript}</Text>
                                    <Text style={[styles.transcriptText, { color: bubbleTextColor }]}>{transcriptText}</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[
                                        styles.transcriptButton,
                                        {
                                            borderColor: theme.borderColor,
                                            backgroundColor: isUser
                                                ? 'rgba(255,255,255,0.12)'
                                                : (isImageBg ? 'rgba(255,255,255,0.12)' : colors.surfaceElevated),
                                        }
                                    ]}
                                    onPress={() => handleTranscribeAudio(item)}
                                    disabled={isTranscribing}
                                >
                                    {isTranscribing ? (
                                        <ActivityIndicator size="small" color={theme.primary} />
                                    ) : (
                                        <View style={styles.transcriptButtonContent}>
                                            <View style={[styles.transcriptButtonIconWrap, { backgroundColor: isUser ? 'rgba(255,255,255,0.14)' : colors.accentSoft }]}>
                                                <FileText size={14} color={isUser ? '#F8FAFC' : theme.primary} />
                                            </View>
                                            <Text style={[styles.transcriptButtonText, { color: bubbleTextColor }]}>{messageListCopy.transcribeShort}</Text>
                                        </View>
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
                                        {item.fileSize ? mediaService.formatFileSize(item.fileSize) : messageListCopy.file}
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
                                        <Text style={[styles.timeText, styles.embeddedTime, { color: bubbleSubTextColor }]}>
                                            {time}{statusLabel ? ` ${statusLabel}` : ''}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {!text && !item.uploading && (
                        <View style={styles.timeOverlay}>
                            <Text style={[styles.timeText, { color: bubbleSubTextColor }]}>
                                {time}{statusLabel ? ` ${statusLabel}` : ''}
                            </Text>
                        </View>
                    )}

                    {item.navTab && (
                        <TouchableOpacity
                            style={[styles.navButton, { backgroundColor: theme.primary }]}
                            onPress={() => onNavigateToTab(item.navTab)}
                        >
                            <Text style={[styles.navButtonText, NAV_BUTTON_TEXT_LIGHT_STYLE]}>{t('chat.goToSection')}</Text>
                        </TouchableOpacity>
                    )}

                    {item.mapData && onNavigateToMap && (
                        <TouchableOpacity
                            style={[styles.mapButton, MAP_BUTTON_BG_STYLE]}
                            onPress={() => onNavigateToMap(item.mapData)}
                        >
                            <MapPin size={16} color="#FFF" />
                            <Text style={[styles.navButtonText, MAP_BUTTON_TEXT_STYLE]}>
                                {t('chat.showOnMap')}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {!isUser && item.assistantContext?.sources?.length ? (
                        <View style={[styles.sourcesContainer, { borderTopColor: theme.borderColor }]}>
                            <Text style={[styles.sourcesTitle, { color: bubbleSubTextColor }]}>
                                {t('chat.sourcesTitle')}
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
                                            {source.title || `${t('chat.sourceTitle')} ${index + 1}`}
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
                <View style={[bubbleShadowStyle, bubbleShellStyle]}>
                    <View style={bubbleStyle}>
                        <View
                            pointerEvents="none"
                            style={[
                                styles.bubbleInnerStroke,
                                {
                                    borderRadius: bubblePreset.outerRadius - 1,
                                    borderTopLeftRadius: bubblePreset.outerRadius - 1,
                                    borderTopRightRadius: bubblePreset.outerRadius - 1,
                                    borderBottomLeftRadius: isUser ? bubblePreset.outerRadius - 1 : bubblePreset.innerCornerRadius,
                                    borderBottomRightRadius: isUser ? bubblePreset.innerCornerRadius : bubblePreset.outerRadius - 1,
                                },
                                { borderColor: innerStrokeColor },
                            ]}
                        />
                        {showEdgeShade ? (
                            <View
                                pointerEvents="none"
                                style={[
                                    styles.bubbleEdgeShade,
                                    {
                                        backgroundColor: edgeShadeColor,
                                        opacity: bubblePreset.edgeShadeOpacity,
                                        borderBottomLeftRadius: isUser ? bubblePreset.outerRadius - 2 : bubblePreset.cornerRadius,
                                        borderBottomRightRadius: isUser ? bubblePreset.cornerRadius : bubblePreset.outerRadius - 2,
                                    },
                                ]}
                            />
                        ) : null}
                        <View
                            style={[
                                styles.bubbleHighlight,
                                isUser
                                    ? { left: bubblePreset.highlightLeft, right: bubblePreset.highlightRight, backgroundColor: 'rgba(255,255,255,0.18)', opacity: 0.5 }
                                    : { left: bubblePreset.highlightLeft, right: bubblePreset.highlightRight, backgroundColor: 'rgba(255,255,255,0.72)', opacity: 0.62 },
                            ]}
                        />
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
            </TouchableOpacity>
        );
    };

    const handleListScroll = ({ nativeEvent }: any) => {
        const layoutHeight = Number(nativeEvent?.layoutMeasurement?.height || 0);
        const offsetY = Number(nativeEvent?.contentOffset?.y || 0);
        const contentHeight = Number(nativeEvent?.contentSize?.height || 0);
        const distanceFromBottom = contentHeight - (offsetY + layoutHeight);
        isUserNearBottomRef.current = distanceFromBottom <= 120;

        if (!hasUserInteractedRef.current) {
            return;
        }

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
        loadOlderMessages().finally(() => {
            loadingOlderGuardRef.current = false;
        });
    };

    const handleContentSizeChange = () => {
        if (messages.length === 0 || isLoadingOlderMessages) {
            return;
        }

        const withinInitialStickWindow = !hasUserInteractedRef.current && Date.now() <= initialStickDeadlineRef.current;
        const shouldAutoStickBottom =
            withinInitialStickWindow ||
            shouldSnapToBottomRef.current ||
            isUserNearBottomRef.current;
        if (!shouldAutoStickBottom) {
            return;
        }

        if (withinInitialStickWindow) {
            startInitialBottomLock();
        }

        shouldSnapToBottomRef.current = false;

        if (autoScrollFrameRef.current !== null) {
            cancelAnimationFrame(autoScrollFrameRef.current);
        }

        autoScrollFrameRef.current = requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
            if (settleScrollTimeoutRef.current) {
                clearTimeout(settleScrollTimeoutRef.current);
            }
            settleScrollTimeoutRef.current = setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
                settleScrollTimeoutRef.current = null;
            }, 180);
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
                    initialNumToRender={12}
                    maxToRenderPerBatch={12}
                    updateCellsBatchingPeriod={50}
                    windowSize={9}
                    removeClippedSubviews={Platform.OS === 'android'}
                    keyboardDismissMode="none"
                    keyboardShouldPersistTaps="always"
                    onScroll={handleListScroll}
                    onScrollBeginDrag={() => {
                        hasUserInteractedRef.current = true;
                        setEnableMaintainVisiblePosition(true);
                        stopInitialBottomLock();
                    }}
                    onContentSizeChange={handleContentSizeChange}
                    scrollEventThrottle={32}
                    maintainVisibleContentPosition={enableMaintainVisiblePosition ? { minIndexForVisible: 1 } : undefined}
                    ListHeaderComponent={
                        isLoadingOlderMessages ? (
                            <View style={styles.historyLoader}>
                                <ActivityIndicator size="small" color={theme.primary} />
                                <Text style={[styles.historyLoaderText, { color: theme.subText }]}>
                                    {t('common.loading') || messageListCopy.loading}
                                </Text>
                            </View>
                        ) : null
                    }
                />
                {isLoading && (
                    <View style={styles.statusBox}>
                        <ActivityIndicator size="small" color={theme.primary} />
                        <Text style={[styles.statusText, { color: theme.subText }]}>{messageListCopy.sending}</Text>
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
    listContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
        paddingTop: 8,
        paddingHorizontal: 14,
        paddingBottom: 18,
    },
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
        maxWidth: '92%',
        overflow: 'hidden',
    },
    bubbleShell: { maxWidth: '92%' },
    userGlassShadow: {
        maxWidth: '92%',
        ...Platform.select({
            ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14 },
            android: { elevation: 4 },
        }),
    },
    botGlassShadow: {
        maxWidth: '92%',
        ...Platform.select({
            ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 14 },
            android: { elevation: 4 },
        }),
    },
    bubbleInnerStroke: {
        position: 'absolute',
        top: 1,
        left: 1,
        right: 1,
        bottom: 1,
        borderWidth: 1,
    },
    bubbleEdgeShade: {
        position: 'absolute',
        bottom: 0,
        height: 14,
        left: 0,
        right: 0,
    },
    bubbleHighlight: {
        position: 'absolute',
        top: 1,
        height: 2,
        borderRadius: 999,
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
        paddingHorizontal: 10,
        minHeight: 36,
        justifyContent: 'center',
    },
    transcriptButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    transcriptButtonIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    transcriptButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    navButton: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
    navButtonText: { fontSize: 13, fontWeight: 'bold' },
    mapButton: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    sourcesContainer: {
        marginTop: 12,
        borderTopWidth: 1,
        paddingTop: 10,
    },
    sourcesTitle: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.9,
    },
    sourceCard: {
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.36)',
    },
    sourceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sourceTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        marginRight: 10,
    },
    sourceSnippet: {
        fontSize: 12,
        lineHeight: 18,
        marginTop: 6,
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
