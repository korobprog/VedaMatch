/**
 * Service Service - API для работы с сервисами
 */
import { getGodModeQueryParams } from './godModeService';
import apiClient from '../lib/apiClient';

// ==================== TYPES ====================

export type ServiceStatus = 'draft' | 'active' | 'paused' | 'archived';
export type ServiceCategory = 'astrology' | 'psychology' | 'coaching' | 'spirituality' | 'yagya' | 'education' | 'health' | 'other';
export type ServiceFormat = 'individual' | 'group' | 'subscription' | 'event' | 'donation';
export type ServiceScheduleType = 'booking' | 'fixed' | 'live' | 'anytime';
export type ServiceChannel = 'video' | 'zoom' | 'youtube' | 'telegram' | 'offline' | 'file';
export type ServiceAccessType = 'free' | 'paid' | 'subscription' | 'invite';

export interface ServiceOwner {
    id: number;
    karmicName: string;
    spiritualName?: string;
    avatar?: string;
}

export interface ServiceTariff {
    id: number;
    serviceId: number;
    name: string;
    price: number;
    maxBonusLkmPercent?: number;
    currency: string;
    durationMinutes: number;
    sessionsCount: number;
    validityDays: number;
    includes: string; // JSON array
    isDefault: boolean;
    isActive: boolean;
    sortOrder: number;
}

export interface ServiceSchedule {
    id: number;
    serviceId: number;
    dayOfWeek?: number;
    timeStart: string;
    timeEnd: string;
    specificDate?: string;
    maxParticipants: number;
    slotDuration: number;
    bufferMinutes: number;
    isActive: boolean;
    timezone: string;
}

export interface AvailableSlot {
    startTime: string;
    endTime: string;
    spotsAvailable: number;
    scheduleId: number;
}

export interface Service {
    id: number;
    createdAt: string;
    updatedAt: string;
    ownerId: number;
    isVedaMatch?: boolean;
    owner?: ServiceOwner;
    title: string;
    description: string;
    coverImageUrl?: string;
    category: ServiceCategory;
    language: string;
    formats: string; // JSON array of ServiceFormat
    scheduleType: ServiceScheduleType;
    channel: ServiceChannel;
    channelLink?: string;
    offlineAddress?: string;
    offlineLat?: number;
    offlineLng?: number;
    accessType: ServiceAccessType;
    status: ServiceStatus;
    viewsCount: number;
    bookingsCount: number;
    rating: number;
    reviewsCount: number;
    chatRoomId?: number;
    tariffs?: ServiceTariff[];
    schedules?: ServiceSchedule[];
}

export interface ServiceFilters {
    category?: ServiceCategory;
    scheduleType?: ServiceScheduleType;
    channel?: ServiceChannel;
    accessType?: ServiceAccessType;
    isVedaMatch?: boolean;
    language?: string;
    search?: string;
    nearLat?: number;
    nearLng?: number;
    radiusKm?: number;
    page?: number;
    limit?: number;
}

