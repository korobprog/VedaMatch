import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Switch,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Save,
    MapPin,
    Phone,
    Globe,
    Instagram,
    Send,
    Clock,
    Truck,
    ShoppingBag,
    Coffee,
} from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { Cafe } from '../../../types/cafe';
import { RootStackParamList } from '../../../types/navigation';

const CafeSettingsScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RootStackParamList, 'CafeSettings'>>();
    const { t } = useTranslation();
    const { cafeId } = route.params;

    const [cafe, setCafe] = useState<Partial<Cafe>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadCafe();
    }, [cafeId]);

    const loadCafe = async () => {
        try {
            setLoading(true);
            const data = await cafeService.getCafeById(cafeId);
            setCafe(data);
        } catch (error) {
            console.error('Error loading cafe:', error);
            Alert.alert(t('common.error'), t('cafe.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await cafeService.updateCafe(cafeId, cafe);
            Alert.alert(t('common.success'), t('cafe.settings.saveSuccess'));
        } catch (error) {
            console.error('Error saving settings:', error);
            Alert.alert(t('common.error'), t('cafe.settings.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof Cafe, value: any) => {
        setCafe(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    const renderInput = (label: string, value: string, icon: any, field: keyof Cafe, keyboardType: any = 'default') => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputContainer}>
                {React.createElement(icon, { size: 20, color: '#8E8E93' })}
                <TextInput
                    style={styles.input}
                    value={value || ''}
                    onChangeText={(text) => updateField(field, text)}
                    placeholder={label}
                    placeholderTextColor="#3A3A3C"
                    keyboardType={keyboardType}
                />
            </View>
        </View>
    );

    const renderSwitch = (label: string, value: boolean, icon: any, field: keyof Cafe) => (
        <View style={styles.switchRow}>
            <View style={styles.switchLabelGroup}>
                {React.createElement(icon, { size: 20, color: '#8E8E93' })}
                <Text style={styles.switchLabelText}>{label}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={(val) => updateField(field, val)}
                trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                thumbColor="#FFFFFF"
            />
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('cafe.dashboard.settings')}</Text>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Save size={24} color="#FFFFFF" />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.settings.general') || 'General Information'}</Text>
                    {renderInput(t('cafe.settings.name') || 'Cafe Name', cafe.name || '', Coffee, 'name')}
                    {renderInput(t('cafe.settings.address') || 'Address', cafe.address || '', MapPin, 'address')}
                    {renderInput(t('cafe.settings.phone') || 'Phone', cafe.phone || '', Phone, 'phone', 'phone-pad')}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.settings.social') || 'Social & Web'}</Text>
                    {renderInput(t('cafe.settings.website') || 'Website', cafe.website || '', Globe, 'website', 'url')}
                    {renderInput(t('cafe.settings.instagram') || 'Instagram', cafe.instagram || '', Instagram, 'instagram')}
                    {renderInput(t('cafe.settings.telegram') || 'Telegram', cafe.telegram || '', Send, 'telegram')}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.settings.serviceOptions') || 'Service Options'}</Text>
                    {renderSwitch(t('cafe.settings.delivery') || 'Delivery', !!cafe.hasDelivery, Truck, 'hasDelivery')}
                    {renderSwitch(t('cafe.settings.takeaway') || 'Takeaway', !!cafe.hasTakeaway, ShoppingBag, 'hasTakeaway')}
                    {renderSwitch(t('cafe.settings.dineIn') || 'Dine-in', !!cafe.hasDineIn, Coffee, 'hasDineIn')}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.settings.workingHours') || 'Working Hours'}</Text>
                    {renderInput(t('cafe.settings.hours') || 'Hours (e.g. 09:00 - 22:00)', cafe.workingHours || '', Clock, 'workingHours')}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D0D0D',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0D0D0D',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 48,
        paddingBottom: 20,
        paddingHorizontal: 16,
        backgroundColor: '#1C1C1E',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    saveButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#34C759',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    section: {
        padding: 16,
        backgroundColor: '#1C1C1E',
        marginVertical: 8,
    },
    sectionTitle: {
        color: '#8E8E93',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        color: '#8E8E93',
        fontSize: 12,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        marginLeft: 10,
        fontSize: 16,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    switchLabelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    switchLabelText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
});

export default CafeSettingsScreen;
