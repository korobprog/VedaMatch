import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Image,
    Linking,
    Alert,
    ScrollView,
    Animated,
    Platform,
    Modal,
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { useWebSocket } from '../../../context/WebSocketContext';
import { InviteFriendModal } from './InviteFriendModal';
import { RoomSettingsModal } from './RoomSettingsModal';
import { AudioPlayer } from '../../../components/chat/AudioPlayer';
import { mediaService } from '../../../services/mediaService';
import { useSettings } from '../../../context/SettingsContext';
import { usePressFeedback } from '../../../hooks/usePressFeedback';
import { Video, ArrowLeft, ArrowRight, UserPlus, Send, ChevronLeft, ChevronRight, Maximize2, Minimize2, Paperclip, SlidersHorizontal } from 'lucide-react-native';
import { RoomVideoBar } from '../../../components/chat/RoomVideoBar';
import { BalancePill } from '../../../components/wallet/BalancePill';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';
import { authorizedFetch } from '../../../services/authSessionService';
import { messageService } from '../../../services/messageService';
import { roomCallService } from '../../../services/roomCallService';
import { roomSupportService, RoomSupportConfig } from '../../../services/roomSupportService';
import { appendLiveMessage, prependHistoryPage } from './roomChatMessageUtils';
import { createRoomChatStyles } from './roomChatStyles';
import { getRoomChatVisualTokens, ROOM_CHAT_DENSITY } from './roomChatVisualTokens';
import peacockAssistant from '../../../assets/peacockAssistant.png';
import krishnaAssistant from '../../../assets/krishnaAssistant.png';
import nanoBanano from '../../../assets/nano_banano.png';
import krishnaBg from '../../../assets/krishna_bg.png';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomChat'>;

interface ChatMessage {
    id: string;
    content: string;
    type?: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
    sender: string;
    isMe: boolean;
    time: string;
}

