import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Star, Award, Users, ThumbsUp, Medal, Map, UserCheck } from 'lucide-react-native';
import { yatraService } from '../../services/yatraService';
import { useTranslation } from 'react-i18next';
import { BlurView } from '@react-native-community/blur';
import { LayoutGrid } from 'lucide-react-native';

interface OrganizerBadgeProps {
    userId: number;
    variant?: 'compact' | 'full';
    showLabel?: boolean;
}

interface OrganizerStats {
    organizedCount: number;
    averageRating: number;
    totalParticipants: number;
    recommendations: number;
}

const OrganizerBadge: React.FC<OrganizerBadgeProps> = ({
    userId,
    variant = 'compact',
    showLabel = true
}) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState<OrganizerStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                // Mock data for development if API fails or returns empty
                // Remove in production if API is guaranteed
                const data = await yatraService.getOrganizerStats(userId);
                if (data) {
                    setStats(data);
                } else {
                    setStats({
                        organizedCount: 0,
                        averageRating: 0,
                        totalParticipants: 0,
                        recommendations: 0
                    });
                }
            } catch (error) {
                console.error('Error loading organizer stats:', error);
                setStats({
                    organizedCount: 0,
                    averageRating: 0,
                    totalParticipants: 0,
                    recommendations: 0
                });
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, [userId]);

    if (loading) {
        return null;
    }

    if (!stats || stats.organizedCount === 0) {
        return null;
    }

    // Badge tier based on organized tours and rating
    const getBadgeTier = (): { tierKey: string; color: string; icon: React.ReactNode } => {
        const { organizedCount, averageRating } = stats;

        if (organizedCount >= 10 && averageRating >= 4.5) {
            return { tierKey: 'master', color: '#FFD700', icon: <Award size={16} color="#FFD700" /> };
        }
        if (organizedCount >= 5 && averageRating >= 4.0) {
            return { tierKey: 'experienced', color: '#C0C0C0', icon: <Medal size={16} color="#C0C0C0" /> };
        }
        if (organizedCount >= 1) {
            return { tierKey: 'organizer', color: '#CD7F32', icon: <Users size={16} color="#CD7F32" /> };
        }
        return { tierKey: 'novice', color: '#8E8E93', icon: <ThumbsUp size={16} color="#8E8E93" /> };
    };

    const badge = getBadgeTier();
    const tierName = t(`contacts.organizer_tiers.${badge.tierKey}`, { defaultValue: badge.tierKey });

    if (variant === 'compact') {
        return (
            <View style={[styles.compactBadge, { borderColor: badge.color, backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                {badge.icon}
                {showLabel && <Text style={[styles.compactText, { color: badge.color }]}>{tierName}</Text>}
            </View>
        );
    }

    return (
        <View style={styles.fullBadgeContainer}>
            <BlurView
                style={StyleSheet.absoluteFill}
                blurType="dark"
                blurAmount={15}
                reducedTransparencyFallbackColor="rgba(20, 20, 20, 0.8)"
            />

            <View style={styles.badgeHeaderRow}>
                <View style={[styles.badgeIconBg, { backgroundColor: `${badge.color}20`, borderColor: `${badge.color}40` }]}>
                    {badge.icon}
                </View>
                <Text style={[styles.tierText, { color: badge.color }]}>{tierName}</Text>
            </View>

            <View style={styles.statsRow}>
                {/* Tours Count */}
                <View style={styles.statItem}>
                    <View style={styles.iconCircle}>
                        <Map size={14} color="#A1A1AA" />
                    </View>
                    <Text style={styles.statValue}>{stats.organizedCount}</Text>
                    {/* <Text style={styles.statLabel}>{t('contacts.tours')}</Text> */}
                </View>

                <View style={styles.statDivider} />

                {/* Rating */}
                <View style={styles.statItem}>
                    <View style={styles.iconCircle}>
                        <Star size={14} color="#FFD700" fill="#FFD700" />
                    </View>
                    <Text style={[styles.statValue, { color: '#FFD700' }]}>{stats.averageRating.toFixed(1)}</Text>
                    {/* <Text style={styles.statLabel}>{t('contacts.rating')}</Text> */}
                </View>

                <View style={styles.statDivider} />

                {/* Participants */}
                <View style={styles.statItem}>
                    <View style={styles.iconCircle}>
                        <UserCheck size={14} color="#A1A1AA" />
                    </View>
                    <Text style={styles.statValue}>{stats.totalParticipants}</Text>
                    {/* <Text style={styles.statLabel}>{t('contacts.participants')}</Text> */}
                </View>
            </View>

            {stats.recommendations > 0 && (
                <View style={styles.recommendRow}>
                    <ThumbsUp size={14} color="#34C759" />
                    <Text style={styles.recommendText}>
                        {stats.recommendations} {t('contacts.recommendations')}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    compactBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    compactText: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: 'Nunito',
    },
    fullBadgeContainer: {
        borderRadius: 20, // Soft corners
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(30, 30, 30, 0.6)', // Fallback bg
    },
    badgeHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(0,0,0,0.2)', // Added semi-transparent background
    },
    badgeIconBg: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    tierText: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Cinzel-Bold',
        letterSpacing: 0.5,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    statItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flex: 1,
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
    },
    statLabel: {
        color: '#A1A1AA',
        fontSize: 10,
        fontFamily: 'Nunito',
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        height: '60%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'center',
    },
    recommendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(52, 199, 89, 0.05)',
    },
    recommendText: {
        color: '#34C759',
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Nunito',
    },
});

export default OrganizerBadge;
