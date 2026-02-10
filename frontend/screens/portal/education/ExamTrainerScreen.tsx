import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert,
    SafeAreaView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { educationService } from '../../../services/educationService';
import { ExamQuestion, UserExamAttempt } from '../../../types/education';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../../context/SettingsContext';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { usePressFeedback } from '../../../hooks/usePressFeedback';
import { CircleCheck, CircleX, Sparkles } from 'lucide-react-native';

type ExamTrainerRouteProp = RouteProp<RootStackParamList, 'ExamTrainer'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExamTrainer'>;

export const ExamTrainerScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ExamTrainerRouteProp>();
    const { moduleId, title } = route.params;
    const { t } = useTranslation();
    const { vTheme, isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const triggerTapFeedback = usePressFeedback();

    const [questions, setQuestions] = useState<ExamQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<UserExamAttempt | null>(null);

    useEffect(() => {
        const loadExams = async () => {
            try {
                const data = await educationService.getModuleExams(moduleId);
                setQuestions(data);
            } catch (error) {
                console.error('Error loading exams:', error);
                Alert.alert(t('common.error'), t('education.loadError'));
            } finally {
                setLoading(false);
            }
        };
        loadExams();
    }, [moduleId]);

    const handleSelectOption = (questionId: number, optionId: number) => {
        triggerTapFeedback();
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < questions.length) {
            Alert.alert(t('education.attention'), t('education.answerAll'));
            return;
        }

        try {
            setSubmitting(true);
            const res = await educationService.submitExam(moduleId, answers);
            setResult(res);
        } catch (error) {
            console.error('Error submitting exam:', error);
            Alert.alert(t('common.error'), t('education.submitError'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: vTheme.colors.background }]}>
                <ActivityIndicator size="large" color={roleColors.accent} />
            </View>
        );
    }

    if (result) {
        return (
            <View style={[styles.center, styles.padding, { backgroundColor: vTheme.colors.background }]}>
                <Text style={styles.resultEmoji}>{result.passed ? '🎉' : '📖'}</Text>
                <Text style={[styles.resultTitle, { color: vTheme.colors.text }]}>
                    {result.passed ? t('education.congrats') : t('education.tryAgain')}
                </Text>
                <Text style={[styles.resultScore, { color: roleColors.accent }]}>
                    {t('education.yourResult')}: {result.score} / {result.total_points}
                </Text>
                <Text style={[styles.resultSub, { color: vTheme.colors.textSecondary }]}>
                    {result.passed
                        ? t('education.passedMsg')
                        : t('education.failedMsg')}
                </Text>
                <View style={[styles.resultBadge, { backgroundColor: result.passed ? roleColors.success + '20' : roleColors.danger + '20' }]}>
                    {result.passed ? (
                        <CircleCheck size={16} color={roleColors.success} />
                    ) : (
                        <CircleX size={16} color={roleColors.danger} />
                    )}
                    <Text style={[styles.resultBadgeText, { color: result.passed ? roleColors.success : roleColors.danger }]}>
                        {result.passed ? 'Тест пройден' : 'Нужна повторная попытка'}
                    </Text>
                </View>
                <TouchableOpacity
                    activeOpacity={0.88}
                    style={[styles.primaryButton, { backgroundColor: roleColors.accent }]}
                    onPress={() => {
                        triggerTapFeedback();
                        navigation.goBack();
                    }}
                >
                    <Text style={styles.primaryButtonText}>{t('education.backToCourse')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentQuestion = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            <View style={[styles.topMeta, { backgroundColor: roleColors.surfaceElevated, borderBottomColor: roleColors.border }]}>
                <View style={[styles.topMetaBadge, { backgroundColor: roleColors.accentSoft }]}>
                    <Sparkles size={12} color={roleColors.accent} />
                    <Text style={[styles.topMetaBadgeText, { color: roleColors.accent }]}>Exam trainer</Text>
                </View>
                <Text style={[styles.topMetaTitle, { color: roleColors.textPrimary }]} numberOfLines={1}>
                    {title || 'Модуль'}
                </Text>
            </View>

            <View style={[styles.progressBarContainer, { backgroundColor: isDarkMode ? 'rgb(51,51,51)' : 'rgb(224,224,224)' }]}>
                <View style={[styles.progressBar, { width: `${((currentIndex + 1) / questions.length) * 100}%`, backgroundColor: roleColors.accent }]} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.questionCounter, { color: vTheme.colors.textSecondary }]}>{t('education.questionInfo', { current: currentIndex + 1, total: questions.length })}</Text>

                <View style={[styles.questionCard, { backgroundColor: vTheme.colors.surface }]}>
                    <Text style={[styles.questionText, { color: roleColors.textPrimary }]}>{currentQuestion?.text}</Text>
                    {currentQuestion?.verse_reference && (
                        <Text style={[styles.verseRef, { color: roleColors.accent }]}>{t('education.source')}: {currentQuestion.verse_reference}</Text>
                    )}
                </View>

                <View style={styles.optionsContainer}>
                    {currentQuestion?.options.map((option) => (
                        <TouchableOpacity
                            key={option.ID}
                            activeOpacity={0.88}
                            style={[
                                styles.optionButton,
                                { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border },
                                answers[currentQuestion.ID] === option.ID && [styles.optionSelected, { borderColor: roleColors.accent, backgroundColor: roleColors.accent + '10' }]
                            ]}
                            onPress={() => handleSelectOption(currentQuestion.ID, option.ID)}
                        >
                            <Text style={[
                                styles.optionText,
                                { color: roleColors.textPrimary },
                                answers[currentQuestion.ID] === option.ID && [styles.optionTextSelected, { color: roleColors.accent }]
                            ]}>
                                {option.text}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: vTheme.colors.divider }]}>
                {currentIndex > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={[styles.secondaryButton, { borderColor: vTheme.colors.divider }]}
                        onPress={() => {
                            triggerTapFeedback();
                            setCurrentIndex(prev => prev - 1);
                        }}
                    >
                        <Text style={[styles.secondaryButtonText, { color: vTheme.colors.textSecondary }]}>{t('common.back')}</Text>
                    </TouchableOpacity>
                )}

                {!isLast ? (
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={[styles.primaryButton, { flex: 1, backgroundColor: roleColors.accent }]}
                        onPress={() => {
                            triggerTapFeedback();
                            setCurrentIndex(prev => prev + 1);
                        }}
                        disabled={!answers[currentQuestion?.ID]}
                    >
                        <Text style={styles.primaryButtonText}>{t('education.next')}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        activeOpacity={0.88}
                        style={[styles.primaryButton, { flex: 1, backgroundColor: roleColors.accent }]}
                        onPress={() => {
                            triggerTapFeedback();
                            handleSubmit();
                        }}
                        disabled={submitting || !answers[currentQuestion?.ID]}
                    >
                        {submitting ? <ActivityIndicator color="rgba(255,255,255,1)" /> : <Text style={styles.primaryButtonText}>{t('education.finish')}</Text>}
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topMeta: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    topMetaBadge: {
        alignSelf: 'flex-start',
        minHeight: 24,
        borderRadius: 999,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    topMetaBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    topMetaTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    padding: {
        padding: 30,
    },
    scrollContent: {
        padding: 20,
    },
    progressBarContainer: {
        height: 5,
        backgroundColor: 'rgb(224,224,224)',
        width: '100%',
    },
    progressBar: {
        height: '100%',
    },
    questionCounter: {
        fontSize: 14,
        marginBottom: 10,
        fontWeight: '600',
    },
    questionCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 20,
        marginBottom: 20,
        borderColor: 'rgba(148,163,184,0.25)',
    },
    questionText: {
        fontSize: 18,
        lineHeight: 26,
        fontWeight: '500',
    },
    verseRef: {
        marginTop: 10,
        fontSize: 12,
        fontStyle: 'italic',
    },
    optionsContainer: {
        gap: 12,
    },
    optionButton: {
        borderRadius: 14,
        padding: 18,
        borderWidth: 1,
        minHeight: 52,
        justifyContent: 'center',
    },
    optionSelected: {
    },
    optionText: {
        fontSize: 16,
    },
    optionTextSelected: {
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        gap: 15,
        borderTopWidth: 1,
    },
    primaryButton: {
        minHeight: 48,
        paddingVertical: 13,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButton: {
        minHeight: 48,
        paddingVertical: 13,
        paddingHorizontal: 25,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: 16,
    },
    resultEmoji: {
        fontSize: 80,
        marginBottom: 20,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    resultScore: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    resultSub: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    resultBadge: {
        minHeight: 34,
        borderRadius: 999,
        paddingHorizontal: 12,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
        marginBottom: 14,
    },
    resultBadgeText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
