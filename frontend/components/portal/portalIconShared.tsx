import React from 'react';
import { Platform, StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import {
    Users,
    MessageCircle,
    Phone,
    Sparkles,
    ShoppingBag,
    Megaphone,
    Book,
    GraduationCap,
    Newspaper,
    Settings,
    MessageSquare,
    Map,
    Coffee,
    Utensils,
    Music,
    Film,
    Compass,
    Briefcase,
    Heart,
    Contact,
    PlayCircle,
    Clapperboard,
    Radio,
    LifeBuoy,
    Sun,
    Bot,
    Flame,
    Landmark,
    CalendarDays,
    Swords,
} from 'lucide-react-native';
import { ServiceDefinition } from '../../types/portal';
import type { PortalIconStyle } from '../../context/SettingsContext';

export type SharedPortalIconSize = 'small' | 'medium' | 'large';
export type SharedPortalBackgroundType = 'color' | 'gradient' | 'image';

export const PORTAL_ICON_SIZES = {
    small: { container: 52, icon: 24, fontSize: 10 },
    medium: { container: 64, icon: 28, fontSize: 11 },
    large: { container: 76, icon: 32, fontSize: 12 },
} as const;

const IconComponents: Record<string, any> = {
    Users,
    MessageCircle,
    Phone,
    Sparkles,
    ShoppingBag,
    Megaphone,
    Book,
    GraduationCap,
    Newspaper,
    Settings,
    MessageSquare,
    Map,
    Coffee,
    Utensils,
    Music,
    Film,
    Compass,
    Briefcase,
    Heart,
    Contact,
    PlayCircle,
    Clapperboard,
    Radio,
    LifeBuoy,
    Sun,
    Bot,
    Flame,
    Landmark,
    CalendarDays,
    Swords,
};

const SERVICE_EMOJIS: Record<string, string> = {
    path_tracker: '🧭',
    contacts: '📇',
    chat: '💬',
    rooms: '👥',
    calls: '📞',
    dating: '💍',
    cafe: '☕️',
    shops: '🛍️',
    ads: '📢',
    library: '📚',
    education: '🎓',
    multimedia: '🎵',
    video_circles: '📹',
    channels: '📻',
    sadhu_sanga: '🪔',
    ekadashi_calendar: '📅',
    feed: '📰',
    news: '📰',
    map: '🗺️',
    support: '🛟',
    history: '🕰️',
    settings: '⚙️',
    travel: '✈️',
    services: '🤖',
    services_catalog: '🧰',
    lila_battle_of_sages: '⚔️',
    seva: '🤲',
};

interface PortalIconChromeOptions {
    accentColor: string;
    portalIconStyle: PortalIconStyle | string;
    portalBackgroundType: SharedPortalBackgroundType;
    isDarkMode: boolean;
    reducedEffects?: boolean;
    roleHighlight?: boolean;
}

export interface PortalIconChromeSpec {
    containerStyle: ViewStyle;
    glyphColor: string;
    glyphSize: number;
    glyphStrokeWidth: number;
    shouldRenderVedaGlow: boolean;
}

export const getPortalSurfaceRadius = (size: number) => Math.round(size * 0.34);

export const getPortalIconChrome = ({
    accentColor,
    portalIconStyle,
    portalBackgroundType,
    isDarkMode,
    reducedEffects = false,
    roleHighlight = false,
}: PortalIconChromeOptions): PortalIconChromeSpec => {
    const isImageOrPremiumSurface = portalBackgroundType === 'image' || portalIconStyle === 'premium3d';
    const backgroundColor = portalIconStyle === 'vedamatch'
        ? '#121212'
        : portalIconStyle === 'solid'
            ? accentColor
            : isImageOrPremiumSurface
                ? (isDarkMode ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)')
                : isDarkMode
                    ? 'rgba(30,30,30,0.85)'
                    : 'rgba(255,255,255,0.9)';
    const borderColor = portalIconStyle === 'vedamatch'
        ? '#D4AF37'
        : portalIconStyle === 'solid'
            ? 'rgba(255,255,255,0.25)'
            : isImageOrPremiumSurface
                ? 'rgba(255,255,255,0.3)'
                : `${accentColor}30`;
    const borderWidth = portalIconStyle === 'vedamatch'
        ? 1
        : roleHighlight
            ? 2
            : isImageOrPremiumSurface || portalIconStyle === 'solid'
                ? 1.5
                : 1;
    const iconSurfaceHasEfficientShadow = portalIconStyle === 'vedamatch' || portalIconStyle === 'solid';
    const shouldRenderShadow = (roleHighlight || portalIconStyle === 'vedamatch')
        && !reducedEffects
        && (Platform.OS !== 'ios' || iconSurfaceHasEfficientShadow);

    return {
        containerStyle: {
            backgroundColor,
            borderColor,
            borderWidth,
            ...(shouldRenderShadow ? {
                shadowColor: portalIconStyle === 'vedamatch' ? '#D4AF37' : accentColor,
                shadowOpacity: portalIconStyle === 'vedamatch' ? 0.5 : 0.35,
                shadowRadius: portalIconStyle === 'vedamatch' ? 10 : 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 6,
            } : {}),
        },
        glyphColor: portalIconStyle === 'vedamatch'
            ? '#FFDF00'
            : portalIconStyle === 'solid' || portalBackgroundType === 'image'
                ? '#ffffff'
                : accentColor,
        glyphSize: portalIconStyle === 'vedamatch' ? -2 : 0,
        glyphStrokeWidth: portalIconStyle === 'solid' ? 2.5 : 2,
        shouldRenderVedaGlow: portalIconStyle === 'vedamatch' && !reducedEffects,
    };
};

export const getPortalLabelVisuals = (
    portalBackgroundType: SharedPortalBackgroundType,
    isDarkMode: boolean,
    textColor: string,
): { pillStyle?: ViewStyle; textStyle: TextStyle } => {
    if (portalBackgroundType === 'image') {
        return {
            pillStyle: {
                backgroundColor: 'rgba(0,0,0,0.45)',
            },
            textStyle: {
                color: '#ffffff',
                textShadowColor: 'rgba(0,0,0,0.95)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 6,
            },
        };
    }

    if (portalBackgroundType === 'gradient') {
        return {
            pillStyle: {
                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.65)',
            },
            textStyle: {
                color: isDarkMode ? '#ffffff' : textColor,
                textShadowColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
                textShadowOffset: { width: 0, height: 0.5 },
                textShadowRadius: 2,
            },
        };
    }

    return {
        textStyle: {
            color: textColor,
        },
    };
};

