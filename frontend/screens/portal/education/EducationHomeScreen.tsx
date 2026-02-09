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
import { Book } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { ModernVedicTheme } from '../../../theme/ModernVedicTheme';
import { educationService } from '../../../services/educationService';
import { EducationCourse } from '../../../types/education';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
import { useRoleTheme } from '../../../hooks/useRoleTheme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EducationHome'>;

export const EducationHomeScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useUser();
    const { t } = useTranslation();
    const { vTheme, isDarkMode } = useSettings();
    const { colors: roleColors } = useRoleTheme(user?.role, true);
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
            style={[styles.courseCard, { backgroundColor: vTheme.colors.surface }]}
            onPress={() => navigation.navigate('CourseDetails', { courseId: item.ID })}
        >
            <View style={[styles.courseImagePlaceholder, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5' }]}>
                <Book size={40} color={roleColors.accent} />
            </View>
            <View style={styles.courseInfo}>
                <Text style={[styles.courseOrg, { color: roleColors.accent }]}>{item.organization}</Text>
                <Text style={[styles.courseTitle, { color: vTheme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.courseDesc, { color: vTheme.colors.textSecondary }]} numberOfLines={2}>
                    {item.description}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const filteredCourses = courses.filter(c => c.organization === user?.madh);
    const otherCourses = courses.filter(c => c.organization !== user?.madh);

    if (loading && !refreshing) {
        return (
            <View style={[styles.center, { backgroundColor: vTheme.colors.background }]}>
                <ActivityIndicator size="large" color={roleColors.accent} />
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: vTheme.colors.background }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleColors.accent} />}
        >
            <GodModeStatusBanner />
            <View style={[styles.header, { backgroundColor: vTheme.colors.surface, borderBottomColor: vTheme.colors.divider }]}>
                <Text style={[styles.headerTitle, { color: roleColors.accent }]}>{t('education.title')}</Text>
                <Text style={[styles.headerSub, { color: vTheme.colors.textSecondary }]}>{t('education.subtitle')}</Text>
            </View>

            {filteredCourses.length > 0 && (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('education.recommended')} ({user?.madh})</Text>
                    {filteredCourses.map(course => (
                        <View key={course.ID}>
                            {renderCourseItem({ item: course })}
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>{t('education.allCourses')}</Text>
                {otherCourses.length > 0 ? (
                    otherCourses.map(course => (
                        <View key={course.ID}>
                            {renderCourseItem({ item: course })}
                        </View>
                    ))
                ) : (
                    filteredCourses.length === 0 && <Text style={[styles.emptyText, { color: vTheme.colors.textSecondary }]}>{t('education.noCourses')}</Text>
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
