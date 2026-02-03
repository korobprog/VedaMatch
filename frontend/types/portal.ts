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
    type: 'clock' | 'calendar';
    size: '1x1' | '2x1' | '2x2';
    position: number;
}

export interface PortalPage {
    id: string;
    items: (PortalItem | PortalFolder)[];
    widgets: PortalWidget[];
    order: number;
}

export interface PortalLayout {
    pages: PortalPage[];
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

// Default services available in portal
export const DEFAULT_SERVICES: ServiceDefinition[] = [
    { id: 'contacts', label: 'Контакты', icon: 'Users', color: '#3B82F6' },
    { id: 'chat', label: 'Чат', icon: 'MessageCircle', color: '#6B5B53' },
    { id: 'calls', label: 'Звонки', icon: 'Phone', color: '#10B981' },
    { id: 'dating', label: 'Знакомства', icon: 'Sparkles', color: '#EC4899' },
    { id: 'cafe', label: 'Кафе', icon: 'Coffee', color: '#FF6B00' },
    { id: 'shops', label: 'Магазины', icon: 'ShoppingBag', color: '#D67D3E' },
    { id: 'ads', label: 'Объявления', icon: 'Megaphone', color: '#EF4444' },
    { id: 'library', label: 'Библиотека', icon: 'Book', color: '#43A047' },
    { id: 'education', label: 'Обучение', icon: 'GraduationCap', color: '#8B5CF6' },
    { id: 'multimedia', label: 'Медиа-хаб', icon: 'Music', color: '#6366F1' },
    { id: 'news', label: 'Новости', icon: 'Newspaper', color: '#6B5B53' },
    { id: 'map', label: 'Карта', icon: 'Map', color: '#7C3AED' },
    { id: 'history', label: 'История', icon: 'MessageSquare', color: '#6B7280' },
    { id: 'settings', label: 'Настройки', icon: 'Settings', color: '#6B7280' },
    { id: 'travel', label: 'Путешествия', icon: 'Compass', color: '#FF9500' },
    { id: 'services', label: 'Сервисы', icon: 'Briefcase', color: '#6366F1' },
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
    const defaultItems: PortalItem[] = DEFAULT_SERVICES.map((service, index) => ({
        id: `item-${service.id}`,
        serviceId: service.id,
        type: 'service' as const,
        position: index,
    }));

    return {
        pages: [{
            id: 'page-1',
            items: defaultItems,
            widgets: [],
            order: 0,
        }],
        activePageIndex: 0,
        gridColumns: 4,
        iconSize: 'medium',
        lastModified: Date.now(),
        syncedWithServer: false,
    };
};
