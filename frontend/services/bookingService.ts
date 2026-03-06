/**
 * Booking Service - API для работы с бронированиями
 */
import apiClient from '../lib/apiClient';
import i18n from '../i18n';
import { Service, ServiceTariff, ServiceOwner } from './serviceService';

// ==================== TYPES ====================

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface ServiceBooking {
    id: number;
    createdAt: string;
    updatedAt: string;
    serviceId: number;
    service?: Service;
    tariffId: number;
    tariff?: ServiceTariff;
    clientId: number;
    client?: ServiceOwner;
    scheduleId?: number;
    scheduledAt: string;
    durationMinutes: number;
    endAt: string;
    status: BookingStatus;
    transactionId?: number;
    pricePaid: number;
    commissionPercentBps?: number;
    commissionCapLkm?: number;
    platformFeeAmount?: number;
    providerNetAmount?: number;
    feeCalculatedAt?: string;
    feeReleasedAt?: string;
    clientNote?: string;
    providerNote?: string;
    source?: string;
    sourcePostId?: number;
    sourceChannelId?: number;
    reminderSent: boolean;
    reminder24hSent: boolean;
    confirmedAt?: string;
    cancelledAt?: string;
    completedAt?: string;
    cancelledBy?: number;
    meetingLink?: string;
    chatRoomId?: number;
}

