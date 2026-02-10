import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    ImageBackground,
    ActivityIndicator,
    Image,
} from 'react-native';
import Share from 'react-native-share';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useUser } from '../../../context/UserContext';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ArrowLeft,
    Gift,
    Users,
    Copy,
    Share2,
    Check,
    UserPlus,
    Sparkles,
    Clock,
    CheckCircle,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';
import { API_PATH } from '../../../config/api.config';
import { getAuthHeaders } from '../../../services/contactService';
import { ReferralRulesModal } from '../../../components/wallet/ReferralRulesModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReferralStats {
    totalInvited: number;
    activeInvited: number;
    totalEarned: number;
}

interface ReferralInfo {
    id: number;
    name: string;
    avatarUrl: string;
    status: 'pending' | 'active';
    joinedAt: string;
}

interface InviteData {
    inviteCode: string;
    deepLink: string;
    webLink: string;
    shareText: string;
}

export default function InviteFriendsScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sharingImage, setSharingImage] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const viewShotRef = React.useRef<any>(null);
    const { user: currentUser } = useUser();
    const [inviteData, setInviteData] = useState<InviteData | null>(null);
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [referrals, setReferrals] = useState<ReferralInfo[]>([]);

    const loadData = useCallback(async () => {
        try {
            setError(null);
            const headers = await getAuthHeaders();
            const [inviteRes, statsRes, listRes] = await Promise.all([
                fetch(`${API_PATH}/referral/invite`, { headers }).then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_PATH}/referral/stats`, { headers }).then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_PATH}/referral/list?limit=50`, { headers }).then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                }),
            ]);
            setInviteData(inviteRes);
            setStats(statsRes);
            setReferrals(listRes.referrals || []);
        } catch (err: any) {
            console.error('[Referral] Failed to load data:', err);
            setError(err.message || 'Ошибка загрузки данных');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleCopyCode = async () => {
        if (!inviteData) return;
        Clipboard.setString(inviteData.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (!inviteData) return;
        try {
            await Share.open({
                title: 'Приглашение в VedaMatch',
                message: inviteData.shareText,
                url: inviteData.webLink,
            });
        } catch (err) {
            console.log('[Referral] Share error:', err);
        }
    };

    const handleShareImage = async () => {
        if (!inviteData) return;
        setSharingImage(true);
        try {
            const uri = await captureRef(viewShotRef, {
                format: 'png',
                quality: 0.9,
            });

            await Share.open({
                title: 'Моя Сангха',
                url: uri,
                type: 'image/png',
            });
        } catch (err: any) {
            if (err?.message !== 'User did not share') {
                console.error('[Referral] Image share error:', err);
            }
        } finally {
            setSharingImage(false);
        }
    };

    const renderReferralItem = ({ item }: { item: ReferralInfo }) => {
        const isActive = item.status === 'active';
        return (
            <View style={styles.referralItem}>
                <View style={[styles.referralIcon, isActive && styles.activeIcon]}>
                    <Text style={styles.referralIconText}>
                        {item.name[0]?.toUpperCase() || '?'}
                    </Text>
                </View>
                <View style={styles.referralInfo}>
                    <Text style={styles.referralName}>{item.name}</Text>
                    <Text style={styles.referralDate}>Присоединился: {item.joinedAt}</Text>
                </View>
                <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.pendingBadge]}>
                    {isActive ? (
                        <CheckCircle size={12} color="#10B981" />
                    ) : (
                        <Clock size={12} color="#9CA3AF" />
                    )}
                    <Text style={[styles.statusText, isActive ? styles.activeText : styles.pendingText]}>
                        {isActive ? '+100' : 'Ожидание'}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#F59E0B" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={{ color: '#EF4444', marginBottom: 20 }}>{error}</Text>
                <TouchableOpacity onPress={loadData} style={{ backgroundColor: '#F59E0B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
                    <Text style={{ color: '#FFF' }}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F0F23', '#1A1A2E', '#16213E']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <ArrowLeft color="#FFF" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Сангха</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />
                }
            >
                {/* Hero Section */}
                <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroContent}>
                        <Gift size={32} color="#FFF" />
                        <Text style={styles.heroTitle}>Приглашай друзей</Text>
                        <Text style={styles.heroSubtitle}>
                            Получай 100 LKM за каждого активного друга!
                        </Text>
                    </View>
                </LinearGradient>

                {/* QR Code Card */}
                <View style={styles.qrCard}>
                    <Text style={styles.sectionTitle}>Твой QR-код</Text>
                    <View style={styles.qrContainer}>
                        {inviteData && (
                            <QRCode
                                value={inviteData.webLink}
                                size={180}
                                backgroundColor="transparent"
                                color="#FFF"
                            />
                        )}
                    </View>
                    <Text style={styles.qrHint}>Покажи друзьям для сканирования</Text>
                </View>

                {/* Invite Code */}
                <View style={styles.codeCard}>
                    <Text style={styles.codeLabel}>Твой код приглашения</Text>
                    <View style={styles.codeRow}>
                        <Text style={styles.codeText}>{inviteData?.inviteCode || '...'}</Text>
                        <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
                            {copied ? (
                                <Check size={20} color="#10B981" />
                            ) : (
                                <Copy size={20} color="#F59E0B" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.shareActions}>
                    <TouchableOpacity onPress={handleShare} style={[styles.shareButton, { flex: 1 }]}>
                        <LinearGradient
                            colors={['#F59E0B', '#D97706']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.shareGradient}
                        >
                            <Share2 size={20} color="#FFF" />
                            <Text style={styles.shareButtonText}>Ссылка</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleShareImage} style={[styles.shareImageButton]} disabled={sharingImage}>
                        <LinearGradient
                            colors={['#8B5CF6', '#6D28D9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.shareGradient}
                        >
                            {sharingImage ? <ActivityIndicator size="small" color="#FFF" /> : <Sparkles size={20} color="#FFF" />}
                            <Text style={styles.shareButtonText}>Story</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Rules Link */}
                <TouchableOpacity
                    onPress={() => setShowRules(true)}
                    style={styles.rulesLink}
                >
                    <Text style={styles.rulesLinkText}>Условия реферальной программы</Text>
                </TouchableOpacity>

                {/* Stats */}
                {stats && (
                    <View style={styles.statsCard}>
                        <Text style={styles.sectionTitle}>Моя Сангха</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Users size={24} color="#9CA3AF" />
                                <Text style={styles.statValue}>{stats.totalInvited}</Text>
                                <Text style={styles.statLabel}>Приглашено</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <UserPlus size={24} color="#10B981" />
                                <Text style={styles.statValue}>{stats.activeInvited}</Text>
                                <Text style={styles.statLabel}>Активных</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Sparkles size={24} color="#F59E0B" />
                                <Text style={[styles.statValue, styles.earnedValue]}>
                                    {stats.totalEarned}
                                </Text>
                                <Text style={styles.statLabel}>Заработано</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Referrals List */}
                {referrals.length > 0 && (
                    <View style={styles.listCard}>
                        <Text style={styles.sectionTitle}>Друзья ({referrals.length})</Text>
                        {referrals.map((item) => (
                            <View key={item.id}>
                                {renderReferralItem({ item })}
                            </View>
                        ))}
                    </View>
                )}

                {/* Rules Summary */}
                <View style={styles.rulesCard}>
                    <Text style={styles.rulesTitle}>Как это работает?</Text>
                    <View style={styles.ruleItem}>
                        <Text style={styles.ruleNumber}>1</Text>
                        <Text style={styles.ruleText}>
                            Поделись своим кодом или QR с другом
                        </Text>
                    </View>
                    <View style={styles.ruleItem}>
                        <Text style={styles.ruleNumber}>2</Text>
                        <Text style={styles.ruleText}>
                            Друг регистрируется и получает 50 LKM
                        </Text>
                    </View>
                    <View style={styles.ruleItem}>
                        <Text style={styles.ruleNumber}>3</Text>
                        <Text style={styles.ruleText}>
                            Когда друг совершает первую покупку, ты получаешь 100 LKM!
                        </Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <ReferralRulesModal
                visible={showRules}
                onClose={() => setShowRules(false)}
            />

            {/* Hidden View for Image Sharing */}
            <View style={styles.hiddenContainer}>
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
                    <LinearGradient
                        colors={['#0F0F23', '#1A1A2E']}
                        style={styles.cardPreview}
                    >
                        <ImageBackground
                            source={require('../../../assets/invite_bg.png')}
                            style={styles.cardBg}
                            imageStyle={{ opacity: 0.2, resizeMode: 'cover' }}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.cardLogoWrapper}>
                                    <Image
                                        source={require('../../../assets/logo_tilak.png')}
                                        style={styles.cardLogo}
                                        resizeMode="contain"
                                    />
                                </View>
                                <Text style={styles.cardBrand}>VEDAMATCH</Text>
                            </View>

                            <View style={styles.cardMain}>
                                <Text style={styles.cardTitle}>Стань частью моей Сангхи!</Text>
                                <View style={styles.cardUserBadge}>
                                    <Text style={styles.cardUserName}>{currentUser?.spiritualName || currentUser?.karmicName}</Text>
                                </View>

                                <View style={styles.cardQR}>
                                    {inviteData && (
                                        <QRCode
                                            value={inviteData.webLink}
                                            size={SCREEN_WIDTH * 0.5}
                                            backgroundColor="white"
                                            color="#0F0F23"
                                            quietZone={10}
                                        />
                                    )}
                                </View>

                                <View style={styles.cardBonus}>
                                    <Gift size={24} color="#F59E0B" />
                                    <Text style={styles.cardBonusText}>+50 LKM приветственный бонус</Text>
                                </View>
                            </View>

                            <View style={styles.cardFooter}>
                                <Text style={styles.cardTagline}>Соединяя Души • Находя Своих</Text>
                                <Text style={styles.cardUrl}>vedamatch.ru</Text>
                            </View>
                        </ImageBackground>
                    </LinearGradient>
                </ViewShot>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F23',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: 'rgba(15, 15, 35, 0.8)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    backButton: {
        padding: 8,
    },
    scrollContent: {
        padding: 20,
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
    },
    heroContent: {
        alignItems: 'center',
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 12,
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
        textAlign: 'center',
    },
    qrCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 20,
    },
    qrContainer: {
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    qrHint: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    codeCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    codeLabel: {
        fontSize: 13,
        color: '#9CA3AF',
        marginBottom: 12,
    },
    codeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    codeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: 2,
    },
    copyButton: {
        padding: 8,
    },
    shareButton: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
    },
    shareGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    shareActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    shareButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    shareImageButton: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
    },
    // Card for sharing Styles
    hiddenContainer: {
        position: 'absolute',
        left: -9999, // Move off-screen
        top: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 1.6, // Vertical story format
    },
    cardPreview: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 1.6,
        padding: 40,
    },
    cardBg: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardHeader: {
        alignItems: 'center',
    },
    cardLogoWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardLogo: {
        width: 50,
        height: 50,
    },
    cardBrand: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 4,
        textShadowColor: '#8B0000',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 3,
    },
    cardMain: {
        alignItems: 'center',
        width: '100%',
    },
    cardTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    cardUserBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderRadius: 12,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    cardUserName: {
        color: '#F59E0B',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardQR: {
        padding: 15,
        backgroundColor: '#FFF',
        borderRadius: 24,
        marginBottom: 30,
    },
    cardBonus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 16,
    },
    cardBonusText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
    },
    cardFooter: {
        alignItems: 'center',
    },
    cardTagline: {
        color: '#9CA3AF',
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 8,
    },
    cardUrl: {
        color: '#F59E0B',
        fontSize: 16,
        fontWeight: 'bold',
    },
    rulesLink: {
        alignItems: 'center',
        marginBottom: 24,
    },
    rulesLinkText: {
        color: '#9CA3AF',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    statsCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 8,
    },
    earnedValue: {
        color: '#F59E0B',
    },
    statLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    listCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    rulesCard: {
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.1)',
        marginBottom: 20,
    },
    rulesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F59E0B',
        marginBottom: 20,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 16,
    },
    ruleNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        color: '#F59E0B',
        textAlign: 'center',
        lineHeight: 28,
        fontSize: 14,
        fontWeight: 'bold',
    },
    ruleText: {
        fontSize: 14,
        color: '#E5E7EB',
        flex: 1,
        lineHeight: 20,
    },
    referralItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    referralIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeIcon: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    referralIconText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    referralInfo: {
        flex: 1,
    },
    referralName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 2,
    },
    referralDate: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    activeBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    pendingBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    activeText: {
        color: '#10B981',
    },
    pendingText: {
        color: '#9CA3AF',
    },
});
