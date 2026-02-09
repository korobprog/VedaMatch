import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { adsService } from '../../../services/adsService';
import { Ad, AdCategory, AdType } from '../../../types/ads';
import { RootStackParamList } from '../../../types/navigation';
import { useSettings } from '../../../context/SettingsContext';

import { AdCard } from '../../../components/ads/AdCard';
import { CategoryPills } from '../../../components/ads/CategoryPills';
import { AdTabSwitcher } from '../../../components/ads/AdTabSwitcher';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { GodModeStatusBanner } from '../../../components/portal/god-mode/GodModeStatusBanner';
import {
    Search,
    X,
    SlidersHorizontal,
    Inbox,
    Plus
} from 'lucide-react-native';

export const AdsScreen: React.FC = () => {
    const { t } = useTranslation();
    const { isDarkMode, vTheme } = useSettings();
    const colors = vTheme.colors;
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const [activeTab, setActiveTab] = useState<AdType>('looking');
    const [selectedCategory, setSelectedCategory] = useState<AdCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);


    const fetchAds = useCallback(async (reset = false) => {
        try {
            if (reset) {
                setLoading(true);
            }


            const currentPage = reset ? 1 : page;
            let response;

            if (activeTab === 'my') {
                const myAds = await adsService.getMyAds();
                response = {
                    ads: myAds,
                    total: myAds.length,
                    page: 1,
                    totalPages: 1
                };
            } else {
                response = await adsService.getAds({
                    adType: activeTab,
                    category: selectedCategory === 'all' ? undefined : selectedCategory,
                    search: searchQuery,
                    page: currentPage,
                    limit: 10,
                    status: 'active'
                });
            }

            if (reset) {
                setAds(response.ads);
            } else {
                setAds(prev => [...prev, ...response.ads]);
            }

            setHasMore(currentPage < response.totalPages);
            setPage(currentPage + 1);
        } catch (error) {
            console.error('Failed to load ads', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, selectedCategory, searchQuery]);

    useEffect(() => {
        fetchAds(true);
    }, [fetchAds]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAds(true);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchAds();
        }
    };

    const handleFavorite = async (ad: Ad) => {
        try {
            const result = await adsService.toggleFavorite(ad.ID);
            setAds(prev => prev.map(item =>
                item.ID === ad.ID ? { ...item, isFavorite: result.isFavorite } : item
            ));
        } catch (error) {
            console.error('Error toggling favorite', error);
        }
    };

    return (
        <ProtectedScreen>
            <View style={[styles.container, { backgroundColor: isDarkMode ? vTheme.colors.background : colors.background }]}>
                {/* Search Bar */}
                <View style={[styles.header, { backgroundColor: isDarkMode ? vTheme.colors.background : colors.background }]}>
                    <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? '#333' : '#fff', borderColor: 'rgba(0,0,0,0.1)' }]}>
                        <Search size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                            style={[styles.searchInput, { color: isDarkMode ? '#fff' : colors.text }]}
                            placeholder={t('ads.searchPlaceholder')}
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={() => fetchAds(true)}
                        />
                        {searchQuery !== '' && (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchAds(true); }}>
                                <X size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.filterBtn}
                            onPress={() => navigation.navigate('AdsFilters')}
                        >
                            <SlidersHorizontal size={18} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tab Switcher */}
                <AdTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
                <GodModeStatusBanner />

                {/* Categories */}
                <CategoryPills selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

                {/* Ads List */}
                <FlatList
                    data={ads}
                    keyExtractor={item => item.ID.toString()}
                    renderItem={({ item }) => (
                        <AdCard
                            ad={item}
                            onPress={() => navigation.navigate('AdDetail', { adId: item.ID })}
                            onFavorite={() => handleFavorite(item)}
                            onEdit={() => navigation.navigate('CreateAd', { adId: item.ID })} // In a real app, this would be EditAd
                        />
                    )}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyContainer}>
                                <Inbox size={64} color={colors.textSecondary} opacity={0.3} style={{ marginBottom: 16 }} />
                                <Text style={{ color: colors.textSecondary }}>{t('ads.noAds')}</Text>
                            </View>
                        ) : null
                    }
                    ListFooterComponent={
                        loading && !refreshing ? <ActivityIndicator color={colors.primary} style={{ margin: 20 }} /> : null
                    }
                />

                {/* FAB - Create Ad */}
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.gradientStart }]}
                    onPress={() => navigation.navigate('CreateAd')}
                >
                    <Plus size={32} color="#fff" />
                </TouchableOpacity>
            </View>
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    filterBtn: {
        padding: 8,
        marginLeft: 4,
    },
    list: {
        paddingTop: 8,
        paddingBottom: 80,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    fabText: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: -4,
    },
});