export interface ServiceListResponse {
    services: Service[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CreateServiceRequest {
    title: string;
    description: string;
    coverImageUrl?: string;
    category: ServiceCategory;
    language?: string;
    formats: string;
    scheduleType: ServiceScheduleType;
    channel: ServiceChannel;
    channelLink?: string;
    offlineAddress?: string;
    offlineLat?: number;
    offlineLng?: number;
    accessType: ServiceAccessType;
}

export interface UpdateServiceRequest {
    title?: string;
    description?: string;
    coverImageUrl?: string;
    category?: ServiceCategory;
    language?: string;
    formats?: string;
    scheduleType?: ServiceScheduleType;
    channel?: ServiceChannel;
    channelLink?: string;
    offlineAddress?: string;
    offlineLat?: number;
    offlineLng?: number;
    accessType?: ServiceAccessType;
    status?: ServiceStatus;
}

export interface CreateTariffRequest {
    name: string;
    price: number;
    maxBonusLkmPercent?: number;
    durationMinutes?: number;
    sessionsCount?: number;
    validityDays?: number;
    includes?: string;
    isDefault?: boolean;
    sortOrder?: number;
}

export interface CreateScheduleRequest {
    serviceId?: number;
    dayOfWeek?: number;
    timeStart?: string;
    timeEnd?: string;
    specificDate?: string;
    maxParticipants?: number;
    slotDuration?: number;
    bufferMinutes?: number;
    timezone?: string;
    // Weekly slots format
    weeklySlots?: Record<string, { enabled: boolean; slots: { startTime: string; endTime: string }[] }>;
    breakBetween?: number;
    maxBookingsPerDay?: number;
}

// ==================== CATEGORY HELPERS ====================

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
    astrology: 'Astrology',
    psychology: 'Psychology',
    coaching: 'Coaching',
    spirituality: 'Spiritual Practices',
    yagya: 'Yagyas and Rituals',
    education: 'Education',
    health: 'Health / Ayurveda',
    other: 'Other',
};

export const CATEGORY_ICONS: Record<ServiceCategory, string> = {
    astrology: '🌟',
    psychology: '🧠',
    coaching: '🎯',
    spirituality: '🕉️',
    yagya: '🔥',
    education: '📚',
    health: '🌿',
    other: '✨',
};

// Map of categories to Lucide icon components (names)
export const CATEGORY_ICON_NAMES: Record<ServiceCategory, string> = {
    astrology: 'Star',
    psychology: 'Brain',
    coaching: 'Target',
    spirituality: 'Infinity',
    yagya: 'Flame',
    education: 'BookOpen',
    health: 'Leaf',
    other: 'Sparkles',
};

export const FORMAT_LABELS: Record<ServiceFormat, string> = {
    individual: 'Individual',
    group: 'Group',
    subscription: 'Subscription',
    event: 'Event',
    donation: 'Donation',
};

export const CHANNEL_LABELS: Record<ServiceChannel, string> = {
    video: 'Video chat',
    zoom: 'Zoom',
    youtube: 'YouTube',
    telegram: 'Telegram',
    offline: 'Offline',
    file: 'Recording / File',
};

export const ACCESS_LABELS: Record<ServiceAccessType, string> = {
    free: 'Free',
    paid: 'Paid',
    subscription: 'Subscription',
    invite: 'Invite only',
};

// ==================== API FUNCTIONS ====================

/**
 * Get list of services with filters
 */
export async function getServices(filters: ServiceFilters = {}): Promise<ServiceListResponse> {
    const params: Record<string, any> = {};

    if (filters.category) params.category = filters.category;
    if (filters.scheduleType) params.scheduleType = filters.scheduleType;
    if (filters.channel) params.channel = filters.channel;
    if (filters.accessType) params.accessType = filters.accessType;
    if (filters.isVedaMatch !== undefined) params.isVedaMatch = String(filters.isVedaMatch);
    if (filters.language) params.language = filters.language;
    if (filters.search) params.search = filters.search;
    if (filters.nearLat !== undefined) params.nearLat = filters.nearLat;
    if (filters.nearLng !== undefined) params.nearLng = filters.nearLng;
    if (filters.radiusKm !== undefined) params.radiusKm = filters.radiusKm;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    const godModeParams = await getGodModeQueryParams();
    if (godModeParams.math) params.math = godModeParams.math;

    const response = await apiClient.get('/services', { params });
    return response.data;
}

/**
 * Get service by ID
 */
export async function getServiceById(id: number): Promise<Service> {
    const response = await apiClient.get(`/services/${id}`);
    return response.data;
}

/**
 * Get my services (as owner)
 */
export async function getMyServices(): Promise<{ services: Service[] }> {
    const response = await apiClient.get('/services/my');
    return response.data;
}

/**
 * Create a new service
 */
export async function createService(data: CreateServiceRequest): Promise<Service> {
    try {
        const response = await apiClient.post('/services', data);
        return response.data;
    } catch (error: any) {
        throw new Error(error?.response?.data?.error || 'Failed to create service');
    }
}

/**
 * Update a service
 */
export async function updateService(id: number, data: UpdateServiceRequest): Promise<Service> {
    try {
        const response = await apiClient.put(`/services/${id}`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(error?.response?.data?.error || 'Failed to update service');
    }
}

/**
 * Upload service photo
 */
export async function uploadServicePhoto(photoUri: string): Promise<string> {
    const formData = new FormData();

    // @ts-ignore
    formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'service_photo.jpg',
    });

