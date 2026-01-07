export const COLORS = {
    // Dark mode: Deep Himalayan Night (Charcoal, Bronze, Slate)
    dark: {
        background: '#121212', // Near black, very solid
        header: '#1E1E1E',     // Matrix grey/Dark stone
        inputBackground: '#2C2C2C',
        inputText: '#E0E0E0',  // Light grey, readable
        userBubble: '#8D6E63', // Muted Earth/Bronze
        botBubble: '#263238',  // Dark Blue Grey (Slate)
        text: '#E0E0E0',
        subText: '#9E9E9E',
        borderColor: '#333333',
        menuBackground: '#1E1E1E',
        iconColor: '#D7CCC8',  // Pale bronze
        accent: '#FFB74D',     // Subtle Gold for highlights
        primary: '#FF9933',    // Saffron Brand Color
        error: '#FF5252',      // Error Red
        button: '#5D4037',     // Match registration
        buttonText: '#D7CCC8',
        card: '#1E1E1E',
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
