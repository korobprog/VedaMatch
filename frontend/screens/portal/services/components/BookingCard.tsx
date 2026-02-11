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
import { Calendar, Clock, User, MapPin, Video, MessageCircle, X, Sparkles } from 'lucide-react-native';
import { ServiceBooking, STATUS_LABELS, STATUS_COLORS } from '../../../../services/bookingService';
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
    const statusColor = STATUS_COLORS[booking.status] || 'rgba(158, 158, 158, 1)';
    const isUpcoming = booking.status === 'confirmed' || booking.status === 'pending';
    const scheduledAt = new Date(booking.scheduledAt);
    const hasValidSchedule = !Number.isNaN(scheduledAt.getTime());
    const canCancel = isUpcoming && hasValidSchedule && scheduledAt > new Date();

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) {
            return 'Дата не указана';
        }
        return date.toLocaleDateString('ru-RU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) {
            return '--:--';
        }
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
            {/* Status Badge */}
            <View style={styles.topRow}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {STATUS_LABELS[booking.status]}
                    </Text>
                </View>
                <View style={styles.priceBadge}>
                    <Text style={styles.price}>{booking.pricePaid} ₵</Text>
                </View>
            </View>

            {/* Service Content */}
            <View style={styles.contentRow}>
                {booking.service?.coverImageUrl ? (
                    <Image
                        source={{ uri: booking.service.coverImageUrl }}
                        style={styles.serviceImage}
                    />
                ) : (
                    <View style={styles.servicePlaceholder}>
                        <Sparkles size={20} color="rgba(245,158,11,1)" />
                    </View>
                )}
                <View style={styles.serviceDetails}>
                    <Text style={styles.serviceTitle} numberOfLines={2}>
                        {booking.service?.title || 'Священная сессия'}
                    </Text>
                    {booking.service?.owner && (
                        <View style={styles.ownerRow}>
                            <View style={styles.ownerAvatarPlaceholder}>
                                <User size={10} color="rgba(245,158,11,1)" />
                            </View>
                            <Text style={styles.ownerName}>{booking.service.owner.karmicName}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Logistics Info */}
            <View style={styles.logisticsGrid}>
                <View style={styles.logisticsItem}>
                    <Calendar size={14} color="rgba(245,158,11,1)" />
                    <Text style={styles.logisticsText}>{formatDate(booking.scheduledAt)}</Text>
                </View>
                <View style={styles.logisticsItem}>
                    <Clock size={14} color="rgba(245,158,11,1)" />
                    <Text style={styles.logisticsText}>{formatTime(booking.scheduledAt)}</Text>
                </View>
                <View style={styles.logisticsItem}>
                    {booking.service?.channel === 'offline' ? (
                        <MapPin size={14} color="rgba(245,158,11,1)" />
                    ) : (
                        <Video size={14} color="rgba(245,158,11,1)" />
                    )}
                    <Text style={styles.logisticsText} numberOfLines={1}>
                        {CHANNEL_LABELS[booking.service?.channel || 'video']}
                    </Text>
                </View>
            </View>

            {/* Action Area */}
            {isUpcoming && (
                <View style={styles.actionsContainer}>
                    {onChat && booking.chatRoomId && (
                        <TouchableOpacity style={styles.chatAction} onPress={onChat}>
                            <MessageCircle size={18} color="rgba(245,158,11,1)" />
                            <Text style={styles.chatActionText}>Обсудить в чате</Text>
                        </TouchableOpacity>
                    )}
                    {canCancel && onCancel && (
                        <TouchableOpacity style={styles.cancelAction} onPress={onCancel}>
                            <X size={18} color="rgba(244, 67, 54, 0.6)" />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Personal Note */}
            {booking.clientNote && (
                <View style={styles.noteOverlay}>
                    <Text style={styles.noteTitle}>Мои пожелания:</Text>
                    <Text style={styles.noteContent} numberOfLines={2}>{booking.clientNote}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 28,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    priceBadge: {
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    price: {
        color: 'rgba(245,158,11,1)',
        fontSize: 16,
        fontWeight: '900',
    },
    contentRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    serviceImage: {
        width: 56,
        height: 56,
        borderRadius: 16,
    },
    servicePlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.1)',
    },
    serviceDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    serviceTitle: {
        color: 'rgba(255,255,255,1)',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 6,
    },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    ownerAvatarPlaceholder: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ownerName: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        fontWeight: '600',
    },
    logisticsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 14,
        borderRadius: 20,
        marginBottom: 16,
    },
    logisticsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logisticsText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 13,
        fontWeight: '700',
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    chatAction: {
        flex: 1,
        flexDirection: 'row',
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    chatActionText: {
        color: 'rgba(245,158,11,1)',
        fontSize: 14,
        fontWeight: '800',
    },
    cancelAction: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    noteOverlay: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    noteTitle: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    noteContent: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
    },
});
