import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star, Award, Users, ThumbsUp } from 'lucide-react-native';
import { yatraService } from '../../services/yatraService';

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
    const [stats, setStats] = useState<OrganizerStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await yatraService.getOrganizerStats(userId);
                setStats(data);
            } catch (error) {
                console.error('Error loading organizer stats:', error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, [userId]);

    if (loading || !stats || stats.organizedCount === 0) {
        return null;
    }

    // Badge tier based on organized tours and rating
    const getBadgeTier = (): { tier: string; color: string; icon: React.ReactNode } => {
        const { organizedCount, averageRating } = stats;

        if (organizedCount >= 10 && averageRating >= 4.5) {
            return { tier: 'Мастер Ятры', color: '#FFD700', icon: <Award size={14} color="#FFD700" /> };
        }
        if (organizedCount >= 5 && averageRating >= 4.0) {
            return { tier: 'Опытный Лидер', color: '#C0C0C0', icon: <Star size={14} color="#C0C0C0" /> };
        }
        if (organizedCount >= 2) {
            return { tier: 'Организатор', color: '#CD7F32', icon: <Users size={14} color="#CD7F32" /> };
        }
        return { tier: 'Новичок', color: '#8E8E93', icon: <ThumbsUp size={14} color="#8E8E93" /> };
    };

    const badge = getBadgeTier();

    if (variant === 'compact') {
        return (
            <View style={[styles.compactBadge, { borderColor: badge.color }]}>
                {badge.icon}
                {showLabel && <Text style={[styles.compactText, { color: badge.color }]}>{badge.tier}</Text>}
            </View>
        );
    }

    return (
        <View style={styles.fullBadge}>
            <View style={[styles.badgeHeader, { backgroundColor: `${badge.color}20` }]}>
                {badge.icon}
                <Text style={[styles.tierText, { color: badge.color }]}>{badge.tier}</Text>
            </View>
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.organizedCount}</Text>
                    <Text style={styles.statLabel}>туров</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Star size={12} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.statValue}>{stats.averageRating.toFixed(1)}</Text>
                    </View>
                    <Text style={styles.statLabel}>рейтинг</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.totalParticipants}</Text>
                    <Text style={styles.statLabel}>участников</Text>
                </View>
            </View>
            {stats.recommendations > 0 && (
                <View style={styles.recommendRow}>
                    <ThumbsUp size={14} color="#34C759" />
                    <Text style={styles.recommendText}>
                        {stats.recommendations} рекомендаций
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
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    compactText: {
        fontSize: 11,
        fontWeight: '600',
    },
    fullBadge: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    badgeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8,
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    tierText: {
        fontSize: 14,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#8E8E93',
        fontSize: 11,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: '100%',
        backgroundColor: '#2C2C2E',
    },
    recommendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
        justifyContent: 'center',
    },
    recommendText: {
        color: '#34C759',
        fontSize: 13,
        fontWeight: '500',
    },
});

export default OrganizerBadge;
