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
import { COLORS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';
import { Phone, Menu, ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../utils/url';

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
        <View style={{
            backgroundColor: theme.header,
            borderBottomColor: theme.borderColor,
            borderBottomWidth: 0.5,
            height: 60,
            justifyContent: 'center',
            ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
                android: { elevation: 2 }
            })
        }}>
            <View style={styles.headerContent}>
                {recipientUser ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                            <ChevronLeft color={theme.text} size={28} />
                        </TouchableOpacity>

                        {/* Avatar Addition for "System" feel */}
                        <View style={[styles.avatarContainer, { backgroundColor: theme.inputBackground }]}>
                            {recipientUser.avatarUrl ? (
                                <Image
                                    source={{ uri: getMediaUrl(recipientUser.avatarUrl) }}
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
                        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                    )}
                </View>

                <View style={styles.rightActions}>
                    {onCallPress && recipientUser && (
                        <TouchableOpacity onPress={onCallPress} style={styles.actionButton}>
                            <Phone color={theme.text} size={24} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    titleContainer: {
        flex: 1,
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
});
