import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Camera,
    Save,
    ChevronDown,
    Plus,
    Trash2,
    Video,
    MapPin,
    Globe,
    Star,
    Brain,
    Target,
    Infinity as InfinityIcon,
    Flame,
    BookOpen,
    Leaf,
    Sparkles,
} from 'lucide-react-native';
import {
    Service,
    ServiceCategory,
    ServiceChannel,
    ServiceAccessType,
    CreateServiceRequest,
    CreateTariffRequest,
    CATEGORY_LABELS,
    CATEGORY_ICON_NAMES,
    CHANNEL_LABELS,
    ACCESS_LABELS,
    createService,
    updateService,
    getServiceById,
    addTariff,
    uploadServicePhoto,
} from '../../../services/serviceService';
import { launchImageLibrary } from 'react-native-image-picker';
import { useUser } from '../../../context/UserContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useSettings } from '../../../context/SettingsContext';
import { RootStackParamList } from '../../../types/navigation';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';

const CategoryIcon = ({ name, color, size }: { name: string, color: string, size: number }) => {
    switch (name) {
        case 'Star': return <Star size={size} color={color} />;
        case 'Brain': return <Brain size={size} color={color} />;
        case 'Target': return <Target size={size} color={color} />;
        case 'Infinity': return <InfinityIcon size={size} color={color} />;
        case 'Flame': return <Flame size={size} color={color} />;
        case 'BookOpen': return <BookOpen size={size} color={color} />;
        case 'Leaf': return <Leaf size={size} color={color} />;
        case 'Sparkles': return <Sparkles size={size} color={color} />;
        default: return <Sparkles size={size} color={color} />;
    }
};

interface TariffForm {
    name: string;
    price: string;
    durationMinutes: string;
    sessionsCount: string;
    isDefault: boolean;
}

const CATEGORIES: ServiceCategory[] = ['astrology', 'psychology', 'coaching', 'spirituality', 'yagya', 'education', 'health', 'other'];
const CHANNELS: ServiceChannel[] = ['video', 'zoom', 'youtube', 'telegram', 'offline', 'file'];
const ACCESS_TYPES: ServiceAccessType[] = ['paid', 'free', 'subscription', 'invite'];

const toPositiveInt = (value: string, fallback: number): number => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
};

