import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    Image,
    Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { COLORS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';
import { Phone, Menu, ChevronLeft, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../utils/url';
import { BalancePill } from '../wallet/BalancePill';

import { useNavigation } from '@react-navigation/native';

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
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const { recipientUser } = useChat();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const displayTitle = recipientUser
        ? (recipientUser.spiritualName || recipientUser.karmicName)
        : title;

    // Updated logic: Show ONLY Country + City to save space
    const locationParts = [];
    if (recipientUser?.country) locationParts.push(recipientUser.country);
    if (recipientUser?.city) locationParts.push(recipientUser.city);
    const subTitle = recipientUser
        ? locationParts.join(', ')
        : null;

    return (
        <View style={styles.header}>
            <BlurView
                style={StyleSheet.absoluteFill}
                blurType={isDarkMode ? "dark" : "light"}
                blurAmount={15}
                reducedTransparencyFallbackColor={isDarkMode ? "rgba(10, 10, 15, 0.9)" : "rgba(255, 255, 255, 0.9)"}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(10, 10, 15, 0.3)' : 'rgba(255, 255, 255, 0.3)' }]} />

            <View style={styles.headerContent}>
                {recipientUser ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                            <ChevronLeft color={theme.text} size={28} />
                        </TouchableOpacity>

                        {/* Avatar Addition for "System" feel */}
                        <View style={[styles.avatarContainer, { backgroundColor: theme.inputBackground }]}>
                            {recipientUser.avatarUrl && getMediaUrl(recipientUser.avatarUrl) ? (
                                <Image
                                    source={{ uri: getMediaUrl(recipientUser.avatarUrl)! }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <Text style={{ fontSize: 16 }}>
                                    {(recipientUser.spiritualName?.[0] || recipientUser.karmicName?.[0] || '?').toUpperCase()}
                                </Text>
                            )}
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity onPress={onSettingsPress} style={styles.menuButton}>
                        <Menu color={theme.text} size={24} />
                    </TouchableOpacity>
                )}

                <View style={styles.titleContainer}>
                    {recipientUser ? (
                        <View>
                            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{displayTitle}</Text>
                            {subTitle ? (
                                <Text style={[styles.subTitle, { color: theme.subText }]} numberOfLines={1}>
                                    {subTitle}
                                </Text>
                            ) : null}
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Portal')}
                            activeOpacity={0.7}
                            style={{ alignItems: 'center' }}
                        >
                            <Image
                                source={require('../../assets/logo_tilak.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.rightActions}>
                    {recipientUser ? (
                        // P2P chat - show call button
                        onCallPress && (
                            <TouchableOpacity onPress={onCallPress} style={styles.actionButton}>
                                <Phone color={theme.text} size={24} />
                            </TouchableOpacity>
                        )
                    ) : (
                        // AI chat - show balance pill
                        <View style={styles.aiBalanceContainer}>
                            <Sparkles size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                            <BalancePill size="small" />
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        height: Platform.OS === 'ios' ? 94 : 64,
        paddingTop: Platform.OS === 'ios' ? 44 : 10,
        justifyContent: 'center',
        borderBottomWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    logoImage: {
        width: 100,
        height: 30,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    subTitle: {
        fontSize: 12,
        marginTop: 1,
    },
    settingsButton: {
        padding: 8,
    },
    backButton: {
        padding: 4,
        marginRight: 4,
    },
    menuButton: {
        padding: 8,
        marginRight: 8,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    sticksContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
    },
    stick: {
        width: 22,
        height: 3,
        borderRadius: 1.5,
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
    },
    aiBalanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
