import React, { createContext, useState, useContext, useRef, ReactNode, useEffect } from 'react';
import { Alert } from 'react-native';
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

export interface ChatHistory {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
}

interface ChatContextType {
    messages: Message[];
    inputText: string;
    setInputText: (text: string) => void;
    isLoading: boolean;
    showMenu: boolean;
    setShowMenu: (show: boolean) => void;
    handleSendMessage: () => void;
    handleStopRequest: () => void;
    handleNewChat: () => void;
    handleMenuOption: (option: string, onNavigateToPortal: (tab: any) => void) => void;
    history: ChatHistory[];
    currentChatId: string | null;
    loadChat: (id: string) => void;
    deleteChat: (id: string) => void;
    recipientId: number | null;
    recipientUser: UserContact | null;
    setChatRecipient: (user: UserContact | null) => void;
    isTyping: boolean;
    handleSendMedia: (media: MediaFile) => Promise<void>;
    isUploading: boolean;
    uploadProgress: number;
    isRecording: boolean;
    recordingDuration: number;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    cancelRecording: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const { t } = useTranslation();
    const { currentModel, currentProvider, isAutoMagicEnabled } = useSettings();
    const [inputText, setInputText] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: t('chat.welcome'),
            sender: 'bot',
        },
    ]);
    const [history, setHistory] = useState<ChatHistory[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [recipientId, setRecipientId] = useState<number | null>(null);
    const [recipientUser, setRecipientUser] = useState<UserContact | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const { user: currentUser } = useUser();
    const { addListener } = useWebSocket();
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    const isFirstRun = useRef(true);

    // Initial load
    useEffect(() => {
        const init = async () => {
            try {
                const savedHistory = await AsyncStorage.getItem('chat_history');
                if (savedHistory && savedHistory !== 'undefined' && savedHistory !== 'null') {
                    const parsed = JSON.parse(savedHistory);
                    setHistory(parsed);
                }
            } catch (e) {
                console.error('Failed to load history', e);
            } finally {
                isFirstRun.current = false;
            }
        };
        init();
    }, []);

    // Auto-save messages to current chat or create new one (only for AI chats)
    useEffect(() => {
        if (isFirstRun.current || recipientId) return;
        if (messages.length <= 1 && !currentChatId) return;

        const saveMessages = async () => {
            let updatedHistory = [...history];
            let chatId = currentChatId;

            if (!chatId && messages.length > 1) {
                // Create new session
                chatId = Date.now().toString();
                setCurrentChatId(chatId);
                const firstUserMsg = messages.find(m => m.sender === 'user')?.text || t('chat.history');
                const newChat: ChatHistory = {
                    id: chatId,
                    title: firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? '...' : ''),
                    messages: messages,
                    timestamp: Date.now()
                };
                updatedHistory = [newChat, ...updatedHistory];
            } else if (chatId) {
                // Update existing
                const index = updatedHistory.findIndex(h => h.id === chatId);
                if (index !== -1) {
                    updatedHistory[index] = {
                        ...updatedHistory[index],
                        messages: messages,
                        timestamp: Date.now()
                    };
                    // Move to top
                    const item = updatedHistory.splice(index, 1)[0];
                    updatedHistory.unshift(item);
                }
            }

            setHistory(updatedHistory);
            try {
                await AsyncStorage.setItem('chat_history', JSON.stringify(updatedHistory));
            } catch (e) {
                console.error('Failed to save history', e);
            }
        };

        const timer = setTimeout(saveMessages, 1000);
        return () => clearTimeout(timer);
    }, [messages]);

    // Load P2P messages when recipient changes
    useEffect(() => {
        if (recipientId && currentUser?.ID) {
            const loadP2PMessages = async () => {
                try {
                    setIsLoading(true);
                    const currentRecipientId = recipientId;
                    const currentUserId = currentUser?.ID;
                    if (!currentRecipientId || !currentUserId) return;
                    const p2pMessages = await messageService.getMessages(currentUserId, currentRecipientId);
                    const formattedMessages: Message[] = p2pMessages.map(m => ({
                        id: m.id?.toString() || m.ID?.toString(),
                        text: m.content,
                        sender: m.senderId === currentUser.ID ? 'user' : 'other' as any,
                        type: m.type || 'text',
                        content: m.content,
                        fileName: m.fileName,
                        fileSize: m.fileSize,
                        duration: m.duration,
                        createdAt: m.createdAt || m.CreatedAt
                    }));
                    setMessages(formattedMessages);
                } catch (e: any) {
                    console.error('Failed to load P2P messages', e);
                    Alert.alert('Error loading messages', e.message || 'Unknown network error');
                } finally {
                    setIsLoading(false);
                }
            };
            loadP2PMessages();
        }
    }, [recipientId, currentUser?.ID]);

    // WebSocket Listener for real-time messages
    useEffect(() => {
        const removeListener = addListener((msg: any) => {
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

            // Check if it's a P2P message for the current chat or an AI message
            const isTargetedToMe = msg.recipientId === currentUser?.ID;
            const isFromCurrentRecipient = msg.senderId === recipientId;
            const isMyOwnMessage = msg.senderId === currentUser?.ID; // For sync across devices
            const isAiMessage = msg.senderId === 0 && !msg.roomId && !recipientId; // AI message for non-P2P chat

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
                    text: msg.content || '',
                    sender: senderType as any,
                    type: msg.type || 'text',
                    content: msg.content || '',
                    fileName: msg.fileName,
                    fileSize: msg.fileSize,
                    duration: msg.duration,
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
    }, [recipientId, currentUser?.ID]);

    const setChatRecipient = (user: UserContact | null) => {
        if (!user) {
            setRecipientId(null);
            setRecipientUser(null);
            handleNewChat();
            return;
        }
        setRecipientId(user.ID);
        setRecipientUser(user);
        setCurrentChatId(null); // Clear AI chat context
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
        setIsLoading(true);

        try {
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
            setMessages((prev) => [...prev, botResponse]);
        } catch (error: any) {
            if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                console.log(t('chat.aborted'));
                return;
            }

            const errorMessage: Message = {
                id: `error_${Date.now()}`,
                text: `${t('common.error')}: ${error.message || t('chat.errorFetch')}`,
                sender: 'bot',
            };
            setMessages((prev) => [...prev, errorMessage]);
            console.error('Ошибка при отправке сообщения:', error);
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleSendP2PMessage = async (text: string) => {
        if (!recipientId || !currentUser?.ID) return;

        try {
            setIsLoading(true);
            const savedMsg = await messageService.sendMessage(currentUser.ID, recipientId, text);
            // No need to manually add to state anymore, WS will handle it
            // This ensures consistency and sync across devices
            setInputText('');
        } catch (error) {
            console.error('Failed to send P2P message', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading) return;

        // Check if AI prompt or P2P
        if (inputText.startsWith('/') || !recipientId) {
            const textToBot = inputText.startsWith('/') ? inputText.substring(1).trim() : inputText.trim();
            if (!textToBot) return;

            // Add user message to UI
            const newUserMessage: Message = {
                id: `user_${Date.now()}`,
                text: inputText.trim(),
                sender: 'user',
            };
            setMessages((prev) => [...prev, newUserMessage]);
            setInputText('');

            await handleSendToAI(textToBot);
        } else {
            // P2P Mode
            await handleSendP2PMessage(inputText.trim());
        }
    };

    const handleMenuOption = (option: string, onNavigateToPortal: (tab: any) => void) => {
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
        const tab = option.split('.').pop() as any;

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
    };

    const handleNewChat = () => {
        setMessages([
            {
                id: `welcome_${Date.now()}`,
                text: t('chat.welcome'),
                sender: 'bot',
            }
        ]);
        setCurrentChatId(null);
        setRecipientId(null);
        setRecipientUser(null);
        setShowMenu(false);
    };

    const loadChat = (id: string) => {
        const chat = history.find(h => h.id === id);
        if (chat) {
            setMessages(chat.messages);
            setCurrentChatId(chat.id);
            setRecipientId(null);
            setRecipientUser(null);
        }
    };

    const deleteChat = async (id: string) => {
        const updated = history.filter(h => h.id !== id);
        setHistory(updated);
        if (currentChatId === id) {
            handleNewChat();
        }
        try {
            await AsyncStorage.setItem('chat_history', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to delete history', e);
        }
    };

    const handleSendMedia = async (media: MediaFile) => {
        if (!currentUser?.ID) return;

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
            const savedMessage = await mediaService.uploadMedia(
                media,
                currentUser.ID,
                recipientId || undefined,
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
                duration: savedMessage.duration,
                content: savedMessage.content,
                senderId: savedMessage.senderId,
                recipientId: savedMessage.recipientId,
                createdAt: savedMessage.createdAt || savedMessage.CreatedAt,
            };

            console.log('🔄 Updating message from temp to final:', finalMessage);

            setMessages(prev => {
                const finalId = savedMessage.ID?.toString() || savedMessage.id || tempId;

                console.log('🔍 Current messages count:', prev.length);
                console.log('🔍 Looking for temp message with ID:', tempId);

                // CRITICAL: Check if this message was already added by WebSocket
                const alreadyExists = prev.some(m => (m.id === finalId || m.id === tempId) && m.id !== tempId);

                if (alreadyExists) {
                    console.log('⚠️ Message already added by WebSocket, removing temp');
                    // Just remove the temporary uploading message
                    return prev.filter(m => m.id !== tempId);
                }

                console.log('🔄 Replacing temp message with final message');
                // Otherwise replace temp message with final one
                const updated = prev.map(m =>
                    m.id === tempId ? finalMessage : m
                );
                console.log('✅ Updated messages count:', updated.length);
                return updated;
            });
        } catch (error: any) {
            console.error('Failed to send media:', error);
            setMessages(prev => prev.filter(m => !m.uploading));
            Alert.alert(
                'Ошибка',
                error.message || 'Не удалось отправить файл'
            );
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const startRecording = async () => {
        try {
            await mediaService.startRecording();
            setIsRecording(true);
            setRecordingDuration(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    const stopRecording = async () => {
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        try {
            console.log('🛑 Stopping audio recording, duration:', recordingDuration);
            const finalDuration = recordingDuration;
            const media = await mediaService.stopRecording();
            console.log('📦 Stopped recording, media object:', media);
            media.duration = finalDuration; // Use duration from context timer

            setIsRecording(false);
            setRecordingDuration(0);
            console.log('🚀 Calling handleSendMedia with audio...');
            await handleSendMedia(media);
            console.log('✅ handleSendMedia completed');
        } catch (error) {
            console.error('Failed to stop recording:', error);
            setIsRecording(false);
            setRecordingDuration(0);
        }
    };

    const cancelRecording = async () => {
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        try {
            await mediaService.stopRecording();
        } catch (error) {
            console.error('Failed to cancel recording:', error);
        }

        setIsRecording(false);
        setRecordingDuration(0);
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
            isTyping,
            handleSendMedia,
            isUploading,
            uploadProgress,
            isRecording,
            recordingDuration,
            startRecording,
            stopRecording,
            cancelRecording,
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
