import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    StatusBar,
    useColorScheme,
} from 'react-native';
import { COLORS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';

interface ChatHeaderProps {
    onSettingsPress: () => void;
    title: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    onSettingsPress,
    title,
}) => {
    const { handleNewChat } = useChat();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    return (
        <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
            <TouchableOpacity
                style={styles.settingsButton}
                onPress={onSettingsPress}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
                <Text style={{ fontSize: 24, color: theme.text }}>☰</Text>
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>

            <TouchableOpacity
                style={styles.newChatButton}
                onPress={handleNewChat}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
                <Text style={{ fontSize: 28, fontWeight: '300', color: theme.text }}>+</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        height: Platform.OS === 'android' ? 60 + (StatusBar.currentHeight || 0) : 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderBottomWidth: 0.5,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        zIndex: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    settingsButton: {
        padding: 10,
    },
    newChatButton: {
        padding: 10,
    },
});
