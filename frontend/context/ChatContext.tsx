import React, { createContext, useState, useContext, useRef, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Message } from '../components/chat/ChatConstants';
import { sendMessage, ChatMessage } from '../services/openaiService';
import { useSettings } from './SettingsContext';
import { messageService } from '../services/messageService';
import { UserContact } from '../services/contactService';
import { useUser } from './UserContext';

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
    const [recipientId, setRecipientId] = useState<number | null>(null);
    const [recipientUser, setRecipientUser] = useState<UserContact | null>(null);
    const { user: currentUser } = useUser();

    const isFirstRun = useRef(true);

    // Initial load
    useEffect(() => {
        const init = async () => {
            try {
                const savedHistory = await AsyncStorage.getItem('chat_history');
                if (savedHistory && savedHistory !== 'undefined') {
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
                        id: m.ID.toString(),
                        text: m.content,
                        sender: m.senderId === currentUser.ID ? 'user' : ('other' as any),
                        createdAt: m.CreatedAt
                    }));
                    setMessages(formattedMessages);
                } catch (e) {
                    console.error('Failed to load P2P messages', e);
                } finally {
                    setIsLoading(false);
                }
            };
            loadP2PMessages();
        }
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

    const handleSendP2PMessage = async (text: string) => {
        if (!recipientId || !currentUser?.ID) return;

        try {
            setIsLoading(true);
            const savedMsg = await messageService.sendMessage(currentUser.ID, recipientId, text);
            const newMessage: Message = {
                id: savedMsg.ID.toString(),
                text: savedMsg.content,
                sender: 'user',
                createdAt: savedMsg.CreatedAt
            };
            setMessages((prev) => [...prev, newMessage]);
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
                id: Date.now().toString(),
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
            id: Date.now().toString(),
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
                id: Date.now().toString(),
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
            setChatRecipient
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
