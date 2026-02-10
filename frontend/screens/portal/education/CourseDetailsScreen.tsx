import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { educationService } from '../../../services/educationService';
import { EducationCourse } from '../../../types/education';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../../context/SettingsContext';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { usePressFeedback } from '../../../hooks/usePressFeedback';

type CourseDetailsRouteProp = RouteProp<RootStackParamList, 'CourseDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CourseDetails'>;

export const CourseDetailsScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<CourseDetailsRouteProp>();
    const { courseId } = route.params;
    const { t } = useTranslation();
    const { vTheme, isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const triggerTapFeedback = usePressFeedback();

    const [course, setCourse] = useState<EducationCourse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDetails = async () => {
        try {
            setError(null);
            setLoading(true);
            const data = await educationService.getCourseDetails(courseId);
            setCourse(data);
        } catch (error) {
            console.error('Error loading course details:', error);
            setError(t('education.loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDetails();
    }, [courseId]);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: vTheme.colors.background, padding: 20 }]}>
                <View style={[styles.header, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
                    <View style={[styles.skeletonLine, { width: 120, backgroundColor: roleColors.border }]} />
                    <View style={[styles.skeletonLine, { width: '80%', marginTop: 10, height: 26, backgroundColor: roleColors.border }]} />
                    <View style={[styles.skeletonLine, { width: '100%', marginTop: 12, height: 14, backgroundColor: roleColors.border }]} />
                    <View style={[styles.skeletonLine, { width: '92%', marginTop: 8, height: 14, backgroundColor: roleColors.border }]} />
                </View>
            </View>
        );
    }

    if (error || !course) {
        return (
            <View style={[styles.center, { backgroundColor: vTheme.colors.background }]}>
                <Text style={{ color: vTheme.colors.text, marginBottom: 12 }}>{error || t('education.courseNotFound')}</Text>
                <TouchableOpacity style={[styles.bookButton, { backgroundColor: roleColors.accentSoft, borderColor: roleColors.border }]} onPress={loadDetails}>
                    <Text style={[styles.bookButtonText, { color: roleColors.accent }]}>{t('common.retry') || 'Повторить'}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const scriptureBook = (course as EducationCourse & {
        scripture_book?: {
            code?: string;
            name_ru?: string;
            name_en?: string;
        };
    }).scripture_book;

    const handleOpenBook = () => {
        if (scriptureBook?.code) {
            navigation.navigate('Reader', {
                bookCode: scriptureBook.code,
                title: scriptureBook.name_ru || scriptureBook.name_en || course.title,
            });
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.header, { backgroundColor: vTheme.colors.surface }]}>
                    <Text style={[styles.orgBadge, { backgroundColor: roleColors.accent + '20', color: roleColors.accent }]}>{course.organization}</Text>
                    <Text style={[styles.title, { color: vTheme.colors.text }]}>{course.title}</Text>
                    <Text style={[styles.description, { color: vTheme.colors.textSecondary }]}>{course.description}</Text>

                    {scriptureBook && (
                        <TouchableOpacity
                            activeOpacity={0.88}
                            style={[styles.bookButton, { backgroundColor: roleColors.accentSoft, borderColor: roleColors.border }]}
                            onPress={() => {
                                triggerTapFeedback();
                                handleOpenBook();
                            }}
                        >
                            <BookOpen size={20} color={roleColors.accent} />
                            <Text style={[styles.bookButtonText, { color: roleColors.accent }]}>Читать оригинал</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.moduleSection}>
                    <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('education.courseProgram')}</Text>
                    {course.modules?.map((module, index) => (
                        <TouchableOpacity
                            key={module.ID}
                            activeOpacity={0.88}
                            style={[styles.moduleCard, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}
                            onPress={() => {
                                triggerTapFeedback();
                                navigation.navigate('ExamTrainer', { moduleId: module.ID, title: module.title });
                            }}
                        >
                            <View style={[styles.moduleNumberContainer, { backgroundColor: roleColors.accent }]}>
                                <Text style={styles.moduleNumber}>{index + 1}</Text>
                            </View>
                            <View style={styles.moduleInfo}>
                                <Text style={[styles.moduleTitle, { color: vTheme.colors.text }]}>{module.title}</Text>
                                <Text style={[styles.moduleDesc, { color: vTheme.colors.textSecondary }]} numberOfLines={1}>{module.description}</Text>
                            </View>
                            <ChevronRight size={20} color={roleColors.accent} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 30,
    },
    header: {
        padding: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        borderWidth: 1,
    },
    orgBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 'bold',
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 15,
        fontFamily: 'Playfair Display',
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
    },
    bookButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        minHeight: 44,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
    },
    bookButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    moduleSection: {
        padding: 20,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 15,
    },
    moduleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
    },
    moduleNumberContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moduleNumber: {
        color: 'rgba(255,255,255,1)',
        fontWeight: 'bold',
    },
    moduleInfo: {
        flex: 1,
        marginLeft: 15,
    },
    moduleTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    moduleDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    arrow: {
        fontSize: 20,
        marginLeft: 10,
    },
    skeletonLine: {
        height: 12,
        borderRadius: 8,
        opacity: 0.6,
    },
});