export interface BookingFilters {
    status?: BookingStatus;
    serviceId?: number;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

export interface BookingListResponse {
    bookings: ServiceBooking[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface UpcomingBookingsResponse {
    today: ServiceBooking[];
    tomorrow: ServiceBooking[];
    thisWeek: ServiceBooking[];
    pending: ServiceBooking[];
}

export interface CreateBookingRequest {
    tariffId: number;
    scheduledAt: string; // ISO format
    clientNote?: string;
    source?: string;
    sourcePostId?: number;
    sourceChannelId?: number;
}

// Alias for backward compatibility
export type BookServiceRequest = CreateBookingRequest;

export interface BookingActionRequest {
    note?: string;
    reason?: string;
}

// ==================== STATUS HELPERS ====================

const STATUS_LABELS_BY_LANGUAGE: Record<'ru' | 'en' | 'hi', Record<BookingStatus, string>> = {
    ru: {
        pending: 'Ожидает подтверждения',
        confirmed: 'Подтверждено',
        cancelled: 'Отменено',
        completed: 'Завершено',
        no_show: 'Неявка',
    },
    en: {
        pending: 'Pending confirmation',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        completed: 'Completed',
        no_show: 'No-show',
    },
    hi: {
        pending: 'पुष्टि की प्रतीक्षा में',
        confirmed: 'पुष्ट',
        cancelled: 'रद्द',
        completed: 'पूर्ण',
        no_show: 'उपस्थित नहीं',
    },
};

const normalizeBookingLanguage = (language?: string): 'ru' | 'en' | 'hi' => {
    const lower = String(language || '').trim().toLowerCase();
    if (lower.startsWith('ru')) {
        return 'ru';
    }
    if (lower.startsWith('hi')) {
        return 'hi';
    }
    return 'en';
};

export const getBookingStatusLabel = (status: BookingStatus, language: string = i18n.language): string =>
    STATUS_LABELS_BY_LANGUAGE[normalizeBookingLanguage(language)][status];

export const STATUS_LABELS: Record<BookingStatus, string> = STATUS_LABELS_BY_LANGUAGE.en;

export const STATUS_COLORS: Record<BookingStatus, string> = {
    pending: '#FFA500',    // Orange
    confirmed: '#4CAF50',  // Green
    cancelled: '#F44336',  // Red
    completed: '#2196F3',  // Blue
    no_show: '#9E9E9E',    // Gray
};

// ==================== API FUNCTIONS ====================

/**
 * Book a service
 */
export async function bookService(
    serviceId: number,
    data: CreateBookingRequest
): Promise<ServiceBooking> {
    try {
        const response = await apiClient.post(`/services/${serviceId}/book`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(error?.response?.data?.error || 'Failed to book service');
    }
}

/**
 * Get my bookings (as client)
 */
export async function getMyBookings(
    filters: BookingFilters = {}
): Promise<BookingListResponse> {
    try {
        const response = await apiClient.get('/bookings/my', { params: filters });
        return response.data;
    } catch (error: any) {
        if (error?.response?.status === 401) {
            throw new Error('UNAUTHORIZED');
        }
        throw new Error('Failed to fetch bookings');
    }
}

/**
 * Get incoming bookings (as service owner)
 */
export async function getIncomingBookings(
    filters: BookingFilters = {}
): Promise<BookingListResponse> {
    const response = await apiClient.get('/bookings/incoming', { params: filters });
    return response.data;
}

/**
 * Get upcoming bookings dashboard
 */
export async function getUpcomingBookings(): Promise<UpcomingBookingsResponse> {
    const response = await apiClient.get('/bookings/upcoming');
    return response.data;
}

/**
 * Confirm a booking (as owner)
 */
export async function confirmBooking(
    bookingId: number,
    data?: BookingActionRequest
): Promise<ServiceBooking> {
    try {
        const response = await apiClient.put(`/bookings/${bookingId}/confirm`, data || {});
        return response.data;
    } catch (error: any) {
        throw new Error(error?.response?.data?.error || 'Failed to confirm booking');
    }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
    bookingId: number,
    data?: BookingActionRequest
): Promise<ServiceBooking> {
    try {
        const response = await apiClient.put(`/bookings/${bookingId}/cancel`, data || {});
        return response.data;
    } catch (error: any) {
        throw new Error(error?.response?.data?.error || 'Failed to cancel booking');
    }
}

/**
 * Complete a booking (as owner)
 */
export async function completeBooking(
    bookingId: number,
    data?: BookingActionRequest
): Promise<ServiceBooking> {
    try {
        const response = await apiClient.put(`/bookings/${bookingId}/complete`, data || {});
        return response.data;
    } catch (error: any) {
        throw new Error(error?.response?.data?.error || 'Failed to complete booking');
    }
}

/**
 * Mark booking as no-show (as owner)
 */
export async function markNoShow(bookingId: number): Promise<ServiceBooking> {
    try {
        const response = await apiClient.put(`/bookings/${bookingId}/no-show`);
        return response.data;
    } catch (error: any) {
        throw new Error(error?.response?.data?.error || 'Failed to mark as no-show');
    }
}

/**
 * Get busy times for calendar view
 */
export async function getBusyTimes(
    dateFrom: string,
    dateTo: string
): Promise<{ dateFrom: string; dateTo: string; bookings: ServiceBooking[] }> {
    const response = await apiClient.get('/calendar/busy', {
        params: { dateFrom, dateTo },
    });
    return response.data;
}

/**
 * Export booking to iCalendar (.ics) text payload
 */
export async function exportBookingCalendarIcs(bookingId: number): Promise<string> {
    const response = await apiClient.get(`/bookings/${bookingId}/calendar.ics`, {
        responseType: 'text',
    });
    return typeof response.data === 'string' ? response.data : String(response.data || '');
}

// ==================== DATE HELPERS ====================

/**
 * Format booking date/time for display
 */
export function formatBookingTime(booking: ServiceBooking, language: string = i18n.language): string {
    const date = new Date(booking.scheduledAt);
    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    };
    const locale = normalizeBookingLanguage(language) === 'ru'
        ? 'ru-RU'
        : normalizeBookingLanguage(language) === 'hi'
            ? 'hi-IN'
            : 'en-US';
    return date.toLocaleDateString(locale, options);
}

/**
 * Format booking duration
 */
export function formatDuration(minutes: number, language: string = i18n.language): string {
    const normalizedLanguage = normalizeBookingLanguage(language);
    if (minutes < 60) {
        return normalizedLanguage === 'ru'
            ? `${minutes} мин`
            : normalizedLanguage === 'hi'
                ? `${minutes} मि॰`
                : `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (normalizedLanguage === 'ru') {
        return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
    }
    if (normalizedLanguage === 'hi') {
        return mins > 0 ? `${hours} घं॰ ${mins} मि॰` : `${hours} घं॰`;
    }
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

/**
 * Check if booking is in the past
 */
export function isBookingPast(booking: ServiceBooking): boolean {
    return new Date(booking.endAt) < new Date();
}

/**
 * Check if booking is starting soon (within 1 hour)
 */
export function isBookingStartingSoon(booking: ServiceBooking): boolean {
    const now = new Date();
    const start = new Date(booking.scheduledAt);
    const diff = start.getTime() - now.getTime();
    return diff > 0 && diff <= 60 * 60 * 1000;
}
