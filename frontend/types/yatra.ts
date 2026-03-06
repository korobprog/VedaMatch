// Yatra Travel Types (Spiritual Pilgrimage Service)

// ==================== YATRA (TOUR) ====================

export type YatraStatus = 'draft' | 'open' | 'full' | 'active' | 'completed' | 'cancelled';
export type YatraBillingState = 'active' | 'paused_insufficient' | 'stopped';
export type YatraBillingPauseReason = 'insufficient_lkm' | 'organizer_stopped' | 'none';

export type YatraTheme =
    | 'vrindavan'
    | 'mayapur'
    | 'jagannath_puri'
    | 'tirupati'
    | 'varanasi'
    | 'haridwar'
    | 'rishikesh'
    | 'navadhama'
    | 'char_dham'
    | 'other';

export interface RoutePoint {
    name: string;
    lat: number;
    lng: number;
    order: number;
    description?: string;
}

export interface Yatra {
    id: number;
    createdAt: string;
    updatedAt: string;
    organizerId: number;
    organizer?: YatraUser;
    title: string;
    description: string;
    theme: YatraTheme;
    startDate: string;
    endDate: string;
    startCity: string;
    startAddress?: string;
    startLatitude?: number;
    startLongitude?: number;
    endCity: string;
    endLatitude?: number;
    endLongitude?: number;
    routePoints?: string; // JSON string of RoutePoint[]
    maxParticipants: number;
    minParticipants: number;
    requirements?: string;
    costEstimate?: string;
    accommodation?: string;
    transportation?: string;
    language: string;
    coverImageUrl?: string;
    photos?: string; // JSON array
    status: YatraStatus;
    billingState?: YatraBillingState;
    billingPaused?: boolean;
    billingPauseReason?: YatraBillingPauseReason;
    billingConsentAt?: string;
    billingNextChargeAt?: string;
    billingLastChargedAt?: string;
    billingStoppedAt?: string;
    dailyFeeLkm?: number;
    chatRoomId?: number;
    viewsCount: number;
    participantCount: number;
    participants?: YatraParticipant[];
}

export interface YatraUser {
    id: number;
    spiritualName?: string;
    karmicName?: string;
    avatarUrl?: string;
    city?: string;
    country?: string;
}

// ==================== PARTICIPANTS ====================

export type YatraParticipantStatus = 'pending' | 'approved' | 'rejected' | 'left';
export type YatraParticipantRole = 'member' | 'assistant' | 'guide';

export interface YatraParticipant {
    id: number;
    createdAt: string;
    yatraId: number;
    userId: number;
    user?: YatraUser;
    status: YatraParticipantStatus;
    role: YatraParticipantRole;
    message?: string;
    emergencyContact?: string;
    reviewedAt?: string;
    reviewedBy?: number;
}

// ==================== SHELTER (ACCOMMODATION) ====================

export type ShelterType = 'ashram' | 'guesthouse' | 'homestay' | 'room' | 'apartment' | 'dharamsala';
export type ShelterStatus = 'active' | 'inactive' | 'pending';

export interface Shelter {
    id: number;
    createdAt: string;
    updatedAt: string;
    hostId: number;
    host?: YatraUser;
    title: string;
    description?: string;
    type: ShelterType;
    city: string;
    country?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    nearTemple?: string;
    capacity: number;
    rooms: number;
    pricePerNight?: string;
    minStay: number;
    amenities?: string; // JSON array
    vegetarianOnly: boolean;
    noSmoking: boolean;
    noAlcohol: boolean;
    houseRules?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    photos?: string; // JSON array
    sevaExchange: boolean;
    sevaDescription?: string;
    status: ShelterStatus;
    rating: number;
    reviewsCount: number;
    viewsCount: number;
    reviews?: ShelterReview[];
}

// ==================== SHELTER REVIEWS ====================

export interface ShelterReview {
    id: number;
    createdAt: string;
    shelterId: number;
    authorId: number;
    author?: YatraUser;
    rating: number;
    cleanlinessRating?: number;
    locationRating?: number;
    valueRating?: number;
    hospitalityRating?: number;
    comment?: string;
    photos?: string;
    stayedFrom?: string;
    stayedTo?: string;
    sevaVerified?: boolean;
}

// ==================== YATRA REVIEWS ====================

export interface YatraReview {
    id: number;
    createdAt: string;
    yatraId: number;
    authorId: number;
    author?: YatraUser;
    overallRating: number;
    organizerRating?: number;
    routeRating?: number;
    accommodationRating?: number;
    valueRating?: number;
    comment?: string;
    photos?: string;
    recommendation: boolean;
}

export interface YatraReviewCreateData {
    overallRating: number;
    organizerRating?: number;
    routeRating?: number;
    accommodationRating?: number;
    valueRating?: number;
    comment?: string;
    photos?: string;
    recommendation?: boolean;
}

// ==================== REQUEST/RESPONSE TYPES ====================

export interface YatraFilters {
    theme?: YatraTheme;
    status?: YatraStatus;
    city?: string;
    language?: string;
    search?: string;
    startAfter?: string;
    startBefore?: string;
    page?: number;
    limit?: number;
}

export interface ShelterFilters {
    city?: string;
    type?: ShelterType;
    nearLat?: number;
    nearLng?: number;
    radiusKm?: number;
    minRating?: number;
    sevaOnly?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}

export interface YatraCreateData {
    title: string;
    description?: string;
    theme?: YatraTheme;
    startDate: string;
    endDate: string;
    startCity?: string;
    startAddress?: string;
    startLatitude?: number;
    startLongitude?: number;
    endCity?: string;
    endLatitude?: number;
    endLongitude?: number;
    routePoints?: string;
    maxParticipants?: number;
    minParticipants?: number;
    requirements?: string;
    costEstimate?: string;
    accommodation?: string;
    transportation?: string;
    language?: string;
    coverImageUrl?: string;
}

