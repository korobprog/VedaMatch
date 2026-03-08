import React, { useEffect, useMemo, useState } from 'react';
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
    Platform,
} from 'react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { supportService } from '../../services/supportService';
import { useUser } from '../../context/UserContext';
import { KeyboardAwareContainer } from '../../components/ui/KeyboardAwareContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportTicketForm'>;

const telegramContactPattern = /^@[A-Za-z0-9_]{4,32}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supportTicketFormCopy = {
    ru: {
        support: 'Поддержка',
        done: 'Готово',
        title: 'Создать тикет',
        subtitle: 'Опишите проблему, и мы ответим в приложении.',
        abuseSubtitle: 'Опишите нарушение. Жалоба отправляется в модерацию и поддержку.',
        moderationTitle: 'Куда попадет жалоба',
        moderationText: 'Жалоба сразу отправляется команде модерации и поддержки VedaMatch внутри системы.',
        complaintTargetUser: 'Цель жалобы: {{name}} (ID {{id}})',
        complaintTargetContent: 'Цель жалобы: {{type}} / {{id}}',
        preacherQuestion: 'Вопрос проповеднику',
        subject: 'Тема',
        subjectPlaceholder: 'Например: ошибка входа',
        contact: 'Контакт (email или @telegram)',
        contactPlaceholder: 'you@example.com или @username',
        name: 'Имя',
        namePlaceholder: 'Как к вам обращаться',
        message: 'Сообщение',
        messagePlaceholder: 'Опишите проблему как можно подробнее',
        addScreenshot: 'Добавить скриншот',
        changeScreenshot: 'Заменить скриншот',
        removeAttachment: 'Удалить',
        submit: 'Отправить тикет',
        abuseDefaultSubject: 'Жалоба на пользователя/контент',
        defaultSubject: 'Обращение в поддержку',
        pickImageFailed: 'Не удалось выбрать изображение.',
        emptyMessage: 'Введите сообщение или добавьте скриншот.',
        missingContact: 'Укажите email или @telegram для связи.',
        invalidContact: 'Контакт должен быть в формате email или @telegram.',
        sent: 'Тикет{{ticket}} отправлен в поддержку.',
        createFailed: 'Не удалось создать тикет.',
        sessionExpired: 'Сессия истекла. Войдите снова, чтобы тикет сохранился в разделе «Мои тикеты».',
        cancel: 'Отмена',
        signIn: 'Войти',
        userFallback: 'Пользователь',
    },
    en: {
        support: 'Support',
        done: 'Done',
        title: 'Create ticket',
        subtitle: 'Describe the issue, and we will reply in the app.',
        abuseSubtitle: 'Describe the violation. The complaint is sent to moderation and support.',
        moderationTitle: 'Where the complaint goes',
        moderationText: 'The complaint is sent directly to the VedaMatch moderation and support team in the system.',
        complaintTargetUser: 'Complaint target: {{name}} (ID {{id}})',
        complaintTargetContent: 'Complaint target: {{type}} / {{id}}',
        preacherQuestion: 'Question to preacher',
        subject: 'Subject',
        subjectPlaceholder: 'For example: Sign-in error',
        contact: 'Contact (email or @telegram)',
        contactPlaceholder: 'you@example.com or @username',
        name: 'Name',
        namePlaceholder: 'How should we address you',
        message: 'Message',
        messagePlaceholder: 'Describe the issue in as much detail as possible',
        addScreenshot: 'Add screenshot',
        changeScreenshot: 'Change screenshot',
        removeAttachment: 'Delete',
        submit: 'Send ticket',
        abuseDefaultSubject: 'Complaint about user/content',
        defaultSubject: 'Support request',
        pickImageFailed: 'Failed to select an image.',
        emptyMessage: 'Enter a message or add a screenshot.',
        missingContact: 'Provide an email or @telegram for contact.',
        invalidContact: 'Contact must be in email or @telegram format.',
        sent: 'Ticket{{ticket}} has been sent to support.',
        createFailed: 'Failed to create the ticket.',
        sessionExpired: 'Your session has expired. Sign in again so the ticket is saved in "My tickets".',
        cancel: 'Cancel',
        signIn: 'Sign in',
        userFallback: 'User',
    },
    hi: {
        support: 'सहायता',
        done: 'पूर्ण',
        title: 'टिकट बनाएं',
        subtitle: 'समस्या बताएं, हम ऐप में उत्तर देंगे।',
        abuseSubtitle: 'उल्लंघन का विवरण दें। शिकायत मॉडरेशन और सहायता को भेजी जाएगी।',
        moderationTitle: 'शिकायत कहाँ जाएगी',
        moderationText: 'शिकायत सीधे सिस्टम के अंदर VedaMatch मॉडरेशन और सहायता टीम को भेजी जाती है।',
        complaintTargetUser: 'शिकायत का लक्ष्य: {{name}} (ID {{id}})',
        complaintTargetContent: 'शिकायत का लक्ष्य: {{type}} / {{id}}',
        preacherQuestion: 'प्रवचक से प्रश्न',
        subject: 'विषय',
        subjectPlaceholder: 'उदाहरण: साइन-इन त्रुटि',
        contact: 'संपर्क (email या @telegram)',
        contactPlaceholder: 'you@example.com या @username',
        name: 'नाम',
        namePlaceholder: 'हम आपको कैसे संबोधित करें',
        message: 'संदेश',
        messagePlaceholder: 'समस्या का यथासंभव विस्तार से वर्णन करें',
        addScreenshot: 'स्क्रीनशॉट जोड़ें',
        changeScreenshot: 'स्क्रीनशॉट बदलें',
        removeAttachment: 'हटाएं',
        submit: 'टिकट भेजें',
        abuseDefaultSubject: 'यूज़र/कंटेंट के बारे में शिकायत',
        defaultSubject: 'सहायता अनुरोध',
        pickImageFailed: 'इमेज चुनी नहीं जा सकी।',
        emptyMessage: 'संदेश लिखें या स्क्रीनशॉट जोड़ें।',
        missingContact: 'संपर्क के लिए email या @telegram दें।',
        invalidContact: 'संपर्क email या @telegram फ़ॉर्मेट में होना चाहिए।',
        sent: 'टिकट{{ticket}} सहायता को भेज दिया गया है।',
        createFailed: 'टिकट बनाया नहीं जा सका।',
        sessionExpired: 'आपका सत्र समाप्त हो गया है। फिर से साइन इन करें ताकि टिकट "My tickets" में सहेजा जाए।',
        cancel: 'रद्द करें',
        signIn: 'साइन इन',
        userFallback: 'यूज़र',
    },
} as const;

