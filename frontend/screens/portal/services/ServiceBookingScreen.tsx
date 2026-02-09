/**
 * ServiceBookingScreen - Экран бронирования сервиса
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, User, MapPin, Video, CreditCard, MessageCircle } from 'lucide-react-native';
import {
    Service,
    ServiceTariff,
    getServiceById,
    getSlotsForRange,
    AvailableSlot,
    CHANNEL_LABELS,
} from '../../../services/serviceService';
import { bookService, CreateBookingRequest } from '../../../services/bookingService';
import { formatBalance, getCurrencyName } from '../../../services/walletService';
import { useWallet } from '../../../context/WalletContext';
import { useUser } from '../../../context/UserContext';
import ServiceCalendar from './components/ServiceCalendar';
import TariffSelector from './components/TariffSelector';
import { useRoleTheme } from '../../../hooks/useRoleTheme';

type RouteParams = {
    params: {
        serviceId: number;
    };
};

interface TimeSlot {
    time: string;
    available: boolean;
    bookedCount?: number;
    maxParticipants?: number;
}

interface AvailableSlotDay {
    date: string;
    slots: TimeSlot[];
}

export default function ServiceBookingScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'params'>>();
    const { user } = useUser();
    const { colors, roleTheme } = useRoleTheme(user?.role, true);
    const { wallet, refreshWallet, formattedBalance } = useWallet();

    const serviceId = route.params?.serviceId;

    const [service, setService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [slotsLoading, setSlotsLoading] = useState(false);

    const [selectedTariff, setSelectedTariff] = useState<ServiceTariff | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [clientNote, setClientNote] = useState('');

    const [availableSlots, setAvailableSlots] = useState<AvailableSlotDay[]>([]);

    // Load service
    const loadService = useCallback(async () => {
        if (!serviceId) return;

        try {
            const data = await getServiceById(serviceId);
            setService(data);

            // Auto-select default tariff
            if (data.tariffs && data.tariffs.length > 0) {
                const defaultTariff = data.tariffs.find(t => t.isDefault) || data.tariffs[0];
                setSelectedTariff(defaultTariff);
            }
        } catch (error) {
            console.error('Failed to load service:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить сервис');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    }, [serviceId, navigation]);

    // Load available slots
    const loadSlots = useCallback(async (_tariffId: number) => {
        if (!serviceId) return;

        setSlotsLoading(true);
        try {
            // Get slots for next 30 days
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);

            const response = await getSlotsForRange(
                serviceId,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            // Transform to our format
            const slots: AvailableSlotDay[] = (response.days || []).map((dayData: { date: string; slots: AvailableSlot[] }) => ({
                date: dayData.date,
                slots: dayData.slots.map((slot: AvailableSlot) => ({
                    time: slot.startTime.split('T')[1]?.substring(0, 5) || slot.startTime,
                    available: slot.spotsAvailable > 0,
                    bookedCount: 0,
                    maxParticipants: slot.spotsAvailable,
                })),
            }));

            setAvailableSlots(slots);
        } catch (error) {
            console.error('Failed to load slots:', error);
            setAvailableSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    }, [serviceId]);

    useEffect(() => {
        loadService();
    }, [loadService]);

    useEffect(() => {
        if (selectedTariff) {
            loadSlots(selectedTariff.id);
            // Reset date/time when tariff changes
            setSelectedDate(null);
            setSelectedTime(null);
        }
    }, [selectedTariff, loadSlots]);

    const handleTariffSelect = (tariff: ServiceTariff) => {
        setSelectedTariff(tariff);
    };

    const handleDateSelect = (date: string) => {
        setSelectedDate(date);
        setSelectedTime(null); // Reset time when date changes
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
    };

    const canBook = selectedTariff && selectedDate && selectedTime;

    const hasEnoughBalance = wallet && selectedTariff
        ? wallet.balance >= selectedTariff.price
        : false;

    const handleBook = async () => {
        if (!canBook || !service || !selectedTariff) return;

        if (!hasEnoughBalance) {
            const currencyName = getCurrencyName(user?.language);
            Alert.alert(
                `Недостаточно ${currencyName}`,
                `Для бронирования нужно ${formatBalance(selectedTariff.price)}. Ваш баланс: ${formattedBalance}`,
                [{ text: 'OK' }]
            );
            return;
        }

        setBooking(true);

        try {
            const scheduledAt = `${selectedDate}T${selectedTime}:00`;

            const request: CreateBookingRequest = {
                tariffId: selectedTariff.id,
                scheduledAt,
                clientNote: clientNote.trim() || undefined,
            };

            await bookService(serviceId, request);

            // Refresh wallet balance
            await refreshWallet();

            Alert.alert(
                'Запись создана! ✨',
                `Вы успешно записались на "${service.title}"\n\nДата: ${formatDate(selectedDate)}\nВремя: ${selectedTime}\nСтоимость: ${formatBalance(selectedTariff.price)}`,
                [
                    {
                        text: 'Мои записи',
                        onPress: () => navigation.navigate('MyBookings'),
                    },
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        } catch (error: any) {
            console.error('Booking failed:', error);
            Alert.alert(
                'Ошибка бронирования',
                error.message || 'Не удалось создать запись. Попробуйте позже.'
            );
        } finally {
            setBooking(false);
        }
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
    };

    if (loading) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            </LinearGradient>
        );
    }

    if (!service) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
                <SafeAreaView style={styles.container}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorIcon}>😔</Text>
                        <Text style={styles.errorText}>Сервис не найден</Text>
                        <TouchableOpacity style={styles.backButtonAlt} onPress={() => navigation.goBack()}>
                            <Text style={styles.backButtonText}>Назад</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Fixed Premium Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerCircleButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Запись на сессию</Text>
                    <View style={styles.walletBadge}>
                        <Text style={styles.walletBalance}>{formattedBalance}</Text>
                    </View>
                </View>

                <KeyboardAvoidingView
                    style={styles.content}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* Immersive Service Overview */}
                        <View style={styles.serviceOverview}>
                            <View style={styles.serviceHeaderInfo}>
                                <Text style={styles.serviceMainTitle}>{service.title}</Text>
                                {service.owner && (
                                    <View style={styles.ownerLine}>
                                        <View style={styles.ownerCircle}>
                                            <User size={10} color={colors.accent} />
                                        </View>
                                        <Text style={styles.ownerKarmicName}>{service.owner.karmicName}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.channelBadge}>
                                {service.channel === 'offline' ? (
                                    <MapPin size={12} color={colors.accent} />
                                ) : (
                                    <Video size={12} color={colors.accent} />
                                )}
                                <Text style={styles.channelLabel}>{CHANNEL_LABELS[service.channel]}</Text>
                            </View>
                        </View>

                        {/* Selection Mastery */}
                        <View style={styles.selectionSection}>
                            <View style={styles.sectionHeading}>
                                <View style={styles.headingIndicator} />
                                <Text style={styles.sectionLabel}>Выберите формат</Text>
                            </View>
                            <TariffSelector
                                tariffs={service.tariffs || []}
                                selectedTariffId={selectedTariff?.id || null}
                                onSelect={handleTariffSelect}
                            />
                        </View>

                        {selectedTariff && (
                            <View style={styles.selectionSection}>
                                <View style={styles.sectionHeading}>
                                    <View style={styles.headingIndicator} />
                                    <Text style={styles.sectionLabel}>Время и пространство</Text>
                                </View>
                                <ServiceCalendar
                                    availableSlots={availableSlots}
                                    selectedDate={selectedDate}
                                    selectedTime={selectedTime}
                                    onDateSelect={handleDateSelect}
                                    onTimeSelect={handleTimeSelect}
                                    loading={slotsLoading}
                                    durationMinutes={selectedTariff.durationMinutes}
                                />
                            </View>
                        )}

                        <View style={styles.selectionSection}>
                            <View style={styles.sectionHeading}>
                                <View style={styles.headingIndicator} />
                                <Text style={styles.sectionLabel}>Ваше намерение</Text>
                            </View>
                            <TextInput
                                style={styles.glassNoteInput}
                                placeholder="Опишите ваш запрос или вопрос..."
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                value={clientNote}
                                onChangeText={setClientNote}
                                multiline
                                maxLength={500}
                                blurOnSubmit
                            />
                        </View>

                        {/* Final Review */}
                        {canBook && selectedTariff && (
                            <View style={styles.reviewCard}>
                                <Text style={styles.reviewTitle}>ИТОГОВАЯ ПРОВЕРКА</Text>
                                <View style={styles.reviewGrid}>
                                    <View style={styles.reviewItem}>
                                        <Text style={styles.reviewLabel}>ТАРИФ</Text>
                                        <Text style={styles.reviewValue}>{selectedTariff.name}</Text>
                                    </View>
                                    <View style={styles.reviewItem}>
                                        <Text style={styles.reviewLabel}>ДАТА</Text>
                                        <Text style={styles.reviewValue}>{formatDate(selectedDate!)}</Text>
                                    </View>
                                    <View style={styles.reviewItem}>
                                        <Text style={styles.reviewLabel}>ВРЕМЯ</Text>
                                        <Text style={styles.reviewValue}>{selectedTime}</Text>
                                    </View>
                                </View>

                                <View style={styles.costDivider} />

                                <View style={styles.costSection}>
                                    <Text style={styles.totalText}>К ОПЛАТЕ</Text>
                                    <Text style={styles.totalAmount}>{selectedTariff.price} ₵</Text>
                                </View>

                                {!hasEnoughBalance && (
                                    <View style={styles.balanceAlert}>
                                        <Text style={styles.balanceAlertText}>
                                            Недостаточно {getCurrencyName(user?.language)}. Не хватает {selectedTariff.price - (wallet?.balance || 0)} ₵
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={{ height: 160 }} />
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Fixed Premium CTA */}
                <View style={styles.footerCTA}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={[
                            styles.primaryBookButton,
                            (!canBook || !hasEnoughBalance || booking) && styles.primaryBookButtonDisabled,
                        ]}
                        onPress={handleBook}
                        disabled={!canBook || !hasEnoughBalance || booking}
                    >
                        {booking ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.primaryBookButtonText}>
                                {!canBook
                                    ? 'ВЫБЕРИТЕ ПАРАМЕТРЫ'
                                    : !hasEnoughBalance
                                        ? 'ПОПОЛНИТЕ БАЛАНС'
                                        : 'ПОДТВЕРДИТЬ И ОПЛАТИТЬ'
                                }
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorIcon: {
        fontSize: 60,
        marginBottom: 20,
    },
    errorText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 24,
        textAlign: 'center',
    },
    backButtonAlt: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 30,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerCircleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
        textAlign: 'center',
    },
    walletBadge: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    walletBalance: {
        color: '#F59E0B',
        fontSize: 13,
        fontWeight: '800',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    serviceOverview: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 28,
        padding: 24,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    serviceHeaderInfo: {
        marginBottom: 16,
    },
    serviceMainTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 10,
        lineHeight: 30,
    },
    ownerLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ownerCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ownerKarmicName: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        fontWeight: '600',
    },
    channelBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 6,
    },
    channelLabel: {
        color: '#F59E0B',
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    selectionSection: {
        marginBottom: 32,
    },
    sectionHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    headingIndicator: {
        width: 4,
        height: 16,
        backgroundColor: '#F59E0B',
        borderRadius: 2,
    },
    sectionLabel: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Cinzel-Bold',
    },
    glassNoteInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 20,
        padding: 20,
        color: '#fff',
        fontSize: 15,
        minHeight: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    reviewCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    reviewTitle: {
        color: '#F59E0B',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 24,
    },
    reviewGrid: {
        gap: 16,
    },
    reviewItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reviewLabel: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 11,
        fontWeight: '800',
    },
    reviewValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    costDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginVertical: 20,
    },
    costSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    totalAmount: {
        color: '#F59E0B',
        fontSize: 24,
        fontWeight: '900',
    },
    balanceAlert: {
        marginTop: 20,
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(244, 67, 54, 0.2)',
    },
    balanceAlertText: {
        color: '#F44336',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    footerCTA: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
        backgroundColor: 'rgba(10, 10, 20, 0.85)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    primaryBookButton: {
        backgroundColor: '#F59E0B',
        height: 64,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
    },
    primaryBookButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        shadowOpacity: 0,
    },
    primaryBookButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});
