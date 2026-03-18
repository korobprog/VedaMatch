import React, { createContext, useState, useContext, useRef, ReactNode, useEffect, useCallback } from 'react';
import { Alert, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Message } from '../components/chat/ChatConstants';
import { sendMessage, ChatMessage } from '../services/openaiService';
import { useSettings } from './SettingsContext';
import { messageService } from '../services/messageService';
import { UserContact } from '../services/contactService';
import { useUser } from './UserContext';
import { useWebSocket } from './WebSocketContext';
import { mediaService, MediaFile } from '../services/mediaService';
import { ragService } from '../services/ragService';

export interface ChatHistory {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
}

type ChatNavTab = NonNullable<Message['navTab']>;

const CHAT_TAB_TO_RAG_DOMAINS: Record<Exclude<ChatNavTab, 'contacts' | 'chat'>, string[]> = {
    dating: ['dating'],
    shops: ['market'],
    services: ['services'],
    ads: ['ads'],
    news: ['news'],
    knowledge_base: ['library'],
};

const getRequestedRagDomains = (messages: Message[], availableDomains: string[]): string[] | undefined => {
    const activeTab = [...messages].reverse().find((message) => message.navTab)?.navTab;
    if (!activeTab || activeTab === 'contacts' || activeTab === 'chat') {
        return undefined;
    }

    const mappedDomains = CHAT_TAB_TO_RAG_DOMAINS[activeTab];
    if (!mappedDomains?.length) {
        return undefined;
    }

    const availableSet = new Set(availableDomains);
    const selected = mappedDomains.filter((domain) => availableSet.has(domain));
    return selected.length > 0 ? selected : mappedDomains;
};

interface ChatContextType {
    messages: Message[];
    inputText: string;
    setInputText: (text: string) => void;
    isLoading: boolean;
    showMenu: boolean;
    setShowMenu: (show: boolean) => void;
    handleSendMessage: (textOverride?: string) => Promise<boolean>;
    handleStopRequest: () => void;
    handleNewChat: () => void;
    handleMenuOption: (option: string, onNavigateToPortal: (tab: ChatNavTab) => void) => void;
    history: ChatHistory[];
    currentChatId: string | null;
    loadChat: (id: string) => void;
    deleteChat: (id: string) => void;
    recipientId: number | null;
    recipientUser: UserContact | null;
    setChatRecipient: (user: UserContact | null) => void;
    loadOlderMessages: () => Promise<void>;
    hasOlderMessages: boolean;
    isLoadingOlderMessages: boolean;
    isTyping: boolean;
    handleSendMedia: (media: MediaFile) => Promise<void>;
    isUploading: boolean;
    uploadProgress: number;
    isRecording: boolean;
    recordingDuration: number;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    cancelRecording: () => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    deleteChats: (ids: string[]) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);
const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'object' && error !== null && 'message' in error) {
        const msg = (error as { message?: string }).message;
        if (msg) return msg;
    }
    return 'Unknown error';
};

const shouldMaskAssistantError = (message: string): boolean => {
    const normalized = message.toLowerCase();
    return (
        normalized.includes('ai service error') ||
        normalized.includes('api error') ||
        normalized.includes('trace_id') ||
        normalized.includes('unauthorized') ||
        normalized.includes('api key') ||
        normalized.includes('некорректный api ключ') ||
        /status\s*40\d/.test(normalized) ||
        /status\s*50\d/.test(normalized)
    );
};

const getAssistantTechnicalErrorText = (language: string): string => {
    const normalized = String(language || '').toLowerCase();
    if (normalized.startsWith('hi')) {
        return 'तकनीकी त्रुटि हुई है. समस्या के समाधान पर काम चल रहा है. कृपया बाद में फिर प्रयास करें.';
    }
    if (normalized.startsWith('en')) {
        return 'A technical issue occurred. We are already working on a fix. Please try again later.';
    }
    return 'Произошла техническая ошибка. Мы уже работаем над устранением проблемы. Пожалуйста, попробуйте позже.';
};

const normalizeP2PMessage = (m: any, currentUserId: number): Message => ({
    id: (m.id || m.ID || Date.now()).toString(),
    text: m.content || m.text || '',
    sender: (m.senderId === currentUserId ? 'user' : 'other') as 'user' | 'other',
    type: m.type || 'text',
    content: m.content || m.text || '',
    fileName: m.fileName,
    fileSize: m.fileSize,
    mimeType: m.mimeType,
    duration: m.duration,
    mapData: m.mapData || undefined,
    createdAt: m.createdAt || m.CreatedAt,
});

