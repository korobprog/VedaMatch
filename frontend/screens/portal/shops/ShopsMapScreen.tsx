import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, useColorScheme, Image, Linking, Alert, Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { marketService } from '../../../services/marketService';
import { Shop, ShopFilters } from '../../../types/market';
import { getMediaUrl } from '../../../utils/url';

// Note: For full map integration, install react-native-maps:
// npm install react-native-maps
// For now, we show a list with "Open in Maps" buttons

export const ShopsMapScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();

    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [shops, setShops] = useState<Shop[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadShops();
        }, [])
    );

    const loadShops = async () => {
        try {
            setLoading(true);

            const filters: ShopFilters = {
                status: 'active',
                limit: 50,
                sort: 'rating',
            };

            // If we have user's location, add geo filter
            if (userLocation) {
                filters.nearLat = userLocation.lat;
                filters.nearLng = userLocation.lng;
                filters.radiusKm = 50;
            }

            const result = await marketService.getShops(filters);
            setShops(result.shops || []);
        } catch (error) {
            console.error('Error loading shops:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadShops();
    };

    const handleShopPress = (shop: Shop) => {
        navigation.navigate('ShopDetails', { shopId: shop.ID });
    };

    const openInMaps = (shop: Shop) => {
        if (!shop.latitude || !shop.longitude) {
            // If no coordinates, search by address
            const query = encodeURIComponent(`${shop.address}, ${shop.city}`);
            const url = Platform.select({
                ios: `maps:0,0?q=${query}`,
                android: `geo:0,0?q=${query}`,
            });

            if (url) {
                Linking.canOpenURL(url).then(supported => {
                    if (supported) {
                        Linking.openURL(url);
                    } else {
                        // Fallback to Google Maps web
                        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
                    }
                });
            }
            return;
        }

        const lat = shop.latitude;
        const lng = shop.longitude;
        const label = encodeURIComponent(shop.name);

        const url = Platform.select({
            ios: `maps:0,0?q=${label}@${lat},${lng}`,
            android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
        });

        if (url) {
            Linking.canOpenURL(url).then(supported => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    // Fallback to Google Maps web
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
                }
            });
        }
    };

    const openDirections = (shop: Shop) => {
        if (!shop.latitude || !shop.longitude) {
            Alert.alert(t('market.map.noLocation'), t('market.map.noLocationMsg'));
            return;
        }

        const lat = shop.latitude;
        const lng = shop.longitude;

        // Try Yandex Maps first (popular in Russia), then Google
        const yandexUrl = `yandexmaps://maps.yandex.ru/?rtext=~${lat},${lng}&rtt=auto`;
        const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

        Linking.canOpenURL(yandexUrl).then(supported => {
            if (supported) {
                Linking.openURL(yandexUrl);
            } else {
                Linking.openURL(googleUrl);
            }
        });
    };

    const renderShop = ({ item }: { item: Shop }) => (
        <View style={[styles.shopCard, { backgroundColor: isDarkMode ? '#252525' : '#fff' }]}>
            <TouchableOpacity style={styles.shopContent} onPress={() => handleShopPress(item)}>
                <View style={[styles.shopLogo, { backgroundColor: colors.primary + '20' }]}>
                    {item.logoUrl ? (
                        <Image source={{ uri: getMediaUrl(item.logoUrl) || '' }} style={styles.logoImage} />
                    ) : (
                        <Text style={{ fontSize: 28 }}>🏪</Text>
                    )}
                </View>

                <View style={styles.shopInfo}>
                    <Text style={[styles.shopName, { color: isDarkMode ? '#fff' : colors.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={[styles.shopAddress, { color: colors.textSecondary }]} numberOfLines={2}>
                        📍 {item.address || item.city}
                    </Text>

                    <View style={styles.shopMeta}>
                        {item.rating > 0 && (
                            <Text style={{ color: '#FFA000', fontSize: 13 }}>
                                ★ {item.rating.toFixed(1)}
                            </Text>
                        )}
                        {item.distance && (
                            <Text style={[styles.distance, { color: colors.primary }]}>
                                {item.distance < 1
                                    ? `${Math.round(item.distance * 1000)} m`
                                    : `${item.distance.toFixed(1)} km`
                                }
                            </Text>
                        )}
                        <Text style={[styles.productsCount, { color: colors.textSecondary }]}>
                            {item.productsCount} {t('market.map.productsCount')}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            <View style={styles.mapActions}>
                <TouchableOpacity
                    style={[styles.mapBtn, { backgroundColor: colors.primary }]}
                    onPress={() => openInMaps(item)}
                >
                    <Text style={styles.mapBtnIcon}>📍</Text>
                    <Text style={styles.mapBtnText}>{t('market.map.openMap')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.mapBtn, { backgroundColor: '#4CAF50' }]}
                    onPress={() => openDirections(item)}
                >
                    <Text style={styles.mapBtnIcon}>🧭</Text>
                    <Text style={styles.mapBtnText}>{t('market.map.openRoute')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={[styles.mapPlaceholder, { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' }]}>
                <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
                <Text style={[styles.mapPlaceholderText, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                    {t('market.map.viewNearby')}
                </Text>
                <Text style={[styles.mapPlaceholderHint, { color: colors.textSecondary }]}>
                    {t('market.map.hint')}
                </Text>
            </View>

            <View style={styles.resultsHeader}>
                <Text style={[styles.resultsTitle, { color: isDarkMode ? '#fff' : colors.text }]}>
                    {t('market.map.nearbyShops')} ({shops.length})
                </Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}>
            <FlatList
                data={shops}
                renderItem={renderShop}
                keyExtractor={(item) => item.ID.toString()}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🏪</Text>
                        <Text style={[styles.emptyText, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                            {t('market.map.noShops')}
                        </Text>
                    </View>
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 8,
    },
    mapPlaceholder: {
        height: 180,
        margin: 16,
        marginBottom: 12,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapPlaceholderIcon: {
        fontSize: 48,
        marginBottom: 8,
    },
    mapPlaceholderText: {
        fontSize: 16,
        fontWeight: '600',
    },
    mapPlaceholderHint: {
        fontSize: 12,
        marginTop: 4,
    },
    resultsHeader: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    listContent: {
        paddingBottom: 20,
    },
    shopCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        elevation: 2,
        overflow: 'hidden',
    },
    shopContent: {
        flexDirection: 'row',
        padding: 14,
    },
    shopLogo: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    shopInfo: {
        flex: 1,
        marginLeft: 12,
    },
    shopName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    shopAddress: {
        fontSize: 13,
        marginTop: 2,
        lineHeight: 18,
    },
    shopMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 10,
    },
    distance: {
        fontSize: 13,
        fontWeight: '600',
    },
    productsCount: {
        fontSize: 12,
    },
    mapActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    mapBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    mapBtnIcon: {
        fontSize: 16,
    },
    mapBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
});
