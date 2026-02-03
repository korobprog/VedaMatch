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
import { Check, Clock, RotateCcw, Star } from 'lucide-react-native';
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
                        style={[
                            styles.tariffCard,
                            isSelected && styles.tariffCardSelected,
                            tariff.isDefault && styles.tariffCardDefault,
                        ]}
                        onPress={() => onSelect(tariff)}
                    >
                        {/* Popular Badge */}
                        {tariff.isDefault && (
                            <View style={styles.popularBadge}>
                                <Star size={10} color="#1a1a2e" />
                                <Text style={styles.popularText}>Популярный</Text>
                            </View>
                        )}

                        {/* Selection indicator */}
                        {isSelected && (
                            <View style={styles.selectedIndicator}>
                                <Check size={16} color="#1a1a2e" />
                            </View>
                        )}

                        {/* Tariff Name */}
                        <Text style={[
                            styles.tariffName,
                            isSelected && styles.tariffNameSelected,
                        ]}>
                            {tariff.name}
                        </Text>

                        {/* Price */}
                        <Text style={[
                            styles.tariffPrice,
                            isSelected && styles.tariffPriceSelected,
                        ]}>
                            {formatBalance(tariff.price)}
                        </Text>

                        {/* Duration */}
                        {tariff.durationMinutes > 0 && (
                            <View style={styles.infoRow}>
                                <Clock size={12} color={isSelected ? '#1a1a2e' : 'rgba(255,255,255,0.6)'} />
                                <Text style={[
                                    styles.infoText,
                                    isSelected && styles.infoTextSelected,
                                ]}>
                                    {tariff.durationMinutes} мин
                                </Text>
                            </View>
                        )}

                        {/* Sessions count */}
                        {tariff.sessionsCount > 1 && (
                            <View style={styles.infoRow}>
                                <RotateCcw size={12} color={isSelected ? '#1a1a2e' : 'rgba(255,255,255,0.6)'} />
                                <Text style={[
                                    styles.infoText,
                                    isSelected && styles.infoTextSelected,
                                ]}>
                                    {tariff.sessionsCount} сессий
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
        gap: 12,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
    },
    tariffCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
        minWidth: 140,
        marginRight: 12,
        position: 'relative',
    },
    tariffCardSelected: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
    },
    tariffCardDefault: {
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.4)',
    },
    popularBadge: {
        position: 'absolute',
        top: -8,
        left: 12,
        right: 12,
        backgroundColor: '#FFD700',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 10,
        gap: 4,
    },
    popularText: {
        color: '#1a1a2e',
        fontSize: 10,
        fontWeight: '700',
    },
    selectedIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tariffName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 4,
    },
    tariffNameSelected: {
        color: '#1a1a2e',
    },
    tariffPrice: {
        color: '#FFD700',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    tariffPriceSelected: {
        color: '#1a1a2e',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    infoText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
    },
    infoTextSelected: {
        color: 'rgba(0, 0, 0, 0.6)',
    },
});
