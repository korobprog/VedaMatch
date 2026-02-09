import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
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
    Star, MapPin, Share2, MessageCircle, Phone, Mail,
    Wifi, Coffee, Wind, Droplets, Utensils, Warehouse, Car,
    ChevronLeft, Heart, Shield, CheckCircle, Clock
} from 'lucide-react-native';
import { yatraService } from '../../../services/yatraService';
import { Shelter, ShelterReview, SHELTER_TYPE_LABELS, AMENITY_LABELS } from '../../../types/yatra';
import LinearGradient from 'react-native-linear-gradient';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';

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
    const { user } = useUser();
    const { colors } = useRoleTheme(user?.role, true);

    const loadShelter = useCallback(async () => {
        try {
            setLoading(true);
            const data = await yatraService.getShelter(shelterId);
            setShelter(data);

            // Load reviews
            const reviewsData = await yatraService.getShelterReviews(shelterId, 1, 3);
            setReviews(reviewsData.reviews);
        } catch (error) {
            console.error('Error loading shelter details:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить информацию о жилье');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    }, [shelterId, navigation]);

    useEffect(() => {
        loadShelter();
    }, [loadShelter]);

    const handleShare = async () => {
        // Implement share logic
    };

    const handleSubmitReview = async () => {
        if (!comment.trim()) {
            Alert.alert('Ошибка', 'Напишите текст отзыва');
            return;
        }

        try {
            setSubmittingReview(true);
            await yatraService.createReview(shelterId, {
                rating,
                comment,
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
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось отправить отзыв');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleContact = (type: 'whatsapp' | 'phone' | 'email') => {
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
            Linking.canOpenURL(url).then(supported => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Alert.alert('Ошибка', 'Не удалось открыть приложение');
                }
            });
        } else {
            Alert.alert('Информация', 'Контакт не указан');
        }
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
            <View style={styles.loadingContainer}>
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
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                        <Share2 size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerContent}>
                        {shelter.sevaExchange && (
                            <View style={styles.sevaBadge}>
                                <Heart size={12} color="#FFFFFF" fill="#FFFFFF" />
                                <Text style={styles.sevaText}>Seva Exchange</Text>
                            </View>
                        )}
                        <Text style={styles.title}>{shelter.title}</Text>
                        <View style={styles.ratingRow}>
                            <Star size={16} color={colors.accent} fill={colors.accent} />
                            <Text style={styles.ratingText}>
                                {shelter.rating.toFixed(1)} <Text style={styles.reviewsCount}>({shelter.reviewsCount} отзывов)</Text>
                            </Text>
                            <Text style={styles.dot}>•</Text>
                            <Text style={styles.typeText}>{SHELTER_TYPE_LABELS[shelter.type] || shelter.type}</Text>
                        </View>
                        <View style={styles.locationRow}>
                            <MapPin size={16} color="#E5E5EA" />
                            <Text style={styles.locationText}>
                                {shelter.city}, {shelter.country}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Host Info */}
                <View style={styles.hostSection}>
                    <View style={styles.hostRow}>
                        <Image
                            source={{ uri: shelter.host?.avatarUrl || 'https://via.placeholder.com/50' }}
                            style={[styles.hostAvatar, { borderColor: colors.accent }]}
                        />
                        <View style={styles.hostInfo}>
                            <Text style={styles.hostLabel}>Хозяин</Text>
                            <Text style={styles.hostName}>
                                {shelter.host?.spiritualName || shelter.host?.karmicName || 'Пользователь'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.chatButton}
                            onPress={() => navigation.navigate('ChatRoom', { recipientId: shelter.hostId })}
                        >
                            <MessageCircle size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Описание</Text>
                    <Text style={styles.descriptionText}>{shelter.description}</Text>

                    {shelter.nearTemple && (
                        <View style={styles.templeBox}>
                            <MapPin size={20} color="#34C759" />
                            <Text style={styles.templeText}>Рядом с храмом: {shelter.nearTemple}</Text>
                        </View>
                    )}
                </View>

                {/* Amenities */}
                {amenities.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Удобства</Text>
                        <View style={styles.amenitiesGrid}>
                            {amenities.map(key => {
                                const Icon = getAmenityIcon(key);
                                return (
                                    <View key={key} style={styles.amenityItem}>
                                        <Icon size={24} color="#8E8E93" strokeWidth={1.5} />
                                        <Text style={styles.amenityText}>
                                            {AMENITY_LABELS[key] || key}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Rules */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Правила дома</Text>
                    <View style={styles.ruleList}>
                        {shelter.vegetarianOnly && (
                            <View style={styles.ruleItem}>
                                <CheckCircle size={20} color="#34C759" />
                                <Text style={styles.ruleText}>Только вегетарианская еда</Text>
                            </View>
                        )}
                        {shelter.noSmoking && (
                            <View style={styles.ruleItem}>
                                <CheckCircle size={20} color="#34C759" />
                                <Text style={styles.ruleText}>Курение запрещено</Text>
                            </View>
                        )}
                        {shelter.noAlcohol && (
                            <View style={styles.ruleItem}>
                                <CheckCircle size={20} color="#34C759" />
                                <Text style={styles.ruleText}>Алкоголь запрещён</Text>
                            </View>
                        )}
                        <View style={styles.ruleItem}>
                            <Clock size={20} color="#8E8E93" />
                            <Text style={styles.ruleText}>Мин. срок аренды: {shelter.minStay} дн.</Text>
                        </View>
                    </View>
                    {shelter.houseRules ? (
                        <Text style={[styles.descriptionText, { marginTop: 12 }]}>
                            {shelter.houseRules}
                        </Text>
                    ) : null}
                </View>

                {/* Seva Exchange Details */}
                {shelter.sevaExchange && (
                    <View style={styles.section}>
                        <View style={styles.sevaBox}>
                            <View style={styles.sevaHeader}>
                                <Heart size={24} color="#FFFFFF" fill="#FF2D55" />
                                <Text style={styles.sevaBoxTitle}>Сева (Служение)</Text>
                            </View>
                            <Text style={styles.sevaBoxText}>
                                {shelter.sevaDescription || 'Хозяин предлагает проживание в обмен на помощь. Свяжитесь для деталей.'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Reviews */}
                {reviews.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.reviewsHeader}>
                            <Text style={styles.sectionHeader}>Отзывы</Text>
                            <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
                                <Text style={styles.seeAllText}>Написать отзыв</Text>
                            </TouchableOpacity>
                        </View>
                        {reviews.map(review => (
                            <View key={review.id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewAuthor}>
                                        <Image
                                            source={{ uri: review.author?.avatarUrl || 'https://via.placeholder.com/30' }}
                                            style={styles.reviewAvatar}
                                        />
                                        <Text style={styles.reviewName}>
                                            {review.author?.spiritualName || review.author?.karmicName}
                                        </Text>
                                    </View>
                                    <View style={styles.reviewRating}>
                                        <Star size={14} color="#FFD700" fill="#FFD700" />
                                        <Text style={styles.reviewRatingText}>{review.rating}</Text>
                                    </View>
                                </View>
                                <Text style={styles.reviewText}>{review.comment}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {reviews.length === 0 && (
                    <View style={styles.section}>
                        <View style={styles.reviewsHeader}>
                            <Text style={styles.sectionHeader}>Отзывы</Text>
                            <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
                                <Text style={styles.seeAllText}>Написать первым</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: '#8E8E93' }}>Пока нет отзывов. Будьте первым!</Text>
                    </View>
                )}

            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.actionBar}>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Цена за ночь</Text>
                    <Text style={styles.priceValue}>
                        {shelter.pricePerNight || 'Договорная'}
                    </Text>
                </View>

                <View style={styles.actionButtons}>
                    {shelter.whatsapp && (
                        <TouchableOpacity
                            style={[styles.contactButton, { backgroundColor: '#25D366' }]}
                            onPress={() => handleContact('whatsapp')}
                        >
                            <MessageCircle size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}
                    {shelter.phone && (
                        <TouchableOpacity
                            style={[styles.contactButton, { backgroundColor: '#34C759' }]}
                            onPress={() => handleContact('phone')}
                        >
                            <Phone size={24} color="#FFFFFF" />
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
                            style={styles.modalContent}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Написать отзыв</Text>
                                <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                                    <Text style={styles.closeButtonText}>Закрыть</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.ratingSelect}>
                                {[1, 2, 3, 4, 5].map(r => (
                                    <TouchableOpacity key={r} onPress={() => setRating(r)} style={{ padding: 8 }}>
                                        <Star
                                            size={32}
                                            color={r <= rating ? '#FFD700' : '#444'}
                                            fill={r <= rating ? '#FFD700' : 'transparent'}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TextInput
                                style={styles.input}
                                placeholder="Расскажите о вашем опыте..."
                                placeholderTextColor="#666"
                                multiline
                                numberOfLines={4}
                                value={comment}
                                onChangeText={setComment}
                            />

                            <TouchableOpacity
                                style={[styles.submitButton, submittingReview && { opacity: 0.7 }]}
                                onPress={handleSubmitReview}
                                disabled={submittingReview}
                            >
                                <Text style={styles.submitButtonText}>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
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
        backgroundColor: '#FF2D55',
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
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
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
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 6,
    },
    reviewsCount: {
        fontWeight: 'normal',
        color: '#E5E5EA',
        fontSize: 14,
    },
    dot: {
        color: '#E5E5EA',
        marginHorizontal: 8,
    },
    typeText: {
        color: '#E5E5EA',
        fontSize: 16,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    locationText: {
        color: '#E5E5EA',
        fontSize: 16,
        fontWeight: '500',
    },
    hostSection: {
        padding: 20,
        backgroundColor: '#1C1C1E',
        marginHorizontal: 16,
        marginTop: -30,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
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
        borderColor: '#FF9500',
    },
    hostInfo: {
        flex: 1,
        marginLeft: 12,
    },
    hostLabel: {
        fontSize: 12,
        color: '#8E8E93',
        marginBottom: 2,
    },
    hostName: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    chatButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3A3A3C',
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C1E',
        paddingBottom: 24,
    },
    sectionHeader: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    descriptionText: {
        color: '#E5E5EA',
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
        color: '#34C759',
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
        color: '#E5E5EA',
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
        color: '#E5E5EA',
        fontSize: 16,
    },
    sevaBox: {
        backgroundColor: '#1C1C1E',
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
        color: '#FF2D55',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sevaBoxText: {
        color: '#E5E5EA',
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
        color: '#FF9500',
        fontSize: 16,
        fontWeight: '600',
    },
    reviewCard: {
        backgroundColor: '#1C1C1E',
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
        fontSize: 12,
    },
    reviewText: {
        color: '#8E8E93',
        fontSize: 14,
        lineHeight: 20,
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1C1C1E',
        padding: 16,
        paddingBottom: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
    },
    priceContainer: {
        flex: 1,
    },
    priceLabel: {
        color: '#8E8E93',
        fontSize: 12,
    },
    priceValue: {
        color: '#FFFFFF',
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
        backgroundColor: '#1C1C1E',
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
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButtonText: {
        color: '#FF9500',
        fontSize: 16,
    },
    ratingSelect: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        padding: 12,
        color: '#FFF',
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    submitButton: {
        backgroundColor: '#FF9500',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default ShelterDetailScreen;
