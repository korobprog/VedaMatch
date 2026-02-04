/**
 * TariffSelector - Компонент выбора тарифа
 */
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Check, Clock, RotateCcw, Star, Sparkles } from 'lucide-react-native';
import { ServiceTariff } from '../../../../services/serviceService';
import { formatBalance } from '../../../../services/walletService';

interface TariffSelectorProps {
    tariffs: ServiceTariff[];
    selectedTariffId: number | null;
    onSelect: (tariff: ServiceTariff) => void;
}

export default function TariffSelector({
    tariffs,
    selectedTariffId,
    onSelect,
}: TariffSelectorProps) {
    if (!tariffs || tariffs.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Тарифы не настроены</Text>
            </View>
        );
    }

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {tariffs.map((tariff) => {
                const isSelected = selectedTariffId === tariff.id;

                return (
                    <TouchableOpacity
                        key={tariff.id}
                        activeOpacity={0.9}
                        style={[
                            styles.tariffCard,
                            isSelected && styles.tariffCardSelected,
                        ]}
                        onPress={() => onSelect(tariff)}
                    >
                        {/* Popular Badge */}
                        {tariff.isDefault && (
                            <View style={styles.featuredBadge}>
                                <Sparkles size={10} color="#000" />
                                <Text style={styles.featuredText}>ПОПУЛЯРНО</Text>
                            </View>
                        )}

                        {/* Selection status */}
                        <View style={[styles.selectionCircle, isSelected && styles.selectionCircleSelected]}>
                            {isSelected && <Check size={12} color="#000" />}
                        </View>

                        <Text style={[styles.tariffName, isSelected && styles.tariffNameSelected]}>
                            {tariff.name}
                        </Text>

                        <Text style={[styles.tariffPrice, isSelected && styles.tariffPriceSelected]}>
                            {tariff.price} ₵
                        </Text>

                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <Clock size={12} color={isSelected ? 'rgba(0,0,0,0.5)' : '#F59E0B'} />
                                <Text style={[styles.metaText, isSelected && styles.metaTextSelected]}>
                                    {tariff.durationMinutes} мин
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 4,
        gap: 16,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 24,
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 14,
        fontWeight: '600',
    },
    tariffCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 24,
        padding: 24,
        minWidth: 160,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        position: 'relative',
    },
    tariffCardSelected: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    featuredBadge: {
        position: 'absolute',
        top: -10,
        left: 20,
        backgroundColor: '#F59E0B',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
        borderWidth: 2,
        borderColor: '#0a0a14',
    },
    featuredText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '900',
    },
    selectionCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignSelf: 'flex-end',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    selectionCircleSelected: {
        borderColor: '#000',
        backgroundColor: '#fff',
    },
    tariffName: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    tariffNameSelected: {
        color: 'rgba(0, 0, 0, 0.6)',
    },
    tariffPrice: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 16,
    },
    tariffPriceSelected: {
        color: '#000',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    metaTextSelected: {
        color: '#000',
    },
});
