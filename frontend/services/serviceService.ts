/**
 * Service Service - API для работы с сервисами
 */
import { API_URL, getAuthHeaders } from './authService';

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
    durationMinutes?: number;
    sessionsCount?: number;
    validityDays?: number;
    includes?: string;
    isDefault?: boolean;
    sortOrder?: number;
}

export interface CreateScheduleRequest {
    dayOfWeek?: number;
    timeStart: string;
    timeEnd: string;
    specificDate?: string;
    maxParticipants?: number;
    slotDuration?: number;
    bufferMinutes?: number;
    timezone?: string;
}

// ==================== CATEGORY HELPERS ====================

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
    astrology: 'Астрология',
    psychology: 'Психология',
    coaching: 'Коучинг',
    spirituality: 'Духовные практики',
    yagya: 'Ягьи и ритуалы',
    education: 'Обучение',
    health: 'Здоровье/Аюрведа',
    other: 'Другое',
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

export const FORMAT_LABELS: Record<ServiceFormat, string> = {
    individual: 'Индивидуально',
    group: 'Группа',
    subscription: 'Подписка',
    event: 'Мероприятие',
    donation: 'Донейшн',
};

export const CHANNEL_LABELS: Record<ServiceChannel, string> = {
    video: 'Видеочат',
    zoom: 'Zoom',
    youtube: 'YouTube',
    telegram: 'Telegram',
    offline: 'Оффлайн',
    file: 'Запись/Файл',
};

export const ACCESS_LABELS: Record<ServiceAccessType, string> = {
    free: 'Бесплатно',
    paid: 'Платно',
    subscription: 'По подписке',
    invite: 'По приглашению',
};

// ==================== API FUNCTIONS ====================

/**
 * Get list of services with filters
 */
export async function getServices(filters: ServiceFilters = {}): Promise<ServiceListResponse> {
    const params = new URLSearchParams();

    if (filters.category) params.append('category', filters.category);
    if (filters.scheduleType) params.append('scheduleType', filters.scheduleType);
    if (filters.channel) params.append('channel', filters.channel);
    if (filters.accessType) params.append('accessType', filters.accessType);
    if (filters.language) params.append('language', filters.language);
    if (filters.search) params.append('search', filters.search);
    if (filters.nearLat !== undefined) params.append('nearLat', filters.nearLat.toString());
    if (filters.nearLng !== undefined) params.append('nearLng', filters.nearLng.toString());
    if (filters.radiusKm !== undefined) params.append('radiusKm', filters.radiusKm.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `${API_URL}/services${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch services');
    return response.json();
}

/**
 * Get service by ID
 */
export async function getServiceById(id: number): Promise<Service> {
    const response = await fetch(`${API_URL}/services/${id}`);
    if (!response.ok) throw new Error('Service not found');
    return response.json();
}

/**
 * Get my services (as owner)
 */
export async function getMyServices(): Promise<{ services: Service[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/services/my`, { headers });
    if (!response.ok) throw new Error('Failed to fetch my services');
    return response.json();
}

/**
 * Create a new service
 */
export async function createService(data: CreateServiceRequest): Promise<Service> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create service');
    }
    return response.json();
}

/**
 * Update a service
 */
export async function updateService(id: number, data: UpdateServiceRequest): Promise<Service> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/services/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update service');
    }
    return response.json();
}

/**
 * Delete a service
 */
export async function deleteService(id: number): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/services/${id}`, {
        method: 'DELETE',
        headers,
    });
    if (!response.ok) throw new Error('Failed to delete service');
}

/**
 * Publish a service (make it active)
 */
export async function publishService(id: number): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/services/${id}/publish`, {
        method: 'POST',
        headers,
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish service');
    }
}

/**
 * Pause a service
 */
export async function pauseService(id: number): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/services/${id}/pause`, {
        method: 'POST',
        headers,
    });
    if (!response.ok) throw new Error('Failed to pause service');
}

// ==================== TARIFF FUNCTIONS ====================

/**
 * Get tariffs for a service
 */
export async function getTariffs(serviceId: number): Promise<{ tariffs: ServiceTariff[] }> {
    const response = await fetch(`${API_URL}/services/${serviceId}/tariffs`);
    if (!response.ok) throw new Error('Failed to fetch tariffs');
    return response.json();
}

/**
 * Add a tariff to a service
 */
export async function addTariff(serviceId: number, data: CreateTariffRequest): Promise<ServiceTariff> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/services/${serviceId}/tariffs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add tariff');
    return response.json();
}

/**
 * Update a tariff
 */
export async function updateTariff(tariffId: number, data: Partial<ServiceTariff>): Promise<ServiceTariff> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tariffs/${tariffId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update tariff');
    return response.json();
}

/**
 * Delete a tariff
 */
export async function deleteTariff(tariffId: number): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tariffs/${tariffId}`, {
        method: 'DELETE',
        headers,
    });
    if (!response.ok) throw new Error('Failed to delete tariff');
}

// ==================== SCHEDULE FUNCTIONS ====================

/**
 * Get schedules for a service
 */
export async function getSchedules(serviceId: number): Promise<{ schedules: ServiceSchedule[] }> {
    const response = await fetch(`${API_URL}/services/${serviceId}/schedule`);
    if (!response.ok) throw new Error('Failed to fetch schedules');
    return response.json();
}

/**
 * Add a schedule to a service
 */
export async function addSchedule(serviceId: number, data: CreateScheduleRequest): Promise<ServiceSchedule> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/services/${serviceId}/schedule`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add schedule');
    return response.json();
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: number): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/${scheduleId}`, {
        method: 'DELETE',
        headers,
    });
    if (!response.ok) throw new Error('Failed to delete schedule');
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
    const params = new URLSearchParams({ date });
    if (timezone) params.append('timezone', timezone);

    const response = await fetch(`${API_URL}/services/${serviceId}/slots?${params}`);
    if (!response.ok) throw new Error('Failed to fetch slots');
    return response.json();
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
    const params = new URLSearchParams({ dateFrom, dateTo });
    if (timezone) params.append('timezone', timezone);

    const response = await fetch(`${API_URL}/services/${serviceId}/slots?${params}`);
    if (!response.ok) throw new Error('Failed to fetch slots');
    return response.json();
}
