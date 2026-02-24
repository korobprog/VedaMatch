export const COLORS = {
    // Dark mode: Deep Himalayan Night (Charcoal, Bronze, Slate)
    dark: {
        background: '#16120B',
        header: 'rgba(35, 24, 14, 0.82)',
        inputBackground: 'rgba(43, 30, 17, 0.84)',
        inputText: '#F7F0E3',
        userBubble: 'rgba(255, 153, 51, 0.2)',
        botBubble: 'rgba(255, 245, 229, 0.08)',
        text: '#F7F0E3',
        subText: 'rgba(247, 240, 227, 0.72)',
        borderColor: 'rgba(255, 210, 133, 0.24)',
        menuBackground: 'rgba(32, 24, 14, 0.96)',
        iconColor: '#F7F0E3',
        accent: '#F4C542',
        primary: '#FF9933',
        error: '#F87171',
        button: '#FF9933',
        buttonText: '#121212',
        card: 'rgba(43, 30, 17, 0.9)',
        glass: 'rgba(39, 27, 15, 0.72)',
        glassBorder: 'rgba(255, 214, 145, 0.22)',
    },
    // Light mode: Vedic Temple Day (Warm Stone, Copper, Clay)
    light: {
        background: '#FAF7F0',
        header: 'rgba(255, 252, 244, 0.9)',
        inputBackground: '#FFFDF8',
        inputText: '#212121',  // Almost black
        userBubble: 'rgba(255, 153, 51, 0.16)',
        botBubble: '#FFFDF8',
        text: '#2A241A',
        subText: '#645743',
        borderColor: 'rgba(255, 153, 51, 0.26)',
        menuBackground: '#FFFDF8',
        iconColor: '#6B4F28',
        accent: '#F4C542',
        primary: '#FF9933',
        error: '#FF5252',      // Error Red
        button: '#FF9933',
        buttonText: '#FFFFFF',
        card: '#FFFDF8',
        glass: 'rgba(255, 253, 248, 0.76)',
        glassBorder: 'rgba(255, 204, 122, 0.3)',
    },
};

export type AssistantSource = {
    id: string;
    domain: string;
    sourceType?: string;
    sourceId?: string;
    title: string;
    snippet: string;
    sourceUrl?: string;
    score?: number;
    metadata?: Record<string, unknown>;
};

export type AssistantContext = {
    domains: string[];
    sources: AssistantSource[];
    confidence: number;
    language?: string;
    visibilityScope?: string;
    retrieverPath?: string;
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
    assistantContext?: AssistantContext;
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