export interface ShelterCreateData {
    title: string;
    description?: string;
    type: ShelterType;
    city: string;
    country?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    nearTemple?: string;
    capacity?: number;
    rooms?: number;
    pricePerNight?: string;
    minStay?: number;
    amenities?: string;
    vegetarianOnly?: boolean;
    noSmoking?: boolean;
    noAlcohol?: boolean;
    houseRules?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    photos?: string;
    sevaExchange?: boolean;
    sevaDescription?: string;
}

export interface ShelterReviewCreateData {
    rating: number;
    cleanlinessRating?: number;
    locationRating?: number;
    valueRating?: number;
    hospitalityRating?: number;
    comment?: string;
    photos?: string;
    stayedFrom?: string;
    stayedTo?: string;
    sevaVerified?: boolean;
}

export interface YatraJoinData {
    message?: string;
    emergencyContact?: string;
}

export interface YatraPublishData {
    billingConsent?: boolean;
}

// ==================== RESPONSE TYPES ====================

export interface YatraListResponse {
    yatras: Yatra[];
    total: number;
    page: number;
}

export interface ShelterListResponse {
    shelters: Shelter[];
    total: number;
    page: number;
}

export interface MyYatrasResponse {
    organized: Yatra[];
    participating: Yatra[];
}

// ==================== THEME LABELS ====================

const YATRA_THEME_LABELS_BY_LANGUAGE: Record<'ru' | 'en' | 'hi', Record<YatraTheme, string>> = {
    ru: {
        vrindavan: 'Вриндаван',
        mayapur: 'Маяпур',
        jagannath_puri: 'Джаганнатх Пури',
        tirupati: 'Тирупати',
        varanasi: 'Варанаси',
        haridwar: 'Харидвар',
        rishikesh: 'Ришикеш',
        navadhama: 'Нава-дхама',
        char_dham: 'Чар Дхам',
        other: 'Другое',
    },
    en: {
        vrindavan: 'Vrindavan',
        mayapur: 'Mayapur',
        jagannath_puri: 'Jagannath Puri',
        tirupati: 'Tirupati',
        varanasi: 'Varanasi',
        haridwar: 'Haridwar',
        rishikesh: 'Rishikesh',
        navadhama: 'Navadhama',
        char_dham: 'Char Dham',
        other: 'Other',
    },
    hi: {
        vrindavan: 'वृंदावन',
        mayapur: 'मायापुर',
        jagannath_puri: 'जगन्नाथ पुरी',
        tirupati: 'तिरुपति',
        varanasi: 'वाराणसी',
        haridwar: 'हरिद्वार',
        rishikesh: 'ऋषिकेश',
        navadhama: 'नवधाम',
        char_dham: 'चार धाम',
        other: 'अन्य',
    },
};

const SHELTER_TYPE_LABELS_BY_LANGUAGE: Record<'ru' | 'en' | 'hi', Record<ShelterType, string>> = {
    ru: {
        ashram: 'Ашрам',
        guesthouse: 'Гостевой дом',
        homestay: 'Проживание в семье',
        room: 'Комната',
        apartment: 'Квартира',
        dharamsala: 'Дхарамсала',
    },
    en: {
        ashram: 'Ashram',
        guesthouse: 'Guesthouse',
        homestay: 'Homestay',
        room: 'Room',
        apartment: 'Apartment',
        dharamsala: 'Dharamsala',
    },
    hi: {
        ashram: 'आश्रम',
        guesthouse: 'गेस्टहाउस',
        homestay: 'होमस्टे',
        room: 'कमरा',
        apartment: 'अपार्टमेंट',
        dharamsala: 'धर्मशाला',
    },
};

const AMENITY_LABELS_BY_LANGUAGE: Record<'ru' | 'en' | 'hi', Record<string, string>> = {
    ru: {
        wifi: 'Wi-Fi',
        ac: 'Кондиционер',
        hot_water: 'Горячая вода',
        prasadam: 'Прасадам включён',
        kitchen: 'Кухня',
        laundry: 'Стирка',
        parking: 'Парковка',
        temple_near: 'Рядом храм',
    },
    en: {
        wifi: 'Wi-Fi',
        ac: 'Air conditioning',
        hot_water: 'Hot water',
        prasadam: 'Prasadam included',
        kitchen: 'Kitchen',
        laundry: 'Laundry',
        parking: 'Parking',
        temple_near: 'Temple nearby',
    },
    hi: {
        wifi: 'वाई-फाई',
        ac: 'एयर कंडीशनिंग',
        hot_water: 'गरम पानी',
        prasadam: 'प्रसाद शामिल',
        kitchen: 'रसोई',
        laundry: 'धुलाई',
        parking: 'पार्किंग',
        temple_near: 'मंदिर पास में',
    },
};

const normalizeTravelLanguage = (language?: string): 'ru' | 'en' | 'hi' => {
    const value = String(language || '').trim().toLowerCase();
    if (value.startsWith('ru')) return 'ru';
    if (value.startsWith('hi')) return 'hi';
    return 'en';
};

export const getYatraThemeLabel = (theme: YatraTheme, language?: string): string =>
    YATRA_THEME_LABELS_BY_LANGUAGE[normalizeTravelLanguage(language)][theme] || theme;

export const getShelterTypeLabel = (type: ShelterType, language?: string): string =>
    SHELTER_TYPE_LABELS_BY_LANGUAGE[normalizeTravelLanguage(language)][type] || type;

export const getAmenityLabel = (key: string, language?: string): string =>
    AMENITY_LABELS_BY_LANGUAGE[normalizeTravelLanguage(language)][key] || key;
