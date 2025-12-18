import React from 'react';
import { View, Text, StyleSheet, FlatList, useColorScheme, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/chat/ChatConstants';

const MOCK_ADS = [
    { id: '1', title: 'Looking for a flatmate', price: '20,000 ₽', location: 'Moscow' },
    { id: '2', title: 'Selling Yoga Mat Lululemon', price: '5,000 ₽', location: 'SPb' },
    { id: '3', title: 'Free Gita Books Distribution', price: 'Free', location: 'All India' },
];

export const AdsScreen: React.FC = () => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const renderItem = ({ item }: any) => (
        <TouchableOpacity style={[styles.adItem, { borderBottomColor: theme.borderColor }]}>
            <View style={styles.adContent}>
                <Text style={[styles.adTitle, { color: theme.text }]}>{item.title}</Text>
                <View style={styles.adMeta}>
                    <Text style={[styles.adPrice, { color: theme.accent }]}>{item.price}</Text>
                    <Text style={[styles.adLoc, { color: theme.subText }]}> • {item.location}</Text>
                </View>
            </View>
            <View style={[styles.adImg, { backgroundColor: theme.inputBackground }]}>
                <Text>📷</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={MOCK_ADS}
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
    adItem: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 0.5,
    },
    adContent: {
        flex: 1,
        marginRight: 12,
    },
    adTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    adMeta: {
        flexDirection: 'row',
        marginTop: 6,
        alignItems: 'center',
    },
    adPrice: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    adLoc: {
        fontSize: 12,
    },
    adImg: {
        width: 60,
        height: 60,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