export const PortalVedaMatchRings: React.FC<{ borderRadius: number }> = ({ borderRadius }) => (
    <View style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}>
        <View style={[styles.vedaRingOuter, { borderRadius: borderRadius * 2.2 }]} />
        <View style={[styles.vedaRingInner, { borderRadius: borderRadius * 2 }]} />
    </View>
);

interface PortalServiceGlyphProps {
    service: ServiceDefinition;
    iconSize: number;
    portalIconStyle: PortalIconStyle | string;
    portalBackgroundType: SharedPortalBackgroundType;
    chrome: PortalIconChromeSpec;
}

export const PortalServiceGlyph: React.FC<PortalServiceGlyphProps> = ({
    service,
    iconSize,
    portalIconStyle,
    chrome,
}) => {
    const IconComponent = IconComponents[service.icon] || Users;

    if (portalIconStyle === 'premium3d') {
        return (
            <Text style={{ fontSize: iconSize + 4, lineHeight: iconSize + 8, marginTop: 4 }}>
                {SERVICE_EMOJIS[service.id] || '✨'}
            </Text>
        );
    }

    return (
        <IconComponent
            size={Math.max(12, iconSize + chrome.glyphSize)}
            color={chrome.glyphColor}
            strokeWidth={chrome.glyphStrokeWidth}
        />
    );
};

const styles = StyleSheet.create({
    vedaRingOuter: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderWidth: 1,
        borderColor: '#FFDF00',
        opacity: 0.2,
    },
    vedaRingInner: {
        position: 'absolute',
        top: 5,
        left: 5,
        right: 5,
        bottom: 5,
        borderWidth: 1,
        borderColor: '#FFDF00',
        opacity: 0.3,
    },
});
