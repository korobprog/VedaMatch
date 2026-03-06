import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { connectService } from '../../../services/connectService';
import type { ConnectMatchProfile } from '../../../types/connect';
import type { RootStackParamList } from '../../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectProfileSetup'>;

const defaultProfile: ConnectMatchProfile = {
    city: '',
    district: '',
    radiusKm: 15,
    interests: [],
    preferredEntryLevels: [],
    participationFormats: [],
    participationModes: [],
    availableTimeLabels: [],
    hasTransport: false,
    quietServicePreferred: false,
    needsMentor: false,
    wantsCompany: false,
    onboardingMode: 'meet_people',
};

const ConnectProfileSetupScreen: React.FC<Props> = ({ navigation }) => {
    const { t } = useTranslation();
    const [profile, setProfile] = useState<ConnectMatchProfile>(defaultProfile);
    const [saving, setSaving] = useState(false);

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        navigation.navigate('Portal');
    };

    useEffect(() => {
        connectService.getProfile()
            .then((data) => {
                if (data) {
                    setProfile({ ...defaultProfile, ...data });
                }
            })
            .catch((error) => console.warn('[ConnectProfileSetup] load failed:', error));
    }, []);

    const save = async () => {
        setSaving(true);
        try {
            const normalized: ConnectMatchProfile = {
                ...profile,
                interests: profile.interests.map((item) => item.trim()).filter(Boolean),
            };
            await connectService.saveProfile(normalized);
            Alert.alert(
                t('portal.connect.profile.savedTitle', { defaultValue: 'Preferences saved' }),
                t('portal.connect.profile.savedBody', { defaultValue: 'Connect will use them for matching.' }),
            );
            navigation.replace('ConnectHome', { filters: { city: normalized.city } });
        } catch (error: any) {
            Alert.alert(
                t('portal.connect.profile.errorTitle', { defaultValue: 'Save failed' }),
                error?.message || t('portal.connect.profile.errorBody', { defaultValue: 'Please try again.' }),
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

            <Text style={styles.title}>{t('portal.connect.profile.title', { defaultValue: 'Shape your Connect profile' })}</Text>
            <Text style={styles.subtitle}>{t('portal.connect.profile.subtitle', { defaultValue: 'Tell Connect how you prefer to join service and community.' })}</Text>

            <TextInput value={profile.city} onChangeText={(city) => setProfile((prev) => ({ ...prev, city }))} style={styles.input} placeholder={t('portal.connect.profile.city', { defaultValue: 'City' })} />
            <TextInput
                value={profile.interests.join(', ')}
                onChangeText={(value) => setProfile((prev) => ({ ...prev, interests: value.split(',') }))}
                style={[styles.input, styles.multiline]}
                multiline
                placeholder={t('portal.connect.profile.interests', { defaultValue: 'Interests: prasadam, kirtan, transport' })}
            />

            <View style={styles.switchRow}>
                <Text style={styles.label}>{t('portal.connect.profile.needsMentor', { defaultValue: 'I want mentor support' })}</Text>
                <Switch value={profile.needsMentor} onValueChange={(needsMentor) => setProfile((prev) => ({ ...prev, needsMentor }))} />
            </View>
            <View style={styles.switchRow}>
                <Text style={styles.label}>{t('portal.connect.profile.wantsCompany', { defaultValue: 'I prefer not to go alone' })}</Text>
                <Switch value={profile.wantsCompany} onValueChange={(wantsCompany) => setProfile((prev) => ({ ...prev, wantsCompany }))} />
            </View>
            <View style={styles.switchRow}>
                <Text style={styles.label}>{t('portal.connect.profile.quiet', { defaultValue: 'I prefer quieter service' })}</Text>
                <Switch value={profile.quietServicePreferred} onValueChange={(quietServicePreferred) => setProfile((prev) => ({ ...prev, quietServicePreferred }))} />
            </View>
            <View style={styles.switchRow}>
                <Text style={styles.label}>{t('portal.connect.profile.transport', { defaultValue: 'I have transport' })}</Text>
                <Switch value={profile.hasTransport} onValueChange={(hasTransport) => setProfile((prev) => ({ ...prev, hasTransport }))} />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={save} disabled={saving}>
                <Text style={styles.primaryButtonText}>{saving ? t('portal.connect.profile.saving', { defaultValue: 'Saving...' }) : t('portal.connect.profile.save', { defaultValue: 'Save preferences' })}</Text>
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
    multiline: { minHeight: 90, textAlignVertical: 'top' },
    switchRow: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA', gap: 12 },
    label: { flex: 1, color: '#431407', fontWeight: '700' },
    primaryButton: { backgroundColor: '#C2410C', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    primaryButtonText: { color: '#FFF7ED', fontWeight: '800' },
});

export default ConnectProfileSetupScreen;
