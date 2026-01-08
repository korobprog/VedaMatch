import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useSettings } from '../../../context/SettingsContext';
import { useUser } from '../../../context/UserContext';
import { API_BASE_URL } from '../../../config/api.config';
import { datingService } from '../../../services/datingService';

interface Favorite {
    ID: number;
    candidate: {
        spiritualName: string;
        city: string;
        madh: string;
    };
    compatibilityScore: string;
}

export const DatingFavoritesScreen = ({ navigation }: any) => {
    const { theme } = useSettings();
    const { user } = useUser();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFavorite, setSelectedFavorite] = useState<Favorite | null>(null);

    useEffect(() => {
        fetchFavorites();
    }, []);

    const fetchFavorites = async () => {
        if (!user?.ID) return;
        try {
            const data = await datingService.getFavorites(user.ID);
            setFavorites(data);
        } catch (error) {
            console.error('Failed to fetch favorites:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteFavorite = async (id: number) => {
        try {
            await datingService.removeFavorite(id);
            setFavorites(prev => prev.filter(f => f.ID !== id));
        } catch (error) {
            Alert.alert('Error', 'Failed to delete favorite');
        }
    };

    const renderItem = ({ item }: { item: Favorite }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.header, borderColor: theme.borderColor }]}
            onPress={() => setSelectedFavorite(item)}
        >
            <View style={styles.cardHeader}>
                <Text style={[styles.name, { color: theme.text }]}>{item.candidate.spiritualName}</Text>
                <TouchableOpacity onPress={() => deleteFavorite(item.ID)}>
                    <Text style={{ color: 'red' }}>🗑️</Text>
                </TouchableOpacity>
            </View>
            <Text style={[styles.details, { color: theme.subText }]}>{item.candidate.madh} • {item.candidate.city}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={{ color: theme.text, fontSize: 18 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Favorites ❤️</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.accent} />
            ) : favorites.length === 0 ? (
                <Text style={{ color: theme.subText, textAlign: 'center', marginTop: 20 }}>No favorites yet.</Text>
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={(item) => item.ID.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}

            {selectedFavorite && (
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.header }]}>
                        <Text style={[styles.modalTitle, { color: theme.accent }]}>Analysis for {selectedFavorite.candidate.spiritualName}</Text>
                        <ScrollView style={styles.modalBody}>
                            <Text style={{ color: theme.text }}>{selectedFavorite.compatibilityScore}</Text>
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.closeBtn, { backgroundColor: theme.button }]}
                            onPress={() => setSelectedFavorite(null)}
                        >
                            <Text style={{ color: theme.buttonText }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 50,
        borderBottomWidth: 1,
    },
    backBtn: { padding: 5 },
    title: { fontSize: 20, fontWeight: 'bold' },
    list: { padding: 16 },
    card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 18, fontWeight: 'bold' },
    details: { fontSize: 14, marginTop: 4 },
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', maxHeight: '80%', borderRadius: 20, padding: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    modalBody: { marginBottom: 20 },
    closeBtn: { padding: 15, borderRadius: 12, alignItems: 'center' }
});
