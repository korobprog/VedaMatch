export const COLORS = {
    // Dark mode: Deep Himalayan Night (Charcoal, Bronze, Slate)
    dark: {
        background: '#0F172A', // Dark Indigo/Slate
        header: 'rgba(15, 23, 42, 0.8)',
        inputBackground: 'rgba(15, 23, 42, 0.65)',
        inputText: '#F8FAFC',
        userBubble: 'rgba(255, 183, 77, 0.15)',
        botBubble: 'rgba(255, 255, 255, 0.08)',
        text: '#F8FAFC',
        subText: 'rgba(248, 250, 252, 0.6)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        menuBackground: 'rgba(15, 23, 42, 0.95)',
        iconColor: '#F8FAFC',
        accent: '#FFB74D',
        primary: '#FFB74D',
        error: '#F87171',
        button: '#FFB74D',
        buttonText: '#121212',
        card: 'rgba(15, 23, 42, 0.8)',
        glass: 'rgba(255, 255, 255, 0.06)',
        glassBorder: 'rgba(255, 255, 255, 0.18)',
    },
    // Light mode: Vedic Temple Day (Warm Stone, Copper, Clay)
    light: {
        background: '#F5F5F0', // Warm grey/stone (not yellow)
        header: '#FFFFFF',     // Clean white surface
        inputBackground: '#FFFFFF',
        inputText: '#212121',  // Almost black
        userBubble: '#D7CCC8', // Pale Copper/Mushroom
        botBubble: '#FFFFFF',  // Clean White with shadow
        text: '#212121',
        subText: '#757575',
        borderColor: '#E0E0E0',
        menuBackground: '#FFFFFF',
        iconColor: '#5D4037',  // Deep Brown
        accent: '#A1887F',     // Muted Copper
        primary: '#FF9933',    // Saffron Brand Color
        error: '#FF5252',      // Error Red
        button: '#8D6E63',     // Match registration
        buttonText: '#FFFFFF',
        card: '#FFFFFF',
    },
};

export type Message = {
    id: string;
    text: string;
    sender: 'user' | 'bot' | 'other';
    type?: 'text' | 'image' | 'audio' | 'video' | 'file' | 'document';
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    uploading?: boolean;
    content?: string;
    senderId?: number;
    recipientId?: number;
    roomId?: number;
    createdAt?: string;
    navTab?: 'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news' | 'knowledge_base';
    // Map integration for AI geo-intents
    mapData?: {
        markers?: Array<{
            id: number;
            type: 'user' | 'shop' | 'ad';
            title: string;
            latitude: number;
            longitude: number;
        }>;
        filters?: {
            showUsers?: boolean;
            showShops?: boolean;
            showAds?: boolean;
        };
        searchQuery?: string;
        focusLocation?: {
            latitude: number;
            longitude: number;
            zoom?: number;
        };
    };
};

export const MENU_OPTIONS = [
    'chat.searchTabs.contacts',
    'chat.searchTabs.chat',
    'chat.searchTabs.dating',
    'chat.searchTabs.shops',
    'chat.searchTabs.ads',
    'chat.searchTabs.news',
    'chat.searchTabs.knowledge_base'
];

export const FRIEND_MENU_OPTIONS = [
    'contacts.viewProfile',
    'contacts.takePhoto',
    'contacts.attachFile',
    'contacts.media',
    'contacts.search',
    'contacts.mute',
    'contacts.pin',
    'contacts.share',
    'contacts.clearHistory',
    'contacts.block',
    'contacts.report',
];
