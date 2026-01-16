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
import { ModernVedicTheme } from '../../../theme/ModernVedicTheme';
import { educationService } from '../../../services/educationService';
import { ExamQuestion, UserExamAttempt } from '../../../types/education';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../../context/SettingsContext';

type ExamTrainerRouteProp = RouteProp<RootStackParamList, 'ExamTrainer'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExamTrainer'>;

export const ExamTrainerScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ExamTrainerRouteProp>();
    const { moduleId, title } = route.params;
    const { t } = useTranslation();
    const { vTheme, isDarkMode } = useSettings();

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
                <ActivityIndicator size="large" color={vTheme.colors.primary} />
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
                <Text style={[styles.resultScore, { color: vTheme.colors.primary }]}>
                    {t('education.yourResult')}: {result.score} / {result.total_points}
                </Text>
                <Text style={[styles.resultSub, { color: vTheme.colors.textSecondary }]}>
                    {result.passed
                        ? t('education.passedMsg')
                        : t('education.failedMsg')}
                </Text>
                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: vTheme.colors.primary }]}
                    onPress={() => navigation.goBack()}
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
            <View style={[styles.progressBarContainer, { backgroundColor: isDarkMode ? '#333' : '#E0E0E0' }]}>
                <View style={[styles.progressBar, { width: `${((currentIndex + 1) / questions.length) * 100}%`, backgroundColor: vTheme.colors.primary }]} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.questionCounter, { color: vTheme.colors.textSecondary }]}>{t('education.questionInfo', { current: currentIndex + 1, total: questions.length })}</Text>

                <View style={[styles.questionCard, { backgroundColor: vTheme.colors.surface }]}>
                    <Text style={[styles.questionText, { color: vTheme.colors.text }]}>{currentQuestion?.text}</Text>
                    {currentQuestion?.verse_reference && (
                        <Text style={[styles.verseRef, { color: vTheme.colors.primary }]}>{t('education.source')}: {currentQuestion.verse_reference}</Text>
                    )}
                </View>

                <View style={styles.optionsContainer}>
                    {currentQuestion?.options.map((option) => (
                        <TouchableOpacity
                            key={option.ID}
                            style={[
                                styles.optionButton,
                                { backgroundColor: vTheme.colors.surface, borderColor: vTheme.colors.divider },
                                answers[currentQuestion.ID] === option.ID && [styles.optionSelected, { borderColor: vTheme.colors.primary, backgroundColor: vTheme.colors.primary + '10' }]
                            ]}
                            onPress={() => handleSelectOption(currentQuestion.ID, option.ID)}
                        >
                            <Text style={[
                                styles.optionText,
                                { color: vTheme.colors.text },
                                answers[currentQuestion.ID] === option.ID && [styles.optionTextSelected, { color: vTheme.colors.primary }]
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
                        style={[styles.secondaryButton, { borderColor: vTheme.colors.divider }]}
                        onPress={() => setCurrentIndex(prev => prev - 1)}
                    >
                        <Text style={[styles.secondaryButtonText, { color: vTheme.colors.textSecondary }]}>{t('common.back')}</Text>
                    </TouchableOpacity>
                )}

                {!isLast ? (
                    <TouchableOpacity
                        style={[styles.primaryButton, { flex: 1, backgroundColor: vTheme.colors.primary }]}
                        onPress={() => setCurrentIndex(prev => prev + 1)}
                        disabled={!answers[currentQuestion?.ID]}
                    >
                        <Text style={styles.primaryButtonText}>{t('education.next')}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.primaryButton, { flex: 1, backgroundColor: vTheme.colors.primary }]}
                        onPress={handleSubmit}
                        disabled={submitting || !answers[currentQuestion?.ID]}
                    >
                        {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>{t('education.finish')}</Text>}
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ModernVedicTheme.colors.background,
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
        height: 4,
        backgroundColor: '#E0E0E0',
        width: '100%',
    },
    progressBar: {
        height: '100%',
        backgroundColor: ModernVedicTheme.colors.primary,
    },
    questionCounter: {
        fontSize: 14,
        color: ModernVedicTheme.colors.textSecondary,
        marginBottom: 10,
        fontWeight: '600',
    },
    questionCard: {
        backgroundColor: ModernVedicTheme.colors.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        ...ModernVedicTheme.shadows.medium,
    },
    questionText: {
        fontSize: 18,
        lineHeight: 26,
        color: ModernVedicTheme.colors.text,
        fontWeight: '500',
    },
    verseRef: {
        marginTop: 10,
        fontSize: 12,
        color: ModernVedicTheme.colors.primary,
        fontStyle: 'italic',
    },
    optionsContainer: {
        gap: 12,
    },
    optionButton: {
        backgroundColor: ModernVedicTheme.colors.surface,
        borderRadius: 15,
        padding: 18,
        borderWidth: 1,
        borderColor: ModernVedicTheme.colors.divider,
    },
    optionSelected: {
        borderColor: ModernVedicTheme.colors.primary,
        backgroundColor: ModernVedicTheme.colors.primary + '10',
    },
    optionText: {
        fontSize: 16,
        color: ModernVedicTheme.colors.text,
    },
    optionTextSelected: {
        color: ModernVedicTheme.colors.primary,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        gap: 15,
        borderTopWidth: 1,
        borderTopColor: ModernVedicTheme.colors.divider,
    },
    primaryButton: {
        backgroundColor: ModernVedicTheme.colors.primary,
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButton: {
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: ModernVedicTheme.colors.divider,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: ModernVedicTheme.colors.textSecondary,
        fontSize: 16,
    },
    resultEmoji: {
        fontSize: 80,
        marginBottom: 20,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: ModernVedicTheme.colors.text,
        marginBottom: 10,
    },
    resultScore: {
        fontSize: 20,
        color: ModernVedicTheme.colors.primary,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    resultSub: {
        fontSize: 16,
        textAlign: 'center',
        color: ModernVedicTheme.colors.textSecondary,
        marginBottom: 30,
        lineHeight: 24,
    }
});
