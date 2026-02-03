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
import { formatBalance } from '../../../services/walletService';
import { useWallet } from '../../../context/WalletContext';
import ServiceCalendar from './components/ServiceCalendar';
import TariffSelector from './components/TariffSelector';

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
            Alert.alert(
                'Недостаточно Лакшми',
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
            <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#FFD700" />
                </View>
            </LinearGradient>
        );
    }

    if (!service) {
        return (
            <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
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
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Запись</Text>
                    <View style={styles.walletBadge}>
                        <Text style={styles.walletBalance}>{formattedBalance}</Text>
                    </View>
                </View>

                <KeyboardAvoidingView
                    style={styles.content}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Service Info */}
                        <View style={styles.serviceInfo}>
                            <Text style={styles.serviceTitle}>{service.title}</Text>
                            {service.owner && (
                                <View style={styles.ownerRow}>
                                    <User size={14} color="rgba(255,255,255,0.6)" />
                                    <Text style={styles.ownerName}>{service.owner.karmicName}</Text>
                                </View>
                            )}
                            <View style={styles.channelRow}>
                                {service.channel === 'offline' ? (
                                    <MapPin size={14} color="#FFD700" />
                                ) : (
                                    <Video size={14} color="#FFD700" />
                                )}
                                <Text style={styles.channelText}>{CHANNEL_LABELS[service.channel]}</Text>
                            </View>
                        </View>

                        {/* Tariff Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Выберите тариф</Text>
                            <TariffSelector
                                tariffs={service.tariffs || []}
                                selectedTariffId={selectedTariff?.id || null}
                                onSelect={handleTariffSelect}
                            />
                        </View>

                        {/* Calendar & Time Selection */}
                        {selectedTariff && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Дата и время</Text>
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

                        {/* Client Note */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MessageCircle size={16} color="#FFD700" />
                                <Text style={styles.sectionTitle}>Комментарий (опционально)</Text>
                            </View>
                            <TextInput
                                style={styles.noteInput}
                                placeholder="Расскажите о себе или задайте вопрос..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={clientNote}
                                onChangeText={setClientNote}
                                multiline
                                maxLength={500}
                            />
                        </View>

                        {/* Summary */}
                        {canBook && selectedTariff && (
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryTitle}>Итого</Text>

                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Тариф</Text>
                                    <Text style={styles.summaryValue}>{selectedTariff.name}</Text>
                                </View>

                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Дата</Text>
                                    <Text style={styles.summaryValue}>{formatDate(selectedDate!)}</Text>
                                </View>

                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Время</Text>
                                    <Text style={styles.summaryValue}>{selectedTime}</Text>
                                </View>

                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Длительность</Text>
                                    <Text style={styles.summaryValue}>{selectedTariff.durationMinutes} мин</Text>
                                </View>

                                <View style={styles.totalRow}>
                                    <CreditCard size={20} color="#FFD700" />
                                    <Text style={styles.totalLabel}>К оплате</Text>
                                    <Text style={styles.totalValue}>{formatBalance(selectedTariff.price)}</Text>
                                </View>

                                {!hasEnoughBalance && (
                                    <View style={styles.insufficientBalance}>
                                        <Text style={styles.insufficientText}>
                                            Недостаточно Лакшми. Нужно ещё {formatBalance(selectedTariff.price - (wallet?.balance || 0))}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={{ height: 120 }} />
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Bottom CTA */}
                <View style={styles.bottomCTA}>
                    <TouchableOpacity
                        style={[
                            styles.bookButton,
                            (!canBook || !hasEnoughBalance || booking) && styles.bookButtonDisabled,
                        ]}
                        onPress={handleBook}
                        disabled={!canBook || !hasEnoughBalance || booking}
                    >
                        {booking ? (
                            <ActivityIndicator color="#1a1a2e" />
                        ) : (
                            <Text style={styles.bookButtonText}>
                                {!canBook
                                    ? 'Выберите дату и время'
                                    : !hasEnoughBalance
                                        ? 'Недостаточно Лакшми'
                                        : 'Записаться'
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
    },
    errorIcon: {
        fontSize: 60,
        marginBottom: 16,
    },
    errorText: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 24,
    },
    backButtonAlt: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    walletBadge: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    walletBalance: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    serviceInfo: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 16,
    },
    serviceTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    ownerName: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    channelText: {
        color: '#FFD700',
        fontSize: 13,
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    noteInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 14,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    summaryCard: {
        marginHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
    },
    summaryTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
    },
    summaryValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
    },
    totalLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    totalValue: {
        color: '#FFD700',
        fontSize: 20,
        fontWeight: '700',
    },
    insufficientBalance: {
        marginTop: 12,
        backgroundColor: 'rgba(244, 67, 54, 0.2)',
        borderRadius: 8,
        padding: 12,
    },
    insufficientText: {
        color: '#F44336',
        fontSize: 12,
        textAlign: 'center',
    },
    bottomCTA: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: 32,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    bookButton: {
        backgroundColor: '#FFD700',
        paddingVertical: 16,
        borderRadius: 28,
        alignItems: 'center',
    },
    bookButtonDisabled: {
        backgroundColor: 'rgba(255, 215, 0, 0.3)',
    },
    bookButtonText: {
        color: '#1a1a2e',
        fontSize: 16,
        fontWeight: '700',
    },
});
