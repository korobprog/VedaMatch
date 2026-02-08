import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { Heart, User } from 'lucide-react-native';
import { charityService, KarmaFeedItem } from '../../services/charityService';

interface Props {
    projectId?: number;
    autoScroll?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const KarmaFeed: React.FC<Props> = ({ projectId, autoScroll = true }) => {
    const [feed, setFeed] = useState<KarmaFeedItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        loadFeed();
    }, [projectId]);

    useEffect(() => {
        if (feed.length <= 1 || !autoScroll) return;

        const interval = setInterval(() => {
            // Fade out
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setCurrentIndex((prev) => (prev + 1) % feed.length);
                // Fade in
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [feed, autoScroll]);

    const loadFeed = async () => {
        try {
            const data = await charityService.getKarmaFeed(projectId, 10);
            setFeed(data);
        } catch (e) {
            console.error('Failed to load karma feed:', e);
        }
    };

    const formatTimeAgo = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return `${diffMins} мин назад`;
        if (diffHours < 24) return `${diffHours}ч назад`;
        return `${diffDays}д назад`;
    };

    if (feed.length === 0) {
        return null;
    }

    const item = feed[currentIndex];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Heart size={16} color="#FFD700" fill="#FFD700" />
                <Text style={styles.headerTitle}>Karma Feed</Text>
            </View>

            <Animated.View style={[styles.feedItem, { opacity: fadeAnim }]}>
                <View style={styles.avatarContainer}>
                    {item.donorAvatar ? (
                        <Image source={{ uri: item.donorAvatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <User size={18} color="#888" />
                        </View>
                    )}
                </View>

                <View style={styles.textContainer}>
                    <View style={styles.nameRow}>
                        <Text style={styles.donorName}>{item.donorName || 'Аноним'}</Text>
                        <Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
                    </View>

                    <Text style={styles.donationText}>
                        пожертвовал <Text style={styles.amount}>{item.amount} LKM</Text>
                    </Text>

                    {item.message && (
                        <Text style={styles.messageText} numberOfLines={2}>
                            "{item.message}"
                        </Text>
                    )}
                </View>
            </Animated.View>

            {feed.length > 1 && (
                <View style={styles.dots}>
                    {feed.map((_, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.dot,
                                idx === currentIndex && styles.dotActive
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFD700',
        marginLeft: 6,
    },
    feedItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2C2C2C',
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2C2C2C',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    donorName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FFF',
    },
    timeAgo: {
        fontSize: 11,
        color: '#888',
    },
    donationText: {
        fontSize: 13,
        color: '#CCC',
    },
    amount: {
        color: '#FFD700',
        fontWeight: 'bold',
    },
    messageText: {
        marginTop: 6,
        fontSize: 13,
        color: '#888',
        fontStyle: 'italic',
        lineHeight: 18,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#333',
        marginHorizontal: 3,
    },
    dotActive: {
        backgroundColor: '#FFD700',
    },
});

export default KarmaFeed;
