import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
} from 'react-native';
import { COLORS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';
import { Phone, Menu, ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

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
    const subTitle = recipientUser
        ? `${recipientUser.identity || t('common.devotee')} • ${recipientUser.country}, ${recipientUser.city}`
        : null;

    return (
        <View style={{
            backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.9)',
            borderBottomColor: theme.borderColor,
            borderBottomWidth: 0.5,
            height: 56, // Slightly taller for better touch targets
        }}>
            <View style={styles.headerContent}>
                {recipientUser ? (
                    <TouchableOpacity onPress={onBackPress} style={styles.menuButton}>
                        <ChevronLeft color={theme.text} size={28} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={onSettingsPress} style={styles.menuButton}>
                        <Menu color={theme.text} size={24} />
                    </TouchableOpacity>
                )}

                <View style={styles.titleContainer}>
                    {recipientUser ? (
                        <>
                            <Text style={[styles.title, { color: theme.text }]}>{displayTitle}</Text>
                            {subTitle && (
                                <Text style={[styles.subTitle, { color: theme.subText }]}>{subTitle}</Text>
                            )}
                        </>
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
    menuButton: {
        padding: 8,
        marginRight: 8,
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