export default function CreateServiceScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RouteProp<RootStackParamList, 'CreateService'>>();
    const { t } = useTranslation();
    const serviceId = route.params?.serviceId;
    const isEditing = !!serviceId;
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>();
    const [category, setCategory] = useState<ServiceCategory>('astrology');
    const [channel, setChannel] = useState<ServiceChannel>('video');
    const [accessType, setAccessType] = useState<ServiceAccessType>('paid');
    const [channelLink, setChannelLink] = useState('');
    const [offlineAddress, setOfflineAddress] = useState('');

    // Tariffs
    const [tariffs, setTariffs] = useState<TariffForm[]>([
        { name: t('portal.createService.tariffs.defaultName'), price: '500', durationMinutes: '60', sessionsCount: '1', isDefault: true },
    ]);

    // Dropdown states
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showChannelPicker, setShowChannelPicker] = useState(false);
    const [showAccessPicker, setShowAccessPicker] = useState(false);
    const latestLoadRequestRef = useRef(0);
    const latestSaveRequestRef = useRef(0);
    const isMountedRef = useRef(true);

    // Load existing service for editing
    const loadService = useCallback(async () => {
        const requestId = ++latestLoadRequestRef.current;
        if (!serviceId) return;
        if (isMountedRef.current) {
            setLoading(true);
        }
        try {
            const service = await getServiceById(serviceId);
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            setTitle(service.title);
            setDescription(service.description);
            setCoverImageUrl(service.coverImageUrl);
            setCategory(service.category);
            setChannel(service.channel);
            setAccessType(service.accessType);
            setChannelLink(service.channelLink || '');
            setOfflineAddress(service.offlineAddress || '');

            if (service.tariffs && service.tariffs.length > 0) {
                setTariffs(service.tariffs.map((tariffItem) => ({
                    name: String(tariffItem.name || ''),
                    price: String(tariffItem.price ?? 0),
                    durationMinutes: String(tariffItem.durationMinutes ?? 60),
                    sessionsCount: String(tariffItem.sessionsCount ?? 1),
                    isDefault: Boolean(tariffItem.isDefault),
                })));
            }
        } catch (error) {
            console.error('Failed to load service:', error);
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                Alert.alert(t('common.error'), t('portal.createService.alerts.loadFailed'));
                navigation.goBack();
            }
        } finally {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [navigation, serviceId, t]);

    useEffect(() => {
        if (serviceId) {
            loadService();
        }
    }, [loadService, serviceId]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
            latestSaveRequestRef.current += 1;
        };
    }, []);

    const handlePickImage = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1200,
                maxHeight: 800,
            });

            if (result.assets && result.assets[0]?.uri) {
                setCoverImageUrl(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Image picker error:', error);
        }
    };

    const handleAddTariff = () => {
        let hitLimit = false;
        setTariffs((prev) => {
            if (prev.length >= 5) {
                hitLimit = true;
                return prev;
            }
            return [...prev, {
                name: t('portal.createService.tariffs.newTariffName', { index: prev.length + 1 }),
                price: '1000',
                durationMinutes: '60',
                sessionsCount: '1',
                isDefault: false,
            }];
        });
        if (hitLimit) {
            Alert.alert(t('portal.createService.alerts.limitTitle'), t('portal.createService.alerts.maxTariffs'));
        }
    };

    const handleRemoveTariff = (index: number) => {
        let canRemove = true;
        setTariffs((prev) => {
            if (prev.length <= 1) {
                canRemove = false;
                return prev;
            }

            const next = prev.filter((_, i) => i !== index).map((tariff) => ({ ...tariff }));
            if (!next.some((tariff) => tariff.isDefault) && next[0]) {
                next[0].isDefault = true;
            }
            return next;
        });
        if (!canRemove) {
            Alert.alert(t('common.error'), t('portal.createService.alerts.needOneTariff'));
        }
    };

    const handleTariffChange = (index: number, field: keyof TariffForm, value: string | boolean) => {
        setTariffs((prev) => prev.map((tariff, i) => {
            if (field === 'isDefault' && value === true) {
                if (i === index) {
                    return { ...tariff, isDefault: true };
                }
                return { ...tariff, isDefault: false };
            }

            if (i !== index) {
                return tariff;
            }

            if (field === 'isDefault') {
                return { ...tariff, isDefault: Boolean(value) };
            }

            return { ...tariff, [field]: String(value) } as TariffForm;
        }));
    };

    const validateForm = (): boolean => {
        if (!title.trim()) {
            Alert.alert(t('common.error'), t('portal.createService.alerts.enterTitle'));
            return false;
        }
        if (!description.trim()) {
            Alert.alert(t('common.error'), t('portal.createService.alerts.enterDescription'));
            return false;
        }
        if (channel === 'offline' && !offlineAddress.trim()) {
            Alert.alert(t('common.error'), t('portal.createService.alerts.enterAddress'));
            return false;
        }
        if ((channel === 'zoom' || channel === 'youtube' || channel === 'telegram') && !channelLink.trim()) {
            Alert.alert(t('common.error'), t('portal.createService.alerts.enterChannelLink'));
            return false;
        }
        for (let i = 0; i < tariffs.length; i += 1) {
            const tariff = tariffs[i];
            if (!tariff.name.trim()) {
                Alert.alert(t('common.error'), t('portal.createService.alerts.enterTariffName', { index: i + 1 }));
                return false;
            }
            if (accessType !== 'free' && toPositiveInt(tariff.price, 0) <= 0) {
                Alert.alert(t('common.error'), t('portal.createService.alerts.enterTariffPrice', { index: i + 1 }));
                return false;
            }
            if (toPositiveInt(tariff.durationMinutes, 0) <= 0) {
                Alert.alert(t('common.error'), t('portal.createService.alerts.enterTariffDuration', { index: i + 1 }));
                return false;
            }
            if (toPositiveInt(tariff.sessionsCount, 0) <= 0) {
                Alert.alert(t('common.error'), t('portal.createService.alerts.enterTariffSessions', { index: i + 1 }));
                return false;
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (saving || loading) return;
        if (!validateForm()) return;
        const requestId = ++latestSaveRequestRef.current;

        if (isMountedRef.current) {
            setSaving(true);
        }
        try {
            let finalCoverUrl = coverImageUrl;

            // If we have a local URI, upload it first
            if (coverImageUrl && !coverImageUrl.startsWith('http')) {
                try {
                    finalCoverUrl = await uploadServicePhoto(coverImageUrl);
                } catch (uploadErr) {
                    console.error('Photo upload failed:', uploadErr);
                    // Continue without photo or notify user? For now, we'll try to proceed
                }
            }

            const serviceData: CreateServiceRequest = {
                title: title.trim(),
                description: description.trim(),
                coverImageUrl: finalCoverUrl,
                category,
                channel,
                accessType,
                channelLink: channelLink.trim() || undefined,
                offlineAddress: channel === 'offline' ? offlineAddress.trim() : undefined,
                formats: JSON.stringify(['individual']),
                scheduleType: 'booking',
            };

            let savedService: Service;

            if (isEditing && serviceId) {
                savedService = await updateService(serviceId, serviceData);
            } else {
                savedService = await createService(serviceData);
                for (const tariff of tariffs) {
                    const tariffData: CreateTariffRequest = {
                        name: tariff.name.trim(),
                        price: accessType === 'free' ? 0 : toPositiveInt(tariff.price, 0),
                        durationMinutes: toPositiveInt(tariff.durationMinutes, 60),
                        sessionsCount: toPositiveInt(tariff.sessionsCount, 1),
                        isDefault: tariff.isDefault,
                    };
                    await addTariff(savedService.id, tariffData);
                }
            }
            if (requestId !== latestSaveRequestRef.current || !isMountedRef.current) {
                return;
            }

            Alert.alert(
                isEditing ? t('portal.createService.alerts.savedTitle') : t('portal.createService.alerts.createdTitle'),
                isEditing ? t('portal.createService.alerts.savedText') : t('portal.createService.alerts.createdText'),
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: unknown) {
            if (requestId !== latestSaveRequestRef.current || !isMountedRef.current) {
                return;
            }
            const message = error instanceof Error ? error.message : t('portal.createService.alerts.saveFailed');
            Alert.alert(t('common.error'), message);
        } finally {
            if (requestId === latestSaveRequestRef.current && isMountedRef.current) {
                setSaving(false);
            }
        }
    };

    return (
        <LinearGradient colors={roleTheme.gradient} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Fixed Premium Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerCircleButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>
                            {isEditing ? t('portal.createService.header.editTitle') : t('portal.createService.header.createTitle')}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            {isEditing ? t('portal.createService.header.editSubtitle') : t('portal.createService.header.createSubtitle')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.saveButton, (saving || loading) && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving || loading}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color={colors.textPrimary} />
                        ) : (
                            <Save size={20} color={colors.textPrimary} />
                        )}
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={colors.accent} />
                    </View>
                ) : (
                    <KeyboardAwareContainer
                        style={styles.content}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Immersive Cover Section */}
                            <TouchableOpacity style={styles.coverSection} onPress={handlePickImage} activeOpacity={0.9}>
                                {coverImageUrl ? (
                                    <View style={styles.imageWrapper}>
                                        <Image source={{ uri: coverImageUrl }} style={styles.coverImage} />
                                        <LinearGradient
                                            colors={['transparent', 'rgba(10, 10, 20, 0.4)']}
                                            style={styles.imageOverlay}
                                        >
                                            <View style={styles.cameraCircleSmall}>
                                                <Camera size={20} color={colors.accent} />
                                            </View>
                                        </LinearGradient>
                                    </View>
                                ) : (
                                    <View style={styles.coverPlaceholder}>
                                        <LinearGradient
                                            colors={['rgba(245, 158, 11, 0.1)', 'transparent']}
                                            style={styles.coverPlaceholderGradient}
                                        />
                                        <View style={styles.cameraCircle}>
                                            <Camera size={28} color={colors.accent} />
                                        </View>
                                        <Text style={styles.coverPlaceholderText}>{t('portal.createService.cover.addCover')}</Text>
                                        <Text style={styles.coverPlaceholderSubtext}>{t('portal.createService.cover.recommended')}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Main Form Mastery */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeaderRow}>
                                    <View style={styles.headingIndicator} />
                                    <Text style={styles.formSectionTitle}>{t('portal.createService.sections.mainInfo')}</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('portal.createService.fields.serviceTitle')}</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder={t('portal.createService.placeholders.serviceTitle')}
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('portal.createService.fields.description')}</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder={t('portal.createService.placeholders.description')}
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                        multiline
                                        numberOfLines={4}
                                    />
                                </View>

                                {/* Sophisticated Pickers */}
                                <View style={styles.pickerRow}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>{t('portal.createService.fields.category')}</Text>
                                        <TouchableOpacity
                                            style={styles.glassPicker}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                setShowCategoryPicker(!showCategoryPicker);
                                                setShowChannelPicker(false);
                                                setShowAccessPicker(false);
                                            }}
                                        >
                                            <View style={styles.pickerIconCircle}>
                                                <CategoryIcon name={CATEGORY_ICON_NAMES[category]} size={14} color={colors.accent} />
                                            </View>
                                            <Text style={styles.pickerText}>{t(`portal.servicesHome.categories.${category}`, { defaultValue: CATEGORY_LABELS[category] })}</Text>
                                            <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {showCategoryPicker && (
                                    <View style={styles.pickerFlyout}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {CATEGORIES.map((cat) => (
                                                <TouchableOpacity
                                                    key={cat}
                                                    style={[styles.pickerItem, category === cat && styles.pickerItemActive]}
                                                    onPress={() => {
                                                        setCategory(cat);
                                                        setShowCategoryPicker(false);
                                                    }}
                                                >
                                                    <CategoryIcon name={CATEGORY_ICON_NAMES[cat]} size={16} color={category === cat ? colors.textPrimary : colors.accent} />
                                                    <Text style={[styles.pickerItemText, category === cat && styles.pickerItemTextActive]}>
                                                        {t(`portal.servicesHome.categories.${cat}`, { defaultValue: CATEGORY_LABELS[cat] })}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                <View style={styles.pickerRow}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>{t('portal.createService.fields.channel')}</Text>
                                        <TouchableOpacity
                                            style={styles.glassPicker}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                setShowChannelPicker(!showChannelPicker);
                                                setShowCategoryPicker(false);
                                                setShowAccessPicker(false);
                                            }}
                                        >
                                            <View style={styles.pickerIconCircle}>
                                                {channel === 'offline' ? <MapPin size={14} color={colors.accent} /> : <Video size={14} color={colors.accent} />}
                                            </View>
                                            <Text style={styles.pickerText}>{t(`portal.serviceDetail.channels.${channel}`, { defaultValue: CHANNEL_LABELS[channel] })}</Text>
                                            <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>{t('portal.createService.fields.accessType')}</Text>
                                        <TouchableOpacity
                                            style={styles.glassPicker}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                setShowAccessPicker(!showAccessPicker);
                                                setShowCategoryPicker(false);
                                                setShowChannelPicker(false);
                                            }}
                                        >
                                            <View style={styles.pickerIconCircle}>
                                                <Globe size={14} color={colors.accent} />
                                            </View>
                                            <Text style={styles.pickerText}>{t(`portal.createService.accessTypes.${accessType}`, { defaultValue: ACCESS_LABELS[accessType] })}</Text>
                                            <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {showChannelPicker && (
                                    <View style={styles.pickerFlyout}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {CHANNELS.map((ch) => (
                                                <TouchableOpacity
                                                    key={ch}
                                                    style={[styles.pickerItem, channel === ch && styles.pickerItemActive]}
                                                    onPress={() => {
                                                        setChannel(ch);
                                                        setShowChannelPicker(false);
                                                    }}
                                                >
                                                    <Text style={[styles.pickerItemText, channel === ch && styles.pickerItemTextActive]}>
                                                        {t(`portal.serviceDetail.channels.${ch}`, { defaultValue: CHANNEL_LABELS[ch] })}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {showAccessPicker && (
                                    <View style={styles.pickerFlyout}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {ACCESS_TYPES.map((at) => (
                                                <TouchableOpacity
                                                    key={at}
                                                    style={[styles.pickerItem, accessType === at && styles.pickerItemActive]}
                                                    onPress={() => {
                                                        setAccessType(at);
                                                        setShowAccessPicker(false);
                                                    }}
                                                >
                                                    <Text style={[styles.pickerItemText, accessType === at && styles.pickerItemTextActive]}>
                                                        {t(`portal.createService.accessTypes.${at}`, { defaultValue: ACCESS_LABELS[at] })}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {(channel === 'zoom' || channel === 'youtube' || channel === 'telegram') && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('portal.createService.fields.channelLink')}</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={channelLink}
                                            onChangeText={setChannelLink}
                                            placeholder="https://..."
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                        />
                                    </View>
                                )}

                                {channel === 'offline' && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('portal.createService.fields.offlineAddress')}</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={offlineAddress}
                                            onChangeText={setOfflineAddress}
                                            placeholder={t('portal.createService.placeholders.offlineAddress')}
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Tariffs Masterclass */}
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionHeaderRow}>
                                    <View style={styles.headingIndicator} />
                                    <Text style={styles.formSectionTitle}>{t('portal.createService.sections.tariffs')}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.addTariffButton}
                                    onPress={handleAddTariff}
                                    activeOpacity={0.7}
                                >
                                    <Plus size={14} color={colors.accent} />
                                    <Text style={styles.addTariffText}>{t('common.add')}</Text>
                                </TouchableOpacity>
                            </View>

                            {tariffs.map((tariff, index) => (
                                <View key={index} style={styles.tariffCard}>
                                    <View style={styles.tariffHeader}>
                                        <TouchableOpacity
                                            style={[styles.customRadio, tariff.isDefault && styles.customRadioActive]}
                                            onPress={() => handleTariffChange(index, 'isDefault', true)}
                                        >
                                            {tariff.isDefault && <View style={styles.customRadioDot} />}
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.tariffTitleInput}
                                            value={tariff.name}
                                            onChangeText={(v) => handleTariffChange(index, 'name', v)}
                                            placeholder={t('portal.createService.placeholders.tariffName')}
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                        />
                                        {tariffs.length > 1 && (
                                            <TouchableOpacity
                                                style={styles.removeTariffButton}
                                                onPress={() => handleRemoveTariff(index)}
                                            >
                                                <Trash2 size={16} color="rgba(244, 67, 54, 0.4)" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View style={styles.tariffParameters}>
                                        <View style={styles.paramItem}>
                                            <Text style={styles.paramLabel}>{t('portal.createService.tariffs.priceLabel')}</Text>
                                            <TextInput
                                                style={styles.paramInput}
                                                value={tariff.price}
                                                onChangeText={(v) => handleTariffChange(index, 'price', v.replace(/[^0-9]/g, ''))}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={styles.paramDivider} />
                                        <View style={styles.paramItem}>
                                            <Text style={styles.paramLabel}>{t('portal.createService.tariffs.durationLabel')}</Text>
                                            <TextInput
                                                style={styles.paramInput}
                                                value={tariff.durationMinutes}
                                                onChangeText={(v) => handleTariffChange(index, 'durationMinutes', v.replace(/[^0-9]/g, ''))}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={styles.paramDivider} />
                                        <View style={styles.paramItem}>
                                            <Text style={styles.paramLabel}>{t('portal.createService.tariffs.sessionsLabel')}</Text>
                                            <TextInput
                                                style={styles.paramInput}
                                                value={tariff.sessionsCount}
                                                onChangeText={(v) => handleTariffChange(index, 'sessionsCount', v.replace(/[^0-9]/g, ''))}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))}

                            <View style={{ height: 60 }} />
                        </ScrollView>
                    </KeyboardAwareContainer>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: 'rgba(255,255,255,1)',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
        textAlign: 'center',
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    headerCircleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    saveButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(245,158,11,1)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'rgba(245,158,11,1)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    coverSection: {
        width: '100%',
        height: 220,
        borderRadius: 32,
        overflow: 'hidden',
        marginBottom: 40,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraCircleSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    coverPlaceholder: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: 'rgba(245, 158, 11, 0.2)',
        borderRadius: 32,
    },
    coverPlaceholderGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    cameraCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.1)',
    },
    coverPlaceholderText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 15,
        fontWeight: '800',
    },
    coverPlaceholderSubtext: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        marginTop: 4,
        fontWeight: '600',
    },
    formSection: {
        marginBottom: 40,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    headingIndicator: {
        width: 4,
        height: 14,
        backgroundColor: 'rgba(245,158,11,1)',
        borderRadius: 2,
    },
    formSectionTitle: {
        color: 'rgba(255,255,255,1)',
        fontSize: 16,
        fontFamily: 'Cinzel-Bold',
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        color: 'rgba(255,255,255,1)',
        fontSize: 16,
        fontWeight: '500',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    textArea: {
        height: 140,
        textAlignVertical: 'top',
    },
    pickerRow: {
        flexDirection: 'row',
        gap: 20,
    },
    glassPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    pickerIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerText: {
        flex: 1,
        color: 'rgba(255,255,255,1)',
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 12,
    },
    pickerFlyout: {
        backgroundColor: 'rgba(10, 10, 20, 0.98)',
        borderRadius: 24,
        padding: 12,
        marginTop: -10,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
        zIndex: 100,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 14,
        gap: 10,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    pickerItemActive: {
        backgroundColor: 'rgba(245,158,11,1)',
        borderColor: 'rgba(245,158,11,1)',
    },
    pickerItemText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '700',
    },
    pickerItemTextActive: {
        color: 'rgba(0,0,0,1)',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    addTariffButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    addTariffText: {
        color: 'rgba(245,158,11,1)',
        fontSize: 13,
        fontWeight: '800',
    },
    tariffCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    tariffHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 14,
    },
    customRadio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    customRadioActive: {
        borderColor: 'rgba(245,158,11,1)',
    },
    customRadioDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(245,158,11,1)',
    },
    tariffTitleInput: {
        flex: 1,
        color: 'rgba(255,255,255,1)',
        fontSize: 18,
        fontWeight: '800',
        padding: 0,
    },
    removeTariffButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(244, 67, 54, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tariffParameters: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 16,
        padding: 16,
    },
    paramItem: {
        flex: 1,
        alignItems: 'center',
    },
    paramLabel: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    paramInput: {
        color: 'rgba(255,255,255,1)',
        fontSize: 18,
        fontWeight: '900',
        textAlign: 'center',
        padding: 0,
        width: '100%',
    },
    paramDivider: {
        width: 1,
        height: '60%',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignSelf: 'center',
    },
});
