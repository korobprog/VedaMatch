import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/chat/ChatConstants';

const MOCK_CHATS = [
    { id: '1', name: 'General Community', lastMsg: 'Namaste everyone!', time: '12:45' },
    { id: '2', name: 'Yoga Enthusiasts', lastMsg: 'Next session at 6 AM', time: '11:20' },
    { id: '3', name: 'Ayurveda Tips', lastMsg: 'Drink warm water with lemon', time: 'Yesterday' },
];

export const PortalChatScreen: React.FC = () => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const renderItem = ({ item }: any) => (
        <TouchableOpacity style={[styles.chatItem, { borderBottomColor: theme.borderColor }]}>
            <View style={[styles.chatIcon, { backgroundColor: theme.accent }]}>
                <Text style={{ fontSize: 20 }}>#</Text>
            </View>
            <View style={styles.chatInfo}>
                <View style={styles.chatHeaderRow}>
                    <Text style={[styles.chatName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.chatTime, { color: theme.subText }]}>{item.time}</Text>
                </View>
                <Text style={[styles.lastMsg, { color: theme.subText }]} numberOfLines={1}>
                    {item.lastMsg}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={MOCK_CHATS}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    list: { paddingVertical: 8 },
    chatItem: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 0.5,
    },
    chatIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatInfo: {
        flex: 1,
        marginLeft: 16,
    },
    chatHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    chatTime: {
        fontSize: 11,
    },
    lastMsg: {
        fontSize: 14,
        marginTop: 2,
    }
});
