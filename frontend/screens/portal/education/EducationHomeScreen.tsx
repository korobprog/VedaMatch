import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { Book, ChevronRight, Sparkles, GraduationCap } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { educationService } from '../../../services/educationService';
import { EducationCourse } from '../../../types/education';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { usePressFeedback } from '../../../hooks/usePressFeedback';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EducationHome'>;

export const EducationHomeScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useUser();
    const { t } = useTranslation();
    const { vTheme, isDarkMode } = useSettings();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const triggerTapFeedback = usePressFeedback();
    const [courses, setCourses] = useState<EducationCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadCourses = async () => {
        try {
            setError(null);
            if (!refreshing) setLoading(true);
            const data = await educationService.getCourses();
            setCourses(data);
        } catch (error) {
            console.error('Error loading courses:', error);
            setError(t('education.loadError'));
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
            activeOpacity={0.9}
            style={[
                styles.courseCard,
                {
                    backgroundColor: roleColors.surfaceElevated,
                    borderColor: roleColors.border,
                },
            ]}
            onPress={() => {
                triggerTapFeedback();
                navigation.navigate('CourseDetails', { courseId: item.ID });
            }}
        >
            <View style={[styles.courseImagePlaceholder, { backgroundColor: roleColors.accentSoft }]}>
                <Book size={30} color={roleColors.accent} />
            </View>
            <View style={styles.courseInfo}>
                <View style={styles.courseTopRow}>
                    <Text style={[styles.courseOrg, { color: roleColors.accent }]}>{item.organization}</Text>
                    <View style={[styles.courseChip, { backgroundColor: roleColors.accentSoft }]}>
                        <GraduationCap size={11} color={roleColors.accent} />
                        <Text style={[styles.courseChipText, { color: roleColors.accent }]}>Курс</Text>
                    </View>
                </View>
                <Text style={[styles.courseTitle, { color: roleColors.textPrimary }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.courseDesc, { color: roleColors.textSecondary }]} numberOfLines={2}>
                    {item.description}
                </Text>
            </View>
            <View style={[styles.chevronWrap, { borderColor: roleColors.border }]}>
                <ChevronRight size={15} color={roleColors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

    const filteredCourses = courses.filter(c => c.organization === user?.madh);
    const otherCourses = courses.filter(c => c.organization !== user?.madh);

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { backgroundColor: roleColors.background }]}>
                <View style={[styles.hero, { backgroundColor: roleColors.surfaceElevated, borderBottomColor: roleColors.border }]}>
                    <View style={[styles.heroBadge, { backgroundColor: roleColors.accentSoft }]}>
                        <Sparkles size={14} color={roleColors.accent} />
                        <Text style={[styles.heroBadgeText, { color: roleColors.accent }]}>Education Hub</Text>
                    </View>
                    <Text style={[styles.headerTitle, { color: roleColors.textPrimary }]}>{t('education.title')}</Text>
                    <Text style={[styles.headerSub, { color: roleColors.textSecondary }]}>{t('education.subtitle')}</Text>
                </View>
                <View style={styles.section}>
                    {[1, 2, 3].map((idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.skeletonCard,
                                { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border },
                            ]}
                        />
                    ))}
                </View>
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: roleColors.background }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleColors.accent} />}
        >
            <GodModeStatusBanner />
            <View style={[styles.hero, { backgroundColor: roleColors.surfaceElevated, borderBottomColor: roleColors.border }]}>
                <View style={[styles.heroBadge, { backgroundColor: roleColors.accentSoft }]}>
                    <Sparkles size={14} color={roleColors.accent} />
                    <Text style={[styles.heroBadgeText, { color: roleColors.accent }]}>Education Hub</Text>
                </View>
                <Text style={[styles.headerTitle, { color: roleColors.textPrimary }]}>{t('education.title')}</Text>
                <Text style={[styles.headerSub, { color: roleColors.textSecondary }]}>{t('education.subtitle')}</Text>
            </View>

            {filteredCourses.length > 0 && (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: roleColors.textPrimary }]}>{t('education.recommended')} ({user?.madh})</Text>
                    {filteredCourses.map(course => (
                        <View key={course.ID}>
                            {renderCourseItem({ item: course })}
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: roleColors.textPrimary }]}>{t('education.allCourses')}</Text>
                {error ? (
                    <View style={[styles.emptyState, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
                        <Text style={[styles.emptyTitle, { color: roleColors.textPrimary }]}>{error}</Text>
                        <TouchableOpacity
                            activeOpacity={0.88}
                            style={[styles.emptyCta, { backgroundColor: roleColors.accent }]}
                            onPress={() => {
                                triggerTapFeedback();
                                loadCourses();
                            }}
                        >
                            <Text style={styles.emptyCtaText}>{t('common.retry') || 'Повторить'}</Text>
                        </TouchableOpacity>
                    </View>
                ) : otherCourses.length > 0 ? (
                    otherCourses.map(course => (
                        <View key={course.ID}>
                            {renderCourseItem({ item: course })}
                        </View>
                    ))
                ) : (
                    filteredCourses.length === 0 && (
                        <View style={[styles.emptyState, { backgroundColor: roleColors.surfaceElevated, borderColor: roleColors.border }]}>
                            <Text style={[styles.emptyTitle, { color: roleColors.textPrimary }]}>{t('education.noCourses')}</Text>
                            <TouchableOpacity
                                activeOpacity={0.88}
                                style={[styles.emptyCta, { backgroundColor: roleColors.accent }]}
                                onPress={() => {
                                    triggerTapFeedback();
                                    onRefresh();
                                }}
                            >
                                <Text style={styles.emptyCtaText}>Обновить список</Text>
                            </TouchableOpacity>
                        </View>
                    )
                )}
            </View>
        </ScrollView>
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
    hero: {
        padding: 20,
        borderBottomWidth: 1,
    },
    heroBadge: {
        alignSelf: 'flex-start',
        minHeight: 28,
        borderRadius: 999,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    heroBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        fontFamily: 'Playfair Display',
    },
    headerSub: {
        fontSize: 17,
        marginTop: 4,
        lineHeight: 24,
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 16,
    },
    courseCard: {
        flexDirection: 'row',
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        marginBottom: 14,
        minHeight: 108,
    },
    courseImagePlaceholder: {
        width: 68,
        height: 68,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    courseTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    courseOrg: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    courseChip: {
        minHeight: 22,
        borderRadius: 999,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    courseChipText: {
        fontSize: 11,
        fontWeight: '700',
    },
    courseTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
        lineHeight: 24,
    },
    courseDesc: {
        fontSize: 14,
        lineHeight: 20,
    },
    chevronWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
    },
    emptyState: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    emptyCta: {
        minHeight: 44,
        marginTop: 12,
        borderRadius: 12,
        paddingHorizontal: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCtaText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    skeletonCard: {
        height: 108,
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 14,
        opacity: 0.65,
    },
});
