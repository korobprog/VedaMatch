import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { connectService } from '../../../services/connectService';
import type { ConnectEntryLevel, ConnectParticipationFormat } from '../../../types/connect';
import type { RootStackParamList } from '../../../types/navigation';
import { getConnectEntryLevelLabel, getConnectFormatLabel } from './connectUi';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectCreateOpportunity'>;

const ConnectCreateOpportunityScreen: React.FC<Props> = ({ navigation }) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [city, setCity] = useState('');
    const [category, setCategory] = useState('');
    const [entryLevel, setEntryLevel] = useState<ConnectEntryLevel>('intro');
    const [participationFormat, setParticipationFormat] = useState<ConnectParticipationFormat>('offline');
    const [newcomerFriendly, setNewcomerFriendly] = useState(true);
    const [mentorAvailable, setMentorAvailable] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        navigation.navigate('Portal');
    };

    const submit = async () => {
        setSaving(true);
        try {
            await connectService.createOpportunity({
                title,
                description,
                city,
                category,
                entryLevel,
                participationFormat,
                newcomerFriendly,
                mentorAvailable,
                participationModes: newcomerFriendly ? ['social'] : ['organizational'],
            });
            Alert.alert(
                t('portal.connect.create.successTitle', { defaultValue: 'Submitted for moderation' }),
                t('portal.connect.create.successBody', { defaultValue: 'The opportunity will appear in Connect after review.' }),
            );
            navigation.replace('ConnectHome', { filters: city ? { city } : undefined });
        } catch (error: any) {
            Alert.alert(
                t('portal.connect.create.errorTitle', { defaultValue: 'Create failed' }),
                error?.message || t('portal.connect.create.errorBody', { defaultValue: 'Please check the form and try again.' }),
            );
        } finally {
            setSaving(false);
        }
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

            <Text style={styles.title}>{t('portal.connect.create.title', { defaultValue: 'Add a Connect opportunity' })}</Text>
            <Text style={styles.subtitle}>{t('portal.connect.create.subtitle', { defaultValue: 'Use this for real service opportunities, not generic announcements.' })}</Text>

            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder={t('portal.connect.create.titleField', { defaultValue: 'Title' })} />
            <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder={t('portal.connect.create.cityField', { defaultValue: 'City' })} />
            <TextInput value={category} onChangeText={setCategory} style={styles.input} placeholder={t('portal.connect.create.categoryField', { defaultValue: 'Category' })} />
            <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.multiline]} multiline placeholder={t('portal.connect.create.descriptionField', { defaultValue: 'What should people expect?' })} />

            <View style={styles.selectionRow}>
                <TouchableOpacity style={styles.option} onPress={() => setEntryLevel('intro')}>
                    <Text style={[styles.optionText, entryLevel === 'intro' && styles.optionTextActive]}>{getConnectEntryLevelLabel('intro', t)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.option} onPress={() => setEntryLevel('regular')}>
                    <Text style={[styles.optionText, entryLevel === 'regular' && styles.optionTextActive]}>{getConnectEntryLevelLabel('regular', t)}</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.selectionRow}>
                <TouchableOpacity style={styles.option} onPress={() => setParticipationFormat('offline')}>
                    <Text style={[styles.optionText, participationFormat === 'offline' && styles.optionTextActive]}>{getConnectFormatLabel('offline', t)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.option} onPress={() => setParticipationFormat('online')}>
                    <Text style={[styles.optionText, participationFormat === 'online' && styles.optionTextActive]}>{getConnectFormatLabel('online', t)}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
                <Text style={styles.label}>{t('portal.connect.create.newcomerFriendly', { defaultValue: 'Friendly for newcomers' })}</Text>
                <Switch value={newcomerFriendly} onValueChange={setNewcomerFriendly} />
            </View>
            <View style={styles.switchRow}>
                <Text style={styles.label}>{t('portal.connect.create.mentorAvailable', { defaultValue: 'Mentor/support person available' })}</Text>
                <Switch value={mentorAvailable} onValueChange={setMentorAvailable} />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={saving}>
                <Text style={styles.primaryButtonText}>{saving ? t('portal.connect.create.saving', { defaultValue: 'Submitting...' }) : t('portal.connect.create.submit', { defaultValue: 'Submit for moderation' })}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7ED' },
    content: { padding: 20, gap: 16, paddingBottom: 36 },
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
    input: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#FDBA74' },
    multiline: { minHeight: 100, textAlignVertical: 'top' },
    selectionRow: { flexDirection: 'row', gap: 10 },
    option: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#FDBA74' },
    optionText: { textAlign: 'center', color: '#7C2D12', fontWeight: '700' },
    optionTextActive: { color: '#C2410C' },
    switchRow: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#FED7AA' },
    label: { flex: 1, color: '#431407', fontWeight: '700' },
    primaryButton: { backgroundColor: '#C2410C', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    primaryButtonText: { color: '#FFF7ED', fontWeight: '800' },
});

export default ConnectCreateOpportunityScreen;
