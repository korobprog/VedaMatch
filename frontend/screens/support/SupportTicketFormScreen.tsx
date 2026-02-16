import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    ActivityIndicator,
    Alert,
    ScrollView,
    Image,
} from 'react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { supportService } from '../../services/supportService';
import { useUser } from '../../context/UserContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportTicketForm'>;

const telegramContactPattern = /^@[A-Za-z0-9_]{4,32}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SupportTicketFormScreen: React.FC<Props> = ({ navigation, route }) => {
    const { isLoggedIn, user } = useUser();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [contact, setContact] = useState(user?.email || '');
    const [name, setName] = useState(user?.karmicName || '');
    const [attachment, setAttachment] = useState<Asset | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const entryPoint = useMemo(() => route.params?.entryPoint || 'portal', [route.params?.entryPoint]);

    const pickImage = async () => {
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
                Alert.alert('Поддержка', result.errorMessage || 'Не удалось выбрать изображение.');
                return;
            }
            const image = result.assets?.[0];
            if (image?.uri) {
                setAttachment(image);
            }
        } catch (error) {
            Alert.alert('Поддержка', 'Не удалось выбрать изображение.');
        }
    };

    const submit = async () => {
        const trimmedMessage = message.trim();
        const trimmedSubject = subject.trim();
        const trimmedContact = contact.trim();
        const trimmedName = name.trim();

        if (!trimmedMessage && !attachment) {
            Alert.alert('Поддержка', 'Введите сообщение или добавьте скриншот.');
            return;
        }

        if (!isLoggedIn) {
            if (!trimmedContact) {
                Alert.alert('Поддержка', 'Укажите email или @telegram для связи.');
                return;
            }
            const validContact = emailPattern.test(trimmedContact) || telegramContactPattern.test(trimmedContact);
            if (!validContact) {
                Alert.alert('Поддержка', 'Контакт должен быть в формате email или @telegram.');
                return;
            }
        }

        setSubmitting(true);
        try {
            let attachmentUrl = '';
            let attachmentMimeType = '';
            if (attachment?.uri) {
                const upload = await supportService.uploadAttachment({
                    uri: attachment.uri,
                    type: attachment.type || 'image/jpeg',
                    fileName: attachment.fileName || `support_${Date.now()}.jpg`,
                });
                attachmentUrl = upload.url;
                attachmentMimeType = upload.contentType || attachment.type || 'image/jpeg';
            }

            const response = await supportService.createTicket({
                subject: trimmedSubject || 'Support request',
                message: trimmedMessage,
                contact: trimmedContact,
                name: trimmedName,
                entryPoint,
                attachmentUrl,
                attachmentMimeType,
                clientRequestId: supportService.randomRequestId(),
            });

            const conversation = response?.conversation;
            const ticketLabel = conversation?.ticketNumber ? ` №${conversation.ticketNumber}` : '';
            Alert.alert('Готово', `Обращение${ticketLabel} отправлено в поддержку.`);

            if (isLoggedIn && conversation?.ID) {
                navigation.replace('SupportConversation', { conversationId: conversation.ID });
                return;
            }
            navigation.replace('SupportHome', { entryPoint });
        } catch (error: any) {
            const messageText = error?.message || 'Не удалось создать обращение.';
            Alert.alert('Поддержка', messageText);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.title}>Создать обращение</Text>
                <Text style={styles.subtitle}>Опишите проблему, и мы ответим в приложении.</Text>

                <View style={styles.field}>
                    <Text style={styles.label}>Тема</Text>
                    <TextInput
                        style={styles.input}
                        value={subject}
                        onChangeText={setSubject}
                        placeholder="Например: Ошибка входа"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                {!isLoggedIn ? (
                    <>
                        <View style={styles.field}>
                            <Text style={styles.label}>Контакт (email или @telegram)</Text>
                            <TextInput
                                style={styles.input}
                                value={contact}
                                onChangeText={setContact}
                                placeholder="you@example.com или @username"
                                placeholderTextColor="#94A3B8"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Имя</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Как к вам обращаться"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </>
                ) : null}

                <View style={styles.field}>
                    <Text style={styles.label}>Сообщение</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Опишите проблему максимально подробно"
                        placeholderTextColor="#94A3B8"
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity style={styles.attachmentButton} onPress={pickImage} activeOpacity={0.88}>
                    <Text style={styles.attachmentButtonText}>
                        {attachment ? 'Изменить скриншот' : 'Добавить скриншот'}
                    </Text>
                </TouchableOpacity>

                {attachment?.uri ? (
                    <View style={styles.previewWrap}>
                        <Image source={{ uri: attachment.uri }} style={styles.preview} resizeMode="cover" />
                        <TouchableOpacity onPress={() => setAttachment(null)} style={styles.removeAttachment} activeOpacity={0.85}>
                            <Text style={styles.removeAttachmentText}>Удалить</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={submit}
                    disabled={submitting}
                    activeOpacity={0.9}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>Отправить обращение</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
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
    content: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
    },
    subtitle: {
        marginTop: 8,
        color: '#334155',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 18,
    },
    field: {
        marginBottom: 14,
    },
    label: {
        color: '#1E293B',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderColor: '#CBD5E1',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        minHeight: 46,
        fontSize: 15,
        color: '#0F172A',
    },
    textarea: {
        minHeight: 120,
        paddingTop: 10,
    },
    attachmentButton: {
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    attachmentButtonText: {
        color: '#1E293B',
        fontWeight: '700',
        fontSize: 14,
    },
    previewWrap: {
        marginTop: 12,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    preview: {
        width: '100%',
        height: 180,
        backgroundColor: '#E2E8F0',
    },
    removeAttachment: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    removeAttachmentText: {
        color: '#B91C1C',
        fontWeight: '700',
    },
    submitButton: {
        marginTop: 18,
        backgroundColor: '#2563EB',
        borderRadius: 12,
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default SupportTicketFormScreen;