const dedupeMessagesById = (items: Message[]): Message[] => {
    const seen = new Set<string>();
    const deduped: Message[] = [];

    for (const item of items) {
        if (!item?.id || seen.has(item.id)) {
            continue;
        }
        seen.add(item.id);
        deduped.push(item);
    }

    return deduped;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const { t, i18n } = useTranslation();
    const { currentModel, currentProvider, isAutoMagicEnabled, assistantType } = useSettings();
    const [inputText, setInputText] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [history, setHistory] = useState<ChatHistory[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [recipientId, setRecipientId] = useState<number | null>(null);
    const [recipientUser, setRecipientUser] = useState<UserContact | null>(null);
    const [p2pNextBeforeId, setP2PNextBeforeId] = useState<number | null>(null);
    const [hasOlderMessages, setHasOlderMessages] = useState(false);
    const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [ragDomains, setRagDomains] = useState<string[]>([]);
    const { user: currentUser } = useUser();
    const { addListener } = useWebSocket();
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const recordingStartedAtRef = useRef<number | null>(null);
    const historyPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isFirstRun = useRef(true);
    const directChatMediaCopy = React.useMemo(() => {
        const lang = i18n.language?.startsWith('ru') ? 'ru' : i18n.language?.startsWith('hi') ? 'hi' : 'en';
        return {
            ru: {
                title: 'Медиа недоступно',
                body: 'Аудио и другие медиа можно отправлять только в личный чат с пользователем.',
            },
            hi: {
                title: 'मीडिया उपलब्ध नहीं है',
                body: 'ऑडियो और दूसरे मीडिया केवल किसी उपयोगकर्ता के निजी चैट में भेजे जा सकते हैं।',
            },
            en: {
                title: 'Media unavailable',
                body: 'Audio and other media can only be sent inside a direct chat with another user.',
            },
        }[lang];
    }, [i18n.language]);

    const persistChatHistory = useCallback((nextHistory: ChatHistory[]) => {
        if (historyPersistTimeoutRef.current) {
            clearTimeout(historyPersistTimeoutRef.current);
        }

        historyPersistTimeoutRef.current = setTimeout(() => {
            InteractionManager.runAfterInteractions(() => {
                AsyncStorage.setItem('chat_history', JSON.stringify(nextHistory))
                    .catch((e) => console.error('Failed to persist chat history', e));
            });
        }, 120);
    }, []);

    // Initial load
    useEffect(() => {
        let isActive = true;
        const task = InteractionManager.runAfterInteractions(async () => {
            try {
                const savedHistory = await AsyncStorage.getItem('chat_history');
                if (!isActive) return;

                if (savedHistory && savedHistory !== 'undefined' && savedHistory !== 'null') {
                    const parsed = JSON.parse(savedHistory);
                    if (Array.isArray(parsed)) {
                        // Migrate titles from default "History" to first word of first message
                        const migrated = (parsed as ChatHistory[]).map(item => {
                            const defaultTitles = [t('chat.history'), 'История чатов', 'Chat History', 'चैट इतिहास'];
                            if (defaultTitles.includes(item.title) || !item.title) {
                                const firstUserMsg = item.messages.find(m => m.sender === 'user')?.text;
                                if (firstUserMsg) {
                                    const trimmed = firstUserMsg.trim();
                                    const firstWord = trimmed.split(/\s+/)[0];
                                    let newTitle = firstWord;
                                    if (trimmed.length > firstWord.length) {
                                        newTitle += '...';
                                    }
                                    return { ...item, title: newTitle };
                                }
                            }
                            return item;
                        });
                        setHistory(migrated);
                    } else {
                        setHistory([]);
                    }
                }
            } catch (e) {
                console.error('Failed to load history', e);
            } finally {
                if (isActive) {
                    isFirstRun.current = false;
                }
            }
        });

        return () => {
            isActive = false;
            task.cancel();
            isFirstRun.current = false;
            if (historyPersistTimeoutRef.current) {
                clearTimeout(historyPersistTimeoutRef.current);
                historyPersistTimeoutRef.current = null;
            }
        };
    }, [t]);

    useEffect(() => {
        let isMounted = true;

        if (!currentUser?.ID || currentUser.ID === 999999) {
            setRagDomains([]);
            return () => {
                isMounted = false;
            };
        }

        const task = InteractionManager.runAfterInteractions(async () => {
            try {
                const domains = await ragService.getDomains();
                if (!isMounted) return;
                const enabledDomains = domains.filter(d => d.enabled).map(d => d.name);
                setRagDomains(enabledDomains);
            } catch (error) {
                console.warn('[RAG] Failed to load domains:', error);
            }
        });
        return () => {
            isMounted = false;
            task.cancel();
        };
    }, [currentUser?.ID]);

    // Auto-save messages to current chat or create new one (only for AI chats)
    useEffect(() => {
        if (isFirstRun.current || recipientId) return;
        if (messages.length === 0 && !currentChatId) return;

        const saveMessages = async () => {
            let updatedHistory: ChatHistory[] = [];
            setHistory(prevHistory => {
                updatedHistory = [...prevHistory];
                let chatId = currentChatId;

                if (!chatId && messages.length > 0) {
                    // Create new session
                    chatId = Date.now().toString();
                    setCurrentChatId(chatId);
                    const firstUserMsg = messages.find(m => m.sender === 'user')?.text;
                    let displayTitle = t('chat.history');

                    if (firstUserMsg) {
                        const trimmed = firstUserMsg.trim();
                        const firstWord = trimmed.split(/\s+/)[0];
                        displayTitle = firstWord;
                        if (trimmed.length > firstWord.length) {
                            displayTitle += '...';
                        }
                    }

                    const newChat: ChatHistory = {
                        id: chatId,
                        title: displayTitle,
                        messages: messages,
                        timestamp: Date.now()
                    };
                    updatedHistory = [newChat, ...updatedHistory];
                    return updatedHistory;
                }

                if (chatId) {
                    const index = updatedHistory.findIndex(h => h.id === chatId);
                    if (index !== -1) {
                        const existingChat = updatedHistory[index];
                        let updatedTitle = existingChat.title;

                        // Update title if it's still the default one
                        if (!updatedTitle || updatedTitle === t('chat.history')) {
                            const firstUserMsg = messages.find(m => m.sender === 'user')?.text;
                            if (firstUserMsg) {
                                const trimmed = firstUserMsg.trim();
                                const firstWord = trimmed.split(/\s+/)[0];
                                updatedTitle = firstWord;
                                if (trimmed.length > firstWord.length) {
                                    updatedTitle += '...';
                                }
                            }
                        }

                        updatedHistory[index] = {
                            ...existingChat,
                            title: updatedTitle,
                            messages: messages,
                            timestamp: Date.now()
                        };
                        const item = updatedHistory.splice(index, 1)[0];
                        updatedHistory.unshift(item);
                    }
                }

                return updatedHistory;
            });
            persistChatHistory(updatedHistory);
        };

        const timer = setTimeout(saveMessages, 1000);
        return () => clearTimeout(timer);
    }, [messages, currentChatId, recipientId, t, persistChatHistory]);

    // Load P2P messages when recipient changes
    useEffect(() => {
        if (recipientId && currentUser?.ID) {
            let isActive = true;
            let isLoadingTimeout: ReturnType<typeof setTimeout> | null = null;
            
            // Safety timeout: force reset isLoading after 12 seconds
            const scheduleLoadingTimeout = () => {
                if (isLoadingTimeout) clearTimeout(isLoadingTimeout);
                isLoadingTimeout = setTimeout(() => {
                    if (isActive) {
                        console.warn('[ChatContext] Force resetting isLoading after timeout');
                        setIsLoading(false);
                    }
                }, 12000);
            };
            
            const loadP2PMessages = async () => {
                try {
                    setIsLoading(true);
                    scheduleLoadingTimeout();
                    
                    const currentRecipientId = recipientId;
                    const currentUserId = currentUser?.ID;
                    if (!currentRecipientId || !currentUserId) return;

                    const page = await messageService.getMessagesHistory(currentRecipientId, 30);
                    const formattedMessages: Message[] = page.items.map(m => normalizeP2PMessage(m, currentUserId));

                    if (!isActive) return;
                    setMessages(dedupeMessagesById(formattedMessages));
                    setHasOlderMessages(page.hasMore);
                    setP2PNextBeforeId(page.nextBeforeId ?? null);
                } catch (e: unknown) {
                    console.error('Failed to load P2P messages', e);
                    if (isActive) {
                        Alert.alert(t('common.error', 'Error'), getErrorMessage(e));
                    }
                } finally {
                    // Always reset loading state
                    if (isLoadingTimeout) clearTimeout(isLoadingTimeout);
                    setIsLoading(false);
                }
            };
            void loadP2PMessages();

            return () => {
                isActive = false;
                if (isLoadingTimeout) clearTimeout(isLoadingTimeout);
            };
        }

        // Reset state when recipient changes
        setP2PNextBeforeId(null);
        setHasOlderMessages(false);
        setIsLoadingOlderMessages(false);
        setIsLoading(false);
        setIsTyping(false);
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        return;
    }, [recipientId, currentUser?.ID, addListener, t]);

    const loadOlderMessages = async () => {
        const currentUserId = currentUser?.ID;
        if (!recipientId || !currentUserId || isLoadingOlderMessages || !hasOlderMessages) {
            return;
        }

        const beforeId = p2pNextBeforeId;
        if (!beforeId || beforeId <= 0) {
            setHasOlderMessages(false);
            return;
        }

        setIsLoadingOlderMessages(true);
        try {
            const page = await messageService.getMessagesHistory(recipientId, 30, beforeId);
            const olderMessages = page.items.map((m) => normalizeP2PMessage(m, currentUserId));

            setMessages(prev => dedupeMessagesById([...olderMessages, ...prev]));
            setHasOlderMessages(page.hasMore);
            setP2PNextBeforeId(page.nextBeforeId ?? null);
        } catch (error) {
            console.error('Failed to load older messages', error);
        } finally {
            setIsLoadingOlderMessages(false);
        }
    };

    // WebSocket Listener for real-time messages
    useEffect(() => {
        const removeListener = addListener((msg: Record<string, any>) => {
            console.log('📨 WebSocket message received:', msg);

            // Handle typing events
            if (msg.type === 'typing') {
                if (recipientId && msg.senderId === recipientId && msg.recipientId === currentUser?.ID) {
                    if (msg.isTyping) {
                        setIsTyping(true);
                        if (typingTimeoutRef.current) {
                            clearTimeout(typingTimeoutRef.current);
                        }
                        typingTimeoutRef.current = setTimeout(() => {
                            setIsTyping(false);
                        }, 3000);
                    } else {
                        setIsTyping(false);
                    }
                }
                return;
            }

            if (msg.type === 'message_transcription_updated') {
                const eventPayload = msg.mapData || {};
                const targetId = (eventPayload.messageId || msg.messageId)?.toString();
                const transcriptPayload = eventPayload.transcript || msg.transcript;
                if (!targetId || !transcriptPayload) {
                    return;
                }
                setMessages(prev => prev.map(item => {
                    if (item.id !== targetId) {
                        return item;
                    }
                    const nextMap = {
                        ...(item.mapData || {}),
                        transcript: transcriptPayload,
                    };
                    return {
                        ...item,
                        mapData: nextMap,
                    };
                }));
                return;
            }

            // Handle deletion events
            if (msg.type === 'delete_message') {
                const deletedId = msg.messageId?.toString();
                if (deletedId) {
                    setMessages(prev => prev.filter(m => m.id !== deletedId));
                }
                return;
            }

            // Check if it's a P2P message for the current chat or an AI message
            const isTargetedToMe = msg.recipientId === currentUser?.ID;
            const isFromCurrentRecipient = msg.senderId === recipientId;
            const isMyOwnMessage = msg.senderId === currentUser?.ID; // For sync across devices
            let shouldAdd = false;
            let senderType: 'user' | 'bot' | 'other' = 'other';

            if (recipientId) {
                // P2P Mode
                if ((isTargetedToMe && isFromCurrentRecipient) || (isMyOwnMessage && msg.recipientId === recipientId)) {
                    shouldAdd = true;
                    senderType = isMyOwnMessage ? 'user' : 'other';
                }
            } else {
                // AI Mode (Search / Assistant)
                if (msg.senderId === 0 && !msg.roomId) {
                    shouldAdd = true;
                    senderType = 'bot';
                }
            }

            if (shouldAdd) {
                const newMessage: Message = {
                    id: msg.id?.toString() || msg.ID?.toString() || Date.now().toString(),
                    text: msg.content || msg.text || '',
                    sender: senderType,
                    type: msg.type || 'text',
                    content: msg.content || msg.text || '',
                    fileName: msg.fileName,
                    fileSize: msg.fileSize,
                    mimeType: msg.mimeType,
                    duration: msg.duration,
                    mapData: msg.mapData || undefined,
                    createdAt: msg.createdAt || msg.CreatedAt || new Date().toISOString()
                };
                setMessages(prev => {
                    if (prev.find(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
            }
        });

        return () => {
            removeListener();
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [recipientId, currentUser?.ID, addListener]);

    const setChatRecipient = (user: UserContact | null) => {
        if (!user) {
            setRecipientId(null);
            setRecipientUser(null);
            setP2PNextBeforeId(null);
            setHasOlderMessages(false);
            setIsLoadingOlderMessages(false);
            handleNewChat();
            return;
        }
        setRecipientId(user.ID);
        setRecipientUser(user);
        setP2PNextBeforeId(null);
        setHasOlderMessages(false);
        setIsLoadingOlderMessages(false);
        setCurrentChatId(null); // Clear AI chat context
        setMessages([]); // Clear previous messages immediately
    };

    const abortControllerRef = useRef<AbortController | null>(null);

    const handleStopRequest = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
        }
    };

    const handleSendToAI = async (text: string) => {
        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        // Safety timeout: force reset isLoading after 30 seconds for AI
        const aiTimeout = setTimeout(() => {
            console.warn('[ChatContext] AI request timeout, aborting');
            controller.abort();
        }, 30000);
        
        setIsLoading(true);

        try {
            let assistantContext: Message['assistantContext'] | undefined;
            try {
                const requestedDomains = getRequestedRagDomains(messages, ragDomains);
                const hybridResponse = await ragService.queryHybrid({
                    query: text,
                    topK: 5,
                    includePrivate: false,
                    domains: requestedDomains,
                });

                const context = hybridResponse.assistant_context;
                const sourceCandidates = (context?.sources && context.sources.length > 0)
                    ? context.sources
                    : (hybridResponse.results || []);

                assistantContext = {
                    domains: context?.domains || [],
                    sources: sourceCandidates.map((source, index) => ({
                        id: source.id || `source_${index}`,
                        domain: source.domain || 'unknown',
                        sourceType: source.sourceType,
                        sourceId: source.sourceId,
                        title: source.title || `Source ${index + 1}`,
                        snippet: source.snippet || '',
                        sourceUrl: source.sourceUrl,
                        score: source.score,
                        metadata: source.metadata,
                    })),
                    confidence: typeof context?.confidence === 'number' ? context.confidence : 0,
                    language: context?.language,
                    visibilityScope: context?.visibility_scope,
                    retrieverPath: hybridResponse.retriever_path,
                };

                const hasContextData =
                    assistantContext.sources.length > 0 ||
                    Boolean(assistantContext.retrieverPath) ||
                    assistantContext.confidence > 0;
                if (!hasContextData) {
                    assistantContext = undefined;
                }
            } catch (ragError) {
                console.warn('[RAG] Hybrid retrieval failed, fallback to chat-only:', ragError);
            }

            const chatMessages: ChatMessage[] = messages
                .filter((msg) => msg.sender !== 'bot' || msg.id !== '1')
                .map((msg) => ({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text,
                })) as ChatMessage[];

            const messagesForAPI: ChatMessage[] = [
                {
                    role: 'system',
                    content: 'You are a helpful assistant responding in Russian. Answer concisely and to the point.',
                },
                ...chatMessages,
                {
                    role: 'user',
                    content: text,
                },
            ];

            const response = await sendMessage(messagesForAPI, {
                model: isAutoMagicEnabled ? 'auto' : currentModel,
                provider: isAutoMagicEnabled ? undefined : currentProvider,
                signal: controller.signal,
            });

            const botResponse: Message = {
                id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                text: response.content,
                sender: 'bot',
            };
            if (assistantContext) {
                botResponse.assistantContext = assistantContext;
            }
            setMessages((prev) => [...prev, botResponse]);
        } catch (error: unknown) {
            const errorName =
                typeof error === 'object' && error !== null && 'name' in error
                    ? String((error as { name?: string }).name)
                    : '';
            const message = getErrorMessage(error);
            if (errorName === 'AbortError' || message.includes('aborted')) {
                console.log(t('chat.aborted'));
                return;
            }

            const userSafeMessage = shouldMaskAssistantError(message)
                ? getAssistantTechnicalErrorText(i18n.language)
                : (message || t('chat.errorFetch'));

            const errorMessage: Message = {
                id: `error_${Date.now()}`,
                text: `${t('common.error')}: ${userSafeMessage}`,
                sender: 'bot',
            };
            setMessages((prev) => [...prev, errorMessage]);
            // Handled network/provider failures should not trigger RN redbox in dev.
            console.warn('Ошибка при отправке сообщения:', message || 'unknown error');
        } finally {
            clearTimeout(aiTimeout);
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleSendP2PMessage = async (text: string): Promise<boolean> => {
        if (!recipientId || !currentUser?.ID) return false;

        let sendTimeout: ReturnType<typeof setTimeout> | null = null;
        
        // Safety timeout: force reset isLoading after 10 seconds
        const scheduleSendTimeout = () => {
            sendTimeout = setTimeout(() => {
                console.warn('[ChatContext] Force resetting isLoading after send timeout');
                setIsLoading(false);
            }, 10000);
        };

        try {
            setIsLoading(true);
            scheduleSendTimeout();
            
            const savedMsg = await messageService.sendMessage(currentUser.ID, recipientId, text);

            const localMessage: Message = {
                id: savedMsg.id?.toString() || savedMsg.ID?.toString() || `local_${Date.now()}`,
                text: savedMsg.content || text,
                sender: 'user',
                type: savedMsg.type || 'text',
                content: savedMsg.content || text,
                fileName: savedMsg.fileName,
                fileSize: savedMsg.fileSize,
                mimeType: savedMsg.mimeType,
                duration: savedMsg.duration,
                createdAt: savedMsg.createdAt || savedMsg.CreatedAt || new Date().toISOString(),
            };

            // Keep local UX resilient when WS echo is delayed/missing.
            setMessages(prev => {
                if (prev.some(m => m.id === localMessage.id)) {
                    return prev;
                }
                return [...prev, localMessage];
            });

            return Boolean(savedMsg);
        } catch (error) {
            console.error('Failed to send P2P message', error);
            return false;
        } finally {
            if (sendTimeout) clearTimeout(sendTimeout);
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (textOverride?: string): Promise<boolean> => {
        const rawInput = textOverride ?? inputText;
        const trimmedInput = rawInput.trim();
        if (!trimmedInput || isLoading) return false;

        // Check if AI prompt or P2P
        if (rawInput.startsWith('/') || !recipientId) {
            const textToBot = rawInput.startsWith('/') ? rawInput.substring(1).trim() : trimmedInput;
            if (!textToBot) return false;

            // Add user message to UI
            const newUserMessage: Message = {
                id: `user_${Date.now()}`,
                text: trimmedInput,
                sender: 'user',
            };
            setMessages((prev) => [...prev, newUserMessage]);
            setInputText('');

            await handleSendToAI(textToBot);
            return true;
        } else {
            // P2P Mode
            const sent = await handleSendP2PMessage(trimmedInput);
            if (sent) {
                setInputText('');
            }
            return sent;
        }
    };

    const handleMenuOption = (option: string, _onNavigateToPortal: (tab: ChatNavTab) => void) => {
        setShowMenu(false);

        if (option === 'contacts.viewProfile') {
            // Handled by the screen to navigate to ContactProfile
            return;
        }

        // If it's another friend option, do nothing (they are disabled in UI anyway)
        if (option.startsWith('contacts.')) {
            return;
        }

        // Extract tab name from key 'chat.searchTabs.xxx'
        const tabCandidate = option.split('.').pop();
        const allowedTabs: ChatNavTab[] = ['contacts', 'chat', 'dating', 'shops', 'services', 'ads', 'news', 'knowledge_base'];
        if (!tabCandidate || !allowedTabs.includes(tabCandidate as ChatNavTab)) {
            return;
        }
        const tab = tabCandidate as ChatNavTab;

        const systemMsg: Message = {
            id: `sys_${Date.now()}`,
            text: t(`chat.searchPrompts.${tab}`),
            sender: 'bot',
            navTab: tab,
        };
        // Reset and start new search chat
        setMessages([systemMsg]);
        setRecipientId(null);
        setRecipientUser(null);
        setP2PNextBeforeId(null);
        setHasOlderMessages(false);
        setIsLoadingOlderMessages(false);
    };

    const handleNewChat = () => {
        const assistantName = assistantType === 'smiley'
            ? (i18n.language === 'ru' ? 'Колобок дас' : i18n.language === 'hi' ? 'कोलोबोक दास' : 'Kolobok das')
            : (i18n.language === 'ru' ? 'Перо дас' : i18n.language === 'hi' ? 'पेरो दास' : 'Pero das');
        const welcomeMessages: Message[] = [{
            id: `welcome_${Date.now()}`,
            text: `${assistantName}. ${t('chat.welcome')}`,
            sender: 'bot',
        }];
        const chatId = Date.now().toString();
        const newChat: ChatHistory = {
            id: chatId,
            title: t('chat.history'),
            messages: welcomeMessages,
            timestamp: Date.now(),
        };

        setMessages(welcomeMessages);
        setCurrentChatId(chatId);
        setHistory((prevHistory) => {
            const updatedHistory = [newChat, ...prevHistory];
            persistChatHistory(updatedHistory);
            return updatedHistory;
        });
        setRecipientId(null);
        setRecipientUser(null);
        setP2PNextBeforeId(null);
        setHasOlderMessages(false);
        setIsLoadingOlderMessages(false);
        setShowMenu(false);
    };

    const loadChat = (id: string) => {
        const chat = history.find(h => h.id === id);
        if (chat) {
            setMessages(chat.messages);
            setCurrentChatId(chat.id);
            setRecipientId(null);
            setRecipientUser(null);
            setP2PNextBeforeId(null);
            setHasOlderMessages(false);
            setIsLoadingOlderMessages(false);
        }
    };

    const deleteChat = async (id: string) => {
        const updated = history.filter(h => h.id !== id);
        setHistory(updated);
        if (currentChatId === id) {
            // When deleting the active chat, reset UI without re-adding a new history item.
            const assistantName = assistantType === 'smiley'
                ? (i18n.language === 'ru' ? 'Колобок дас' : i18n.language === 'hi' ? 'कोलोबोक दास' : 'Kolobok das')
                : (i18n.language === 'ru' ? 'Перо дас' : i18n.language === 'hi' ? 'पेरो दास' : 'Pero das');
            setMessages([{
                id: `welcome_${Date.now()}`,
                text: `${assistantName}. ${t('chat.welcome')}`,
                sender: 'bot',
            }]);
            setCurrentChatId(null);
            setRecipientId(null);
            setRecipientUser(null);
            setP2PNextBeforeId(null);
            setHasOlderMessages(false);
            setIsLoadingOlderMessages(false);
        }
        persistChatHistory(updated);
    };

    const deleteChats = async (ids: string[]) => {
        const updated = history.filter(h => !ids.includes(h.id));
        setHistory(updated);

        // If current chat is in the deleted list, reset it
        if (currentChatId && ids.includes(currentChatId)) {
            const assistantName = assistantType === 'smiley'
                ? (i18n.language === 'ru' ? 'Колобок дас' : i18n.language === 'hi' ? 'कोलोबोक दास' : 'Kolobok das')
                : (i18n.language === 'ru' ? 'Перо дас' : i18n.language === 'hi' ? 'पेरो दास' : 'Pero das');
            setMessages([{
                id: `welcome_${Date.now()}`,
                text: `${assistantName}. ${t('chat.welcome')}`,
                sender: 'bot',
            }]);
            setCurrentChatId(null);
            setRecipientId(null);
            setRecipientUser(null);
            setP2PNextBeforeId(null);
            setHasOlderMessages(false);
            setIsLoadingOlderMessages(false);
        }

        persistChatHistory(updated);
    };

    const handleSendMedia = async (media: MediaFile) => {
        if (!currentUser?.ID) return;
        const currentUserId = currentUser.ID;
        const targetRecipientId = recipientId || recipientUser?.ID || null;

        if (!targetRecipientId) {
            Alert.alert(directChatMediaCopy.title, directChatMediaCopy.body);
            return;
        }

        try {
            console.log('📤 Starting media upload:', media);

            setIsUploading(true);
            setUploadProgress(0);

            const tempId = Date.now().toString();
            console.log('🆔 Created temp message ID:', tempId);

            const tempMessage: Message = {
                id: tempId,
                text: '',
                sender: 'user',
                type: media.type,
                fileName: media.name,
                fileSize: media.size,
                mimeType: media.mimeType,
                duration: media.duration,
                uploading: true,
                content: media.uri,
            };

            console.log('➕ Adding temp message to state:', tempMessage);
            setMessages(prev => {
                const newMessages = [...prev, tempMessage];
                console.log('📨 Messages after adding temp:', newMessages.length);
                return newMessages;
            });

            console.log('🌐 Uploading media to server...');
            const savedMessage = media.type === 'video_circle'
                ? await mediaService.uploadVideoCircle(
                    media,
                    targetRecipientId,
                    undefined
                )
                : await mediaService.uploadMedia(
                    media,
                    currentUserId,
                    targetRecipientId,
                    undefined
                );

            console.log('✅ Server response:', savedMessage);

            const finalMessage: Message = {
                id: savedMessage.id?.toString() || savedMessage.ID?.toString() || tempId,
                text: savedMessage.content || '',
                sender: 'user',
                type: savedMessage.type || media.type,
                fileName: savedMessage.fileName,
                fileSize: savedMessage.fileSize,
                mimeType: savedMessage.mimeType || media.mimeType,
                duration: savedMessage.duration,
                content: savedMessage.content,
                senderId: savedMessage.senderId,
                recipientId: savedMessage.recipientId,
                mapData: savedMessage.mapData || undefined,
                createdAt: savedMessage.CreatedAt,
            };

            // Preserve duration from local media if server didn't return it
            if ((media.type === 'audio' || media.type === 'video_circle') && !finalMessage.duration && media.duration) {
                finalMessage.duration = media.duration;
            }

            console.log('🔄 Updating message from temp to final:', finalMessage);

            setMessages(prev => {
                const finalId = (savedMessage.ID?.toString() || savedMessage.id?.toString() || tempId);
                const withoutTemp = prev.filter(m => m.id !== tempId);

                console.log('🔍 Current messages count:', prev.length);
                console.log('🔍 Looking for temp message with ID:', tempId);

                const existingIndex = withoutTemp.findIndex(m => m.id === finalId);
                if (existingIndex >= 0) {
                    console.log('⚠️ Message already exists (likely from WebSocket), normalizing final payload');
                    const updated = [...withoutTemp];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        ...finalMessage,
                        id: finalId,
                        uploading: false,
                    };
                    return updated;
                }

                console.log('➕ Final message not found, appending to list');
                return [...withoutTemp, { ...finalMessage, id: finalId, uploading: false }];
            });

            // Hard sync with backend state to avoid rare UI races where media message
            // is persisted but not rendered in current list due local/WS ordering.
            if (targetRecipientId) {
                try {
                    const refreshedPage = await messageService.getMessagesHistory(targetRecipientId, 30);
                    const refreshedMessages = refreshedPage.items.map((m) => normalizeP2PMessage(m, currentUserId));
                    setMessages(prev => dedupeMessagesById([
                        ...refreshedMessages,
                        ...prev.filter(m => m.uploading),
                    ]));
                    setHasOlderMessages(refreshedPage.hasMore);
                    setP2PNextBeforeId(refreshedPage.nextBeforeId ?? null);
                } catch (syncError) {
                    console.warn('Failed to refresh P2P messages after media upload', syncError);
                }
            }
        } catch (error: unknown) {
            console.error('Failed to send media:', error);
            setMessages(prev => prev.filter(m => !m.uploading));
            Alert.alert(
                t('common.error', 'Error'),
                getErrorMessage(error) || t('chat.sendFileFailed', 'Failed to send file')
            );
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const startRecording = async () => {
        try {
            await mediaService.startRecording();
            recordingStartedAtRef.current = Date.now();
            setIsRecording(true);
            setRecordingDuration(0);
        } catch (error: unknown) {
            console.error('Failed to start recording:', error);
            Alert.alert(
                t('chat.recordingUnavailable', 'Recording unavailable'),
                getErrorMessage(error) || t('chat.startRecordingFailed', 'Failed to start audio recording')
            );
        }
    };

    const stopRecording = async () => {
        try {
            const durationFromTimestamp = recordingStartedAtRef.current
                ? Math.max(1, Math.floor((Date.now() - recordingStartedAtRef.current) / 1000))
                : 0;
            const finalDuration = durationFromTimestamp || recordingDuration;
            console.log('🛑 Stopping audio recording, duration:', finalDuration);
            const media = await mediaService.stopRecording();
            console.log('📦 Stopped recording, media object:', media);
            media.duration = finalDuration; // Use duration from context timer

            setIsRecording(false);
            setRecordingDuration(0);
            recordingStartedAtRef.current = null;
            console.log('🚀 Calling handleSendMedia with audio...');
            await handleSendMedia(media);
            console.log('✅ handleSendMedia completed');
        } catch (error: unknown) {
            console.error('Failed to stop recording:', error);
            setIsRecording(false);
            setRecordingDuration(0);
            recordingStartedAtRef.current = null;
            Alert.alert(
                t('chat.audioError', 'Audio error'),
                getErrorMessage(error) || t('chat.stopRecordingFailed', 'Failed to finish audio recording')
            );
        }
    };

    const cancelRecording = async () => {
        try {
            await mediaService.stopRecording();
        } catch (error) {
            console.error('Failed to cancel recording:', error);
        }

        setIsRecording(false);
        setRecordingDuration(0);
        recordingStartedAtRef.current = null;
    };

    return (
        <ChatContext.Provider value={{
            messages,
            inputText,
            setInputText,
            isLoading,
            showMenu,
            setShowMenu,
            handleSendMessage,
            handleStopRequest,
            handleNewChat,
            handleMenuOption,
            history,
            currentChatId,
            loadChat,
            deleteChat,
            recipientId,
            recipientUser,
            setChatRecipient,
            loadOlderMessages,
            hasOlderMessages,
            isLoadingOlderMessages,
            isTyping,
            handleSendMedia,
            isUploading,
            uploadProgress,
            isRecording,
            recordingDuration,
            startRecording,
            stopRecording,
            cancelRecording,
            deleteMessage: async (messageId: string) => {
                try {
                    console.log(`🗑️ Attempting to delete message: ${messageId}`);
                    // Only try to delete from server if it's a numeric ID (P2P message)
                    const numericId = parseInt(messageId, 10);

                    if (!isNaN(numericId) && recipientId) {
                        console.log(`🌐 Deleting from server via API. ID: ${numericId}`);
                        try {
                            await messageService.deleteMessage(numericId);
                            console.log('✅ Server delete successful');
                        } catch (serverError: unknown) {
                            // If 404, it's already gone, so we can ignore and just remove locally
                            const status =
                                typeof serverError === 'object' && serverError !== null
                                    ? (serverError as { response?: { status?: number } }).response?.status
                                    : undefined;
                            if (status === 404) {
                                console.log('ℹ️ Message not found on server (404), removing locally anyway');
                            } else {
                                // Re-throw other errors to be caught by outer block
                                throw serverError;
                            }
                        }
                    } else {
                        console.log('Local delete only (NaN ID or no recipient)');
                    }

                    // Always remove from local state
                    setMessages(prev => prev.filter(m => m.id !== messageId));
                } catch (error: unknown) {
                    console.error('Failed to delete message', error);
                    Alert.alert(
                        t('common.error', 'Error'),
                        i18n.language === 'ru'
                            ? 'Не удалось удалить сообщение'
                            : i18n.language === 'hi'
                                ? 'संदेश हटाया नहीं जा सका'
                                : 'Could not delete message'
                    );
                }
            },
            deleteChats,
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
