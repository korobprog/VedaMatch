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
} from 'react-native';
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

type Props = NativeStackScreenProps<RootStackParamList, 'RoomChat'>;

export const RoomChatScreen: React.FC<Props> = ({ route, navigation }) => {
    const { roomId, roomName } = route.params;
    const { t, i18n } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { user } = useUser();
    const { addListener } = useWebSocket();

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [inviteVisible, setInviteVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);

    const fetchMessages = async () => {
        try {
            const response = await fetch(`${API_PATH}/messages/${user?.ID}/0?roomId=${roomId}`);
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
            title: roomName,
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setInviteVisible(true)} style={{ marginRight: 15 }}>
                        <Text style={{ fontSize: 24, color: theme.text }}>👤+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSettingsVisible(true)} style={{ marginRight: 10 }}>
                        <Text style={{ fontSize: 24, color: theme.text }}>⋮</Text>
                    </TouchableOpacity>
                </View>
            )
        });

        return () => removeListener();
    }, [navigation, roomName, roomId, user?.ID]);

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
            const response = await fetch(`${API_PATH}/messages`, {
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

                <View style={[styles.inputContainer, { backgroundColor: theme.header, borderTopColor: theme.borderColor }]}>
                    <TextInput
                        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={t('chat.placeholder')}
                        placeholderTextColor={theme.subText}
                    />
                    <TouchableOpacity onPress={handleSendMessage} style={[styles.sendButton, { backgroundColor: theme.accent }]}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>→</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <InviteFriendModal
                visible={inviteVisible}
                onClose={() => setInviteVisible(false)}
                roomId={roomId}
            />

            <RoomSettingsModal
                visible={settingsVisible}
                onClose={() => setSettingsVisible(false)}
                roomId={roomId}
                roomName={roomName}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
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
});
