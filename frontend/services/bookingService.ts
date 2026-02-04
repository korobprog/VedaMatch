/**
 * Booking Service - API для работы с бронированиями
 */
import { API_PATH } from '../config/api.config';
import { getAuthHeaders } from './contactService';
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
    clientNote?: string;
    providerNote?: string;
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
}

// Alias for backward compatibility
export type BookServiceRequest = CreateBookingRequest;

export interface BookingActionRequest {
    note?: string;
    reason?: string;
}

// ==================== STATUS HELPERS ====================

export const STATUS_LABELS: Record<BookingStatus, string> = {
    pending: 'Ожидает подтверждения',
    confirmed: 'Подтверждено',
    cancelled: 'Отменено',
    completed: 'Завершено',
    no_show: 'Неявка',
};

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
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_PATH}/services/${serviceId}/book`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to book service');
    }
    return response.json();
}

/**
 * Get my bookings (as client)
 */
export async function getMyBookings(
    filters: BookingFilters = {}
): Promise<BookingListResponse> {
    const headers = await getAuthHeaders();

    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.serviceId) params.append('serviceId', filters.serviceId.toString());
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `${API_PATH}/bookings/my${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, { headers });
    if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
    }
    if (!response.ok) throw new Error('Failed to fetch bookings');
    return response.json();
}

/**
 * Get incoming bookings (as service owner)
 */
export async function getIncomingBookings(
    filters: BookingFilters = {}
): Promise<BookingListResponse> {
    const headers = await getAuthHeaders();

    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `${API_PATH}/bookings/incoming${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch incoming bookings');
    return response.json();
}

/**
 * Get upcoming bookings dashboard
 */
export async function getUpcomingBookings(): Promise<UpcomingBookingsResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_PATH}/bookings/upcoming`, { headers });
    if (!response.ok) throw new Error('Failed to fetch upcoming bookings');
    return response.json();
}

/**
 * Confirm a booking (as owner)
 */
export async function confirmBooking(
    bookingId: number,
    data?: BookingActionRequest
): Promise<ServiceBooking> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_PATH}/bookings/${bookingId}/confirm`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to confirm booking');
    }
    return response.json();
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
    bookingId: number,
    data?: BookingActionRequest
): Promise<ServiceBooking> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_PATH}/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel booking');
    }
    return response.json();
}

/**
 * Complete a booking (as owner)
 */
export async function completeBooking(
    bookingId: number,
    data?: BookingActionRequest
): Promise<ServiceBooking> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_PATH}/bookings/${bookingId}/complete`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete booking');
    }
    return response.json();
}

/**
 * Mark booking as no-show (as owner)
 */
export async function markNoShow(bookingId: number): Promise<ServiceBooking> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_PATH}/bookings/${bookingId}/no-show`, {
        method: 'PUT',
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark as no-show');
    }
    return response.json();
}

/**
 * Get busy times for calendar view
 */
export async function getBusyTimes(
    dateFrom: string,
    dateTo: string
): Promise<{ dateFrom: string; dateTo: string; bookings: ServiceBooking[] }> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ dateFrom, dateTo });

    const response = await fetch(`${API_PATH}/calendar/busy?${params}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch busy times');
    return response.json();
}

// ==================== DATE HELPERS ====================

/**
 * Format booking date/time for display
 */
export function formatBookingTime(booking: ServiceBooking): string {
    const date = new Date(booking.scheduledAt);
    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    };
    return date.toLocaleDateString('ru-RU', options);
}

/**
 * Format booking duration
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
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