export const RoomChatScreen: React.FC<Props> = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { roomId, roomName, isYatraChat, listenerMode = false, showSupportPrompt = true } = route.params;
    const { t, i18n } = useTranslation();
    const { isDarkMode, assistantType } = useSettings();
    const { user } = useUser();
    const { addListener } = useWebSocket();
    const tokens = useMemo(() => getRoomChatVisualTokens(isDarkMode), [isDarkMode]);
    const styles = useMemo(() => createRoomChatStyles(tokens, ROOM_CHAT_DENSITY), [tokens]);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [inviteVisible, setInviteVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [sending, setSending] = useState(false);
    const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);

    const [roomDetails, setRoomDetails] = useState<any>(null);
    const [currentVerse, setCurrentVerse] = useState<any>(null);
    const [chapters, setChapters] = useState<any[]>([]);
    const [versesInChapter, setVersesInChapter] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [readerFontSize, setReaderFontSize] = useState(16);
    const [readerFontBold, setReaderFontBold] = useState(false);
    const [roomSfuEnabled, setRoomSfuEnabled] = useState(false);
    const [supportConfig, setSupportConfig] = useState<RoomSupportConfig | null>(null);
    const [supportPromptVisible, setSupportPromptVisible] = useState(false);
    const [supportChecked, setSupportChecked] = useState(false);
    const [supportAmount, setSupportAmount] = useState(20);
    const [supportAmountInput, setSupportAmountInput] = useState('20');
    const [supportSubmitting, setSupportSubmitting] = useState(false);
    const latestMessagesRequestRef = useRef(0);
    const latestRoomRequestRef = useRef(0);
    const latestChaptersRequestRef = useRef(0);
    const latestVerseRequestRef = useRef(0);
    const latestFontSettingsRequestRef = useRef(0);
    const loadingOlderRef = useRef(false);
    const isMountedRef = useRef(true);
    const triggerTapFeedback = usePressFeedback();
    const safeChapters = Array.isArray(chapters) ? chapters : [];
    const safeVersesInChapter = Array.isArray(versesInChapter) ? versesInChapter : [];

    const panelFade = useRef(new Animated.Value(0)).current;
    const panelTranslateY = useRef(new Animated.Value(10)).current;
    const inputFade = useRef(new Animated.Value(0)).current;
    const inputTranslateY = useRef(new Animated.Value(12)).current;
    const supportPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (roomDetails?.bookCode) {
            Animated.parallel([
                Animated.timing(panelFade, { toValue: 1, duration: 420, useNativeDriver: true }),
                Animated.timing(panelTranslateY, { toValue: 0, duration: 420, useNativeDriver: true })
            ]).start();
        }
    }, [panelFade, panelTranslateY, roomDetails?.bookCode]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(inputFade, { toValue: 1, duration: 260, useNativeDriver: true }),
            Animated.timing(inputTranslateY, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]).start();
    }, [inputFade, inputTranslateY]);

    const toPositiveInt = (value: unknown): number | null => {
        const parsed = Number.parseInt(String(value ?? ''), 10);
        if (!Number.isFinite(parsed) || parsed <= 0) return null;
        return parsed;
    };

    const normalizeBookCode = (value: unknown): string => String(value ?? '').trim().toLowerCase();
    const toQueryString = (params: Record<string, string | undefined>) => Object.entries(params)
        .filter(([, value]) => typeof value === 'string' && value.length > 0)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');

    const getVerseText = useCallback((verse: any) => {
        if (!verse) {
            return {
                primary: '',
                translation: '',
                purport: '',
            };
        }
        return {
            primary: String(verse.devanagari || verse.text_sanskrit || verse.transliteration || '').trim(),
            translation: String(verse.translation || verse.translation_ru || verse.translation_en || verse.text || '').trim(),
            purport: String(verse.purport || '').trim(),
        };
    }, []);

    const fetchVerse = useCallback(async (bookCode: string, chapter: number, verseNum: number, lang: string = 'ru') => {
        const requestId = ++latestVerseRequestRef.current;
        const normalizedBookCode = normalizeBookCode(bookCode);
        if (!normalizedBookCode) {
            if (requestId === latestVerseRequestRef.current && isMountedRef.current) {
                setVersesInChapter([]);
                setCurrentVerse(null);
            }
            return;
        }

        const languagePriority = [lang, 'en', '']
            .map((item) => String(item || '').trim().toLowerCase())
            .filter((item, index, arr) => item === '' || arr.indexOf(item) === index);

        try {
            let selectedVerses: any[] = [];
            for (const language of languagePriority) {
                const query = toQueryString({
                    bookCode: normalizedBookCode,
                    chapter: String(chapter),
                    language: language || undefined,
                });

                const response = await fetch(`${API_PATH}/library/verses?${query}`);
                if (!response.ok) {
                    continue;
                }
                const versesPayload = await response.json();
                const verses = Array.isArray(versesPayload) ? versesPayload : [];
                if (verses.length > 0) {
                    selectedVerses = verses;
                    break;
                }
                if (language === '') {
                    selectedVerses = verses;
                }
            }

            if (requestId === latestVerseRequestRef.current && isMountedRef.current) {
                setVersesInChapter(selectedVerses);
                const verse = selectedVerses.find((v: { verse?: string | number }) => Number.parseInt(String(v.verse ?? ''), 10) === verseNum);
                setCurrentVerse(verse || selectedVerses[0] || null);
            }
        } catch (err) {
            console.error('Error fetching verse', err);
            if (requestId === latestVerseRequestRef.current && isMountedRef.current) {
                setVersesInChapter([]);
                setCurrentVerse(null);
            }
        }
    }, []);

    const fetchChapters = useCallback(async (bookCode: string) => {
        const requestId = ++latestChaptersRequestRef.current;
        const normalizedBookCode = normalizeBookCode(bookCode);
        if (!normalizedBookCode) {
            if (requestId === latestChaptersRequestRef.current && isMountedRef.current) {
                setChapters([]);
            }
            return;
        }
        try {
            const response = await fetch(`${API_PATH}/library/books/${normalizedBookCode}/chapters`);
            if (response.ok) {
                const dataPayload = await response.json();
                const data = Array.isArray(dataPayload) ? dataPayload : [];
                if (requestId === latestChaptersRequestRef.current && isMountedRef.current) {
                    setChapters(data);
                }
            } else if (requestId === latestChaptersRequestRef.current && isMountedRef.current) {
                setChapters([]);
            }
        } catch (err) {
            console.error('Error fetching chapters', err);
            if (requestId === latestChaptersRequestRef.current && isMountedRef.current) {
                setChapters([]);
            }
        }
    }, []);

    const fetchRoomDetails = useCallback(async () => {
        const requestId = ++latestRoomRequestRef.current;
        try {
            const response = await authorizedFetch(`${API_PATH}/rooms/${roomId}`);
            if (response.ok) {
                const currentRoom = await response.json();
                if (requestId !== latestRoomRequestRef.current || !isMountedRef.current) {
                    return;
                }
                setRoomDetails(currentRoom);
                // Fetch chapters if changed
                if (currentRoom.bookCode) {
                    const chapter = toPositiveInt(currentRoom.currentChapter) ?? 1;
                    const verse = toPositiveInt(currentRoom.currentVerse) ?? 1;
                    const normalizedBookCode = normalizeBookCode(currentRoom.bookCode);
                    if (normalizedBookCode) {
                        fetchChapters(normalizedBookCode);
                        fetchVerse(normalizedBookCode, chapter, verse, currentRoom.language || 'ru');
                    } else {
                        setChapters([]);
                        setVersesInChapter([]);
                        setCurrentVerse(null);
                    }
                } else {
                    setChapters([]);
                    setVersesInChapter([]);
                    setCurrentVerse(null);
                }
            }
        } catch (error) {
            console.error('Error fetching room details:', error);
        }
    }, [fetchChapters, fetchVerse, roomId]);

    const fetchRoomSfuAvailability = useCallback(async () => {
        if (!user?.ID) {
            setRoomSfuEnabled(false);
            return;
        }
        try {
            const cfg = await roomCallService.getRoomSfuConfig(roomId);
            setRoomSfuEnabled(Boolean(cfg?.enabled));
        } catch (error) {
            console.error('Error fetching room SFU config:', error);
            setRoomSfuEnabled(false);
        }
    }, [roomId, user?.ID]);

    const handleJoinCallPress = useCallback(() => {
        if (listenerMode) {
            Alert.alert(
                t('chat.listenerMode') || 'Режим слушателя',
                t('chat.listenerVoiceVideoDisabled') || 'Аудио и видео отключены для этого входа'
            );
            return;
        }
        if (!roomSfuEnabled) {
            Alert.alert(
                t('common.error'),
                t('chat.videoUnavailable') || 'Видеосвязь временно недоступна'
            );
            return;
        }
        triggerTapFeedback();
        setIsCallActive(true);
    }, [listenerMode, roomSfuEnabled, t]);

    const fetchFontSettings = useCallback(async () => {
        const requestId = ++latestFontSettingsRequestRef.current;
        try {
            const size = await AsyncStorage.getItem('reader_font_size');
            const bold = await AsyncStorage.getItem('reader_font_bold');
            const expanded = await AsyncStorage.getItem('chat_reader_expanded');

            if (requestId !== latestFontSettingsRequestRef.current || !isMountedRef.current) {
                return;
            }
            if (size) {
                const parsedSize = Number.parseInt(size, 10);
                if (Number.isFinite(parsedSize) && parsedSize >= 12 && parsedSize <= 40) {
                    setReaderFontSize(parsedSize);
                }
            }
            if (bold) setReaderFontBold(bold === 'true');
            if (expanded !== null) setIsExpanded(expanded === 'true');
        } catch (e) {
            console.error('Failed to load font settings', e);
        }
    }, []);

    const handleJumpToVerse = async (chapter: number, verse: number) => {
        if (!roomDetails) return;

        // Optimistic update
        const updatedRoom = { ...roomDetails, currentChapter: chapter, currentVerse: verse };
        setRoomDetails(updatedRoom);
        fetchVerse(roomDetails.bookCode, chapter, verse, roomDetails.language || 'ru');

        try {
            // Also save locally for the user's history
            const lastReadKey = `last_read_${roomDetails.bookCode}_${user?.ID || 'guest'}`;
            await AsyncStorage.setItem(lastReadKey, verse.toString());

            await authorizedFetch(`${API_PATH}/rooms/${roomId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ currentChapter: chapter, currentVerse: verse })
            });
        } catch (error) {
            console.error('Failed to update room reading state', error);
        }
    };

    const formatChatMessage = useCallback((m: any): ChatMessage | null => {
        if (m?.ID == null) return null;
        return {
            id: String(m.ID),
            content: m.content,
            type: m.type || 'text',
            fileName: m.fileName,
            fileSize: m.fileSize,
            duration: m.duration,
            sender: m.senderId === user?.ID
                ? (user?.spiritualName || user?.karmicName || t('common.me'))
                : (m.senderId === 0 ? t('chat.aiAssistant') : m.senderName || t('common.other')),
            isMe: m.senderId === user?.ID,
            time: new Date(m.CreatedAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
        };
    }, [i18n.language, t, user?.ID, user?.karmicName, user?.spiritualName]);

    const fetchMessages = useCallback(async () => {
        const requestId = ++latestMessagesRequestRef.current;
        setLoading(true);
        if (!user?.ID) {
            if (requestId === latestMessagesRequestRef.current) {
                setLoading(false);
                setMessages([]);
                setHasMore(false);
                setNextBeforeId(null);
            }
            return;
        }
        try {
            const history = await messageService.getRoomMessagesHistory(roomId, 30);
            if (requestId === latestMessagesRequestRef.current && isMountedRef.current) {
                const formattedMessages = history.items
                    .map(formatChatMessage)
                    .filter((m): m is ChatMessage => m !== null);
                setMessages(formattedMessages);
                setHasMore(Boolean(history.hasMore));
                setNextBeforeId(history.nextBeforeId ?? null);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            if (requestId === latestMessagesRequestRef.current && isMountedRef.current) {
                setHasMore(false);
                setNextBeforeId(null);
            }
        } finally {
            if (requestId === latestMessagesRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [formatChatMessage, roomId, user?.ID]);

    const loadOlderMessages = useCallback(async () => {
        if (loadingOlderRef.current || loading || !hasMore || !nextBeforeId) {
            return;
        }

        loadingOlderRef.current = true;
        setIsLoadingOlder(true);
        try {
            const history = await messageService.getRoomMessagesHistory(roomId, 30, nextBeforeId);
            if (!isMountedRef.current) return;

            const olderMessages = history.items
                .map(formatChatMessage)
                .filter((m): m is ChatMessage => m !== null);
            setMessages(prev => prependHistoryPage(prev, olderMessages));
            setHasMore(Boolean(history.hasMore));
            setNextBeforeId(history.nextBeforeId ?? null);
        } catch (error) {
            console.error('Error loading older room messages:', error);
        } finally {
            loadingOlderRef.current = false;
            if (isMountedRef.current) {
                setIsLoadingOlder(false);
            }
        }
    }, [formatChatMessage, hasMore, loading, nextBeforeId, roomId]);

    const handleMessagesScroll = useCallback((event: any) => {
        if (!hasMore || loading || isLoadingOlder) return;
        const offsetY = event?.nativeEvent?.contentOffset?.y;
        if (typeof offsetY === 'number' && offsetY <= 48) {
            void loadOlderMessages();
        }
    }, [hasMore, isLoadingOlder, loadOlderMessages, loading]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestMessagesRequestRef.current += 1;
            latestRoomRequestRef.current += 1;
            latestChaptersRequestRef.current += 1;
            latestVerseRequestRef.current += 1;
            latestFontSettingsRequestRef.current += 1;
            loadingOlderRef.current = false;
        };
    }, []);

    useEffect(() => {
        fetchMessages();
        fetchRoomDetails();
        fetchFontSettings();
    }, [fetchFontSettings, fetchMessages, fetchRoomDetails]);

    useEffect(() => {
        fetchRoomSfuAvailability();
    }, [fetchRoomSfuAvailability]);

    useEffect(() => {
        let isCancelled = false;
        if (!showSupportPrompt || !user?.ID) {
            return;
        }

        const maybeShowPrompt = async () => {
            try {
                const cfg = await roomSupportService.getSupportConfig();
                if (isCancelled) return;
                setSupportConfig(cfg);
                const defaultAmount = cfg.defaultAmount > 0 ? cfg.defaultAmount : 20;
                setSupportAmount(defaultAmount);
                setSupportAmountInput(String(defaultAmount));
                if (!cfg.enabled || cfg.projectId <= 0) {
                    return;
                }

                const cooldownKey = `rooms_support_prompt:${user.ID}:${roomId}`;
                const cooldownMs = Math.max(1, cfg.cooldownHours) * 60 * 60 * 1000;
                const lastSeenRaw = await AsyncStorage.getItem(cooldownKey);
                const lastSeen = Number.parseInt(lastSeenRaw || '0', 10);
                if (Number.isFinite(lastSeen) && lastSeen > 0 && (Date.now() - lastSeen) < cooldownMs) {
                    return;
                }

                if (isCancelled) return;
                setSupportChecked(false);
                setSupportPromptVisible(true);
                Animated.sequence([
                    Animated.timing(supportPulse, { toValue: 1.08, duration: 220, useNativeDriver: true }),
                    Animated.timing(supportPulse, { toValue: 1, duration: 220, useNativeDriver: true }),
                    Animated.timing(supportPulse, { toValue: 1.08, duration: 220, useNativeDriver: true }),
                    Animated.timing(supportPulse, { toValue: 1, duration: 220, useNativeDriver: true }),
                ]).start();
            } catch (error) {
                console.error('Error loading room support config:', error);
            }
        };

        void maybeShowPrompt();
        return () => {
            isCancelled = true;
        };
    }, [roomId, showSupportPrompt, supportPulse, user?.ID]);

    useEffect(() => {
        const removeListener = addListener((msg: any) => {
            if (!isMountedRef.current) {
                return;
            }
            // Check if message belongs to this room
            if (String(msg?.roomId) === String(roomId) && msg?.ID != null) {
                const formattedMsg = formatChatMessage(msg);
                if (!formattedMsg) return;
                setMessages(prev => appendLiveMessage(prev, formattedMsg));
            }
        });

        return () => removeListener();
    }, [addListener, formatChatMessage, roomId]);

    useEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    const isYatraChatRoom = isYatraChat || (roomDetails?.yatraId != null);
    const myRole = String(roomDetails?.myRole || '').toLowerCase();
    const canInvite = !isYatraChatRoom && (myRole === 'owner' || myRole === 'admin');
    const canOpenSettings = myRole === 'owner';
    const markSupportPromptCooldown = useCallback(async () => {
        if (!user?.ID) return;
        const key = `rooms_support_prompt:${user.ID}:${roomId}`;
        await AsyncStorage.setItem(key, String(Date.now()));
    }, [roomId, user?.ID]);

    const handleSupportLater = useCallback(async () => {
        await markSupportPromptCooldown();
        setSupportPromptVisible(false);
    }, [markSupportPromptCooldown]);

    const handleSupportDonate = useCallback(async () => {
        if (!supportConfig || !supportChecked || supportSubmitting) return;
        if (supportAmount <= 0) {
            Alert.alert(t('common.error'), 'Введите корректную сумму');
            return;
        }
        setSupportSubmitting(true);
        try {
            await roomSupportService.donateToRooms(
                supportConfig.projectId,
                supportAmount,
                false,
                'Поддержка развития сервиса Комнаты',
                Number(roomId),
            );
            await markSupportPromptCooldown();
            setSupportPromptVisible(false);
            Alert.alert(t('common.success'), t('chat.roomsSupportThanks') || 'Спасибо за поддержку!');
        } catch (error: any) {
            Alert.alert(t('common.error'), error?.message || 'Не удалось выполнить пожертвование');
        } finally {
            if (isMountedRef.current) {
                setSupportSubmitting(false);
            }
        }
    }, [markSupportPromptCooldown, supportAmount, supportChecked, supportConfig, supportSubmitting, t]);

    const changeSupportAmount = useCallback((next: number) => {
        const normalized = Math.max(1, Math.floor(next));
        setSupportAmount(normalized);
        setSupportAmountInput(String(normalized));
    }, []);

    const handleNextVerse = async () => {
        if (!roomDetails || !versesInChapter) return;

        const currentVerse = toPositiveInt(roomDetails.currentVerse);
        if (!currentVerse) return;
        const currentVerseIdx = safeVersesInChapter.findIndex(v => toPositiveInt(v.verse) === currentVerse);
        if (currentVerseIdx !== -1 && currentVerseIdx < safeVersesInChapter.length - 1) {
            // Move to next verse in same chapter
            const nextVerse = toPositiveInt(safeVersesInChapter[currentVerseIdx + 1].verse);
            if (nextVerse) {
                handleJumpToVerse(roomDetails.currentChapter, nextVerse);
            }
        } else {
            // Check if next chapter exists
            const currentChapterIdx = safeChapters.findIndex(ch => ch.chapter === roomDetails.currentChapter);
            if (currentChapterIdx !== -1 && currentChapterIdx < safeChapters.length - 1) {
                // Move to first verse of next chapter
                handleJumpToVerse(safeChapters[currentChapterIdx + 1].chapter, 1);
            }
        }
    };

    const handlePrevVerse = async () => {
        if (!roomDetails || !versesInChapter) return;

        const currentVerse = toPositiveInt(roomDetails.currentVerse);
        if (!currentVerse) return;
        const currentVerseIdx = safeVersesInChapter.findIndex(v => toPositiveInt(v.verse) === currentVerse);
        if (currentVerseIdx > 0) {
            // Move to previous verse in same chapter
            const prevVerse = toPositiveInt(safeVersesInChapter[currentVerseIdx - 1].verse);
            if (prevVerse) {
                handleJumpToVerse(roomDetails.currentChapter, prevVerse);
            }
        } else {
            // Check if previous chapter exists
            const currentChapterIdx = safeChapters.findIndex(ch => ch.chapter === roomDetails.currentChapter);
            if (currentChapterIdx > 0) {
                // Move to last verse of previous chapter - but for simplicity, just first verse
                // Better: fetch previous chapter verses and go to last one, but let's just go to ch start
                handleJumpToVerse(safeChapters[currentChapterIdx - 1].chapter, 1);
            }
        }
    };

    const handleSendMessage = async () => {
        const normalizedText = inputText.trim();
        if (!normalizedText || !user?.ID || sending) return;
        setSending(true);

        const newMessage = {
            senderId: user?.ID,
            roomId: roomId,
            content: normalizedText,
            type: 'text',
        };

        setInputText('');

        try {
            const response = await authorizedFetch(`${API_PATH}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newMessage),
            });

            if (response.ok) {
                // No need to fetchMessages() here anymore, 
                // the WS will send it back to us or we can rely on immediate local update if we want 
                // but for now relying on WS is cleaner for "sync"
            } else if (response.status === 402) {
                // Insufficient LKM balance - show modal to top up
                let errorData: { message?: string } = {};
                try {
                    errorData = await response.json();
                } catch {
                    errorData = {};
                }
                Alert.alert(
                    t('wallet.insufficientBalance') || 'Недостаточно LKM',
                    errorData.message || t('wallet.topUpToChat') || 'Пополните баланс для использования AI Chat',
                    [
                        { text: t('common.cancel') || 'Отмена', style: 'cancel' },
                        {
                            text: t('wallet.goToWallet') || 'Пополнить',
                            onPress: () => navigation.navigate('Wallet'),
                        },
                    ]
                );
                // Restore the input text so user doesn't lose their message
                setInputText((prev) => (prev.trim() ? prev : newMessage.content));
            } else {
                // Restore input on any non-success response to avoid message loss.
                setInputText((prev) => (prev.trim() ? prev : newMessage.content));
                Alert.alert(
                    t('common.error'),
                    t('chat.sendError') || 'Не удалось отправить сообщение'
                );
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setInputText((prev) => (prev.trim() ? prev : newMessage.content));
            Alert.alert(
                t('common.error'),
                t('chat.sendError') || 'Не удалось отправить сообщение'
            );
        } finally {
            if (isMountedRef.current) {
                setSending(false);
            }
        }
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isAudio = item.type === 'audio';
        const isImage = item.type === 'image';
        const isDocument = item.type === 'document';
        const isAI = item.sender === t('chat.aiAssistant');
        const bubbleBg = item.isMe ? tokens.messageMine : tokens.messageOther;
        const bubbleBorder = item.isMe ? tokens.messageMineBorder : tokens.messageOtherBorder;
        const messageColor = tokens.messageText;
        const timeColor = tokens.messageMeta;

        return (
            <View
                style={[
                    styles.messageRow,
                    item.isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
                ]}
            >
                {!item.isMe && (
                    <View style={styles.avatarBox}>
                        {isAI ? (
                            <Image
                                source={assistantType === 'feather2' ? nanoBanano : (assistantType === 'feather' ? peacockAssistant : krishnaAssistant)}
                                style={styles.assistantAvatarIcon as any}
                                resizeMode="contain"
                            />
                        ) : (
                            <Text style={{ fontSize: 16 }}>👤</Text>
                        )}
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    item.isMe ? styles.myBubble : styles.otherBubble,
                    {
                        backgroundColor: bubbleBg,
                        borderColor: bubbleBorder,
                    }
                ]}>
                    {!item.isMe && <Text style={styles.senderName}>{item.sender}</Text>}

                    {isAudio ? (
                        <AudioPlayer url={item.content} duration={item.duration} isDarkMode={isDarkMode} />
                    ) : isImage ? (
                        <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL(item.content)}>
                            <Image source={{ uri: item.content }} style={styles.messageImage as any} />
                        </TouchableOpacity>
                    ) : isDocument ? (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.documentRow}
                            onPress={async () => {
                                try {
                                    const supported = await Linking.canOpenURL(item.content);
                                    if (supported) await Linking.openURL(item.content);
                                } catch (error) {
                                    console.error('Failed to open document URL:', error);
                                }
                            }}
                        >
                            <Paperclip size={20} color={messageColor} style={{ marginRight: 8 }} />
                            <View>
                                <Text style={[styles.messageText, { color: messageColor }]} numberOfLines={1}>{item.fileName || 'Document'}</Text>
                                <Text style={[styles.timeText, { alignSelf: 'flex-start', marginTop: 2 }]}>{mediaService.formatFileSize(item.fileSize ?? 0)}</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <Text style={[styles.messageText, { color: messageColor }]}>{item.content}</Text>
                    )}

                    <Text style={[styles.timeText, { color: timeColor }]}>{item.time}</Text>
                </View>
            </View>
        );
    };

    const verseText = getVerseText(currentVerse);
    const hasReadableVerseContent = Boolean(verseText.primary || verseText.translation || verseText.purport);

    return (
        <View style={[styles.container, { backgroundColor: tokens.canvas }]}>
            {/* Custom Premium Header */}
            <View style={[styles.headerWrapper]} testID="roomchat-header">
                <Image
                    source={nanoBanano}
                    style={[StyleSheet.absoluteFill, { opacity: 0.35 }]}
                    resizeMode="contain"
                />
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType={isDarkMode ? 'dark' : 'light'}
                    blurAmount={16}
                    reducedTransparencyFallbackColor={isDarkMode ? '#0B1120' : '#F2F4F8'}
                />

                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.headerBackButton}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={19} strokeWidth={2.5} color={tokens.headerIcon} />
                </TouchableOpacity>

                <Text style={styles.headerTitleText} numberOfLines={1}>
                    {roomName}
                </Text>

                <View style={[styles.headerRightRow, { minWidth: 44, justifyContent: 'flex-end', marginRight: 10 }]}>
                    {canInvite && (
                        <TouchableOpacity
                            onPress={() => setInviteVisible(true)}
                            style={styles.headerActionButton}
                            activeOpacity={0.7}
                        >
                            <UserPlus size={18} strokeWidth={2.2} color={tokens.headerIcon} />
                        </TouchableOpacity>
                    )}
                    {canOpenSettings && (
                        <TouchableOpacity
                            onPress={() => setSettingsVisible(true)}
                            style={[styles.headerActionButton, { marginLeft: 8 }]}
                            activeOpacity={0.7}
                        >
                            <SlidersHorizontal size={18} strokeWidth={2.2} color={tokens.headerIcon} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <KeyboardAwareContainer style={styles.container} useTopInset={false}>

                {isCallActive && (
                    <RoomVideoBar
                        roomId={roomId}
                        onClose={() => setIsCallActive(false)}
                        blockedByListener={listenerMode}
                    />
                )}

                {listenerMode && (
                    <View style={styles.listenerModeBanner}>
                        <Text style={styles.listenerModeBannerTitle}>{t('chat.listenerMode') || 'Режим слушателя'}</Text>
                        <Text style={styles.listenerModeBannerText}>
                            {t('chat.listenerVoiceVideoDisabled') || 'Аудио и видео отключены, чат доступен'}
                        </Text>
                    </View>
                )}

                {roomDetails?.bookCode ? (
                    <Animated.View style={[
                        styles.readerCardShell,
                        {
                            flex: isExpanded ? 1 : 0,
                            opacity: panelFade,
                            transform: [{ translateY: panelTranslateY }]
                        }
                    ]} testID="roomchat-reader-card">
                        <LinearGradient
                            colors={tokens.gradientTop}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0.65 }}
                        />
                        <View style={styles.readerCardOverlay} />
                        <View style={styles.readingHeader}>
                            <View style={styles.readingHeaderTopRow}>
                                <View style={styles.readingHeaderTextWrap}>
                                    <Text style={styles.bookTitle} numberOfLines={1}>
                                        {roomDetails?.bookCode
                                            ? `📖 ${roomDetails.bookCode.toUpperCase()} ${roomDetails.currentChapter}.${roomDetails.currentVerse}`
                                            : (roomName || t('chat.publicRoom'))}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    onPress={async () => {
                                        triggerTapFeedback();
                                        const newState = !isExpanded;
                                        setIsExpanded(newState);
                                        await AsyncStorage.setItem('chat_reader_expanded', newState.toString());
                                    }}
                                    style={styles.toggleReaderButton}
                                >
                                    {isExpanded ? (
                                        <Minimize2 size={18} color={tokens.accent} />
                                    ) : (
                                        <Maximize2 size={18} color={tokens.accent} />
                                    )}
                                </TouchableOpacity>
                            </View>
                            {!isCallActive && !listenerMode && (
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[styles.joinCallButton, styles.joinCallButtonFullWidth]}
                                    onPress={handleJoinCallPress}
                                >
                                    <Video size={18} color={tokens.accentTextOnPrimary} />
                                    <Text style={styles.joinCallButtonText}>
                                        {roomSfuEnabled ? (t('chat.joinCall')) : (t('chat.videoUnavailable') || 'Видеосвязь недоступна')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {roomDetails?.bookCode && isExpanded && (
                            <View style={styles.navCard}>
                                <View style={styles.navRow}>
                                    <TouchableOpacity onPress={() => handleJumpToVerse(roomDetails.currentChapter - 1, 1)} disabled={roomDetails.currentChapter <= 1} style={styles.navEdgeButton}>
                                        <ChevronLeft size={20} color={roomDetails.currentChapter <= 1 ? tokens.messageMeta : tokens.accent} />
                                    </TouchableOpacity>
                                    <View style={styles.navLabelCell}>
                                        <Text style={styles.navLabelText}>{t('reader.chapter').substring(0, 6).toUpperCase()}</Text>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navScroll}>
                                        {safeChapters.length > 0 ? safeChapters.map((ch) => (
                                            <TouchableOpacity
                                                key={`${ch.canto}-${ch.chapter}`}
                                                style={[styles.navItem, roomDetails.currentChapter === ch.chapter && styles.navItemActive]}
                                                onPress={() => handleJumpToVerse(ch.chapter, 1)}
                                            >
                                                <Text style={[styles.navItemText, { color: roomDetails.currentChapter === ch.chapter ? tokens.accent : tokens.readerSecondaryText }]}>
                                                    {ch.chapter}
                                                </Text>
                                            </TouchableOpacity>
                                        )) : (
                                            <View style={styles.navItem}>
                                                <Text style={[styles.navItemText, { color: tokens.readerSecondaryText }]}>{roomDetails.currentChapter}</Text>
                                            </View>
                                        )}
                                    </ScrollView>
                                    <TouchableOpacity onPress={() => handleJumpToVerse(roomDetails.currentChapter + 1, 1)} disabled={safeChapters.length > 0 ? roomDetails.currentChapter >= safeChapters.length : true} style={styles.navEdgeButton}>
                                        <ChevronRight size={20} color={(safeChapters.length > 0 ? roomDetails.currentChapter >= safeChapters.length : true) ? tokens.messageMeta : tokens.accent} />
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.navRow, styles.navRowDivider]}>
                                    <TouchableOpacity onPress={() => handleJumpToVerse(roomDetails.currentChapter, roomDetails.currentVerse - 1)} disabled={roomDetails.currentVerse <= 1} style={styles.navEdgeButton}>
                                        <ChevronLeft size={20} color={roomDetails.currentVerse <= 1 ? tokens.messageMeta : tokens.accent} />
                                    </TouchableOpacity>
                                    <View style={styles.navLabelCell}>
                                        <Text style={styles.navLabelText}>{t('reader.verse').substring(0, 5).toUpperCase()}</Text>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navScroll}>
                                        {safeVersesInChapter.map((v) => (
                                            (() => {
                                                const verseNumber = toPositiveInt(v.verse);
                                                if (!verseNumber) return null;
                                                return (
                                                    <TouchableOpacity
                                                        key={v.id}
                                                        style={[
                                                            styles.verseNavItem,
                                                            {
                                                                backgroundColor: roomDetails.currentVerse === verseNumber ? tokens.accent : 'transparent',
                                                                borderColor: roomDetails.currentVerse === verseNumber ? tokens.accent : 'transparent'
                                                            }
                                                        ]}
                                                        onPress={() => handleJumpToVerse(roomDetails.currentChapter, verseNumber)}
                                                    >
                                                        <Text style={[styles.verseNavItemText, { color: roomDetails.currentVerse === verseNumber ? tokens.accentTextOnPrimary : tokens.readerSecondaryText }]}>
                                                            {v.verse}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })()
                                        ))}
                                    </ScrollView>
                                    <TouchableOpacity onPress={() => handleJumpToVerse(roomDetails.currentChapter, roomDetails.currentVerse + 1)} disabled={roomDetails.currentVerse >= safeVersesInChapter.length} style={styles.navEdgeButton}>
                                        <ChevronRight size={20} color={roomDetails.currentVerse >= safeVersesInChapter.length ? tokens.messageMeta : tokens.accent} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {hasReadableVerseContent ? (
                            <View style={styles.verseContentWrap}>
                                <ScrollView
                                    style={styles.verseScroll}
                                    showsVerticalScrollIndicator={true}
                                    contentContainerStyle={styles.verseScrollContent}
                                >
                                    <Text style={[
                                        styles.sanskritText,
                                        {
                                            fontSize: readerFontSize * 1.2,
                                            fontWeight: readerFontBold ? 'bold' : 'normal',
                                            lineHeight: (readerFontSize * 1.2) * 1.4
                                        }
                                    ]}>
                                        {verseText.primary || (t('reader.translationOnly') || 'Санскрит недоступен')}
                                    </Text>
                                    <Text style={[
                                        styles.translationText,
                                        {
                                            fontSize: readerFontSize,
                                            fontWeight: readerFontBold ? '600' : 'normal',
                                            lineHeight: readerFontSize * 1.5
                                        }
                                    ]}>
                                        {verseText.translation || (t('reader.translationMissing') || 'Перевод временно недоступен')}
                                    </Text>

                                    {roomDetails?.showPurport && verseText.purport && (
                                        <View style={styles.purportContainer}>
                                            <Text style={styles.purportHeader}>
                                                {t('reader.purport') || 'Purport'}
                                            </Text>
                                            <Text style={[
                                                styles.purportText,
                                                {
                                                    fontSize: readerFontSize * 0.95,
                                                    fontWeight: readerFontBold ? '500' : 'normal',
                                                    lineHeight: (readerFontSize * 0.95) * 1.6
                                                }
                                            ]}>
                                                {verseText.purport}
                                            </Text>
                                        </View>
                                    )}
                                </ScrollView>

                                {isExpanded && (
                                    <View style={styles.readingControls}>
                                        <TouchableOpacity
                                            style={styles.readingControlButton}
                                            onPress={handlePrevVerse}
                                        >
                                            <ArrowLeft size={16} color={tokens.readerSecondaryText} />
                                            <Text style={styles.readingControlText}>{t('reader.prevVerse')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.readingControlButton}
                                            onPress={handleNextVerse}
                                        >
                                            <Text style={[styles.readingControlText, styles.readingControlTextAccent]}>{t('reader.nextVerse')}</Text>
                                            <ArrowRight size={16} color={tokens.accent} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.readerSettingsLinkWrap}>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        setSettingsVisible(true);
                                    }}
                                    style={styles.readerSettingsButton}
                                >
                                    <SlidersHorizontal size={16} color={tokens.accent} strokeWidth={2.2} />
                                    <Text style={styles.readerSettingsButtonText}>
                                        {t('reader.settings')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>
                ) : (
                    <View style={styles.compactHeaderCard} testID="roomchat-compact-header">
                        <LinearGradient
                            colors={tokens.gradientTop}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0.65 }}
                        />
                        <View style={styles.readingHeaderTextWrap}>
                            <Text style={[styles.bookTitle, { color: tokens.readerPrimaryText, marginBottom: 2 }]} numberOfLines={1}>
                                {roomName || t('chat.publicRoom')}
                            </Text>
                            {roomDetails?.description ? (
                                <Text style={{
                                    color: tokens.readerSecondaryText,
                                    fontSize: 13,
                                    lineHeight: 16,
                                    fontFamily: tokens.fontFamily,
                                }} numberOfLines={2}>
                                    {roomDetails.description}
                                </Text>
                            ) : null}
                        </View>
                        {!isCallActive && !listenerMode && (
                            <TouchableOpacity
                                activeOpacity={0.88}
                                style={styles.joinCallButton}
                                onPress={handleJoinCallPress}
                            >
                                <Video size={18} color={tokens.accentTextOnPrimary} />
                                <Text style={styles.joinCallButtonText}>
                                    {roomSfuEnabled ? (t('chat.joinCall')) : (t('chat.videoUnavailable') || 'Видеосвязь недоступна')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {(roomDetails?.bookCode ? !isExpanded : true) && (
                    <View style={styles.messagesContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color={tokens.accent} style={styles.center} />
                        ) : (
                            <FlatList
                                data={messages}
                                keyExtractor={item => item.id}
                                renderItem={renderMessage}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={styles.list}
                                onScroll={handleMessagesScroll}
                                scrollEventThrottle={100}
                                ListHeaderComponent={isLoadingOlder ? (
                                    <View style={{ paddingVertical: 12 }}>
                                        <ActivityIndicator size="small" color={tokens.accent} />
                                    </View>
                                ) : null}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyTitle}>
                                            {t('chat.noHistory')}
                                        </Text>
                                        <Text style={styles.emptySub}>
                                            Начните диалог в этой комнате
                                        </Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                )}

                <Animated.View
                    testID="roomchat-input-bar"
                    style={[
                        styles.inputBarWrapper,
                        {
                            marginBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 10),
                        },
                        {
                            opacity: inputFade,
                            transform: [{ translateY: inputTranslateY }],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={tokens.gradientTop}
                        style={styles.inputGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    />
                    <View style={styles.inputBar}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder={t('chat.placeholder')}
                            placeholderTextColor={tokens.inputPlaceholder}
                            textContentType="none"
                            autoComplete="off"
                            importantForAutofill="no"
                            multiline
                        />
                        <TouchableOpacity
                            testID="roomchat-send-button"
                            activeOpacity={0.88}
                            disabled={!inputText.trim() || sending}
                            onPress={() => {
                                if (!inputText.trim() || sending) return;
                                triggerTapFeedback();
                                handleSendMessage();
                            }}
                            style={[
                                styles.sendButton,
                                {
                                    backgroundColor: inputText.trim() && !sending ? tokens.accent : tokens.accentMuted,
                                    opacity: inputText.trim() && !sending ? 1 : 0.75,
                                }
                            ]}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color={tokens.accentTextOnPrimary} />
                            ) : (
                                <Send size={20} color={tokens.accentTextOnPrimary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAwareContainer>

            <InviteFriendModal
                visible={inviteVisible}
                onClose={() => setInviteVisible(false)}
                roomId={roomId}
            />

            <RoomSettingsModal
                visible={settingsVisible}
                onClose={() => {
                    setSettingsVisible(false);
                    fetchRoomDetails();
                    fetchFontSettings();
                }}
                roomId={roomId}
                roomName={roomName}
            />

            <Modal
                transparent
                animationType="fade"
                visible={supportPromptVisible}
                onRequestClose={() => {
                    void handleSupportLater();
                }}
            >
                <View style={styles.supportOverlay}>
                    <View style={styles.supportCard}>
                        <Animated.Text style={[styles.supportBlink, { transform: [{ scale: supportPulse }] }]}>😉</Animated.Text>
                        <Text style={styles.supportTitle}>{t('chat.roomsSupportTitle') || 'Поддержка Комнат'}</Text>
                        <Text style={styles.supportBenefitText}>{t('chat.roomsSupportBenefit1') || 'Поддержка серверов звонков и стабильности комнат.'}</Text>
                        <Text style={styles.supportBenefitText}>{t('chat.roomsSupportBenefit2') || 'Развитие совместного чтения и новых функций.'}</Text>
                        <Text style={styles.supportBenefitText}>{t('chat.roomsSupportBenefit3') || 'Ваш вклад ускоряет улучшения для всех участников.'}</Text>

                        <View style={styles.supportCheckRow}>
                            <Text style={styles.supportCheckLabel}>{t('chat.roomsSupportCheckbox') || 'Поддержать сейчас'}</Text>
                            <Switch
                                value={supportChecked}
                                onValueChange={setSupportChecked}
                                trackColor={{ false: tokens.inputFieldBorder, true: tokens.accent }}
                            />
                        </View>

                        <View style={styles.supportAmountRow}>
                            <TouchableOpacity
                                onPress={() => changeSupportAmount(supportAmount - 5)}
                                style={styles.supportAmountButton}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.supportAmountButtonText}>-5</Text>
                            </TouchableOpacity>
                            <View style={styles.supportAmountInputWrap}>
                                <TextInput
                                    value={supportAmountInput}
                                    onChangeText={(value) => {
                                        const digits = value.replace(/[^\d]/g, '');
                                        setSupportAmountInput(digits);
                                        if (!digits) {
                                            setSupportAmount(0);
                                            return;
                                        }
                                        const parsed = Number.parseInt(digits, 10);
                                        if (Number.isFinite(parsed)) {
                                            setSupportAmount(parsed);
                                        }
                                    }}
                                    onBlur={() => {
                                        if (!supportAmountInput.trim()) {
                                            changeSupportAmount(20);
                                            return;
                                        }
                                        const parsed = Number.parseInt(supportAmountInput, 10);
                                        if (!Number.isFinite(parsed) || parsed <= 0) {
                                            changeSupportAmount(20);
                                        } else {
                                            changeSupportAmount(parsed);
                                        }
                                    }}
                                    keyboardType="number-pad"
                                    style={styles.supportAmountInput}
                                    placeholder="20"
                                    placeholderTextColor={tokens.inputPlaceholder}
                                    maxLength={5}
                                />
                                <Text style={styles.supportAmountSuffix}>LKM</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => changeSupportAmount(supportAmount + 5)}
                                style={styles.supportAmountButton}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.supportAmountButtonText}>+5</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.supportActions}>
                            <TouchableOpacity
                                style={styles.supportLaterButton}
                                onPress={() => {
                                    void handleSupportLater();
                                }}
                                activeOpacity={0.85}
                                disabled={supportSubmitting}
                            >
                                <Text style={styles.supportLaterButtonText}>{t('chat.roomsSupportLater') || 'Позже'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.supportConfirmButton,
                                    { opacity: supportChecked ? 1 : 0.7 },
                                ]}
                                onPress={() => {
                                    void handleSupportDonate();
                                }}
                                activeOpacity={0.9}
                                disabled={!supportChecked || supportSubmitting}
                            >
                                {supportSubmitting ? (
                                    <ActivityIndicator size="small" color={tokens.accentTextOnPrimary} />
                                ) : (
                                    <Text style={styles.supportConfirmButtonText}>{t('chat.roomsSupportConfirm') || 'Поддержать'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};
