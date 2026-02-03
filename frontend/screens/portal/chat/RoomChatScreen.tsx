import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    useColorScheme,
    Image,
    Linking,
    Alert,
    ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { useWebSocket } from '../../../context/WebSocketContext';
import { InviteFriendModal } from './InviteFriendModal';
import { RoomSettingsModal } from './RoomSettingsModal';
import { AudioPlayer } from '../../../components/chat/AudioPlayer';
import { mediaService } from '../../../services/mediaService';
import { useSettings } from '../../../context/SettingsContext';
import { Video, ArrowLeft, ArrowRight, Settings, UserPlus, Send, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react-native';
import { RoomVideoBar } from '../../../components/chat/RoomVideoBar';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomChat'>;

export const RoomChatScreen: React.FC<Props> = ({ route, navigation }) => {
    const { roomId, roomName, isYatraChat } = route.params;
    const { t, i18n } = useTranslation();
    const { isDarkMode, vTheme } = useSettings();
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { user } = useUser();
    const { addListener } = useWebSocket();

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [inviteVisible, setInviteVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);

    const [roomDetails, setRoomDetails] = useState<any>(null);
    const [currentVerse, setCurrentVerse] = useState<any>(null);
    const [chapters, setChapters] = useState<any[]>([]);
    const [versesInChapter, setVersesInChapter] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [readerFontSize, setReaderFontSize] = useState(16);
    const [readerFontBold, setReaderFontBold] = useState(false);

    const fetchRoomDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_PATH}/rooms/${roomId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const currentRoom = await response.json();
                setRoomDetails(currentRoom);
                // Fetch chapters if changed
                if (currentRoom.bookCode) {
                    fetchChapters(currentRoom.bookCode);
                    fetchVerse(currentRoom.bookCode, currentRoom.currentChapter, currentRoom.currentVerse, currentRoom.language || 'ru');
                }
            }
        } catch (error) {
            console.error('Error fetching room details:', error);
        }
    };

    const fetchVerse = async (bookCode: string, chapter: number, verseNum: number, lang: string = 'ru') => {
        try {
            const response = await fetch(`${API_PATH}/library/verses?bookCode=${bookCode}&chapter=${chapter}&language=${lang}`);
            if (response.ok) {
                const verses = await response.json();
                setVersesInChapter(verses);
                const verse = verses.find((v: any) => parseInt(v.verse) === verseNum);
                setCurrentVerse(verse || verses[0]);
            }
        } catch (err) {
            console.error('Error fetching verse', err);
        }
    }

    const fetchFontSettings = async () => {
        try {
            const size = await AsyncStorage.getItem('reader_font_size');
            const bold = await AsyncStorage.getItem('reader_font_bold');
            const expanded = await AsyncStorage.getItem('chat_reader_expanded');

            if (size) setReaderFontSize(parseInt(size));
            if (bold) setReaderFontBold(bold === 'true');
            if (expanded !== null) setIsExpanded(expanded === 'true');
        } catch (e) {
            console.error('Failed to load font settings', e);
        }
    };

    const fetchChapters = async (bookCode: string) => {
        try {
            const response = await fetch(`${API_PATH}/library/books/${bookCode}/chapters`);
            if (response.ok) {
                const data = await response.json();
                setChapters(data);
            }
        } catch (err) {
            console.error('Error fetching chapters', err);
        }
    }

    const handleJumpToVerse = async (chapter: number, verse: number) => {
        if (!roomDetails) return;

        // Optimistic update
        const updatedRoom = { ...roomDetails, currentChapter: chapter, currentVerse: verse };
        setRoomDetails(updatedRoom);
        fetchVerse(roomDetails.bookCode, chapter, verse, roomDetails.language || 'ru');

        try {
            const token = await AsyncStorage.getItem('token');
            // Also save locally for the user's history
            const lastReadKey = `last_read_${roomDetails.bookCode}_${user?.ID || 'guest'}`;
            await AsyncStorage.setItem(lastReadKey, verse.toString());

            await fetch(`${API_PATH}/rooms/${roomId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentChapter: chapter, currentVerse: verse })
            });
        } catch (error) {
            console.error('Failed to update room reading state', error);
        }
    };

    const fetchMessages = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_PATH}/messages/${user?.ID}/0?roomId=${roomId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const formattedMessages = data.map((m: any) => ({
                    id: m.ID.toString(),
                    content: m.content,
                    type: m.type || 'text',
                    fileName: m.fileName,
                    fileSize: m.fileSize,
                    duration: m.duration,
                    sender: m.senderId === user?.ID ? (user?.spiritualName || user?.karmicName || t('common.me')) : (m.senderId === 0 ? t('chat.aiAssistant') : m.senderName || t('common.other')),
                    isMe: m.senderId === user?.ID,
                    time: new Date(m.CreatedAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
                }));
                setMessages(formattedMessages);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        fetchRoomDetails();
        fetchFontSettings();

        const removeListener = addListener((msg: any) => {
            // Check if message belongs to this room
            if (msg.roomId === roomId) {
                const formattedMsg = {
                    id: msg.ID.toString(),
                    content: msg.content,
                    type: msg.type || 'text',
                    fileName: msg.fileName,
                    fileSize: msg.fileSize,
                    duration: msg.duration,
                    sender: msg.senderId === user?.ID ? (user?.spiritualName || user?.karmicName || t('common.me')) : (msg.senderId === 0 ? t('chat.aiAssistant') : msg.senderName || t('common.other')),
                    isMe: msg.senderId === user?.ID,
                    time: new Date(msg.CreatedAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages(prev => {
                    // Avoid duplicates (e.g. if we sent it and it came back via WS)
                    if (prev.find(m => m.id === formattedMsg.id)) return prev;
                    return [...prev, formattedMsg];
                });
            }
        });

        navigation.setOptions({
            headerTitle: () => (
                <View style={{ maxWidth: '70%', alignItems: 'center' }}>
                    <Text
                        style={{
                            fontSize: 17,
                            fontWeight: '700',
                            color: vTheme.colors.text,
                            fontFamily: vTheme.typography.header.fontFamily
                        }}
                        numberOfLines={1}
                    >
                        {roomName}
                    </Text>
                </View>
            ),
            headerLeft: () => (
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: vTheme.colors.surface,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginLeft: 8,
                        borderWidth: 1,
                        borderColor: vTheme.colors.divider,
                        ...vTheme.shadows.soft
                    }}
                >
                    <ChevronLeft size={22} color={vTheme.colors.primary} />
                </TouchableOpacity>
            ),
            headerStyle: {
                backgroundColor: vTheme.colors.background,
            },
            headerTitleAlign: 'center',
            headerShadowVisible: false,
        });

        return () => removeListener();
    }, [navigation, roomName, roomId, user?.ID, vTheme]);

    // Update header buttons based on room type (separate effect to react to roomDetails changes)
    useEffect(() => {
        // Hide invite button for Yatra group chats - participants are managed via tour registration
        const isYatraChatRoom = isYatraChat || (roomDetails?.yatraId != null);

        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                    {!isYatraChatRoom && (
                        <TouchableOpacity
                            onPress={() => setInviteVisible(true)}
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                backgroundColor: vTheme.colors.surface,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 10,
                                borderWidth: 1,
                                borderColor: vTheme.colors.divider,
                                ...vTheme.shadows.soft
                            }}
                        >
                            <UserPlus size={20} color={vTheme.colors.primary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => setSettingsVisible(true)}
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: vTheme.colors.surface,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: vTheme.colors.divider,
                            ...vTheme.shadows.soft
                        }}
                    >
                        <Settings size={20} color={vTheme.colors.primary} />
                    </TouchableOpacity>
                </View>
            )
        });
    }, [navigation, roomDetails, isYatraChat, vTheme]);

    const handleNextVerse = async () => {
        if (!roomDetails || !versesInChapter) return;

        const currentVerseIdx = versesInChapter.findIndex(v => parseInt(v.verse) === roomDetails.currentVerse);
        if (currentVerseIdx !== -1 && currentVerseIdx < versesInChapter.length - 1) {
            // Move to next verse in same chapter
            handleJumpToVerse(roomDetails.currentChapter, parseInt(versesInChapter[currentVerseIdx + 1].verse));
        } else {
            // Check if next chapter exists
            const currentChapterIdx = chapters.findIndex(ch => ch.chapter === roomDetails.currentChapter);
            if (currentChapterIdx !== -1 && currentChapterIdx < chapters.length - 1) {
                // Move to first verse of next chapter
                handleJumpToVerse(chapters[currentChapterIdx + 1].chapter, 1);
            }
        }
    };

    const handlePrevVerse = async () => {
        if (!roomDetails || !versesInChapter) return;

        const currentVerseIdx = versesInChapter.findIndex(v => parseInt(v.verse) === roomDetails.currentVerse);
        if (currentVerseIdx > 0) {
            // Move to previous verse in same chapter
            handleJumpToVerse(roomDetails.currentChapter, parseInt(versesInChapter[currentVerseIdx - 1].verse));
        } else {
            // Check if previous chapter exists
            const currentChapterIdx = chapters.findIndex(ch => ch.chapter === roomDetails.currentChapter);
            if (currentChapterIdx > 0) {
                // Move to last verse of previous chapter - but for simplicity, just first verse
                // Better: fetch previous chapter verses and go to last one, but let's just go to ch start
                handleJumpToVerse(chapters[currentChapterIdx - 1].chapter, 1);
            }
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const newMessage = {
            senderId: user?.ID,
            roomId: roomId,
            content: inputText,
            type: 'text',
        };

        setInputText('');

        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_PATH}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newMessage),
            });

            if (response.ok) {
                // No need to fetchMessages() here anymore, 
                // the WS will send it back to us or we can rely on immediate local update if we want 
                // but for now relying on WS is cleaner for "sync"
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const renderMessage = ({ item }: any) => {
        const isAudio = item.type === 'audio';
        const isImage = item.type === 'image';
        const isDocument = item.type === 'document';

        return (
            <View style={[
                styles.messageBubble,
                item.isMe ? styles.myMessage : styles.otherMessage,
                { backgroundColor: item.isMe ? theme.userBubble : theme.botBubble }
            ]}>
                {!item.isMe && <Text style={[styles.senderName, { color: theme.accent }]}>{item.sender}</Text>}

                {isAudio ? (
                    <AudioPlayer
                        url={item.content}
                        duration={item.duration}
                        isDarkMode={isDarkMode}
                        onError={() => Alert.alert('Error', 'Failed to play audio')}
                    />
                ) : isImage ? (
                    <TouchableOpacity onPress={() => Alert.alert('Image', 'View image option coming soon')}>
                        <Image
                            source={{ uri: item.content }}
                            style={styles.messageImage}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                ) : isDocument ? (
                    <TouchableOpacity
                        style={styles.documentRow}
                        onPress={() => Linking.openURL(item.content)}
                    >
                        <Text style={{ fontSize: 20, marginRight: 8 }}>📄</Text>
                        <View>
                            <Text style={[styles.messageText, { color: theme.text }]} numberOfLines={1}>{item.fileName || 'Document'}</Text>
                            <Text style={{ color: theme.subText, fontSize: 10 }}>{mediaService.formatFileSize(item.fileSize)}</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <Text style={[styles.messageText, { color: theme.text }]}>{item.content}</Text>
                )}

                <Text style={[styles.timeText, { color: theme.subText }]}>{item.time}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >

                {isCallActive && (
                    <RoomVideoBar
                        roomId={roomId}
                        onClose={() => setIsCallActive(false)}
                    />
                )}

                {roomDetails?.bookCode ? (
                    <View style={[
                        styles.readingPanel,
                        {
                            backgroundColor: vTheme.colors.surface,
                            borderRadius: vTheme.layout.borderRadius.md,
                            margin: vTheme.layout.spacing.md,
                            ...vTheme.shadows.medium,
                            borderBottomWidth: 0,
                            flex: isExpanded ? 1 : 0,
                            overflow: 'hidden'
                        }
                    ]}>
                        <View style={styles.readingHeader}>
                            <Text style={[styles.bookTitle, { color: vTheme.colors.primary, fontFamily: vTheme.typography.subHeader.fontFamily }]}>
                                {roomDetails?.bookCode
                                    ? `📖 ${roomDetails.bookCode.toUpperCase()} ${roomDetails.currentChapter}.${roomDetails.currentVerse}`
                                    : (roomName || t('chat.publicRoom'))}
                            </Text>
                            {!isCallActive && (
                                <TouchableOpacity
                                    style={[
                                        styles.joinCallBtn,
                                        {
                                            backgroundColor: vTheme.colors.primary,
                                            borderRadius: 30, // Using fixed value for pill shape
                                            paddingHorizontal: 20,
                                            paddingVertical: 10,
                                            ...vTheme.shadows.soft,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 8
                                        }
                                    ]}
                                    onPress={() => setIsCallActive(true)}
                                >
                                    <Video size={18} color={vTheme.colors.textLight} />
                                    <Text style={{ color: vTheme.colors.textLight, fontWeight: '700', fontSize: 14 }}>{t('chat.joinCall')}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={async () => {
                                    const newState = !isExpanded;
                                    setIsExpanded(newState);
                                    await AsyncStorage.setItem('chat_reader_expanded', newState.toString());
                                }}
                                style={{ padding: 8 }}
                            >
                                {isExpanded ? (
                                    <Minimize2 size={20} color={vTheme.colors.primary} />
                                ) : (
                                    <Maximize2 size={20} color={vTheme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {roomDetails?.bookCode && isExpanded && (
                            <View style={styles.navHeaderCard}>
                                <View style={styles.navBarRow}>
                                    <TouchableOpacity onPress={() => handleJumpToVerse(roomDetails.currentChapter - 1, 1)} disabled={roomDetails.currentChapter <= 1} style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
                                        <ChevronLeft size={20} color={roomDetails.currentChapter <= 1 ? 'rgba(0,0,0,0.1)' : vTheme.colors.primary} />
                                    </TouchableOpacity>
                                    <View style={{ width: 50, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', height: '100%', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 9, fontWeight: '900', color: vTheme.colors.primary }}>{t('reader.chapter').substring(0, 6).toUpperCase()}</Text>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navScroll}>
                                        {chapters.length > 0 ? chapters.map((ch) => (
                                            <TouchableOpacity
                                                key={`${ch.canto}-${ch.chapter}`}
                                                style={[styles.navItem, roomDetails.currentChapter === ch.chapter && styles.navItemActive]}
                                                onPress={() => handleJumpToVerse(ch.chapter, 1)}
                                            >
                                                <Text style={[styles.navItemText, roomDetails.currentChapter === ch.chapter && styles.navItemTextActive]}>
                                                    {ch.chapter}
                                                </Text>
                                            </TouchableOpacity>
                                        )) : (
                                            <View style={styles.navItem}>
                                                <Text style={styles.navItemText}>{roomDetails.currentChapter}</Text>
                                            </View>
                                        )}
                                    </ScrollView>
                                    <TouchableOpacity onPress={() => handleJumpToVerse(roomDetails.currentChapter + 1, 1)} disabled={roomDetails.currentChapter >= chapters.length} style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
                                        <ChevronRight size={20} color={roomDetails.currentChapter >= chapters.length ? 'rgba(0,0,0,0.1)' : vTheme.colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.navBarRow, { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }]}>
                                    <TouchableOpacity onPress={() => handleJumpToVerse(roomDetails.currentChapter, roomDetails.currentVerse - 1)} disabled={roomDetails.currentVerse <= 1} style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
                                        <ChevronLeft size={20} color={roomDetails.currentVerse <= 1 ? 'rgba(0,0,0,0.1)' : vTheme.colors.primary} />
                                    </TouchableOpacity>
                                    <View style={{ width: 50, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', height: '100%', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 9, fontWeight: '900', color: vTheme.colors.primary }}>{t('reader.verse').substring(0, 5).toUpperCase()}</Text>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navScroll}>
                                        {versesInChapter.map((v) => (
                                            <TouchableOpacity
                                                key={v.id}
                                                style={[styles.verseNavItem, roomDetails.currentVerse === parseInt(v.verse) && styles.verseNavItemActive]}
                                                onPress={() => handleJumpToVerse(roomDetails.currentChapter, parseInt(v.verse))}
                                            >
                                                <Text style={[styles.verseNavItemText, roomDetails.currentVerse === parseInt(v.verse) && styles.verseNavItemTextActive]}>
                                                    {v.verse}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                    <TouchableOpacity onPress={() => handleJumpToVerse(roomDetails.currentChapter, roomDetails.currentVerse + 1)} disabled={roomDetails.currentVerse >= versesInChapter.length} style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
                                        <ChevronRight size={20} color={roomDetails.currentVerse >= versesInChapter.length ? 'rgba(0,0,0,0.1)' : vTheme.colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {currentVerse ? (
                            <View style={{ flex: 1 }}>
                                <ScrollView
                                    style={{ flex: 1 }}
                                    showsVerticalScrollIndicator={true}
                                    contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16 }}
                                >
                                    <Text style={[
                                        styles.sanskritText,
                                        {
                                            color: vTheme.colors.text,
                                            fontSize: readerFontSize * 1.2,
                                            fontWeight: readerFontBold ? 'bold' : 'normal',
                                            lineHeight: (readerFontSize * 1.2) * 1.4
                                        }
                                    ]}>
                                        {currentVerse.devanagari || currentVerse.text_sanskrit}
                                    </Text>
                                    <Text style={[
                                        styles.translationText,
                                        {
                                            color: vTheme.colors.textSecondary,
                                            fontSize: readerFontSize,
                                            fontWeight: readerFontBold ? '600' : 'normal',
                                            lineHeight: readerFontSize * 1.5
                                        }
                                    ]}>
                                        {currentVerse.translation}
                                    </Text>

                                    {roomDetails?.showPurport && currentVerse.purport && (
                                        <View style={styles.purportContainer}>
                                            <Text style={[styles.purportHeader, { color: vTheme.colors.primary }]}>
                                                {t('reader.purport') || 'Purport'}
                                            </Text>
                                            <Text style={[
                                                styles.purportText,
                                                {
                                                    color: vTheme.colors.textSecondary,
                                                    fontSize: readerFontSize * 0.95,
                                                    fontWeight: readerFontBold ? '500' : 'normal',
                                                    lineHeight: (readerFontSize * 0.95) * 1.6
                                                }
                                            ]}>
                                                {currentVerse.purport}
                                            </Text>
                                        </View>
                                    )}
                                </ScrollView>

                                {isExpanded && (
                                    <View style={styles.readingControls}>
                                        <TouchableOpacity
                                            style={{ padding: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                            onPress={handlePrevVerse}
                                        >
                                            <ArrowLeft size={16} color={vTheme.colors.textSecondary} />
                                            <Text style={{ color: vTheme.colors.textSecondary }}>{t('reader.prevVerse')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{ padding: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                            onPress={handleNextVerse}
                                        >
                                            <Text style={{ color: vTheme.colors.primary, fontWeight: 'bold' }}>{t('reader.nextVerse')}</Text>
                                            <ArrowRight size={16} color={vTheme.colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => setSettingsVisible(true)} style={{ padding: 10 }}>
                                <Text style={{ color: vTheme.colors.primary, textAlign: 'center', fontStyle: 'italic', textDecorationLine: 'underline' }}>
                                    {t('reader.settings')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={[
                        styles.minimalHeader,
                        {
                            backgroundColor: vTheme.colors.surface,
                            borderBottomWidth: 1,
                            borderBottomColor: vTheme.colors.divider,
                            paddingHorizontal: 20,
                            paddingVertical: 18,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            ...vTheme.shadows.soft
                        }
                    ]}>
                        <View style={{ flex: 1, marginRight: 16 }}>
                            <Text style={[styles.bookTitle, {
                                color: vTheme.colors.primary,
                                fontSize: 18,
                                marginBottom: 2
                            }]} numberOfLines={1}>
                                {roomName || t('chat.publicRoom')}
                            </Text>
                            {roomDetails?.description ? (
                                <Text style={{
                                    color: vTheme.colors.textSecondary,
                                    fontSize: 13,
                                    lineHeight: 16
                                }} numberOfLines={2}>
                                    {roomDetails.description}
                                </Text>
                            ) : null}
                        </View>
                        {!isCallActive && (
                            <TouchableOpacity
                                style={[
                                    styles.joinCallBtn,
                                    {
                                        backgroundColor: vTheme.colors.primary,
                                        borderRadius: 25,
                                        paddingHorizontal: 20,
                                        paddingVertical: 10,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 8,
                                        ...vTheme.shadows.soft
                                    }
                                ]}
                                onPress={() => setIsCallActive(true)}
                            >
                                <Video size={18} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{t('chat.joinCall')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {(roomDetails?.bookCode ? !isExpanded : true) && (
                    <View style={{ flex: 1 }}>
                        {loading ? (
                            <ActivityIndicator size="large" color={theme.accent} style={styles.center} />
                        ) : (
                            <FlatList
                                data={messages}
                                keyExtractor={item => item.id}
                                renderItem={renderMessage}
                                contentContainerStyle={styles.list}
                                ListEmptyComponent={
                                    <View style={styles.center}>
                                        <Text style={{ color: theme.subText }}>{t('chat.noHistory')}</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                )}

                <View style={[styles.inputContainer, { backgroundColor: theme.header, borderTopColor: theme.borderColor }]}>
                    <TextInput
                        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={t('chat.placeholder')}
                        placeholderTextColor={theme.subText}
                    />
                    <TouchableOpacity onPress={handleSendMessage} style={[styles.sendButton, { backgroundColor: theme.accent }]}>
                        <Send size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView >

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
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    minimalHeader: {
        width: '100%',
        zIndex: 10,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    myMessage: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    otherMessage: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    senderName: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 16,
    },
    timeText: {
        fontSize: 10,
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginVertical: 4,
    },
    documentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        fontSize: 16,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    readingPanel: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    readingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    readingControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    navHeaderCard: {
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 8,
        marginHorizontal: 12,
        marginBottom: 8,
        overflow: 'hidden',
    },
    navBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 36,
    },
    navScroll: {
        flex: 1,
    },
    navItem: {
        paddingHorizontal: 10,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    navItemActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#FF8000',
    },
    navItemText: {
        fontSize: 12,
        color: '#666',
    },
    navItemTextActive: {
        color: '#FF8000',
        fontWeight: 'bold',
    },
    verseNavItem: {
        width: 34,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2,
    },
    verseNavItemActive: {
        backgroundColor: '#FF8000',
        borderRadius: 4,
    },
    verseNavItemText: {
        fontSize: 11,
        color: '#888',
    },
    verseNavItemTextActive: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    joinCallBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    sanskritText: {
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 8,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    translationText: {
        fontSize: 14,
        marginBottom: 8,
        lineHeight: 20,
    },
    purportContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    purportHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    purportText: {
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
    },
});
