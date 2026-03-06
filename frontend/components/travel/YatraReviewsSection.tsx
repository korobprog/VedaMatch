import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    Image,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Alert
} from 'react-native';
import { Star, ThumbsUp, ThumbsDown, X, MessageSquare } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { yatraService } from '../../services/yatraService';
import { YatraReview, YatraReviewCreateData } from '../../types/yatra';

interface YatraReviewsSectionProps {
    yatraId: number;
    yatraStatus: string;
    isParticipant: boolean;
}

const YatraReviewsSection: React.FC<YatraReviewsSectionProps> = ({
    yatraId,
    yatraStatus,
    isParticipant
}) => {
    const { i18n } = useTranslation();
    const reviewCopy = i18n.language?.startsWith('ru')
        ? {
            error: 'Ошибка',
            writeReviewMessage: 'Напишите текст отзыва',
            thankYouTitle: 'Спасибо!',
            reviewPublished: 'Ваш отзыв опубликован',
            submitFailed: 'Не удалось отправить отзыв',
            participant: 'Участник',
            recommends: 'Рекомендует',
            reviews: 'Отзывы',
            reviewsCount: 'отзывов',
            write: 'Написать',
            noReviewsYet: 'Отзывов пока нет. Будьте первым!',
            reviewsAfterTrip: 'Отзывы появятся после завершения поездки',
            rateTrip: 'Оцените поездку',
            overallRating: 'Общая оценка',
            organizer: 'Организация',
            route: 'Маршрут',
            experiencePlaceholder: 'Расскажите о своих впечатлениях...',
            wouldRecommend: 'Порекомендовали бы вы эту поездку?',
            yes: 'Да',
            no: 'Нет',
            publish: 'Опубликовать',
        }
        : i18n.language?.startsWith('hi')
            ? {
                error: 'त्रुटि',
                writeReviewMessage: 'कृपया समीक्षा लिखें',
                thankYouTitle: 'धन्यवाद!',
                reviewPublished: 'आपकी समीक्षा प्रकाशित हो गई है',
                submitFailed: 'समीक्षा भेजी नहीं जा सकी',
                participant: 'प्रतिभागी',
                recommends: 'सिफारिश करता है',
                reviews: 'समीक्षाएँ',
                reviewsCount: 'समीक्षाएँ',
                write: 'लिखें',
                noReviewsYet: 'अभी तक कोई समीक्षा नहीं। पहले बनें!',
                reviewsAfterTrip: 'यात्रा पूरी होने के बाद समीक्षाएँ उपलब्ध होंगी',
                rateTrip: 'यात्रा को रेट करें',
                overallRating: 'कुल रेटिंग',
                organizer: 'आयोजन',
                route: 'मार्ग',
                experiencePlaceholder: 'अपने अनुभव के बारे में बताइए...',
                wouldRecommend: 'क्या आप इस यात्रा की सिफारिश करेंगे?',
                yes: 'हाँ',
                no: 'नहीं',
                publish: 'प्रकाशित करें',
            }
            : {
                error: 'Error',
                writeReviewMessage: 'Write a review message',
                thankYouTitle: 'Thank you!',
                reviewPublished: 'Your review has been published',
                submitFailed: 'Failed to submit the review',
                participant: 'Participant',
                recommends: 'Recommends',
                reviews: 'Reviews',
                reviewsCount: 'reviews',
                write: 'Write',
                noReviewsYet: 'No reviews yet. Be the first!',
                reviewsAfterTrip: 'Reviews will be available after the trip is completed',
                rateTrip: 'Rate the trip',
                overallRating: 'Overall rating',
                organizer: 'Organizer',
                route: 'Route',
                experiencePlaceholder: 'Tell about your experience...',
                wouldRecommend: 'Would you recommend this trip?',
                yes: 'Yes',
                no: 'No',
                publish: 'Publish',
            };
    const [reviews, setReviews] = useState<YatraReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [averageRating, setAverageRating] = useState(0);
    const [total, setTotal] = useState(0);

    // Review Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [rating, setRating] = useState(5);
    const [organizerRating, setOrganizerRating] = useState(5);
    const [routeRating, setRouteRating] = useState(5);
    const [comment, setComment] = useState('');
    const [recommendation, setRecommendation] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const loadReviews = useCallback(async () => {
        try {
            setLoading(true);
            const data = await yatraService.getYatraReviews(yatraId, 1, 5);
            setReviews(data.reviews);
            setAverageRating(data.averageRating);
            setTotal(data.total);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    }, [yatraId]);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    const handleSubmitReview = async () => {
        if (!comment.trim()) {
            Alert.alert(reviewCopy.error, reviewCopy.writeReviewMessage);
            return;
        }

        try {
            setSubmitting(true);
            const data: YatraReviewCreateData = {
                overallRating: rating,
                organizerRating,
                routeRating,
                comment,
                recommendation,
            };
            await yatraService.createYatraReview(yatraId, data);
            Alert.alert(reviewCopy.thankYouTitle, reviewCopy.reviewPublished);
            setModalVisible(false);
            setComment('');
            setRating(5);
            loadReviews();
        } catch (error: any) {
            Alert.alert(reviewCopy.error, error.response?.data?.error || reviewCopy.submitFailed);
        } finally {
            setSubmitting(false);
        }
    };

    // Only show review option for completed yatras
    const canReview = yatraStatus === 'completed' && isParticipant;

    const RatingStars: React.FC<{ value: number; onChange?: (v: number) => void; size?: number }> = ({
        value,
        onChange,
        size = 24
    }) => (
        <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(r => (
                <TouchableOpacity
                    key={r}
                    onPress={() => onChange?.(r)}
                    disabled={!onChange}
                    style={{ padding: 4 }}
                >
                    <Star
                        size={size}
                        color={r <= value ? '#FFD700' : '#444'}
                        fill={r <= value ? '#FFD700' : 'transparent'}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderReviewItem = ({ item }: { item: YatraReview }) => (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <View style={styles.reviewAuthor}>
                    <Image
                        source={{ uri: item.author?.avatarUrl || 'https://via.placeholder.com/30' }}
                        style={styles.reviewAvatar}
                    />
                    <Text style={styles.reviewName}>
                        {item.author?.spiritualName || item.author?.karmicName || reviewCopy.participant}
                    </Text>
                </View>
                <View style={styles.reviewRating}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.reviewRatingText}>{item.overallRating}</Text>
                </View>
            </View>
            {item.comment && <Text style={styles.reviewText}>{item.comment}</Text>}
            <View style={styles.reviewFooter}>
                {item.recommendation ? (
                    <View style={styles.recommendBadge}>
                        <ThumbsUp size={12} color="#34C759" />
                        <Text style={styles.recommendText}>{reviewCopy.recommends}</Text>
                    </View>
                ) : null}
                <Text style={styles.reviewDate}>
                    {new Date(item.createdAt).toLocaleDateString(i18n.language?.startsWith('ru') ? 'ru-RU' : i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-US')}
                </Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FF9500" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.sectionHeader}>
                <View>
                    <Text style={styles.sectionTitle}>{reviewCopy.reviews}</Text>
                    {total > 0 && (
                        <View style={styles.ratingOverview}>
                            <Star size={16} color="#FFD700" fill="#FFD700" />
                            <Text style={styles.avgRating}>{averageRating.toFixed(1)}</Text>
                            <Text style={styles.totalReviews}>({total} {reviewCopy.reviewsCount})</Text>
                        </View>
                    )}
                </View>
                {canReview && (
                    <TouchableOpacity
                        style={styles.writeButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <MessageSquare size={16} color="#FFFFFF" />
                        <Text style={styles.writeButtonText}>{reviewCopy.write}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {reviews.length === 0 ? (
                <Text style={styles.emptyText}>
                    {yatraStatus === 'completed'
                        ? reviewCopy.noReviewsYet
                        : reviewCopy.reviewsAfterTrip}
                </Text>
            ) : (
                <FlatList
                    data={reviews}
                    renderItem={renderReviewItem}
                    keyExtractor={item => item.id.toString()}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                />
            )}

            {/* Review Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.modalContent}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{reviewCopy.rateTrip}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <X size={24} color="#8E8E93" />
                                </TouchableOpacity>
                            </View>

                            {/* Overall Rating */}
                            <View style={styles.ratingSection}>
                                <Text style={styles.ratingLabel}>{reviewCopy.overallRating}</Text>
                                <RatingStars value={rating} onChange={setRating} size={32} />
                            </View>

                            {/* Sub Ratings */}
                            <View style={styles.subRatings}>
                                <View style={styles.subRatingItem}>
                                    <Text style={styles.subRatingLabel}>{reviewCopy.organizer}</Text>
                                    <RatingStars value={organizerRating} onChange={setOrganizerRating} size={20} />
                                </View>
                                <View style={styles.subRatingItem}>
                                    <Text style={styles.subRatingLabel}>{reviewCopy.route}</Text>
                                    <RatingStars value={routeRating} onChange={setRouteRating} size={20} />
                                </View>
                            </View>

                            <TextInput
                                style={styles.input}
                                placeholder={reviewCopy.experiencePlaceholder}
                                placeholderTextColor="#666"
                                multiline
                                numberOfLines={4}
                                value={comment}
                                onChangeText={setComment}
                            />

                            {/* Recommendation Toggle */}
                            <View style={styles.recommendToggle}>
                                <Text style={styles.recommendLabel}>{reviewCopy.wouldRecommend}</Text>
                                <View style={styles.toggleButtons}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, recommendation && styles.toggleActive]}
                                        onPress={() => setRecommendation(true)}
                                    >
                                        <ThumbsUp size={16} color={recommendation ? '#FFFFFF' : '#34C759'} />
                                        <Text style={[styles.toggleText, recommendation && styles.toggleTextActive]}>{reviewCopy.yes}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, !recommendation && styles.toggleActiveNo]}
                                        onPress={() => setRecommendation(false)}
                                    >
                                        <ThumbsDown size={16} color={!recommendation ? '#FFFFFF' : '#FF3B30'} />
                                        <Text style={[styles.toggleText, !recommendation && styles.toggleTextActive]}>{reviewCopy.no}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                                onPress={handleSubmitReview}
                                disabled={submitting}
                            >
                                <Text style={styles.submitButtonText}>
                                    {submitting ? 'Submitting...' : 'Publish review'}
                                </Text>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    ratingOverview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    avgRating: {
        color: '#FFD700',
        fontWeight: 'bold',
        fontSize: 16,
    },
    totalReviews: {
        color: '#8E8E93',
        fontSize: 14,
    },
    writeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF9500',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    writeButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 20,
    },
    reviewCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 16,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    reviewAuthor: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    reviewAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    reviewName: {
        color: '#E5E5EA',
        fontSize: 14,
        fontWeight: '600',
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewRatingText: {
        color: '#FFD700',
        fontWeight: 'bold',
        fontSize: 14,
    },
    reviewText: {
        color: '#8E8E93',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10,
    },
    reviewFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recommendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    recommendText: {
        color: '#34C759',
        fontSize: 12,
        fontWeight: '500',
    },
    reviewDate: {
        color: '#636366',
        fontSize: 11,
    },
    starsRow: {
        flexDirection: 'row',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1C1C1E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    ratingSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    ratingLabel: {
        color: '#8E8E93',
        fontSize: 14,
        marginBottom: 12,
    },
    subRatings: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    subRatingItem: {
        alignItems: 'center',
    },
    subRatingLabel: {
        color: '#8E8E93',
        fontSize: 12,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        padding: 16,
        color: '#FFFFFF',
        fontSize: 15,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    recommendToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    recommendLabel: {
        color: '#E5E5EA',
        fontSize: 14,
    },
    toggleButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    toggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        gap: 6,
    },
    toggleActive: {
        backgroundColor: '#34C759',
        borderColor: '#34C759',
    },
    toggleActiveNo: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    toggleText: {
        color: '#8E8E93',
        fontWeight: '500',
    },
    toggleTextActive: {
        color: '#FFFFFF',
    },
    submitButton: {
        backgroundColor: '#FF9500',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default YatraReviewsSection;
