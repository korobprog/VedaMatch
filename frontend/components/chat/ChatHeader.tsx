import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useChat } from '../../context/ChatContext';
import { Phone, Menu, ChevronLeft, Sparkles } from 'lucide-react-native';
import { getMediaUrl } from '../../utils/url';
import { BalancePill } from '../wallet/BalancePill';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { isColorLight, isGradientLight } from '../../utils/chatBackgroundContrast';
import { useTranslation } from 'react-i18next';

interface ChatHeaderProps {
    title: string;
    onSettingsPress: () => void;
    onCallPress?: () => void;
    onBackPress?: () => void;
    topInset?: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    title,
    onSettingsPress,
    onCallPress,
    onBackPress,
    topInset = 0,
}) => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const { recipientUser } = useChat();
    const { user } = useUser();
    const { isDarkMode, portalIconStyle, chatBackgroundType, chatBackground } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const isImageBg = chatBackgroundType === 'image';
    const isVedaMatch = portalIconStyle === 'vedamatch';
    const isLightChatBackground =
        (chatBackgroundType === 'color' && isColorLight(chatBackground)) ||
        (chatBackgroundType === 'gradient' && isGradientLight(chatBackground));
    const useLightVedaContrast = isVedaMatch && !isImageBg && isLightChatBackground;
    const titleColor = isVedaMatch
        ? (useLightVedaContrast ? '#3F2F00' : '#FFDF00')
        : isImageBg ? '#F8FAFC' : colors.textPrimary;
    const subTitleColor = isVedaMatch
        ? (useLightVedaContrast ? '#6B5500' : '#D4AF37')
        : isImageBg ? 'rgba(248,250,252,0.82)' : colors.textSecondary;
    const headerBg = isVedaMatch
        ? (useLightVedaContrast ? 'rgba(255,248,220,0.92)' : '#121212')
        : isImageBg ? 'rgba(15,23,42,0.64)' : colors.surfaceElevated;
    const headerBorder = isVedaMatch
        ? (useLightVedaContrast ? '#C59D22' : '#D4AF37')
        : isImageBg ? 'rgba(255,255,255,0.22)' : colors.border;
    const iconColor = isVedaMatch
        ? (useLightVedaContrast ? '#5B4700' : '#D4AF37')
        : isImageBg ? '#F8FAFC' : colors.textPrimary;
    const iconButtonBg = isVedaMatch
        ? (useLightVedaContrast ? 'rgba(255,248,220,0.94)' : '#121212')
        : isImageBg ? 'rgba(255,255,255,0.16)' : colors.surface;
    const headerTopInset = Platform.OS === 'ios' ? Math.max(topInset - 55, 0) : 0;
    const headerHeight = Platform.OS === 'ios' ? 58 : 52;

    const displayTitle = recipientUser
        ? (recipientUser.spiritualName || recipientUser.karmicName)
        : title;

    const locationParts = [];
    if (recipientUser?.country) locationParts.push(recipientUser.country);
    if (recipientUser?.city) locationParts.push(recipientUser.city);
    const subTitle = recipientUser
        ? locationParts.join(', ')
        : t('chat.aiAssistantDesc');

    return (
        <View style={[styles.shell, { paddingTop: headerTopInset }]}>
            <View style={[styles.header, {
                height: headerHeight,
                paddingTop: 0,
                borderColor: headerBorder,
                borderWidth: isVedaMatch ? 1 : 1.2,
                ...(isVedaMatch ? {
                    shadowColor: '#D4AF37',
                    shadowOpacity: 0.5,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 6,
                } : {}),
            }]}>
                {isVedaMatch && (
                    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
                        <View style={{ position: 'absolute', top: -20, left: -20, right: -20, bottom: -20, borderWidth: 1, borderColor: '#FFDF00', borderRadius: 80, opacity: 0.2 }} />
                        <View style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderWidth: 1, borderColor: '#FFDF00', borderRadius: 80, opacity: 0.3 }} />
                    </View>
                )}
                {!isVedaMatch && (
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType={isDarkMode ? 'dark' : 'light'}
                        blurAmount={18}
                        reducedTransparencyFallbackColor={isImageBg ? 'rgba(15,23,42,0.95)' : colors.surfaceElevated}
                    />
                )}
                <View style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: isVedaMatch
                            ? (useLightVedaContrast ? headerBg : 'transparent')
                            : headerBg,
                    }
                ]} />

                <View style={styles.headerContent}>
                    {recipientUser ? (
                        <View style={styles.leftGroup}>
                            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                                <ChevronLeft color={iconColor} size={21} />
                            </TouchableOpacity>

                            <View style={[styles.avatarContainer, { backgroundColor: isImageBg ? 'rgba(255,255,255,0.16)' : colors.accentSoft }]}>
                                {recipientUser.avatarUrl && getMediaUrl(recipientUser.avatarUrl) ? (
                                    <Image
                                        source={{ uri: getMediaUrl(recipientUser.avatarUrl)! }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <Text style={{ fontSize: 15, color: titleColor }}>
                                        {(recipientUser.spiritualName?.[0] || recipientUser.karmicName?.[0] || '?').toUpperCase()}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.leftGroup}>
                            <TouchableOpacity
                                onPress={onBackPress}
                                style={[styles.backButton, { backgroundColor: iconButtonBg, borderColor: headerBorder }]}
                                activeOpacity={0.86}
                                accessibilityRole="button"
                                accessibilityLabel={t('common.back')}
                                accessibilityHint={t('chat.backToPortal')}
                            >
                                <ChevronLeft color={iconColor} size={20} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onSettingsPress}
                                style={[styles.menuButton, { backgroundColor: iconButtonBg, borderColor: headerBorder }]}
                                activeOpacity={0.86}
                                accessibilityRole="button"
                                accessibilityLabel={t('common.menu', { defaultValue: 'Меню' })}
                            >
                                <Menu color={iconColor} size={20} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.titleContainer}>
                        {recipientUser ? (
                            <View>
                                <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>{displayTitle}</Text>
                                {!!subTitle && (
                                    <Text style={[styles.subTitle, { color: subTitleColor }]} numberOfLines={1}>
                                        {subTitle}
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={onBackPress}
                                activeOpacity={0.8}
                                style={[
                                    styles.aiTitleWrap,
                                    {
                                        backgroundColor: isVedaMatch ? 'transparent' : isImageBg ? 'rgba(255, 183, 77, 0.15)' : colors.accentSoft,
                                        borderColor: isVedaMatch ? '#D4AF37' : isImageBg ? 'rgba(255, 183, 77, 0.35)' : colors.border,
                                    },
                                ]}
                            >
                                <Sparkles size={12} color={isVedaMatch ? '#FFDF00' : isImageBg ? '#FFB74D' : colors.accent} />
                                <Text style={[styles.aiTitle, { color: titleColor }]}>{t('chat.aiAssistant')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.rightActions}>
                        <View style={{ marginRight: recipientUser ? 10 : 0 }}>
                            <BalancePill size="small" lightMode={isImageBg || isDarkMode || (isVedaMatch && !useLightVedaContrast)} />
                        </View>
                        {recipientUser && onCallPress && (
                            <TouchableOpacity onPress={onCallPress} style={[styles.actionButton, { backgroundColor: iconButtonBg, borderColor: headerBorder }]} activeOpacity={0.86}>
                                <Phone color={iconColor} size={18} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    shell: {
        paddingHorizontal: 10,
        paddingTop: 0,
        backgroundColor: 'transparent',
    },
    header: {
        height: Platform.OS === 'ios' ? 58 : 52,
        paddingTop: 0,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1.2,
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    leftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 6,
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 15,
        lineHeight: 18,
        fontWeight: '700',
    },
    subTitle: {
        fontSize: 10,
        lineHeight: 13,
        marginTop: 2,
    },
    aiTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 183, 77, 0.15)',
        borderWidth: 1.2,
        borderColor: 'rgba(255, 183, 77, 0.35)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3.5,
        gap: 6,
    },
    aiTitle: {
        fontSize: 12,
        fontWeight: '700',
    },
    backButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
        borderWidth: 1,
    },
    menuButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
        borderWidth: 1,
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    rightActions: {
        minWidth: 44,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    aiBalanceContainer: {
        alignItems: 'flex-end',
    },
});
