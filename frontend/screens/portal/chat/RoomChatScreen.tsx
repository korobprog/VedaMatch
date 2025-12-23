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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { InviteFriendModal } from './InviteFriendModal';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomChat'>;

export const RoomChatScreen: React.FC<Props> = ({ route, navigation }) => {
    const { roomId, roomName } = route.params;
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { user } = useUser();

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [inviteVisible, setInviteVisible] = useState(false);

    const fetchMessages = async () => {
        // TODO: Implement fetching messages for room
        setLoading(false);
    };

    useEffect(() => {
        fetchMessages();
        navigation.setOptions({
            title: roomName,
            headerRight: () => (
                <TouchableOpacity onPress={() => setInviteVisible(true)} style={{ marginRight: 10 }}>
                    <Text style={{ fontSize: 24, color: theme.text }}>👤+</Text>
                </TouchableOpacity>
            )
        });
    }, [navigation, roomName]);

    const handleSendMessage = () => {
        if (!inputText.trim()) return;

        const newMessage = {
            id: Date.now().toString(),
            content: inputText,
            sender: user?.karmicName || 'Me',
            isMe: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputText('');
        // TODO: Send to backend via WebSocket or API
    };

    const renderMessage = ({ item }: any) => (
        <View style={[
            styles.messageBubble,
            item.isMe ? styles.myMessage : styles.otherMessage,
            { backgroundColor: item.isMe ? theme.userBubble : theme.botBubble }
        ]}>
            {!item.isMe && <Text style={[styles.senderName, { color: theme.accent }]}>{item.sender}</Text>}
            <Text style={[styles.messageText, { color: theme.text }]}>{item.content}</Text>
            <Text style={[styles.timeText, { color: theme.subText }]}>{item.time}</Text>
        </View>
    );

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
