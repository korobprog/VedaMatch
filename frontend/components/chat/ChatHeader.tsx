import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    Platform,
    StatusBar,
} from 'react-native';
import { COLORS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';

interface ChatHeaderProps {
    title: string;
    onSettingsPress: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    title,
    onSettingsPress,
}) => {
    const { recipientUser } = useChat();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const displayTitle = recipientUser
        ? (recipientUser.spiritualName || recipientUser.karmicName)
        : title;
    const subTitle = recipientUser ? (recipientUser.identity || 'Devotee') : null;

    return (
        <View style={{
            backgroundColor: theme.header,
            borderBottomColor: theme.borderColor,
            borderBottomWidth: 0.5,
            height: 44,
        }}>
            <View style={styles.headerContent}>
                <TouchableOpacity onPress={onSettingsPress} style={styles.menuButton}>
                    {/* 3 Vertical Sticks */}
                    <View style={styles.sticksContainer}>
                        <View style={[styles.stick, { backgroundColor: theme.text }]} />
                        <View style={[styles.stick, { backgroundColor: theme.text }]} />
                        <View style={[styles.stick, { backgroundColor: theme.text }]} />
                    </View>
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                    {recipientUser ? (
                        <>
                            <Text style={[styles.title, { color: theme.text }]}>{displayTitle}</Text>
                            {subTitle && (
                                <Text style={[styles.subTitle, { color: theme.subText }]}>{subTitle}</Text>
                            )}
                        </>
                    ) : null}
                </View>

                {/* Gear removed as requested */}
                <View style={{ width: 40 }} />
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
});
