import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    SafeAreaView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { ModernVedicTheme } from '../../../theme/ModernVedicTheme';
import { educationService } from '../../../services/educationService';
import { EducationCourse, EducationModule } from '../../../types/education';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react-native';

type CourseDetailsRouteProp = RouteProp<RootStackParamList, 'CourseDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CourseDetails'>;

export const CourseDetailsScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<CourseDetailsRouteProp>();
    const { courseId } = route.params;
    const { t } = useTranslation();

    const [course, setCourse] = useState<EducationCourse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDetails = async () => {
            try {
                const data = await educationService.getCourseDetails(courseId);
                setCourse(data);
            } catch (error) {
                console.error('Error loading course details:', error);
            } finally {
                setLoading(false);
            }
        };
        loadDetails();
    }, [courseId]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={ModernVedicTheme.colors.primary} />
            </View>
        );
    }

    if (!course) {
        return (
            <View style={styles.center}>
                <Text>{t('education.courseNotFound')}</Text>
            </View>
        );
    }

    const handleOpenBook = () => {
        if (course.scripture_book) {
            navigation.navigate('Reader', { 
                bookCode: course.scripture_book.code, 
                title: course.scripture_book.name_ru || course.scripture_book.name_en 
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.orgBadge}>{course.organization}</Text>
                    <Text style={styles.title}>{course.title}</Text>
                    <Text style={styles.description}>{course.description}</Text>
                    
                    {course.scripture_book && (
                        <TouchableOpacity 
                            style={styles.bookButton}
                            onPress={handleOpenBook}
                        >
                            <BookOpen size={20} color={ModernVedicTheme.colors.primary} />
                            <Text style={styles.bookButtonText}>Читать оригинал</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.moduleSection}>
                    <Text style={styles.sectionTitle}>{t('education.courseProgram')}</Text>
                    {course.modules?.map((module, index) => (
                        <TouchableOpacity
                            key={module.ID}
                            style={styles.moduleCard}
                            onPress={() => navigation.navigate('ExamTrainer', { moduleId: module.ID, title: module.title })}
                        >
                            <View style={styles.moduleNumberContainer}>
                                <Text style={styles.moduleNumber}>{index + 1}</Text>
                            </View>
                            <View style={styles.moduleInfo}>
                                <Text style={styles.moduleTitle}>{module.title}</Text>
                                <Text style={styles.moduleDesc} numberOfLines={1}>{module.description}</Text>
                            </View>
                            <Text style={styles.arrow}>→</Text>
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
        backgroundColor: ModernVedicTheme.colors.background,
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
        backgroundColor: ModernVedicTheme.colors.surface,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        ...ModernVedicTheme.shadows.medium,
    },
    orgBadge: {
        backgroundColor: ModernVedicTheme.colors.primary + '20',
        color: ModernVedicTheme.colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 'bold',
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: ModernVedicTheme.colors.text,
        marginBottom: 15,
        fontFamily: 'Playfair Display',
    },
    description: {
        fontSize: 15,
        color: ModernVedicTheme.colors.textSecondary,
        lineHeight: 22,
    },
    bookButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        padding: 12,
        borderRadius: 12,
        backgroundColor: ModernVedicTheme.colors.primary + '10',
        borderWidth: 1,
        borderColor: ModernVedicTheme.colors.primary + '30',
        gap: 10,
    },
    bookButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: ModernVedicTheme.colors.primary,
    },
    moduleSection: {
        padding: 20,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: ModernVedicTheme.colors.text,
        marginBottom: 15,
    },
    moduleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: ModernVedicTheme.colors.surface,
        borderRadius: 15,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: ModernVedicTheme.colors.divider,
    },
    moduleNumberContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: ModernVedicTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moduleNumber: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    moduleInfo: {
        flex: 1,
        marginLeft: 15,
    },
    moduleTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: ModernVedicTheme.colors.text,
    },
    moduleDesc: {
        fontSize: 12,
        color: ModernVedicTheme.colors.textSecondary,
        marginTop: 2,
    },
    arrow: {
        fontSize: 20,
        color: ModernVedicTheme.colors.primary,
        marginLeft: 10,
    }
});