const normalizeSupportTicketFormLanguage = (language?: string): 'ru' | 'en' | 'hi' => {
    const lower = String(language || '').trim().toLowerCase();
    if (lower.startsWith('ru')) {
        return 'ru';
    }
    if (lower.startsWith('hi')) {
        return 'hi';
    }
    return 'en';
};

export const SupportTicketFormScreen: React.FC<Props> = ({ navigation, route }) => {
    const { i18n } = useTranslation();
    const { isLoggedIn, user } = useUser();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [contact, setContact] = useState(user?.email || '');
    const [name, setName] = useState(user?.karmicName || '');
    const [attachment, setAttachment] = useState<Asset | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const entryPoint = useMemo(() => route.params?.entryPoint || 'portal', [route.params?.entryPoint]);
    const isAbuseReport = entryPoint === 'abuse_report';
    const targetPreacherId = useMemo(() => route.params?.targetPreacherId, [route.params?.targetPreacherId]);
    const targetPreacherName = useMemo(() => route.params?.targetPreacherName, [route.params?.targetPreacherName]);
    const reportType = useMemo(() => route.params?.reportType, [route.params?.reportType]);
    const reportedUserId = useMemo(() => route.params?.reportedUserId, [route.params?.reportedUserId]);
    const reportedUserName = useMemo(() => route.params?.reportedUserName, [route.params?.reportedUserName]);
    const reportedContentType = useMemo(() => route.params?.reportedContentType, [route.params?.reportedContentType]);
    const reportedContentId = useMemo(() => route.params?.reportedContentId, [route.params?.reportedContentId]);
    const ui = useMemo(
        () => supportTicketFormCopy[normalizeSupportTicketFormLanguage(i18n.language)],
        [i18n.language]
    );
    const clientMeta = useMemo(() => ({
        devicePlatform: Platform.OS,
        deviceOs: Platform.OS,
        deviceOsVersion: String(Platform.Version ?? ''),
    }), []);

    useEffect(() => {
        if (!isAbuseReport) {
            return;
        }
        setSubject((prev) => prev.trim() ? prev : ui.abuseDefaultSubject);
    }, [isAbuseReport, ui.abuseDefaultSubject]);

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
                Alert.alert(ui.support, result.errorMessage || ui.pickImageFailed);
                return;
            }
            const image = result.assets?.[0];
            if (image?.uri) {
                setAttachment(image);
            }
        } catch {
            Alert.alert(ui.support, ui.pickImageFailed);
        }
    };

    const submit = async () => {
        const trimmedMessage = message.trim();
        const trimmedSubject = subject.trim();
        const trimmedContact = contact.trim();
        const trimmedName = name.trim();

        if (!trimmedMessage && !attachment) {
            Alert.alert(ui.support, ui.emptyMessage);
            return;
        }

        if (!isLoggedIn) {
            if (!trimmedContact) {
                Alert.alert(ui.support, ui.missingContact);
                return;
            }
            const validContact = emailPattern.test(trimmedContact) || telegramContactPattern.test(trimmedContact);
            if (!validContact) {
                Alert.alert(ui.support, ui.invalidContact);
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
                subject: trimmedSubject || (isAbuseReport ? ui.abuseDefaultSubject : ui.defaultSubject),
                message: trimmedMessage,
                contact: trimmedContact,
                name: trimmedName,
                entryPoint,
                reportType,
                reportedUserId,
                reportedContentType,
                reportedContentId,
                targetPreacherId,
                attachmentUrl,
                attachmentMimeType,
                clientRequestId: supportService.randomRequestId(),
                ...clientMeta,
            });

            const conversation = response?.conversation;
            const ticketLabel = conversation?.ticketNumber ? ` №${conversation.ticketNumber}` : '';
            Alert.alert(ui.done, ui.sent.replace('{{ticket}}', ticketLabel));

            if (isLoggedIn && conversation?.ID) {
                navigation.replace('SupportConversation', { conversationId: conversation.ID });
                return;
            }
            navigation.replace('SupportHome', { entryPoint });
        } catch (error: any) {
            const messageText = error?.message || ui.createFailed;
            const isAuthIssue = String(messageText).toLowerCase().includes('auth') || String(messageText).toLowerCase().includes('unauthorized');
            if (isAuthIssue) {
                Alert.alert(
                    ui.support,
                    ui.sessionExpired,
                    [
                        { text: ui.cancel, style: 'cancel' },
                        { text: ui.signIn, onPress: () => navigation.navigate('Login') },
                    ]
                );
            } else {
                Alert.alert(ui.support, messageText);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAwareContainer
                style={styles.container}
                behavior={Platform.OS === 'android' ? 'height' : 'padding'}
                useTopInset={false}
            >
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                >
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('SupportHome', { entryPoint }))}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={ui.support}
                    >
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{ui.title}</Text>
                    <Text style={styles.subtitle}>
                        {isAbuseReport
                            ? ui.abuseSubtitle
                            : ui.subtitle}
                    </Text>
                    {isAbuseReport ? (
                        <View style={styles.moderationHint}>
                            <Text style={styles.moderationHintTitle}>{ui.moderationTitle}</Text>
                            <Text style={styles.moderationHintText}>
                                {ui.moderationText}
                            </Text>
                            {reportType === 'user' && reportedUserId ? (
                                <Text style={styles.moderationHintTarget}>
                                    {ui.complaintTargetUser
                                        .replace('{{name}}', reportedUserName ? `${reportedUserName}` : ui.userFallback)
                                        .replace('{{id}}', String(reportedUserId))}
                                </Text>
                            ) : null}
                            {reportType === 'content' && reportedContentType && reportedContentId ? (
                                <Text style={styles.moderationHintTarget}>
                                    {ui.complaintTargetContent
                                        .replace('{{type}}', String(reportedContentType))
                                        .replace('{{id}}', String(reportedContentId))}
                                </Text>
                            ) : null}
                        </View>
                    ) : null}
                    {targetPreacherId ? (
                        <View style={styles.targetHint}>
                            <Text style={styles.targetHintLabel}>{ui.preacherQuestion}</Text>
                            <Text style={styles.targetHintValue}>
                                {targetPreacherName ? `${targetPreacherName} (ID ${targetPreacherId})` : `ID ${targetPreacherId}`}
                            </Text>
                        </View>
                    ) : null}

                <View style={styles.field}>
                    <Text style={styles.label}>{ui.subject}</Text>
                    <TextInput
                        style={styles.input}
                        value={subject}
                        onChangeText={setSubject}
                        placeholder={ui.subjectPlaceholder}
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                {!isLoggedIn ? (
                    <>
                        <View style={styles.field}>
                            <Text style={styles.label}>{ui.contact}</Text>
                            <TextInput
                                style={styles.input}
                                value={contact}
                                onChangeText={setContact}
                                placeholder={ui.contactPlaceholder}
                                placeholderTextColor="#94A3B8"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>{ui.name}</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder={ui.namePlaceholder}
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </>
                ) : null}

                <View style={styles.field}>
                    <Text style={styles.label}>{ui.message}</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={message}
                        onChangeText={setMessage}
                        placeholder={ui.messagePlaceholder}
                        placeholderTextColor="#94A3B8"
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity style={styles.attachmentButton} onPress={pickImage} activeOpacity={0.88}>
                    <Text style={styles.attachmentButtonText}>
                        {attachment ? ui.changeScreenshot : ui.addScreenshot}
                    </Text>
                </TouchableOpacity>

                {attachment?.uri ? (
                    <View style={styles.previewWrap}>
                        <Image source={{ uri: attachment.uri }} style={styles.preview} resizeMode="cover" />
                        <TouchableOpacity onPress={() => setAttachment(null)} style={styles.removeAttachment} activeOpacity={0.85}>
                            <Text style={styles.removeAttachmentText}>{ui.removeAttachment}</Text>
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
                            <Text style={styles.submitButtonText}>{ui.submit}</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
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
    content: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 32,
    },
    backButton: {
        alignSelf: 'flex-start',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    backButtonText: {
        color: '#0F172A',
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 22,
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
    targetHint: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 14,
    },
    targetHintLabel: {
        color: '#1D4ED8',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    targetHintValue: {
        color: '#1E293B',
        fontSize: 13,
        fontWeight: '600',
    },
    moderationHint: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FDBA74',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 14,
    },
    moderationHintTitle: {
        color: '#9A3412',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    moderationHintText: {
        color: '#7C2D12',
        fontSize: 13,
        lineHeight: 18,
    },
    moderationHintTarget: {
        color: '#431407',
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '600',
        marginTop: 6,
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
