import React, { createContext, useState, useContext, useRef, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Message } from '../components/chat/ChatConstants';
import { sendMessage, ChatMessage } from '../services/openaiService';
import { useSettings } from './SettingsContext';

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const { t } = useTranslation();
    const { currentModel, currentProvider } = useSettings();
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

    const isFirstRun = useRef(true);

    // Initial load
    useEffect(() => {
        const init = async () => {
            try {
                const savedHistory = await AsyncStorage.getItem('chat_history');
                if (savedHistory) {
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

    // Auto-save messages to current chat or create new one
    useEffect(() => {
        if (isFirstRun.current) return;
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

    const abortControllerRef = useRef<AbortController | null>(null);

    const handleStopRequest = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading) return;

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const userMessageText = inputText.trim();
        const newUserMessage: Message = {
            id: Date.now().toString(),
            text: userMessageText,
            sender: 'user',
        };

        setMessages((prev) => [...prev, newUserMessage]);
        setInputText('');
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
                    content: userMessageText,
                },
            ];

            const response = await sendMessage(messagesForAPI, {
                model: currentModel,
                provider: currentProvider,
                signal: controller.signal,
            });

            const botResponse: Message = {
                id: (Date.now() + 1).toString(),
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
                id: (Date.now() + 1).toString(),
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

    const handleMenuOption = (option: string, onNavigateToPortal: (tab: any) => void) => {
        setShowMenu(false);

        // Extract tab name from key 'settings.tabs.xxx'
        const tab = option.split('.').pop() as any;

        const systemMsg: Message = {
            id: Date.now().toString(),
            text: t(`chat.searchPrompts.${tab}`),
            sender: 'bot',
            navTab: tab,
        };
        // Reset and start new search chat
        setMessages([systemMsg]);
    };

    const handleNewChat = () => {
        setMessages([
            {
                id: Date.now().toString(),
                text: t('chat.welcome'),
                sender: 'bot',
            }
        ]);
        setCurrentChatId(null);
        setShowMenu(false);
    };

    const loadChat = (id: string) => {
        const chat = history.find(h => h.id === id);
        if (chat) {
            setMessages(chat.messages);
            setCurrentChatId(chat.id);
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
            deleteChat
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
