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
    Dimensions,
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    Settings as SettingsIcon,
} from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { Cafe } from '../../../types/cafe';
import { RootStackParamList } from '../../../types/navigation';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';

const CafeSettingsScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RootStackParamList, 'CafeSettings'>>();
    const { t } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const { cafeId } = route.params;
    const styles = React.useMemo(() => createStyles(colors), [colors]);

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
            <LinearGradient colors={roleTheme.gradient} style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
            </LinearGradient>
        );
    }

    const renderInput = (label: string, value: string, icon: any, field: keyof Cafe, keyboardType: any = 'default') => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputBox}>
                {React.createElement(icon, { size: 18, color: colors.textSecondary, style: styles.innerIcon })}
                <TextInput
                    style={styles.textInput}
                    value={value || ''}
                    onChangeText={(text) => updateField(field, text)}
                    placeholder={label}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType={keyboardType}
                />
            </View>
        </View>
    );

    const renderSwitch = (label: string, value: boolean, icon: any, field: keyof Cafe) => (
        <View style={styles.switchRow}>
            <View style={styles.switchLabelGroup}>
                <View style={styles.switchIconBox}>
                    {React.createElement(icon, { size: 16, color: colors.accent })}
                </View>
                <Text style={styles.switchLabelText}>{label}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={(val) => updateField(field, val)}
                trackColor={{ false: colors.surface, true: colors.accent }}
                thumbColor={Platform.OS === 'ios' ? colors.textPrimary : (value ? colors.textPrimary : colors.textSecondary)}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={roleTheme.gradient} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.header} edges={['top']}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('cafe.dashboard.settings')}</Text>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.disabledBtn]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color={colors.textPrimary} />
                    ) : (
                        <Save size={20} color={colors.textPrimary} strokeWidth={2.5} />
                    )}
                </TouchableOpacity>
            </SafeAreaView>

            <KeyboardAwareContainer style={{ flex: 1 }}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.glassSection}>
                    <View style={styles.sectionHeader}>
                        <SettingsIcon size={18} color={colors.accent} />
                        <Text style={styles.sectionTitle}>{t('cafe.settings.general') || 'General Information'}</Text>
                    </View>
                    {renderInput(t('cafe.settings.name') || 'Cafe Name', cafe.name || '', Coffee, 'name')}
                    {renderInput(t('cafe.settings.address') || 'Address', cafe.address || '', MapPin, 'address')}
                    {renderInput(t('cafe.settings.phone') || 'Phone', cafe.phone || '', Phone, 'phone', 'phone-pad')}
                </View>

                <View style={styles.glassSection}>
                    <View style={styles.sectionHeader}>
                        <Globe size={18} color={colors.accent} />
                        <Text style={styles.sectionTitle}>{t('cafe.settings.social') || 'Social & Web'}</Text>
                    </View>
                    {renderInput(t('cafe.settings.website') || 'Website', cafe.website || '', Globe, 'website', 'url')}
                    {renderInput(t('cafe.settings.instagram') || 'Instagram', cafe.instagram || '', Instagram, 'instagram')}
                    {renderInput(t('cafe.settings.telegram') || 'Telegram', cafe.telegram || '', Send, 'telegram')}
                </View>

                <View style={styles.glassSection}>
                    <View style={styles.sectionHeader}>
                        <Truck size={18} color={colors.accent} />
                        <Text style={styles.sectionTitle}>{t('cafe.settings.serviceOptions') || 'Service Options'}</Text>
                    </View>
                    {renderSwitch(t('cafe.settings.delivery') || 'Delivery', !!cafe.hasDelivery, Truck, 'hasDelivery')}
                    {renderSwitch(t('cafe.settings.takeaway') || 'Takeaway', !!cafe.hasTakeaway, ShoppingBag, 'hasTakeaway')}
                    {renderSwitch(t('cafe.settings.dineIn') || 'Dine-in', !!cafe.hasDineIn, Coffee, 'hasDineIn')}
                </View>

                <View style={styles.glassSection}>
                    <View style={styles.sectionHeader}>
                        <Clock size={18} color={colors.accent} />
                        <Text style={styles.sectionTitle}>{t('cafe.settings.workingHours') || 'Working Hours'}</Text>
                    </View>
                    {renderInput(t('cafe.settings.hours') || 'Hours (e.g. 09:00 - 22:00)', cafe.workingHours || '', Clock, 'workingHours')}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
            </KeyboardAwareContainer>
        </View>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 10,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    saveBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    glassSection: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    sectionTitle: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 54,
        borderWidth: 1,
        borderColor: colors.border,
    },
    innerIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    switchLabelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    switchIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.accentSoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    switchLabelText: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
});

export default CafeSettingsScreen;
