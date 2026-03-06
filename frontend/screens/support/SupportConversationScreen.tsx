import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Image,
    Alert,
    Platform,
} from 'react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { supportService, SupportConversation, SupportMessage } from '../../services/supportService';
import { useUser } from '../../context/UserContext';
import { API_BASE_URL } from '../../config/api.config';
import { KeyboardAwareContainer } from '../../components/ui/KeyboardAwareContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportConversation'>;

const normalizeLocale = (language?: string) => {
    const normalized = String(language || '').toLowerCase();
    if (normalized.startsWith('hi')) return 'hi-IN';
    if (normalized.startsWith('en')) return 'en-US';
    return 'ru-RU';
};

const formatTime = (value?: string, language?: string) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleString(normalizeLocale(language), {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const resolveMediaUrl = (raw?: string) => {
    if (!raw) {
        return '';
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return raw;
    }
    if (raw.startsWith('/')) {
        return `${API_BASE_URL}${raw}`;
    }
    return `${API_BASE_URL}/${raw}`;
};

export const SupportConversationScreen: React.FC<Props> = ({ route, navigation }) => {
    const { i18n } = useTranslation();
    const { isLoggedIn } = useUser();
    const conversationId = route.params?.conversationId;
    const [ticket, setTicket] = useState<SupportConversation | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [draft, setDraft] = useState('');
    const [attachment, setAttachment] = useState<Asset | null>(null);
    const [sending, setSending] = useState(false);
    const copy = useMemo(() => {
        const language = String(i18n.language || '').toLowerCase();
        if (language.startsWith('hi')) {
            return {
                support: 'सहायता',
                failedToSelectImage: 'छवि चुनी नहीं जा सकी।',
                failedToSendMessage: 'संदेश भेजा नहीं जा सका।',
                signInTitle: 'अपने खाते में साइन इन करें',
                signInSubtitle: 'अधिकृत होने के बाद वार्तालाप इतिहास उपलब्ध होगा।',
                openSignIn: 'साइन-इन खोलें',
                ticketNotFound: 'टिकट नहीं मिला',
                supportRequest: 'सहायता अनुरोध',
                open: 'खुला',
                resolved: 'समाधान हुआ',
                remove: 'हटाएँ',
                writeMessage: 'संदेश लिखें...',
                send: 'भेजें',
            };
        }
        if (language.startsWith('en')) {
            return {
                support: 'Support',
                failedToSelectImage: 'Failed to select an image.',
                failedToSendMessage: 'Failed to send the message.',
                signInTitle: 'Sign in to your account',
                signInSubtitle: 'Conversation history is available after authorization.',
                openSignIn: 'Open sign-in',
                ticketNotFound: 'Ticket not found',
                supportRequest: 'Support request',
                open: 'open',
                resolved: 'resolved',
                remove: 'Remove',
                writeMessage: 'Write a message...',
                send: 'Send',
            };
        }
        return {
            support: 'Поддержка',
            failedToSelectImage: 'Не удалось выбрать изображение.',
            failedToSendMessage: 'Не удалось отправить сообщение.',
            signInTitle: 'Войдите в аккаунт',
            signInSubtitle: 'История переписки доступна после авторизации.',
            openSignIn: 'Открыть вход',
            ticketNotFound: 'Обращение не найдено',
            supportRequest: 'Обращение в поддержку',
            open: 'открыт',
            resolved: 'решён',
            remove: 'Удалить',
            writeMessage: 'Напишите сообщение...',
            send: 'Отправить',
        };
    }, [i18n.language]);
    const clientMeta = useMemo(() => ({
        devicePlatform: Platform.OS,
        deviceOs: Platform.OS,
        deviceOsVersion: String(Platform.Version ?? ''),
    }), []);

    const load = useCallback(async (silent: boolean) => {
        if (!conversationId) {
            setLoading(false);
            return;
        }
        if (!silent) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
        try {
            const payload = await supportService.getTicketMessages(conversationId);
            setTicket(payload.ticket);
            setMessages(payload.messages || []);
            await supportService.markTicketRead(conversationId);
        } catch (error) {
            console.warn('[SupportConversation] failed to load conversation:', error);
        } finally {
            if (!silent) {
                setLoading(false);
            } else {
                setRefreshing(false);
            }
        }
    }, [conversationId]);

    useFocusEffect(
        useCallback(() => {
            load(false);
        }, [load])
    );

    const pickImage = useCallback(async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1,
                quality: 0.8,
            });
            if (result.didCancel) {
                return;
            }
            if (result.errorCode) {
                Alert.alert(copy.support, result.errorMessage || copy.failedToSelectImage);
                return;
            }
            const image = result.assets?.[0];
            if (image?.uri) {
                setAttachment(image);
            }
        } catch {
            Alert.alert(copy.support, copy.failedToSelectImage);
        }
    }, [copy.failedToSelectImage, copy.support]);

    const send = useCallback(async () => {
        if (!conversationId) {
            return;
        }
        const messageText = draft.trim();
        if (!messageText && !attachment) {
            return;
        }
        setSending(true);
        try {
            let attachmentUrl = '';
            let attachmentMimeType = '';
            if (attachment?.uri) {
                const upload = await supportService.uploadAttachment({
                    uri: attachment.uri,
                    type: attachment.type || 'image/jpeg',
                    fileName: attachment.fileName || `support_followup_${Date.now()}.jpg`,
                });
                attachmentUrl = upload.url;
                attachmentMimeType = upload.contentType || attachment.type || 'image/jpeg';
            }

            await supportService.postTicketMessage(conversationId, {
                message: messageText,
                attachmentUrl,
                attachmentMimeType,
                ...clientMeta,
            });

            setDraft('');
            setAttachment(null);
            await load(true);
        } catch (error: any) {
            Alert.alert(copy.support, error?.message || copy.failedToSendMessage);
        } finally {
            setSending(false);
        }
    }, [attachment, clientMeta, conversationId, copy.failedToSendMessage, copy.support, draft, load]);

    const statusLabel = useMemo(() => {
        if (!ticket) {
            return '';
        }
        return ticket.status === 'resolved' ? copy.resolved : copy.open;
    }, [copy.open, copy.resolved, ticket]);

    if (!isLoggedIn) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <Text style={styles.blockedTitle}>{copy.signInTitle}</Text>
                    <Text style={styles.blockedSubtitle}>{copy.signInSubtitle}</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.primaryButtonText}>{copy.openSignIn}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (!conversationId) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <Text style={styles.blockedTitle}>{copy.ticketNotFound}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAwareContainer
                style={styles.container}
                behavior={Platform.OS === 'android' ? 'height' : 'padding'}
                useTopInset={false}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>{ticket?.ticketNumber || `#${conversationId}`}</Text>
                        <Text style={styles.metaText}>{ticket?.subject || copy.supportRequest}</Text>
                    </View>
                    <View style={styles.metaRight}>
                        <Text style={[styles.status, ticket?.status === 'resolved' ? styles.statusResolved : styles.statusOpen]}>
                            {statusLabel}
                        </Text>
                        <Text style={styles.timeText}>{formatTime(ticket?.lastMessageAt || ticket?.UpdatedAt, i18n.language)}</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="small" color="#2563EB" />
                    </View>
                ) : (
                    <FlatList
                        data={messages}
                        keyExtractor={(item) => String(item.ID)}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
                        renderItem={({ item }) => {
                            const outbound = item.direction === 'outbound';
                            const media = resolveMediaUrl(item.mediaUrl);
                            return (
                                <View style={[styles.messageRow, outbound ? styles.rowOutbound : styles.rowInbound]}>
                                    <View style={[styles.bubble, outbound ? styles.bubbleOutbound : styles.bubbleInbound]}>
                                        {item.text ? <Text style={styles.messageText}>{item.text}</Text> : null}
                                        {item.caption ? <Text style={styles.messageText}>{item.caption}</Text> : null}
                                        {media ? (
                                            <Image source={{ uri: media }} style={styles.mediaPreview} resizeMode="cover" />
                                        ) : null}
                                        <Text style={styles.messageMeta}>
                                            {item.source} • {formatTime(item.sentAt || item.CreatedAt, i18n.language)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        }}
                    />
                )}

                {attachment?.uri ? (
                    <View style={styles.attachmentPreviewWrap}>
                        <Image source={{ uri: attachment.uri }} style={styles.attachmentPreview} resizeMode="cover" />
                        <TouchableOpacity onPress={() => setAttachment(null)} style={styles.removeAttachment} activeOpacity={0.85}>
                            <Text style={styles.removeAttachmentText}>{copy.remove}</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                <View style={styles.composer}>
                    <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
                        <Text style={styles.attachButtonText}>+</Text>
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={draft}
                        onChangeText={setDraft}
                        placeholder={copy.writeMessage}
                        placeholderTextColor="#94A3B8"
                        multiline
                    />
                    <TouchableOpacity
                        onPress={send}
                        style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                        disabled={sending}
                    >
                        {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.sendButtonText}>{copy.send}</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAwareContainer>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 22,
    },
    blockedTitle: {
        color: '#0F172A',
        fontSize: 22,
        fontWeight: '800',
    },
    blockedSubtitle: {
        marginTop: 8,
        color: '#64748B',
        textAlign: 'center',
        fontSize: 14,
    },
    primaryButton: {
        marginTop: 16,
        backgroundColor: '#2563EB',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    header: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 10,
        borderBottomColor: '#CBD5E1',
        borderBottomWidth: 1,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '800',
    },
    metaText: {
        marginTop: 2,
        color: '#475569',
        fontSize: 13,
    },
    metaRight: {
        alignItems: 'flex-end',
    },
    status: {
        textTransform: 'uppercase',
        fontWeight: '700',
        fontSize: 11,
    },
    statusOpen: {
        color: '#1D4ED8',
    },
    statusResolved: {
        color: '#16A34A',
    },
    timeText: {
        marginTop: 3,
        color: '#64748B',
        fontSize: 11,
    },
    listContent: {
        paddingHorizontal: 10,
        paddingTop: 12,
        paddingBottom: 12,
    },
    messageRow: {
        marginBottom: 10,
        flexDirection: 'row',
    },
    rowInbound: {
        justifyContent: 'flex-start',
    },
    rowOutbound: {
        justifyContent: 'flex-end',
    },
    bubble: {
        maxWidth: '86%',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    bubbleInbound: {
        backgroundColor: '#FFFFFF',
        borderColor: '#CBD5E1',
        borderWidth: 1,
    },
    bubbleOutbound: {
        backgroundColor: '#DBEAFE',
        borderColor: '#93C5FD',
        borderWidth: 1,
    },
    messageText: {
        color: '#0F172A',
        fontSize: 14,
        lineHeight: 19,
    },
    messageMeta: {
        marginTop: 6,
        color: '#64748B',
        fontSize: 11,
    },
    mediaPreview: {
        marginTop: 8,
        width: 180,
        height: 140,
        borderRadius: 8,
        backgroundColor: '#E2E8F0',
    },
    attachmentPreviewWrap: {
        borderTopColor: '#CBD5E1',
        borderTopWidth: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 4,
    },
    attachmentPreview: {
        width: 84,
        height: 84,
        borderRadius: 8,
        backgroundColor: '#E2E8F0',
    },
    removeAttachment: {
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    removeAttachmentText: {
        color: '#B91C1C',
        fontWeight: '700',
        fontSize: 12,
    },
    composer: {
        borderTopColor: '#CBD5E1',
        borderTopWidth: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    attachButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    attachButtonText: {
        color: '#1E293B',
        fontSize: 22,
        lineHeight: 22,
        fontWeight: '600',
    },
    input: {
        flex: 1,
        minHeight: 38,
        maxHeight: 120,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 8,
        color: '#0F172A',
        fontSize: 14,
    },
    sendButton: {
        minHeight: 38,
        borderRadius: 10,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    sendButtonDisabled: {
        opacity: 0.7,
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13,
    },
});

export default SupportConversationScreen;
