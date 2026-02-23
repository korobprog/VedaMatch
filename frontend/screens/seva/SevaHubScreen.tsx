import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, Alert, SafeAreaView, ImageBackground, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Sparkles as PointsIcon } from 'lucide-react-native';
import { CharityProject } from '../../types/charity';
import { charityService } from '../../services/charityService';
import { useWallet } from '../../context/WalletContext';
import { DonateModal } from '../../components/seva/DonateModal';
import { supportAttributionService } from '../../services/supportAttributionService';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { GodModeStatusBanner } from '../../components/portal/god-mode/GodModeStatusBanner';

const SevaHubScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { wallet, refreshWallet, totalBalance, bonusBalance } = useWallet();
    const [projects, setProjects] = useState<CharityProject[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [screenError, setScreenError] = useState<string | null>(null);

    // Donate Modal State
    const [donateModalVisible, setDonateModalVisible] = useState(false);
    const [selectedProject, setSelectedProject] = useState<CharityProject | null>(null);

    const userBalance = wallet?.balance || 0;
    const regularBalance = wallet?.balance ?? 0;

    const loadProjects = useCallback(async () => {
        try {
            const data = await charityService.getProjects();
            if (!Array.isArray(data)) {
                setProjects([]);
                return;
            }
            setProjects(data.filter(Boolean));
            setScreenError(null);
        } catch (e) {
            console.error('Failed to load projects:', e);
            setProjects([]);
            setScreenError('Не удалось загрузить проекты Севы.');
        }
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        setScreenError(null);
        try {
            await Promise.all([
                loadProjects(),
                refreshWallet()
            ]);
        } catch (e) {
            console.error('Failed to load initial data:', e);
            setScreenError('Не удалось загрузить раздел Сева. Проверьте интернет и попробуйте снова.');
        } finally {
            setLoading(false);
        }
    }, [loadProjects, refreshWallet]);

    useEffect(() => {
        console.log('[SevaHub] mounted');
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                loadProjects(),
                refreshWallet()
            ]);
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false);
        }
    }, [loadProjects, refreshWallet]);

    const openDonateModal = (project: CharityProject) => {
        setSelectedProject(project);
        setDonateModalVisible(true);
    };

    const handleDonate = async (amount: number, tips: boolean, isAnonymous: boolean, message: string) => {
        if (!selectedProject) {
            Alert.alert("Authentication Required", "Please login to donate.");
            return;
        }

        try {
            await charityService.donate(undefined, {
                projectId: selectedProject.id,
                amount,
                isAnonymous,
                karmaMessage: message,
                includeTips: tips,
                wantsCertificate: false,
                sourceService: 'seva',
                sourceTrigger: 'donate_modal',
                sourceContext: supportAttributionService.serializeContext(
                    supportAttributionService.build('seva', 'donate_modal', {
                        screen: 'SevaHub',
                        projectId: selectedProject.id,
                    }).sourceContext,
                ),
                platformContributionEnabled: tips,
            });

            // Success
            Alert.alert("Success", "Thank you for your donation!");
            setDonateModalVisible(false);

            // Refresh data to show updated progress and balance
            onRefresh();

        } catch (e: any) {
            Alert.alert("Donation Failed", e.message || "An error occurred. Please try again.");
        }
    };

    const renderProjectCard = ({ item }: { item: CharityProject }) => {
        const raisedAmount = Number(item?.raisedAmount ?? 0);
        const goalAmount = Number(item?.goalAmount ?? 0);
        const progress = goalAmount > 0
            ? Math.min(raisedAmount / goalAmount, 1)
            : 0;
        const projectTitle = item?.title || 'Проект без названия';
        const organizationName = item?.organization?.name || 'Vedic Charity';
        const coverUri = typeof item?.coverUrl === 'string' && item.coverUrl.trim().length > 0
            ? item.coverUrl
            : null;

        const isPaused = Boolean(item.nextReportDue && new Date(item.nextReportDue) < new Date());

        return (
            <View style={[styles.card, isPaused && { opacity: 0.8 }]}>
                <TouchableOpacity
                    onPress={() => {
                        navigation.navigate('SevaProjectDetails', { project: item });
                    }}
                >
                    {coverUri ? (
                        <Image source={{ uri: coverUri }} style={styles.cardCover} />
                    ) : (
                        <View style={[styles.cardCover, styles.cardCoverFallback]}>
                            <Text style={styles.cardCoverFallbackText}>SEVA</Text>
                        </View>
                    )}

                    {item.isUrgent && !isPaused && (
                        <View style={styles.urgentBadge}>
                            <Text style={styles.urgentText}>URGENT</Text>
                        </View>
                    )}

                    {isPaused && (
                        <View style={[styles.urgentBadge, { backgroundColor: '#FFA000' }]}>
                            <Text style={styles.urgentText}>PAUSED: WAITING FOR REPORT</Text>
                        </View>
                    )}

                    <View style={styles.cardContent}>
                        <Text style={styles.orgName}>{organizationName}</Text>
                        <Text style={styles.title}>{projectTitle}</Text>

                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                        </View>

                        <View style={styles.statsRow}>
                            <Text style={styles.raisedText}>
                                {raisedAmount.toLocaleString()} LKM
                                <Text style={styles.goalText}> / {goalAmount.toLocaleString()}</Text>
                            </Text>
                            <Text style={styles.percentText}>{Math.round(progress * 100)}%</Text>
                        </View>

                        {item.impactMetrics && item.impactMetrics.length > 0 && (
                            <View style={styles.impactBadge}>
                                <Text style={styles.impactText}>
                                    {item.impactMetrics[0].icon} 1 unit = {item.impactMetrics[0].unitCost} LKM ({item.impactMetrics[0].labelEn})
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.donateButton, isPaused && { backgroundColor: '#444' }]}
                        onPress={() => !isPaused && openDonateModal(item)}
                        disabled={isPaused}
                    >
                        <Text style={[styles.donateButtonText, isPaused && { color: '#888' }]}>
                            {isPaused ? 'Fundraising Paused' : 'Donate Now'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeHeader}>
                <ImageBackground
                    source={require('../../assets/vedamatch_bg.png')}
                    style={styles.headerBanner}
                    imageStyle={styles.headerBannerImage}
                >
                    <View style={styles.headerOverlay} />
                    <View style={styles.header}>
                        <View style={styles.headerTop}>
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                style={styles.backButton}
                            >
                                <ChevronLeft color="#FFF" size={28} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => navigation.navigate('MyDonations')}
                                style={styles.historyButton}
                            >
                                <Text style={styles.historyButtonText}>История</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.balanceRow}>
                            <PointsIcon color="#FFD700" size={18} style={{ marginRight: 6 }} />
                            <Text style={styles.balanceText}>Итого: {totalBalance.toLocaleString()} LKM</Text>
                        </View>
                        <View style={styles.balanceSplitRow}>
                            <View style={styles.balanceSplitBadge}>
                                <Text style={styles.balanceSplitText}>Основной: {regularBalance.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.balanceSplitBadge, styles.balanceBonusBadge]}>
                                <Text style={[styles.balanceSplitText, styles.balanceBonusText]}>Бонусный: {bonusBalance.toLocaleString()}</Text>
                            </View>
                        </View>

                        <Text style={styles.headerTitle}>Seva Marketplace</Text>
                        <Text style={styles.headerSubtitle}>Donate with trust & transparency</Text>
                    </View>
                </ImageBackground>
            </SafeAreaView>
            <GodModeStatusBanner />

            <FlatList
                data={projects}
                renderItem={renderProjectCard}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
                }
                ListHeaderComponent={
                    screenError ? (
                        <View style={styles.errorCard}>
                            <Text style={styles.errorTitle}>Временная ошибка</Text>
                            <Text style={styles.errorText}>{screenError}</Text>
                            <TouchableOpacity style={styles.errorRetryButton} onPress={loadData}>
                                <Text style={styles.errorRetryButtonText}>Повторить</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator color="#FFD700" />
                            <Text style={{ color: '#AAA', marginTop: 10 }}>Загружаем проекты...</Text>
                        </View>
                    ) : !screenError ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Text style={{ color: '#888', textAlign: 'center' }}>
                                No Active Projects Found at the moment.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Text style={{ color: '#888' }}>Потяните вниз, чтобы обновить</Text>
                        </View>
                    )
                }
            />

            {selectedProject && (
                <DonateModal
                    visible={donateModalVisible}
                    onClose={() => setDonateModalVisible(false)}
                    project={selectedProject}
                    userBalance={userBalance}
                    onDonate={handleDonate}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    safeHeader: {
        backgroundColor: '#000',
    },
    headerBanner: {
        width: '100%',
        overflow: 'hidden',
    },
    headerBannerImage: {
        resizeMode: 'cover',
        opacity: 0.6,
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    header: {
        padding: 20,
        paddingTop: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    backButton: {
        marginLeft: -10,
        padding: 10,
    },
    historyButton: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    historyButtonText: {
        color: '#FFD700',
        fontWeight: '600',
        fontSize: 13,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    balanceText: {
        color: '#FFD700',
        fontWeight: 'bold',
        fontSize: 15,
    },
    balanceSplitRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 8,
    },
    balanceSplitBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    balanceBonusBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
    },
    balanceSplitText: {
        color: '#E5E7EB',
        fontSize: 12,
        fontWeight: '600',
    },
    balanceBonusText: {
        color: '#86EFAC',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFD700',
        fontFamily: 'Cinzel-Bold',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#AAAAAA',
        marginTop: 5,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    cardCover: {
        width: '100%',
        height: 180,
    },
    cardCoverFallback: {
        backgroundColor: '#2A2A2A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardCoverFallbackText: {
        color: '#FFD700',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 2,
    },
    urgentBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#FF4444',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    urgentText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 10,
    },
    cardContent: {
        padding: 16,
    },
    orgName: {
        fontSize: 12,
        color: '#888',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 12,
    },
    progressContainer: {
        height: 6,
        backgroundColor: '#333',
        borderRadius: 3,
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 3,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    raisedText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    goalText: {
        color: '#888',
        fontWeight: 'normal',
    },
    percentText: {
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    impactBadge: {
        backgroundColor: '#2C2C2C',
        padding: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    impactText: {
        color: '#FFD700',
        fontSize: 12,
    },
    actionRow: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#252525',
    },
    donateButton: {
        backgroundColor: '#FFD700',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    donateButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    errorCard: {
        backgroundColor: '#221919',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.35)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    errorTitle: {
        color: '#FCA5A5',
        fontWeight: '700',
        fontSize: 15,
        marginBottom: 6,
    },
    errorText: {
        color: '#E5E7EB',
        fontSize: 13,
        lineHeight: 18,
    },
    errorRetryButton: {
        alignSelf: 'flex-start',
        marginTop: 10,
        backgroundColor: '#FFD700',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    errorRetryButtonText: {
        color: '#000',
        fontWeight: '700',
    }
});

export default SevaHubScreen;
