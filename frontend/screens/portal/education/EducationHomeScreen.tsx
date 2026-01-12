import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { ModernVedicTheme } from '../../../theme/ModernVedicTheme';
import { educationService } from '../../../services/educationService';
import { EducationCourse } from '../../../types/education';
import { useUser } from '../../../context/UserContext';
import { useTranslation } from 'react-i18next';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EducationHome'>;

export const EducationHomeScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useUser();
    const { t } = useTranslation();
    const [courses, setCourses] = useState<EducationCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadCourses = async () => {
        try {
            setLoading(true);
            const data = await educationService.getCourses();
            setCourses(data);
        } catch (error) {
            console.error('Error loading courses:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadCourses();
    };

    const renderCourseItem = ({ item }: { item: EducationCourse }) => (
        <TouchableOpacity
            style={styles.courseCard}
            onPress={() => navigation.navigate('CourseDetails', { courseId: item.ID })}
        >
            <View style={styles.courseImagePlaceholder}>
                <Text style={styles.courseEmoji}>📚</Text>
            </View>
            <View style={styles.courseInfo}>
                <Text style={styles.courseOrg}>{item.organization}</Text>
                <Text style={styles.courseTitle}>{item.title}</Text>
                <Text style={styles.courseDesc} numberOfLines={2}>
                    {item.description}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const filteredCourses = courses.filter(c => c.organization === user?.madh);
    const otherCourses = courses.filter(c => c.organization !== user?.madh);

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={ModernVedicTheme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('education.title')}</Text>
                <Text style={styles.headerSub}>{t('education.subtitle')}</Text>
            </View>

            {filteredCourses.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('education.recommended')} ({user?.madh})</Text>
                    {filteredCourses.map(course => (
                        <View key={course.ID}>
                            {renderCourseItem({ item: course })}
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('education.allCourses')}</Text>
                {otherCourses.length > 0 ? (
                    otherCourses.map(course => (
                        <View key={course.ID}>
                            {renderCourseItem({ item: course })}
                        </View>
                    ))
                ) : (
                    filteredCourses.length === 0 && <Text style={styles.emptyText}>{t('education.noCourses')}</Text>
                )}
            </View>
        </ScrollView>
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
    header: {
        padding: 20,
        backgroundColor: ModernVedicTheme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: ModernVedicTheme.colors.divider,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: ModernVedicTheme.colors.primary,
        fontFamily: 'Playfair Display',
    },
    headerSub: {
        fontSize: 14,
        color: ModernVedicTheme.colors.textSecondary,
        marginTop: 4,
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: ModernVedicTheme.colors.text,
        marginBottom: 15,
    },
    courseCard: {
        flexDirection: 'row',
        backgroundColor: ModernVedicTheme.colors.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 15,
        ...ModernVedicTheme.shadows.soft,
    },
    courseImagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseEmoji: {
        fontSize: 40,
    },
    courseInfo: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'center',
    },
    courseOrg: {
        fontSize: 12,
        fontWeight: '600',
        color: ModernVedicTheme.colors.primary,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    courseTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: ModernVedicTheme.colors.text,
        marginBottom: 4,
    },
    courseDesc: {
        fontSize: 13,
        color: ModernVedicTheme.colors.textSecondary,
        lineHeight: 18,
    },
    emptyText: {
        textAlign: 'center',
        color: ModernVedicTheme.colors.textSecondary,
        marginTop: 20,
    }
});
