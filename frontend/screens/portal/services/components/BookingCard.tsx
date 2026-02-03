/**
 * BookingCard - Карточка записи
 */
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import { Calendar, Clock, User, MapPin, Video, MessageCircle, X } from 'lucide-react-native';
import { ServiceBooking, STATUS_LABELS, STATUS_COLORS, formatBookingTime, formatDuration } from '../../../../services/bookingService';
import { CHANNEL_LABELS } from '../../../../services/serviceService';

interface BookingCardProps {
    booking: ServiceBooking;
    onPress: () => void;
    onCancel?: () => void;
    onChat?: () => void;
}

export default function BookingCard({
    booking,
    onPress,
    onCancel,
    onChat,
}: BookingCardProps) {
    const statusColor = STATUS_COLORS[booking.status];
    const isUpcoming = booking.status === 'confirmed' || booking.status === 'pending';
    const canCancel = isUpcoming && new Date(booking.scheduledAt) > new Date();

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                    {STATUS_LABELS[booking.status]}
                </Text>
            </View>

            {/* Service Info */}
            <View style={styles.serviceRow}>
                {booking.service?.coverImageUrl ? (
                    <Image
                        source={{ uri: booking.service.coverImageUrl }}
                        style={styles.serviceImage}
                    />
                ) : (
                    <View style={styles.servicePlaceholder}>
                        <Text style={styles.placeholderEmoji}>🔮</Text>
                    </View>
                )}
                <View style={styles.serviceInfo}>
                    <Text style={styles.serviceTitle} numberOfLines={2}>
                        {booking.service?.title || 'Сервис'}
                    </Text>
                    {booking.service?.owner && (
                        <View style={styles.ownerRow}>
                            <User size={12} color="rgba(255,255,255,0.5)" />
                            <Text style={styles.ownerName}>{booking.service.owner.karmicName}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Date & Time */}
            <View style={styles.dateTimeRow}>
                <View style={styles.dateBlock}>
                    <Calendar size={14} color="#FFD700" />
                    <Text style={styles.dateText}>{formatDate(booking.scheduledAt)}</Text>
                </View>
                <View style={styles.timeBlock}>
                    <Clock size={14} color="#FFD700" />
                    <Text style={styles.timeText}>{formatTime(booking.scheduledAt)}</Text>
                </View>
                <View style={styles.durationBlock}>
                    <Text style={styles.durationText}>{formatDuration(booking.durationMinutes)}</Text>
                </View>
            </View>

            {/* Channel */}
            {booking.service && (
                <View style={styles.channelRow}>
                    {booking.service.channel === 'offline' ? (
                        <MapPin size={12} color="rgba(255,255,255,0.5)" />
                    ) : (
                        <Video size={12} color="rgba(255,255,255,0.5)" />
                    )}
                    <Text style={styles.channelText}>
                        {CHANNEL_LABELS[booking.service.channel]}
                    </Text>
                    {booking.meetingLink && (
                        <Text style={styles.meetingLink}>• Ссылка готова</Text>
                    )}
                </View>
            )}

            {/* Tariff & Price */}
            <View style={styles.priceRow}>
                <Text style={styles.tariffName}>{booking.tariff?.name || 'Стандарт'}</Text>
                <Text style={styles.price}>{booking.pricePaid} ₽</Text>
            </View>

            {/* Actions */}
            {isUpcoming && (
                <View style={styles.actionsRow}>
                    {onChat && booking.chatRoomId && (
                        <TouchableOpacity style={styles.actionButton} onPress={onChat}>
                            <MessageCircle size={16} color="#FFD700" />
                            <Text style={styles.actionText}>Чат</Text>
                        </TouchableOpacity>
                    )}
                    {canCancel && onCancel && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={onCancel}
                        >
                            <X size={16} color="#F44336" />
                            <Text style={[styles.actionText, styles.cancelText]}>Отменить</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Client Note */}
            {booking.clientNote && (
                <View style={styles.noteRow}>
                    <Text style={styles.noteLabel}>Ваш комментарий:</Text>
                    <Text style={styles.noteText} numberOfLines={2}>{booking.clientNote}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 12,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    serviceRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    serviceImage: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    servicePlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 20,
    },
    serviceInfo: {
        flex: 1,
        marginLeft: 12,
    },
    serviceTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ownerName: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 16,
    },
    dateBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    timeBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    durationBlock: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    durationText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 11,
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    channelText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
    },
    meetingLink: {
        color: '#4CAF50',
        fontSize: 12,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    tariffName: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
    },
    price: {
        color: '#FFD700',
        fontSize: 16,
        fontWeight: '700',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    cancelButton: {
        backgroundColor: 'rgba(244, 67, 54, 0.15)',
    },
    actionText: {
        color: '#FFD700',
        fontSize: 13,
        fontWeight: '500',
    },
    cancelText: {
        color: '#F44336',
    },
    noteRow: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    noteLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        marginBottom: 4,
    },
    noteText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontStyle: 'italic',
    },
});
