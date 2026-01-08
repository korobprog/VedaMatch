import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { RootStackParamList } from '../../../types/navigation';
import { CategoryPills } from '../../../components/ads/CategoryPills';
import { AdCategory } from '../../../types/ads';
import { adsService } from '../../../services/adsService';

export const AdsFiltersScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const colors = vedicTheme.colors;

    const [category, setCategory] = useState<AdCategory | 'all'>('all');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [isFreeOnly, setIsFreeOnly] = useState(false);
    const [city, setCity] = useState('');

    const handleApply = () => {
        // In a real app, we would pass these filters back to the previous screen
        // via Context, Redux, or navigation params.
        // For now, let's assume we just go back and the AdsScreen might refetch 
        // if we persisted these preferences somewhere. 
        // Or simpler: Navigate to Ads with params.

        // However, AdsScreen uses local state. Ideally we should have a Context.
        // Given current architecture in AdsScreen, passing params back is tricky without context.
        // I will just go back for now, assuming this is a visual implementation until Context is refactored.
        navigation.goBack();
    };

    const handleReset = () => {
        setCategory('all');
        setMinPrice('');
        setMaxPrice('');
        setIsFreeOnly(false);
        setCity('');
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ fontSize: 18, color: colors.text }}>✕</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('ads.filters.title')}</Text>
                <TouchableOpacity onPress={handleReset}>
                    <Text style={{ color: colors.primary }}>{t('ads.filters.reset')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Category */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('ads.create.category')}</Text>
                <CategoryPills selectedCategory={category} onSelectCategory={setCategory} />

                {/* City */}
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>{t('ads.filters.city')}</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: '#fff', color: colors.text }]}
                    placeholder={t('ads.filters.city')}
                    value={city}
                    onChangeText={setCity}
                />

                {/* Price */}
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>{t('ads.filters.priceRange')}</Text>
                <View style={styles.row}>
                    <Text style={{ color: colors.text }}>{t('ads.filters.showFreeOnly')}</Text>
                    <Switch
                        value={isFreeOnly}
                        onValueChange={setIsFreeOnly}
                        trackColor={{ false: '#767577', true: colors.primary }}
                    />
                </View>

                {!isFreeOnly && (
                    <View style={styles.priceRow}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>{t('ads.filters.minPrice')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#fff', color: colors.text }]}
                                placeholder="0"
                                keyboardType="numeric"
                                value={minPrice}
                                onChangeText={setMinPrice}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>{t('ads.filters.maxPrice')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#fff', color: colors.text }]}
                                placeholder="∞"
                                keyboardType="numeric"
                                value={maxPrice}
                                onChangeText={setMaxPrice}
                            />
                        </View>
                    </View>
                )}

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={handleApply}>
                    <Text style={styles.applyText}>{t('ads.filters.apply')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
    title: { fontSize: 18, fontWeight: 'bold' },
    content: { padding: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    input: { borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    priceRow: { flexDirection: 'row' },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
    applyBtn: { padding: 16, borderRadius: 30, alignItems: 'center' },
    applyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