    const response = await apiClient.post('/services/upload', formData, {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
        },
    });

    const result = response.data;
    return result.photoUrl;
}

/**
 * Delete a service
 */
export async function deleteService(id: number): Promise<void> {
    await apiClient.delete(`/services/${id}`);
}

/**
 * Publish a service (make it active)
 */
export async function publishService(id: number): Promise<void> {
    try {
        await apiClient.post(`/services/${id}/publish`, {});
    } catch (error: any) {
        throw new Error(error?.response?.data?.error || 'Failed to publish service');
    }
}

/**
 * Pause a service
 */
export async function pauseService(id: number): Promise<void> {
    await apiClient.post(`/services/${id}/pause`, {});
}

// ==================== TARIFF FUNCTIONS ====================

/**
 * Get tariffs for a service
 */
export async function getTariffs(serviceId: number): Promise<{ tariffs: ServiceTariff[] }> {
    const response = await apiClient.get(`/services/${serviceId}/tariffs`);
    return response.data;
}

/**
 * Add a tariff to a service
 */
export async function addTariff(serviceId: number, data: CreateTariffRequest): Promise<ServiceTariff> {
    const response = await apiClient.post(`/services/${serviceId}/tariffs`, data);
    return response.data;
}

/**
 * Update a tariff
 */
export async function updateTariff(tariffId: number, data: Partial<ServiceTariff>): Promise<ServiceTariff> {
    const response = await apiClient.put(`/tariffs/${tariffId}`, data);
    return response.data;
}

/**
 * Delete a tariff
 */
export async function deleteTariff(tariffId: number): Promise<void> {
    await apiClient.delete(`/tariffs/${tariffId}`);
}

// ==================== SCHEDULE FUNCTIONS ====================

/**
 * Get schedules for a service
 */
export async function getSchedules(serviceId: number): Promise<{ schedules: ServiceSchedule[] }> {
    const response = await apiClient.get(`/services/${serviceId}/schedule`);
    return response.data;
}

/**
 * Get service schedule (weekly format)
 */
export async function getServiceSchedule(serviceId: number): Promise<{
    weeklySlots: Record<string, { enabled: boolean; slots: { startTime: string; endTime: string }[] }>;
    slotDuration?: number;
    breakBetween?: number;
    maxBookingsPerDay?: number;
}> {
    try {
        const response = await apiClient.get(`/services/${serviceId}/schedule/weekly`);
        return response.data;
    } catch (error: any) {
        if (error?.response?.status === 404) {
            return { weeklySlots: {} };
        }
        throw new Error('Failed to fetch schedule');
    }
}

/**
 * Update service schedule (weekly format)
 */
export async function updateServiceSchedule(serviceId: number, data: CreateScheduleRequest): Promise<void> {
    await apiClient.put(`/services/${serviceId}/schedule/weekly`, data);
}

/**
 * Add a schedule to a service
 */
export async function addSchedule(serviceId: number, data: CreateScheduleRequest): Promise<ServiceSchedule> {
    const response = await apiClient.post(`/services/${serviceId}/schedule`, data);
    return response.data;
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: number): Promise<void> {
    await apiClient.delete(`/schedule/${scheduleId}`);
}

// ==================== SLOTS FUNCTIONS ====================

/**
 * Get available slots for a date
 */
export async function getAvailableSlots(
    serviceId: number,
    date: string,
    timezone?: string
): Promise<{ serviceId: number; date: string; slots: AvailableSlot[] }> {
    const params: Record<string, string> = { date };
    if (timezone) params.timezone = timezone;
    const response = await apiClient.get(`/services/${serviceId}/slots`, { params });
    return response.data;
}

/**
 * Get available slots for a date range
 */
export async function getSlotsForRange(
    serviceId: number,
    dateFrom: string,
    dateTo: string,
    timezone?: string
): Promise<{ serviceId: number; dateFrom: string; dateTo: string; days: any[] }> {
    const params: Record<string, string> = { dateFrom, dateTo };
    if (timezone) params.timezone = timezone;
    const response = await apiClient.get(`/services/${serviceId}/slots`, { params });
    return response.data;
}
