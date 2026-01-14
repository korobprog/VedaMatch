import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useColorScheme, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { adsService } from '../../../services/adsService';
import { Ad } from '../../../types/ads';
import { RootStackParamList } from '../../../types/navigation';
import { getMediaUrl } from '../../../utils/url';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import {
    Image as ImageIcon,
    MapPin,
    MessageCircle,
    Heart,
    Flag,
    User
} from 'lucide-react-native';

type AdDetailRouteProp = RouteProp<RootStackParamList, 'AdDetail'>;

const { width } = Dimensions.get('window');

export const AdDetailScreen: React.FC = () => {
    const { t } = useTranslation();
    const route = useRoute<AdDetailRouteProp>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;
    const { adId } = route.params;

    const [ad, setAd] = useState<Ad | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAd();
    }, [adId]);

    const loadAd = async () => {
        try {
            setLoading(true);
            const data = await adsService.getAd(adId);
            setAd(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load ad details');
        } finally {
            setLoading(false);
        }
    };

    const handleFavorite = async () => {
        if (!ad) return;
        try {
            const result = await adsService.toggleFavorite(ad.ID);
            setAd(prev => prev ? { ...prev, isFavorite: result.isFavorite } : null);
        } catch (error) {
            Alert.alert('Error', 'Failed to update favorite');
        }
    };

    const handleChat = async () => {
        if (!ad || !ad.author) return;
        try {
            const result = await adsService.contactSeller(ad.ID, 'message');
            if (result.roomId) {
                // Navigate to the chat room
                navigation.navigate('RoomChat', { roomId: result.roomId, roomName: result.roomName || 'Chat' });
            } else {
                Alert.alert(t('ads.detail.contactSuccess'), t('ads.detail.messageRequested'));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to start chat');
        }
    };

    const handleReport = () => {
        Alert.alert(
            'Report Ad',
            'Reason for reporting:',
            [
                { text: 'Inappropriate', onPress: () => sendReport('inappropriate') },
                { text: 'Spam', onPress: () => sendReport('spam') },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const sendReport = async (reason: string) => {
        if (!ad) return;
        try {
            await adsService.reportAd(ad.ID, reason);
            Alert.alert('Reported', 'Thank you for your report.');
        } catch (error) {
            Alert.alert('Error', 'Failed to submit report');
        }
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!ad) {
        return (
            <View style={[styles.center, { backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }]}>
                <Text style={{ color: colors.text }}>Ad not found</Text>
            </View>
        );
    }

    const priceText = ad.isFree
        ? t('ads.price.free')
        : `${ad.price} ${ad.currency}`;

    return (
        <ProtectedScreen>
            <ScrollView style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}>
                {/* Images */}
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
                    {ad.photos && ad.photos.length > 0 ? (
                        ad.photos.map((photo, index) => (
                            <Image
                                key={index}
                                source={{ uri: getMediaUrl(photo.photoUrl) || '' }}
                                style={{ width: width, height: 300 }}
                                resizeMode="cover"
                            />
                        ))
                    ) : (
                        <View style={[styles.placeholder, { width: width, backgroundColor: isDarkMode ? '#333' : '#f5f5f5' }]}>
                            <ImageIcon size={64} color={isDarkMode ? '#555' : '#ddd'} />
                        </View>
                    )}
                </ScrollView>

                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.title, { color: isDarkMode ? '#fff' : colors.text }]}>{ad.title}</Text>
                            <Text style={[styles.category, { color: colors.primary }]}>{t(`ads.categories.${ad.category}`).toUpperCase()}</Text>
                        </View>
                        <Text style={[styles.price, { color: colors.primary }]}>{priceText}</Text>
                    </View>

                    {/* Location */}
                    <View style={styles.row}>
                        <MapPin size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={{ color: colors.textSecondary }}>{ad.city}{ad.district ? `, ${ad.district}` : ''}</Text>
                    </View>

                    {/* Description */}
                    <Text style={[styles.sectionTitle, { color: isDarkMode ? '#ddd' : colors.text }]}>{t('ads.create.description')}</Text>
                    <Text style={[styles.description, { color: isDarkMode ? '#ccc' : colors.textSecondary }]}>
                        {ad.description}
                    </Text>

                    {/* Author */}
                    {ad.author && (
                        <View style={[styles.authorCard, { backgroundColor: isDarkMode ? '#2a2a2a' : '#fff', borderColor: colors.textSecondary }]}>
                            <Image
                                source={{ uri: getMediaUrl(ad.author.avatarUrl) || '' }}
                                style={styles.avatar}
                            />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.authorName, { color: isDarkMode ? '#fff' : colors.text }]}>{ad.author.spiritualName}</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('ads.card.posted')} {new Date(ad.CreatedAt).toLocaleDateString()}</Text>
                            </View>
                            <TouchableOpacity onPress={() => ad.author && navigation.navigate('ContactProfile', { userId: ad.author.id })}>
                                <Text style={{ color: colors.primary }}>Profile</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleChat}>
                            <MessageCircle size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.btnText}>{t('ads.detail.message') || 'Message'}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.favoriteBtn} onPress={handleFavorite}>
                        <Heart size={20} color={ad.isFavorite ? '#FF5252' : colors.textSecondary} fill={ad.isFavorite ? '#FF5252' : 'transparent'} style={{ marginRight: 8 }} />
                        <Text style={{ color: isDarkMode ? '#fff' : colors.text }}>
                            {ad.isFavorite ? t('ads.detail.removeFromFavorites') || 'Remove from Favorites' : t('ads.detail.addToFavorites') || 'Add to Favorites'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.reportBtn} onPress={handleReport}>
                        <Flag size={16} color="#FF5252" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#FF5252' }}>{t('ads.detail.report') || 'Report Ad'}</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    gallery: { height: 300 },
    placeholder: { height: 300, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    title: { fontSize: 24, fontWeight: 'bold', flex: 1, marginRight: 10 },
    price: { fontSize: 20, fontWeight: 'bold' },
    category: { fontSize: 12, fontWeight: '600', marginTop: 4 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, marginTop: 10 },
    description: { fontSize: 16, lineHeight: 24, marginBottom: 20 },
    authorCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    authorName: { fontSize: 16, fontWeight: 'bold' },
    actions: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }, // Changed justifyContent
    actionBtn: { flex: 1, flexDirection: 'row', padding: 15, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginHorizontal: 5, elevation: 2 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    favoriteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, marginBottom: 10 },
    reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10 },
});
