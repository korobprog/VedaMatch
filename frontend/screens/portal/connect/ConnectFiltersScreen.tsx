import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ConnectEntryLevel, ConnectFeedFilters, ConnectParticipationFormat } from '../../../types/connect';
import type { RootStackParamList } from '../../../types/navigation';
import { CONNECT_ENTRY_LEVEL_OPTIONS, CONNECT_FORMAT_OPTIONS, getConnectEntryLevelLabel, getConnectFormatLabel } from './connectUi';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectFilters'>;

const ConnectFiltersScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const [filters, setFilters] = useState<ConnectFeedFilters>(route.params?.filters || {});

    const categorySuggestions = useMemo(() => ['harinama', 'prasadam', 'transport', 'media', 'festival'], []);

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        navigation.navigate('Portal');
    };

    const toggleEntry = (entryLevel: ConnectEntryLevel) => {
        setFilters((prev) => ({ ...prev, entryLevel: prev.entryLevel === entryLevel ? undefined : entryLevel }));
    };

    const toggleFormat = (format: ConnectParticipationFormat) => {
        setFilters((prev) => ({ ...prev, participationFormat: prev.participationFormat === format ? undefined : format }));
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.iconButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
                >
                    <ArrowLeft size={20} color="#431407" />
                </TouchableOpacity>
            </View>

            <Text style={styles.title}>{t('portal.connect.filters.title', { defaultValue: 'Tune your Connect feed' })}</Text>
            <Text style={styles.subtitle}>
                {t('portal.connect.filters.subtitle', { defaultValue: 'Use simple filters to find the most natural next step for service and community.' })}
            </Text>

            <View style={styles.group}>
                <Text style={styles.label}>{t('portal.connect.filters.city', { defaultValue: 'City' })}</Text>
                <TextInput value={filters.city || ''} onChangeText={(city) => setFilters((prev) => ({ ...prev, city }))} style={styles.input} placeholder="Moscow" />
            </View>

            <View style={styles.group}>
                <Text style={styles.label}>{t('portal.connect.filters.category', { defaultValue: 'Category' })}</Text>
                <TextInput value={filters.category || ''} onChangeText={(category) => setFilters((prev) => ({ ...prev, category }))} style={styles.input} placeholder="prasadam" />
                <View style={styles.rowWrap}>
                    {categorySuggestions.map((item) => (
                        <TouchableOpacity key={item} style={styles.chip} onPress={() => setFilters((prev) => ({ ...prev, category: item }))}>
                            <Text style={styles.chipText}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.group}>
                <Text style={styles.label}>{t('portal.connect.filters.entryLevel', { defaultValue: 'Entry level' })}</Text>
                <View style={styles.rowWrap}>
                    {CONNECT_ENTRY_LEVEL_OPTIONS.map((item) => (
                        <TouchableOpacity
                            key={item}
                            style={[styles.chip, filters.entryLevel === item && styles.chipActive]}
                            onPress={() => toggleEntry(item)}
                        >
                            <Text style={[styles.chipText, filters.entryLevel === item && styles.chipTextActive]}>{getConnectEntryLevelLabel(item, t)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.group}>
                <Text style={styles.label}>{t('portal.connect.filters.format', { defaultValue: 'Participation format' })}</Text>
                <View style={styles.rowWrap}>
                    {CONNECT_FORMAT_OPTIONS.map((item) => (
                        <TouchableOpacity
                            key={item}
                            style={[styles.chip, filters.participationFormat === item && styles.chipActive]}
                            onPress={() => toggleFormat(item)}
                        >
                            <Text style={[styles.chipText, filters.participationFormat === item && styles.chipTextActive]}>{getConnectFormatLabel(item, t)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                    <Text style={styles.label}>{t('portal.connect.filters.newcomerOnly', { defaultValue: 'Newcomer-friendly only' })}</Text>
                    <Text style={styles.note}>{t('portal.connect.filters.newcomerOnlyHint', { defaultValue: 'Prefer softer first steps and friendly teams.' })}</Text>
                </View>
                <View style={styles.switchControl}>
                    <Switch value={Boolean(filters.newcomerOnly)} onValueChange={(value) => setFilters((prev) => ({ ...prev, newcomerOnly: value }))} />
                </View>
            </View>

            <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                    <Text style={styles.label}>{t('portal.connect.filters.nearbyOnly', { defaultValue: 'Nearby only' })}</Text>
                    <Text style={styles.note}>{t('portal.connect.filters.nearbyOnlyHint', { defaultValue: 'Prefer matches in your city first.' })}</Text>
                </View>
                <View style={styles.switchControl}>
                    <Switch value={Boolean(filters.nearbyOnly)} onValueChange={(value) => setFilters((prev) => ({ ...prev, nearbyOnly: value }))} />
                </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.replace('ConnectHome', { filters })}>
                <Text style={styles.primaryButtonText}>{t('portal.connect.filters.apply', { defaultValue: 'Apply filters' })}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7ED' },
    content: { padding: 20, gap: 18, paddingBottom: 36 },
    header: { flexDirection: 'row', alignItems: 'center' },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    title: { fontSize: 28, fontWeight: '800', color: '#7C2D12' },
    subtitle: { color: '#9A3412', lineHeight: 21 },
    group: { gap: 10 },
    label: { fontSize: 16, fontWeight: '700', color: '#431407' },
    note: { color: '#9A3412', marginTop: 4 },
    input: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#FDBA74' },
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#FDBA74' },
    chipActive: { backgroundColor: '#C2410C', borderColor: '#C2410C' },
    chipText: { color: '#7C2D12', fontWeight: '700' },
    chipTextActive: { color: '#FFF7ED' },
    switchRow: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA' },
    switchCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
    switchControl: { flexShrink: 0, alignSelf: 'center' },
    primaryButton: { backgroundColor: '#C2410C', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    primaryButtonText: { color: '#FFF7ED', fontWeight: '800', fontSize: 16 },
});

export default ConnectFiltersScreen;
