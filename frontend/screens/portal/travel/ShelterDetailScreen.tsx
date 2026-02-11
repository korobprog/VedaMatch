import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    Star, MapPin, Share2, MessageCircle, Phone,
    Wifi, Coffee, Wind, Droplets, Utensils, Warehouse, Car,
    ChevronLeft, Heart, CheckCircle, Clock
} from 'lucide-react-native';
import { yatraService } from '../../../services/yatraService';
import { Shelter, ShelterReview, SHELTER_TYPE_LABELS, AMENITY_LABELS } from '../../../types/yatra';
import LinearGradient from 'react-native-linear-gradient';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useSettings } from '../../../context/SettingsContext';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const ShelterDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { shelterId } = route.params;

    const [shelter, setShelter] = useState<Shelter | null>(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<ShelterReview[]>([]);

    // Review Modal State
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const latestLoadRequestRef = useRef(0);
    const isMountedRef = useRef(true);
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const loadShelter = useCallback(async () => {
        const requestId = ++latestLoadRequestRef.current;
        try {
            if (isMountedRef.current) {
                setLoading(true);
            }
            const [data, reviewsData] = await Promise.all([
                yatraService.getShelter(shelterId),
                yatraService.getShelterReviews(shelterId, 1, 3),
            ]);
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            setShelter(data);
            setReviews(Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : []);
        } catch (error) {
            console.error('Error loading shelter details:', error);
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                Alert.alert('Ошибка', 'Не удалось загрузить информацию о жилье');
                navigation.goBack();
            }
        } finally {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [shelterId, navigation]);

    useEffect(() => {
        loadShelter();
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
        };
    }, [loadShelter]);

    const handleShare = async () => {
        // Implement share logic
    };

    const handleSubmitReview = async () => {
        if (submittingReview) {
            return;
        }
        if (!comment.trim()) {
            Alert.alert('Ошибка', 'Напишите текст отзыва');
            return;
        }

        try {
            setSubmittingReview(true);
            await yatraService.createReview(shelterId, {
                rating,
                comment: comment.trim(),
                cleanlinessRating: rating, // Simple default
                locationRating: rating,
                valueRating: rating,
                hospitalityRating: rating
            });
            Alert.alert('Спасибо!', 'Ваш отзыв опубликован');
            setReviewModalVisible(false);
            setComment('');
            setRating(5);
            loadShelter(); // Reload to see new review and avg rating
        } catch {
            Alert.alert('Ошибка', 'Не удалось отправить отзыв');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleContact = (type: 'whatsapp' | 'phone' | 'email') => {
        void (async () => {
        if (!shelter) return;

        let url = '';
        switch (type) {
            case 'whatsapp':
                if (shelter.whatsapp) {
                    url = `whatsapp://send?phone=${shelter.whatsapp}&text=Здравствуйте, интересует ваше жилье ${shelter.title}`;
                }
                break;
            case 'phone':
                if (shelter.phone) url = `tel:${shelter.phone}`;
                break;
            case 'email':
                if (shelter.email) url = `mailto:${shelter.email}`;
                break;
        }

        if (url) {
            try {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                    await Linking.openURL(url);
                } else {
                    Alert.alert('Ошибка', 'Не удалось открыть приложение');
                }
            } catch (error) {
                console.error('Failed to open contact URL:', error);
                Alert.alert('Ошибка', 'Не удалось открыть приложение');
            }
        } else {
            Alert.alert('Информация', 'Контакт не указан');
        }
        })();
    };

    const getAmenityIcon = (key: string) => {
        switch (key) {
            case 'wifi': return Wifi;
            case 'ac': return Wind;
            case 'hot_water': return Droplets;
            case 'prasadam': return Coffee;
            case 'kitchen': return Utensils;
            case 'laundry': return Warehouse; // Approximate
            case 'parking': return Car;
            default: return CheckCircle;
        }
    };

    if (loading || !shelter) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    const amenities = yatraService.parseAmenities(shelter.amenities);
    const photos = yatraService.parsePhotos(shelter.photos);
    const coverImage = photos.length > 0 ? photos[0] : shelter.host?.avatarUrl;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: yatraService.getImageUrl(coverImage || null) }}
                        style={styles.coverImage}
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.gradient}
                    />

                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: colors.overlay }]}
                        onPress={() => navigation.goBack()}
                    >
                        <ChevronLeft size={28} color={colors.textPrimary} strokeWidth={2} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.overlay }]} onPress={handleShare}>
                        <Share2 size={24} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.headerContent}>
                        {shelter.sevaExchange && (
                            <View style={[styles.sevaBadge, { backgroundColor: colors.danger }]}>
                                <Heart size={12} color={colors.textPrimary} fill={colors.textPrimary} />
                                <Text style={styles.sevaText}>Seva Exchange</Text>
                            </View>
                        )}
                        <Text style={[styles.title, { color: colors.textPrimary }]}>{shelter.title}</Text>
                        <View style={styles.ratingRow}>
                            <Star size={16} color={colors.accent} fill={colors.accent} />
                            <Text style={[styles.ratingText, { color: colors.textPrimary }]}>
                                {shelter.rating.toFixed(1)} <Text style={[styles.reviewsCount, { color: colors.textSecondary }]}>({shelter.reviewsCount} отзывов)</Text>
                            </Text>
                            <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
                            <Text style={[styles.typeText, { color: colors.textSecondary }]}>{SHELTER_TYPE_LABELS[shelter.type] || shelter.type}</Text>
                        </View>
                        <View style={styles.locationRow}>
                            <MapPin size={16} color={colors.textSecondary} />
                            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                                {shelter.city}, {shelter.country}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Host Info */}
                <View style={[styles.hostSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <View style={styles.hostRow}>
                        <Image
                            source={{ uri: shelter.host?.avatarUrl || 'https://via.placeholder.com/50' }}
                            style={[styles.hostAvatar, { borderColor: colors.accent }]}
                        />
                        <View style={styles.hostInfo}>
                            <Text style={[styles.hostLabel, { color: colors.textSecondary }]}>Хозяин</Text>
                            <Text style={[styles.hostName, { color: colors.textPrimary }]}>
                                {shelter.host?.spiritualName || shelter.host?.karmicName || 'Пользователь'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.chatButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => navigation.navigate('ChatRoom', { recipientId: shelter.hostId })}
                        >
                            <MessageCircle size={20} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Description */}
                <View style={[styles.section, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Описание</Text>
                    <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{shelter.description}</Text>

                    {shelter.nearTemple && (
                        <View style={[styles.templeBox, { backgroundColor: colors.accentSoft }]}>
                            <MapPin size={20} color={colors.success} />
                            <Text style={[styles.templeText, { color: colors.success }]}>Рядом с храмом: {shelter.nearTemple}</Text>
                        </View>
                    )}
                </View>

                {/* Amenities */}
                {amenities.length > 0 && (
                    <View style={[styles.section, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Удобства</Text>
                        <View style={styles.amenitiesGrid}>
                            {amenities.map(key => {
                                const Icon = getAmenityIcon(key);
                                return (
                                    <View key={key} style={styles.amenityItem}>
                                        <Icon size={24} color={colors.textSecondary} strokeWidth={1.5} />
                                        <Text style={[styles.amenityText, { color: colors.textSecondary }]}>
                                            {AMENITY_LABELS[key] || key}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Rules */}
                <View style={[styles.section, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Правила дома</Text>
                    <View style={styles.ruleList}>
                        {shelter.vegetarianOnly && (
                            <View style={styles.ruleItem}>
                                <CheckCircle size={20} color={colors.success} />
                                <Text style={[styles.ruleText, { color: colors.textSecondary }]}>Только вегетарианская еда</Text>
                            </View>
                        )}
                        {shelter.noSmoking && (
                            <View style={styles.ruleItem}>
                                <CheckCircle size={20} color={colors.success} />
                                <Text style={[styles.ruleText, { color: colors.textSecondary }]}>Курение запрещено</Text>
                            </View>
                        )}
                        {shelter.noAlcohol && (
                            <View style={styles.ruleItem}>
                                <CheckCircle size={20} color={colors.success} />
                                <Text style={[styles.ruleText, { color: colors.textSecondary }]}>Алкоголь запрещён</Text>
                            </View>
                        )}
                        <View style={styles.ruleItem}>
                            <Clock size={20} color={colors.textSecondary} />
                            <Text style={[styles.ruleText, { color: colors.textSecondary }]}>Мин. срок аренды: {shelter.minStay} дн.</Text>
                        </View>
                    </View>
                    {shelter.houseRules ? (
                        <Text style={[styles.descriptionText, { marginTop: 12, color: colors.textSecondary }]}>
                            {shelter.houseRules}
                        </Text>
                    ) : null}
                </View>

                {/* Seva Exchange Details */}
                {shelter.sevaExchange && (
                    <View style={[styles.section, { borderBottomColor: colors.border }]}>
                        <View style={[styles.sevaBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.danger }]}>
                            <View style={styles.sevaHeader}>
                                <Heart size={24} color={colors.danger} fill={colors.danger} />
                                <Text style={[styles.sevaBoxTitle, { color: colors.danger }]}>Сева (Служение)</Text>
                            </View>
                            <Text style={[styles.sevaBoxText, { color: colors.textSecondary }]}>
                                {shelter.sevaDescription || 'Хозяин предлагает проживание в обмен на помощь. Свяжитесь для деталей.'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Reviews */}
                {reviews.length > 0 && (
                    <View style={[styles.section, { borderBottomColor: colors.border }]}>
                        <View style={styles.reviewsHeader}>
                            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Отзывы</Text>
                            <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
                                <Text style={[styles.seeAllText, { color: colors.accent }]}>Написать отзыв</Text>
                            </TouchableOpacity>
                        </View>
                        {reviews.map(review => (
                            <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.surfaceElevated }]}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewAuthor}>
                                        <Image
                                            source={{ uri: review.author?.avatarUrl || 'https://via.placeholder.com/30' }}
                                            style={styles.reviewAvatar}
                                        />
                                        <Text style={[styles.reviewName, { color: colors.textPrimary }]}>
                                            {review.author?.spiritualName || review.author?.karmicName}
                                        </Text>
                                    </View>
                                    <View style={styles.reviewRating}>
                                        <Star size={14} color={colors.warning} fill={colors.warning} />
                                        <Text style={[styles.reviewRatingText, { color: colors.warning }]}>{review.rating}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.reviewText, { color: colors.textSecondary }]}>{review.comment}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {reviews.length === 0 && (
                    <View style={[styles.section, { borderBottomColor: colors.border }]}>
                        <View style={styles.reviewsHeader}>
                            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Отзывы</Text>
                            <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
                                <Text style={[styles.seeAllText, { color: colors.accent }]}>Написать первым</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.textSecondary }}>Пока нет отзывов. Будьте первым!</Text>
                    </View>
                )}

            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={[styles.actionBar, { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border }]}>
                <View style={styles.priceContainer}>
                    <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Цена за ночь</Text>
                    <Text style={[styles.priceValue, { color: colors.textPrimary }]}>
                        {shelter.pricePerNight || 'Договорная'}
                    </Text>
                </View>

                <View style={styles.actionButtons}>
                    {shelter.whatsapp && (
                        <TouchableOpacity
                            style={[styles.contactButton, { backgroundColor: colors.success }]}
                            onPress={() => handleContact('whatsapp')}
                        >
                            <MessageCircle size={24} color={colors.background} />
                        </TouchableOpacity>
                    )}
                    {shelter.phone && (
                        <TouchableOpacity
                            style={[styles.contactButton, { backgroundColor: colors.accent }]}
                            onPress={() => handleContact('phone')}
                        >
                            <Phone size={24} color={colors.background} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Review Modal */}
            <Modal
                visible={reviewModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setReviewModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={[styles.modalContent, { backgroundColor: colors.surfaceElevated }]}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Написать отзыв</Text>
                                <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                                    <Text style={[styles.closeButtonText, { color: colors.accent }]}>Закрыть</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.ratingSelect}>
                                {[1, 2, 3, 4, 5].map(r => (
                                    <TouchableOpacity key={r} onPress={() => setRating(r)} style={{ padding: 8 }}>
                                        <Star
                                            size={32}
                                            color={r <= rating ? colors.warning : colors.border}
                                            fill={r <= rating ? colors.warning : 'transparent'}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                                placeholder="Расскажите о вашем опыте..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={4}
                                value={comment}
                                onChangeText={setComment}
                            />

                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.accent }, submittingReview && { opacity: 0.7 }]}
                                onPress={handleSubmitReview}
                                disabled={submittingReview}
                            >
                                <Text style={[styles.submitButtonText, { color: colors.background }]}>
                                    {submittingReview ? 'Отправка...' : 'Опубликовать'}
                                </Text>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View >
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
    },
    imageContainer: {
        height: 350,
        width: '100%',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
        zIndex: 10,
    },
    shareButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    headerContent: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
    },
    sevaBadge: {
        backgroundColor: colors.danger,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sevaText: {
        color: colors.textPrimary,
        fontWeight: 'bold',
        fontSize: 12,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 8,
        lineHeight: 38,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    ratingText: {
        color: colors.textPrimary,
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 6,
    },
    reviewsCount: {
        fontWeight: 'normal',
        color: colors.textSecondary,
        fontSize: 14,
    },
    dot: {
        color: colors.textSecondary,
        marginHorizontal: 8,
    },
    typeText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    locationText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '500',
    },
    hostSection: {
        padding: 20,
        backgroundColor: colors.surfaceElevated,
        marginHorizontal: 16,
        marginTop: -30,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    hostRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hostAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: colors.accent,
    },
    hostInfo: {
        flex: 1,
        marginLeft: 12,
    },
    hostLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    hostName: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    chatButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 24,
    },
    sectionHeader: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 16,
    },
    descriptionText: {
        color: colors.textSecondary,
        fontSize: 16,
        lineHeight: 24,
    },
    templeBox: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        padding: 12,
        borderRadius: 12,
        gap: 10,
    },
    templeText: {
        color: colors.success,
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    amenityItem: {
        width: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    amenityText: {
        color: colors.textSecondary,
        fontSize: 15,
    },
    ruleList: {
        gap: 12,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    ruleText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    sevaBox: {
        backgroundColor: colors.surfaceElevated,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 45, 85, 0.3)',
    },
    sevaHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    sevaBoxTitle: {
        color: colors.danger,
        fontSize: 18,
        fontWeight: 'bold',
    },
    sevaBoxText: {
        color: colors.textSecondary,
        fontSize: 15,
        lineHeight: 22,
    },
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    seeAllText: {
        color: colors.accent,
        fontSize: 16,
        fontWeight: '600',
    },
    reviewCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reviewAuthor: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    reviewAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    reviewName: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewRatingText: {
        color: colors.warning,
        fontWeight: 'bold',
        fontSize: 12,
    },
    reviewText: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surfaceElevated,
        padding: 16,
        paddingBottom: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    priceContainer: {
        flex: 1,
    },
    priceLabel: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    priceValue: {
        color: colors.textPrimary,
        fontSize: 22,
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    contactButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surfaceElevated,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButtonText: {
        color: colors.accent,
        fontSize: 16,
    },
    ratingSelect: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 12,
        color: colors.textPrimary,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    submitButton: {
        backgroundColor: colors.accent,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        color: colors.background,
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default ShelterDetailScreen;
