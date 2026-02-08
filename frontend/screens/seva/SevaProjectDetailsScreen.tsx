import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import { CharityProject } from '../../types/charity';
import { DonateModal } from '../../components/seva/DonateModal';
import { EvidenceWall } from '../../components/seva/EvidenceWall';
import { KarmaFeed } from '../../components/seva/KarmaFeed';
import LinearGradient from 'react-native-linear-gradient';

const SevaProjectDetailsScreen: React.FC = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { project } = route.params as { project: CharityProject };

    const [donateModalVisible, setDonateModalVisible] = useState(false);

    // Mock balance
    const userBalance = 2500;

    const progress = Math.min(project.raisedAmount / project.goalAmount, 1);

    const handleDonate = async (amount: number, tips: boolean, isAnonymous: boolean, message: string) => {
        // API Call would go here
        console.log("Donate:", amount, tips, isAnonymous, message);
        // Refresh data...
    };

    return (
        <View style={styles.container}>
            <ScrollView bounces={false} contentContainerStyle={styles.content}>
                <View style={styles.coverContainer}>
                    <Image source={{ uri: project.coverUrl }} style={styles.coverImage} />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.gradient}
                    />
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ArrowLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.detailsContainer}>
                    <View style={styles.headerRow}>
                        <View style={styles.orgTag}>
                            <Text style={styles.orgName}>{project.organization?.name}</Text>
                            {project.organization?.isPremium && (
                                <CheckCircle size={14} color="#4CAF50" style={{ marginLeft: 4 }} />
                            )}
                        </View>
                        <View style={styles.categoryTag}>
                            <Text style={styles.categoryText}>{project.category}</Text>
                        </View>
                    </View>

                    <Text style={styles.title}>{project.title}</Text>

                    <View style={styles.progressSection}>
                        <View style={styles.statsRow}>
                            <Text style={styles.raisedPrice}>{project.raisedAmount.toLocaleString()} LKM</Text>
                            <Text style={styles.goalPrice}>of {project.goalAmount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaText}>{project.donationsCount} donations</Text>
                            <Text style={styles.metaText}>{Math.round(progress * 100)}% funded</Text>
                        </View>
                    </View>

                    {project.impactMetrics && project.impactMetrics.length > 0 && (
                        <View style={styles.impactCard}>
                            <Text style={styles.impactTitle}>Your Impact</Text>
                            <View style={styles.impactRow}>
                                <Text style={styles.impactIcon}>{project.impactMetrics[0].icon}</Text>
                                <View>
                                    <Text style={styles.impactLabel}>{project.impactMetrics[0].labelEn}</Text>
                                    <Text style={styles.impactCost}>1 unit = {project.impactMetrics[0].unitCost} LKM</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>About this project</Text>
                    <Text style={styles.description}>{project.description}</Text>

                    {project.organization?.website && (
                        <TouchableOpacity onPress={() => Linking.openURL(project.organization!.website!)}>
                            <Text style={styles.linkText}>Visit Website</Text>
                        </TouchableOpacity>
                    )}

                    {/* Evidence Wall - Reports from Charity */}
                    <EvidenceWall projectId={project.id} projectTitle={project.title} />

                    {/* Karma Feed - Recent Donations */}
                    <KarmaFeed projectId={project.id} />

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            <View style={styles.floater}>
                <TouchableOpacity
                    style={styles.donateButton}
                    onPress={() => setDonateModalVisible(true)}
                >
                    <Text style={styles.donateButtonText}>Donate Now</Text>
                </TouchableOpacity>
            </View>

            <DonateModal
                visible={donateModalVisible}
                onClose={() => setDonateModalVisible(false)}
                project={project}
                userBalance={userBalance}
                onDonate={handleDonate}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    content: {
        paddingBottom: 40,
    },
    coverContainer: {
        height: 300,
        width: '100%',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 150,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailsContainer: {
        padding: 24,
        marginTop: -20,
        backgroundColor: '#121212',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orgTag: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orgName: {
        color: '#AAA',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    categoryTag: {
        backgroundColor: '#333',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    categoryText: {
        color: '#FFF',
        fontSize: 12,
        textTransform: 'capitalize',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 20,
        lineHeight: 34,
    },
    progressSection: {
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    raisedPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    goalPrice: {
        fontSize: 16,
        color: '#888',
        marginLeft: 8,
    },
    progressContainer: {
        height: 8,
        backgroundColor: '#333',
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metaText: {
        color: '#888',
        fontSize: 12,
    },
    impactCard: {
        backgroundColor: '#1E1E1E',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#333',
    },
    impactTitle: {
        color: '#AAA',
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    impactRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    impactIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    impactLabel: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    impactCost: {
        color: '#AAA',
        fontSize: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: '#DDD',
        lineHeight: 24,
        marginBottom: 24,
    },
    linkText: {
        color: '#FFD700',
        textDecorationLine: 'underline',
        marginBottom: 24,
    },
    floater: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: 40,
        backgroundColor: 'rgba(18,18,18,0.95)',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    donateButton: {
        backgroundColor: '#FFD700',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    donateButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});

export default SevaProjectDetailsScreen;
