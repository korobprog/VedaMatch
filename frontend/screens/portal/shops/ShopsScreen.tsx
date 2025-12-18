import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, useColorScheme, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/chat/ChatConstants';

const MOCK_SHOPS = [
    { id: '1', name: 'Vedic Aromas', category: 'Incense & Oils', rating: '4.8' },
    { id: '2', name: 'Yoga Essentials', category: 'Mats & Props', rating: '4.9' },
    { id: '3', name: 'Sacred Seeds', category: 'Malas & Beads', rating: '5.0' },
];

export const ShopsScreen: React.FC = () => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const renderItem = ({ item }: any) => (
        <TouchableOpacity style={[styles.shopCard, { backgroundColor: theme.header, borderColor: theme.borderColor }]}>
            <View style={[styles.imagePlaceholder, { backgroundColor: theme.button }]}>
                <Text style={{ fontSize: 40 }}>🏪</Text>
            </View>
            <View style={styles.shopInfo}>
                <Text style={[styles.shopName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.shopCat, { color: theme.subText }]}>{item.category}</Text>
                <View style={styles.ratingRow}>
                    <Text style={{ color: theme.accent }}>★ {item.rating}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={MOCK_SHOPS}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                numColumns={2}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    list: { padding: 8 },
    shopCard: {
        flex: 1,
        margin: 8,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 2,
    },
    imagePlaceholder: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shopInfo: {
        padding: 12,
    },
    shopName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    shopCat: {
        fontSize: 12,
        marginVertical: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});
