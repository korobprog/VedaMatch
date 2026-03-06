import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, Dimensions, RefreshControl } from 'react-native';
import { X, Play, FileText, Camera, Video } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { CharityEvidence } from '../../types/charity';
import { charityService } from '../../services/charityService';

interface Props {
    projectId: number;
    projectTitle?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2;

export const EvidenceWall: React.FC<Props> = ({ projectId, projectTitle }) => {
    const { i18n } = useTranslation();
    const [evidence, setEvidence] = useState<CharityEvidence[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEvidence, setSelectedEvidence] = useState<CharityEvidence | null>(null);

    useEffect(() => {
        loadEvidence();
    }, [projectId]);

    const loadEvidence = async () => {
        setLoading(true);
        try {
            const data = await charityService.getProjectEvidence(projectId);
            setEvidence(data);
        } catch (e) {
            console.error('Failed to load evidence:', e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadEvidence();
        setRefreshing(false);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video size={16} color="#FFD700" />;
            case 'receipt': return <FileText size={16} color="#FFD700" />;
            case 'report': return <FileText size={16} color="#FFD700" />;
            default: return <Camera size={16} color="#FFD700" />;
        }
    };

    const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'hi' ? 'hi-IN' : 'en-US';
    const copy = i18n.language === 'ru'
        ? {
            emptyTitle: 'Отчеты еще не загружены',
            emptySubtitle: 'Организация скоро добавит фото и видео отчеты о расходовании средств',
            sectionTitle: '📸 Стена доказательств',
            sectionSubtitle: 'Фото и видео отчеты о расходовании средств',
            photo: 'Фотоотчет',
            video: 'Видеоотчет',
            receipt: 'Чек/Квитанция',
            report: 'Документ',
        }
        : i18n.language === 'hi'
            ? {
                emptyTitle: 'रिपोर्ट अभी अपलोड नहीं की गई हैं',
                emptySubtitle: 'संगठन जल्द ही धन के उपयोग पर फोटो और वीडियो रिपोर्ट जोड़ेगा',
                sectionTitle: '📸 प्रमाण दीवार',
                sectionSubtitle: 'धन के उपयोग पर फोटो और वीडियो रिपोर्ट',
                photo: 'फोटो रिपोर्ट',
                video: 'वीडियो रिपोर्ट',
                receipt: 'रसीद',
                report: 'दस्तावेज़',
            }
            : {
                emptyTitle: 'Reports have not been uploaded yet',
                emptySubtitle: 'The organization will soon add photo and video reports on how the funds were used',
                sectionTitle: '📸 Evidence Wall',
                sectionSubtitle: 'Photo and video reports on how funds were used',
                photo: 'Photo report',
                video: 'Video report',
                receipt: 'Receipt',
                report: 'Document',
            };

    const renderEvidenceItem = ({ item }: { item: CharityEvidence }) => (
        <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedEvidence(item)}
            activeOpacity={0.8}
        >
            <Image
                source={{ uri: item.thumbnailUrl || item.mediaUrl }}
                style={styles.thumbnail}
            />
            {item.type === 'video' && (
                <View style={styles.playOverlay}>
                    <Play size={32} color="#FFF" fill="#FFF" />
                </View>
            )}
            <View style={styles.itemInfo}>
                <View style={styles.typeRow}>
                    {getTypeIcon(item.type)}
                    <Text style={styles.dateText}>
                        {new Date(item.createdAt).toLocaleDateString(locale)}
                    </Text>
                </View>
                {item.title && (
                    <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    if (evidence.length === 0 && !loading) {
        return (
            <View style={styles.emptyContainer}>
                <FileText size={40} color="#555" />
                <Text style={styles.emptyText}>{copy.emptyTitle}</Text>
                <Text style={styles.emptySubtext}>
                    {copy.emptySubtitle}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>{copy.sectionTitle}</Text>
            <Text style={styles.sectionSubtitle}>
                {copy.sectionSubtitle}
            </Text>

            <FlatList
                data={evidence}
                renderItem={renderEvidenceItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                contentContainerStyle={styles.gridContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
                }
            />

            {/* Fullscreen Modal */}
            <Modal
                visible={!!selectedEvidence}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedEvidence(null)}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setSelectedEvidence(null)}
                    >
                        <X size={28} color="#FFF" />
                    </TouchableOpacity>

                    {selectedEvidence && (
                        <View style={styles.modalContent}>
                            <Image
                                source={{ uri: selectedEvidence.mediaUrl }}
                                style={styles.fullImage}
                                resizeMode="contain"
                            />

                            <View style={styles.modalInfo}>
                                <View style={styles.modalTypeRow}>
                                    {getTypeIcon(selectedEvidence.type)}
                                    <Text style={styles.modalType}>
                                        {selectedEvidence.type === 'photo' && copy.photo}
                                        {selectedEvidence.type === 'video' && copy.video}
                                        {selectedEvidence.type === 'receipt' && copy.receipt}
                                        {selectedEvidence.type === 'report' && copy.report}
                                    </Text>
                                    <Text style={styles.modalDate}>
                                        {new Date(selectedEvidence.createdAt).toLocaleDateString(locale)}
                                    </Text>
                                </View>

                                {selectedEvidence.title && (
                                    <Text style={styles.modalTitle}>{selectedEvidence.title}</Text>
                                )}

                                {selectedEvidence.description && (
                                    <Text style={styles.modalDescription}>{selectedEvidence.description}</Text>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFD700',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#888',
        marginBottom: 16,
    },
    gridContent: {
        gap: 12,
    },
    gridItem: {
        width: ITEM_WIDTH,
        marginRight: 12,
        marginBottom: 12,
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    thumbnail: {
        width: '100%',
        height: ITEM_WIDTH * 0.75,
        backgroundColor: '#2C2C2C',
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: ITEM_WIDTH * 0.75,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    itemInfo: {
        padding: 10,
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    dateText: {
        color: '#888',
        fontSize: 11,
        marginLeft: 6,
    },
    itemTitle: {
        color: '#FFF',
        fontSize: 13,
        lineHeight: 18,
    },
    emptyContainer: {
        padding: 30,
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        marginTop: 20,
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
        marginTop: 12,
        fontWeight: '600',
    },
    emptySubtext: {
        color: '#666',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    modalContent: {
        flex: 1,
        justifyContent: 'center',
    },
    fullImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
    },
    modalInfo: {
        padding: 20,
    },
    modalTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalType: {
        color: '#FFD700',
        fontSize: 14,
        marginLeft: 8,
        fontWeight: '600',
    },
    modalDate: {
        color: '#888',
        fontSize: 12,
        marginLeft: 'auto',
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    modalDescription: {
        color: '#CCC',
        fontSize: 14,
        lineHeight: 20,
    },
});

export default EvidenceWall;
