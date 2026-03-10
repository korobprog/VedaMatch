// Portal folder system types

export interface PortalItem {
    id: string;
    serviceId: string;
    type: 'service';
    position: number;
}

export interface PortalFolder {
    id: string;
    name: string;
    type: 'folder';
    color: string;
    items: PortalItem[];
    position: number;
}

export interface PortalWidget {
    id: string;
    type: 'clock' | 'calendar' | 'circles_quick' | 'circles_panel' | 'feed_quick' | 'feed_mix';
    size: '1x1' | '2x1' | '2x2';
    position: number;
}

export interface WidgetCanvas {
    widgets: PortalWidget[];
    lastModified: number;
}

export interface PortalPage {
    id: string;
    items: (PortalItem | PortalFolder)[];
    widgets: PortalWidget[];
    order: number;
}

export interface PortalLayout {
    pages: PortalPage[];
    widgetCanvas: WidgetCanvas;
    quickAccess: PortalItem[]; // Bottom dock items (max 3)
    activePageIndex: number;
    gridColumns: number;
    iconSize: 'small' | 'medium' | 'large';
    lastModified: number;
    syncedWithServer: boolean;
}

export interface ServiceDefinition {
    id: string;
    label: string;
    icon: string;
    color: string;
}

export interface PortalServiceVisibilityEntry {
    mode: 'visible' | 'beta' | 'hidden';
    visible: boolean;
    maintenanceMessage?: string;
}

export type PortalServiceVisibilityMap = Record<string, PortalServiceVisibilityEntry>;

const DEVOTEE_ONLY_SERVICE_IDS = new Set(['ekadashi_calendar']);

export const isServiceAllowedForRole = (serviceId: string, role?: string | null): boolean => {
    if (!DEVOTEE_ONLY_SERVICE_IDS.has(serviceId)) {
        return true;
    }
    return String(role || '').trim().toLowerCase() === 'devotee';
};

export const DEFAULT_QUICK_ACCESS_SERVICE_IDS = ['contacts', 'calls', 'services'] as const;

export const DEFAULT_PORTAL_FOLDER_DEFINITIONS = [
    {
        id: 'folder-communication',
        name: 'Общение',
        color: '#3B82F6',
        serviceIds: ['chat', 'rooms', 'channels', 'connect', 'history'],
    },
    {
        id: 'folder-practice',
        name: 'Практика',
        color: '#10B981',
        serviceIds: ['path_tracker', 'ekadashi_calendar', 'sadhu_sanga', 'seva', 'education', 'library'],
    },
    {
        id: 'folder-content',
        name: 'Контент',
        color: '#8B5CF6',
        serviceIds: ['feed', 'news', 'multimedia', 'video_circles'],
    },
    {
        id: 'folder-services',
        name: 'Сервисы',
        color: '#F59E0B',
        serviceIds: ['services_catalog', 'cafe', 'shops', 'ads', 'dating'],
    },
    {
        id: 'folder-travel',
        name: 'Путешествия',
        color: '#D67D3E',
        serviceIds: ['travel', 'map', 'dhama'],
    },
    {
        id: 'folder-profile',
        name: 'Профиль',
        color: '#6B7280',
        serviceIds: ['support', 'settings'],
    },
] as const;

// Default services available in portal
export const DEFAULT_SERVICES: ServiceDefinition[] = [
    { id: 'path_tracker', label: 'Daily Path', icon: 'Sun', color: '#0F766E' },
    { id: 'contacts', label: 'Contacts', icon: 'MessageSquare', color: '#3B82F6' },
    { id: 'chat', label: 'Chat', icon: 'MessageCircle', color: '#6B5B53' },
    { id: 'rooms', label: 'Rooms', icon: 'Users', color: '#6366F1' },
    { id: 'calls', label: 'Calls', icon: 'Phone', color: '#10B981' },
    { id: 'dating', label: 'Union', icon: 'Sparkles', color: '#EC4899' },
    { id: 'cafe', label: 'Cafe', icon: 'Coffee', color: '#FF6B00' },
    { id: 'shops', label: 'Shops', icon: 'ShoppingBag', color: '#D67D3E' },
    { id: 'ads', label: 'Ads', icon: 'Megaphone', color: '#EF4444' },
    { id: 'library', label: 'Library', icon: 'Book', color: '#43A047' },
    { id: 'education', label: 'Education', icon: 'GraduationCap', color: '#8B5CF6' },
    { id: 'multimedia', label: 'Media', icon: 'Music', color: '#6366F1' },
    { id: 'video_circles', label: 'Circles', icon: 'Clapperboard', color: '#EA580C' },
    { id: 'channels', label: 'Channels', icon: 'Radio', color: '#0EA5A4' },
    { id: 'sadhu_sanga', label: 'Sadhu-Sanga', icon: 'Flame', color: '#F59E0B' },
    { id: 'ekadashi_calendar', label: 'Ekadashi', icon: 'CalendarDays', color: '#D97706' },
    { id: 'feed', label: 'Feed', icon: 'PlayCircle', color: '#0EA5E9' },
    { id: 'news', label: 'News', icon: 'Newspaper', color: '#6B5B53' },
    { id: 'map', label: 'Map', icon: 'Map', color: '#7C3AED' },
    { id: 'dhama', label: 'Dhama', icon: 'Landmark', color: '#C0841A' },
    { id: 'support', label: 'Support', icon: 'LifeBuoy', color: '#2563EB' },
    { id: 'history', label: 'History', icon: 'MessageSquare', color: '#6B7280' },
    { id: 'settings', label: 'Settings', icon: 'Settings', color: '#6B7280' },
    { id: 'travel', label: 'Travel', icon: 'Compass', color: '#FF9500' },
    { id: 'services', label: 'Assistant', icon: 'Bot', color: '#6366F1' },
    { id: 'services_catalog', label: 'Services', icon: 'Briefcase', color: '#2563EB' },
    { id: 'connect', label: 'Connect', icon: 'HeartHandshake', color: '#C2410C' },
    { id: 'seva', label: 'Seva', icon: 'Heart', color: '#EF4444' },
];

// Folder color options
export const FOLDER_COLORS = [
    '#3B82F6', // Blue
    '#EC4899', // Pink
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#6B7280', // Gray
    '#D67D3E', // Saffron (brand)
];

// Create default layout
export const createDefaultLayout = (): PortalLayout => {
    const quickAccessIds: string[] = [...DEFAULT_QUICK_ACCESS_SERVICE_IDS];

    const quickAccess: PortalItem[] = quickAccessIds.map((id, index) => ({
        id: `qa-${id}`,
        serviceId: id,
        type: 'service' as const,
        position: index,
    }));

    const defaultItems: PortalFolder[] = DEFAULT_PORTAL_FOLDER_DEFINITIONS
        .map((folder, index) => ({
            id: folder.id,
            name: folder.name,
            type: 'folder' as const,
            color: folder.color,
            items: folder.serviceIds.map((serviceId, itemIndex) => ({
                id: `item-${serviceId}`,
                serviceId,
                type: 'service' as const,
                position: itemIndex,
            })),
            position: index,
        }));

    return {
        pages: [{
            id: 'page-1',
            items: defaultItems,
            widgets: [],
            order: 0,
        }],
        widgetCanvas: {
            widgets: [],
            lastModified: Date.now(),
        },
        quickAccess,
        activePageIndex: 0,
        gridColumns: 4,
        iconSize: 'medium',
        lastModified: Date.now(),
        syncedWithServer: false,
    };
};
