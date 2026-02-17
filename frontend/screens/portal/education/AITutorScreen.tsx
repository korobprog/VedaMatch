import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Brain, Link2, Send, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../../context/SettingsContext';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { usePressFeedback } from '../../../hooks/usePressFeedback';
import { educationService } from '../../../services/educationService';
import { ragService } from '../../../services/ragService';
import { TutorHistoryMessage, TutorModelInfo, TutorWeakTopic, TutorAssistantContext } from '../../../types/education';

type ChatRole = 'user' | 'assistant';

type TutorMessage = {
    id: string;
    role: ChatRole;
    content: string;
    assistantContext?: TutorAssistantContext;
    weakTopics?: TutorWeakTopic[];
    model?: TutorModelInfo;
};

const buildHistory = (messages: TutorMessage[]): TutorHistoryMessage[] => {
    return messages
        .filter((item) => item.role === 'user' || item.role === 'assistant')
        .slice(-12)
        .map((item) => ({
            role: item.role,
            content: item.content,
        }));
};

const shortText = (value: string, limit = 260): string => {
    const text = value?.trim() || '';
    if (text.length <= limit) {
        return text;
    }
    return `${text.slice(0, limit)}...`;
};

export const AITutorScreen: React.FC = () => {
    const { t } = useTranslation();
    const { isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const triggerTapFeedback = usePressFeedback();
    const scrollRef = useRef<ScrollView>(null);

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<TutorMessage[]>([]);
    const [weakTopics, setWeakTopics] = useState<TutorWeakTopic[]>([]);
    const [sending, setSending] = useState(false);
    const [loadingWeakTopics, setLoadingWeakTopics] = useState(false);
    const [isTutorEnabled, setIsTutorEnabled] = useState(true);
    const [statusLoading, setStatusLoading] = useState(true);

    const hasMessages = messages.length > 0;
    const canSend = !sending && message.trim().length > 0;

    const weakTopicText = useMemo(() => {
        if (!weakTopics.length) {
            return t('education.aiTutor.noWeakTopics');
        }
        return weakTopics
            .slice(0, 5)
            .map((topic, index) => `${index + 1}. ${topic.topicLabel} (${Math.round(topic.mastery * 100)}%)`)
            .join('\n');
    }, [weakTopics, t]);

    const loadWeakTopics = async () => {
        setLoadingWeakTopics(true);
        try {
            const response = await educationService.getTutorWeakTopics();
            setWeakTopics(response.items || []);
        } catch (error) {
            console.warn('Failed to load tutor weak topics:', error);
        } finally {
            setLoadingWeakTopics(false);
        }
    };

    const loadTutorStatus = async (): Promise<boolean> => {
        setStatusLoading(true);
        try {
            const response = await educationService.getTutorStatus();
            const enabled = Boolean(response?.enabled);
            setIsTutorEnabled(enabled);
            return enabled;
        } catch (error) {
            console.warn('Failed to load tutor status:', error);
            setIsTutorEnabled(false);
            return false;
        } finally {
            setStatusLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            const enabled = await loadTutorStatus();
            if (enabled) {
                await loadWeakTopics();
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!scrollRef.current) {
            return;
        }
        requestAnimationFrame(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        });
    }, [messages.length]);

    const openSourceDetails = async (sourceId: string, fallbackTitle?: string) => {
        try {
            const details = await ragService.getSourceById(sourceId, true);
            const title = details.title || fallbackTitle || t('chat.sourceTitle');
            const body = shortText(details.content || details.sourceUrl || t('chat.sourceDetailsUnavailable'));
            Alert.alert(title, body);
        } catch (error) {
            console.warn('Failed to load tutor source details:', error);
            Alert.alert(
                t('common.error'),
                t('chat.sourceDetailsUnavailable'),
            );
        }
    };

    const onSend = async () => {
        const trimmed = message.trim();
        if (!isTutorEnabled || !trimmed || sending) {
            return;
        }

        triggerTapFeedback();
        const nextUserMessage: TutorMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
        };

        const history = buildHistory(messages);
        setMessages((prev) => [...prev, nextUserMessage]);
        setMessage('');
        setSending(true);

        try {
            const response = await educationService.tutorTurn({
                message: trimmed,
                history,
            });
            const nextAssistantMessage: TutorMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response.reply,
                assistantContext: response.assistant_context,
                weakTopics: response.weak_topics,
                model: response.model,
            };
            setMessages((prev) => [...prev, nextAssistantMessage]);
            setWeakTopics(response.weak_topics || []);
        } catch (error) {
            console.error('Tutor turn failed:', error);
            Alert.alert(t('common.error'), t('education.aiTutor.turnError'));
        } finally {
            setSending(false);
        }
    };

    const onClearMemory = () => {
        if (!isTutorEnabled) {
            return;
        }

        Alert.alert(
            t('education.aiTutor.clearMemoryTitle'),
            t('education.aiTutor.clearMemoryDescription'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('education.aiTutor.clearMemoryAction'),
                    style: 'destructive',
                    onPress: async () => {
                        triggerTapFeedback();
                        try {
                            await educationService.clearTutorMemory('all');
                            setWeakTopics([]);
                            Alert.alert(t('common.success'), t('education.aiTutor.memoryCleared'));
                        } catch (error) {
                            console.error('Failed to clear tutor memory:', error);
                            Alert.alert(t('common.error'), t('education.aiTutor.clearMemoryError'));
                        }
                    },
                },
            ],
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: roleColors.background }]}>
            <View style={[styles.header, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
                <View style={[styles.headerIconWrap, { backgroundColor: roleColors.accentSoft }]}>
                    <Brain size={18} color={roleColors.accent} />
                </View>
                <View style={styles.headerTextWrap}>
                    <Text style={[styles.title, { color: roleColors.textPrimary }]}>{t('education.aiTutor.title')}</Text>
                    <Text style={[styles.subtitle, { color: roleColors.textSecondary }]}>{t('education.aiTutor.subtitle')}</Text>
                </View>
                <TouchableOpacity
                    testID="ai-tutor-clear-memory"
                    activeOpacity={0.85}
                    style={[styles.clearButton, { borderColor: roleColors.border }]}
                    onPress={onClearMemory}
                >
                    <Trash2 size={16} color={roleColors.textSecondary} />
                </TouchableOpacity>
            </View>

            {!statusLoading && !isTutorEnabled && (
                <View style={[styles.emptyState, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
                    <Text style={[styles.emptyTitle, { color: roleColors.textPrimary }]}>{t('education.aiTutor.disabledTitle')}</Text>
                    <Text style={[styles.emptySub, { color: roleColors.textSecondary }]}>{t('education.aiTutor.disabledSubtitle')}</Text>
                </View>
            )}

            <View style={[styles.weakTopicsCard, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
                <Text style={[styles.weakTopicsTitle, { color: roleColors.textPrimary }]}>
                    {statusLoading || loadingWeakTopics ? t('common.loading') : t('education.aiTutor.weakTopicsTitle')}
                </Text>
                <Text style={[styles.weakTopicsText, { color: roleColors.textSecondary }]}>
                    {statusLoading || loadingWeakTopics ? t('common.loading') : weakTopicText}
                </Text>
            </View>

            {isTutorEnabled && (
                <>
                    <ScrollView
                        ref={scrollRef}
                        style={styles.messagesWrap}
                        contentContainerStyle={styles.messagesContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {!hasMessages && (
                            <View style={[styles.emptyState, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
                                <Text style={[styles.emptyTitle, { color: roleColors.textPrimary }]}>{t('education.aiTutor.emptyTitle')}</Text>
                                <Text style={[styles.emptySub, { color: roleColors.textSecondary }]}>{t('education.aiTutor.emptySubtitle')}</Text>
                            </View>
                        )}

                        {messages.map((item) => {
                            const isAssistant = item.role === 'assistant';
                            return (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.messageBubble,
                                        {
                                            backgroundColor: isAssistant ? roleColors.surfaceElevated : roleColors.accent,
                                            borderColor: isAssistant ? roleColors.border : roleColors.accent,
                                            alignSelf: isAssistant ? 'flex-start' : 'flex-end',
                                        },
                                    ]}
                                >
                                    <Text style={[styles.messageText, { color: isAssistant ? roleColors.textPrimary : '#fff' }]}>
                                        {item.content}
                                    </Text>

                                    {isAssistant && item.assistantContext?.sources?.length ? (
                                        <View style={[styles.sourcesBlock, { borderTopColor: roleColors.border }]}>
                                            <Text style={[styles.sourcesTitle, { color: roleColors.textSecondary }]}>
                                                {t('chat.sourcesTitle')}
                                            </Text>
                                            {item.assistantContext.sources.slice(0, 3).map((source) => (
                                                <TouchableOpacity
                                                    key={`${item.id}-${source.id}`}
                                                    activeOpacity={0.85}
                                                    style={[styles.sourceChip, { borderColor: roleColors.border }]}
                                                    onPress={() => {
                                                        triggerTapFeedback();
                                                        openSourceDetails(source.id, source.title);
                                                    }}
                                                >
                                                    <Link2 size={13} color={roleColors.accent} />
                                                    <Text style={[styles.sourceChipText, { color: roleColors.textSecondary }]} numberOfLines={1}>
                                                        {source.title || source.sourceType}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    ) : null}
                                </View>
                            );
                        })}
                    </ScrollView>

                    <View style={[styles.composer, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
                        <TextInput
                            testID="ai-tutor-input"
                            style={[styles.input, { color: roleColors.textPrimary }]}
                            placeholder={t('education.aiTutor.inputPlaceholder')}
                            placeholderTextColor={roleColors.textSecondary}
                            value={message}
                            multiline
                            onChangeText={setMessage}
                            editable={!sending}
                        />
                        <TouchableOpacity
                            testID="ai-tutor-send"
                            activeOpacity={0.85}
                            style={[styles.sendButton, { backgroundColor: canSend ? roleColors.accent : roleColors.border }]}
                            onPress={onSend}
                            disabled={!canSend}
                        >
                            <Send size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    headerTextWrap: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    subtitle: {
        marginTop: 2,
        fontSize: 13,
        lineHeight: 18,
    },
    clearButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    weakTopicsCard: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
    },
    weakTopicsTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 6,
    },
    weakTopicsText: {
        fontSize: 13,
        lineHeight: 19,
    },
    messagesWrap: {
        flex: 1,
    },
    messagesContent: {
        paddingBottom: 12,
    },
    emptyState: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    emptySub: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 18,
    },
    messageBubble: {
        width: '88%',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    sourcesBlock: {
        borderTopWidth: 1,
        marginTop: 10,
        paddingTop: 8,
    },
    sourcesTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
    },
    sourceChip: {
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    sourceChipText: {
        marginLeft: 6,
        fontSize: 12,
        flex: 1,
    },
    composer: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 8,
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: 8,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        paddingHorizontal: 8,
        paddingVertical: 8,
        fontSize: 14,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
});
