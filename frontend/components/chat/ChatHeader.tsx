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

interface ChatHeaderProps {
    title: string;
    onSettingsPress: () => void;
    onCallPress?: () => void;
    onBackPress?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    title,
    onSettingsPress,
    onCallPress,
    onBackPress,
}) => {
    const navigation = useNavigation<any>();
    const { recipientUser } = useChat();
    const { user } = useUser();
    const { isDarkMode, portalBackgroundType } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const isPhotoBg = portalBackgroundType === 'image';
    const titleColor = isPhotoBg ? '#F8FAFC' : colors.textPrimary;
    const subTitleColor = isPhotoBg ? 'rgba(248,250,252,0.82)' : colors.textSecondary;
    const headerBg = isPhotoBg ? 'rgba(15,23,42,0.64)' : colors.surfaceElevated;
    const headerBorder = isPhotoBg ? 'rgba(255,255,255,0.22)' : colors.border;
    const iconColor = isPhotoBg ? '#F8FAFC' : colors.textPrimary;
    const iconButtonBg = isPhotoBg ? 'rgba(255,255,255,0.16)' : colors.surface;

    const displayTitle = recipientUser
        ? (recipientUser.spiritualName || recipientUser.karmicName)
        : title;

    const locationParts = [];
    if (recipientUser?.country) locationParts.push(recipientUser.country);
    if (recipientUser?.city) locationParts.push(recipientUser.city);
    const subTitle = recipientUser
        ? locationParts.join(', ')
        : 'AI-ассистент VedaMatch';

    return (
        <View style={styles.shell}>
            <View style={[styles.header, { borderColor: headerBorder }]}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType={isDarkMode ? 'dark' : 'light'}
                    blurAmount={18}
                    reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.95)' : colors.surfaceElevated}
                />
                <View style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: headerBg,
                    }
                ]} />

                <View style={styles.headerContent}>
                    {recipientUser ? (
                        <View style={styles.leftGroup}>
                            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                                <ChevronLeft color={iconColor} size={21} />
                            </TouchableOpacity>

                            <View style={[styles.avatarContainer, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : colors.accentSoft }]}>
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
                        <TouchableOpacity onPress={onSettingsPress} style={styles.menuButton} activeOpacity={0.86}>
                            <Menu color={iconColor} size={20} />
                        </TouchableOpacity>
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
                                onPress={() => navigation.navigate('Portal')}
                                activeOpacity={0.8}
                                style={[
                                    styles.aiTitleWrap,
                                    {
                                        backgroundColor: isPhotoBg ? 'rgba(255, 183, 77, 0.15)' : colors.accentSoft,
                                        borderColor: isPhotoBg ? 'rgba(255, 183, 77, 0.35)' : colors.border,
                                    },
                                ]}
                            >
                                <Sparkles size={12} color={isPhotoBg ? '#FFB74D' : colors.accent} />
                                <Text style={[styles.aiTitle, { color: titleColor }]}>AI-чат</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.rightActions}>
                        <View style={{ marginRight: recipientUser ? 10 : 0 }}>
                            <BalancePill size="small" lightMode={isPhotoBg || isDarkMode} />
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
        height: Platform.OS === 'ios' ? 64 : 50,
        paddingTop: Platform.OS === 'ios' ? 8 : 5,
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
        fontSize: 14,
        fontWeight: '700',
    },
    subTitle: {
        fontSize: 9,
        marginTop: 1,
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
    },
    menuButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
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
