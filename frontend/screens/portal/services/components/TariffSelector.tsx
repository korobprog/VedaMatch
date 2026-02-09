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
import { Check, Clock, Sparkles } from 'lucide-react-native';
import { ServiceTariff } from '../../../../services/serviceService';
import { useUser } from '../../../../context/UserContext';
import { useSettings } from '../../../../context/SettingsContext';
import { useRoleTheme } from '../../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../../theme/semanticTokens';

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
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

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
                                <Sparkles size={10} color={colors.textPrimary} />
                                <Text style={styles.featuredText}>ПОПУЛЯРНО</Text>
                            </View>
                        )}

                        {/* Selection status */}
                        <View style={[styles.selectionCircle, isSelected && styles.selectionCircleSelected]}>
                            {isSelected && <Check size={12} color={colors.textPrimary} />}
                        </View>

                        <Text style={[styles.tariffName, isSelected && styles.tariffNameSelected]}>
                            {tariff.name}
                        </Text>

                        <Text style={[styles.tariffPrice, isSelected && styles.tariffPriceSelected]}>
                            {tariff.price} ₵
                        </Text>

                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <Clock size={12} color={isSelected ? colors.textPrimary : colors.accent} />
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

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 4,
        gap: 16,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 24,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    tariffCard: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 24,
        minWidth: 160,
        borderWidth: 1,
        borderColor: colors.border,
        position: 'relative',
    },
    tariffCardSelected: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    featuredBadge: {
        position: 'absolute',
        top: -10,
        left: 20,
        backgroundColor: colors.accent,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
        borderWidth: 2,
        borderColor: colors.background,
    },
    featuredText: {
        color: colors.textPrimary,
        fontSize: 10,
        fontWeight: '900',
    },
    selectionCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        alignSelf: 'flex-end',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    selectionCircleSelected: {
        borderColor: colors.textPrimary,
        backgroundColor: colors.textPrimary,
    },
    tariffName: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    tariffNameSelected: {
        color: colors.textPrimary,
    },
    tariffPrice: {
        color: colors.textPrimary,
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 16,
    },
    tariffPriceSelected: {
        color: colors.textPrimary,
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
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    metaTextSelected: {
        color: colors.textPrimary,
    },
});
