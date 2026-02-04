/**
 * CreateServiceScreen - Экран создания/редактирования сервиса
 */
import React, { useState, useEffect } from 'react';
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
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
    ArrowLeft,
    Camera,
    Save,
    Eye,
    ChevronDown,
    Plus,
    Trash2,
    Video,
    MapPin,
    Globe,
} from 'lucide-react-native';
import {
    Service,
    ServiceCategory,
    ServiceScheduleType,
    ServiceChannel,
    ServiceAccessType,
    CreateServiceRequest,
    CreateTariffRequest,
    CATEGORY_LABELS,
    CATEGORY_ICONS,
    CHANNEL_LABELS,
    ACCESS_LABELS,
    createService,
    updateService,
    getServiceById,
    addTariff,
} from '../../../services/serviceService';
import { launchImageLibrary } from 'react-native-image-picker';

type RouteParams = {
    params: {
        serviceId?: number;
    };
};

interface TariffForm {
    name: string;
    price: string;
    durationMinutes: string;
    sessionsCount: string;
    isDefault: boolean;
}

const CATEGORIES: ServiceCategory[] = ['astrology', 'psychology', 'coaching', 'spirituality', 'yagya', 'education', 'health', 'other'];
const CHANNELS: ServiceChannel[] = ['video', 'zoom', 'telegram', 'offline', 'file'];
const ACCESS_TYPES: ServiceAccessType[] = ['paid', 'free', 'subscription', 'invite'];

export default function CreateServiceScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'params'>>();
    const serviceId = route.params?.serviceId;
    const isEditing = !!serviceId;

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
        { name: 'Стандарт', price: '500', durationMinutes: '60', sessionsCount: '1', isDefault: true },
    ]);

    // Dropdown states
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showChannelPicker, setShowChannelPicker] = useState(false);
    const [showAccessPicker, setShowAccessPicker] = useState(false);

    // Load existing service for editing
    useEffect(() => {
        if (serviceId) {
            loadService();
        }
    }, [serviceId]);

    const loadService = async () => {
        if (!serviceId) return;
        setLoading(true);
        try {
            const service = await getServiceById(serviceId);
            setTitle(service.title);
            setDescription(service.description);
            setCoverImageUrl(service.coverImageUrl);
            setCategory(service.category);
            setChannel(service.channel);
            setAccessType(service.accessType);
            setChannelLink(service.channelLink || '');
            setOfflineAddress(service.offlineAddress || '');

            if (service.tariffs && service.tariffs.length > 0) {
                setTariffs(service.tariffs.map(t => ({
                    name: t.name,
                    price: t.price.toString(),
                    durationMinutes: t.durationMinutes.toString(),
                    sessionsCount: t.sessionsCount.toString(),
                    isDefault: t.isDefault,
                })));
            }
        } catch (error) {
            console.error('Failed to load service:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить сервис');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1200,
                maxHeight: 800,
            });

            if (result.assets && result.assets[0]?.uri) {
                // TODO: Upload to S3 and get URL
                setCoverImageUrl(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Image picker error:', error);
        }
    };

    const handleAddTariff = () => {
        if (tariffs.length >= 5) {
            Alert.alert('Лимит', 'Максимум 5 тарифов');
            return;
        }
        setTariffs([...tariffs, {
            name: `Тариф ${tariffs.length + 1}`,
            price: '1000',
            durationMinutes: '60',
            sessionsCount: '1',
            isDefault: false,
        }]);
    };

    const handleRemoveTariff = (index: number) => {
        if (tariffs.length <= 1) {
            Alert.alert('Ошибка', 'Нужен хотя бы один тариф');
            return;
        }
        const newTariffs = tariffs.filter((_, i) => i !== index);
        // Ensure at least one is default
        if (!newTariffs.some(t => t.isDefault)) {
            newTariffs[0].isDefault = true;
        }
        setTariffs(newTariffs);
    };

    const handleTariffChange = (index: number, field: keyof TariffForm, value: string | boolean) => {
        const newTariffs = [...tariffs];
        if (field === 'isDefault' && value === true) {
            // Only one can be default
            newTariffs.forEach(t => t.isDefault = false);
        }
        (newTariffs[index] as any)[field] = value;
        setTariffs(newTariffs);
    };

    const validateForm = (): boolean => {
        if (!title.trim()) {
            Alert.alert('Ошибка', 'Введите название сервиса');
            return false;
        }
        if (!description.trim()) {
            Alert.alert('Ошибка', 'Введите описание');
            return false;
        }
        if (channel === 'offline' && !offlineAddress.trim()) {
            Alert.alert('Ошибка', 'Укажите адрес для офлайн-встреч');
            return false;
        }
        if (tariffs.some(t => !t.name.trim() || !t.price || parseInt(t.price) < 0)) {
            Alert.alert('Ошибка', 'Проверьте тарифы');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setSaving(true);
        try {
            const serviceData: CreateServiceRequest = {
                title: title.trim(),
                description: description.trim(),
                coverImageUrl,
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

                // Add tariffs for new service
                for (const tariff of tariffs) {
                    const tariffData: CreateTariffRequest = {
                        name: tariff.name,
                        price: parseInt(tariff.price) || 0,
                        durationMinutes: parseInt(tariff.durationMinutes) || 60,
                        sessionsCount: parseInt(tariff.sessionsCount) || 1,
                        isDefault: tariff.isDefault,
                    };
                    await addTariff(savedService.id, tariffData);
                }
            }

            Alert.alert(
                isEditing ? 'Сохранено!' : 'Сервис создан! 🎉',
                isEditing ? 'Изменения сохранены' : 'Теперь настройте расписание, чтобы клиенты могли записываться',
                [
                    {
                        text: 'Мои сервисы',
                        onPress: () => navigation.navigate('MyServices'),
                    },
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        } catch (error: any) {
            console.error('Save failed:', error);
            Alert.alert('Ошибка', error.message || 'Не удалось сохранить');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#FFD700" />
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {isEditing ? 'Редактировать' : 'Новый сервис'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#1a1a2e" />
                        ) : (
                            <Save size={20} color="#1a1a2e" />
                        )}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    style={styles.content}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Cover Image */}
                        <TouchableOpacity style={styles.coverSection} onPress={handlePickImage}>
                            {coverImageUrl ? (
                                <Image source={{ uri: coverImageUrl }} style={styles.coverImage} />
                            ) : (
                                <View style={styles.coverPlaceholder}>
                                    <Camera size={32} color="rgba(255,255,255,0.4)" />
                                    <Text style={styles.coverPlaceholderText}>Добавить обложку</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Title */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Название *</Text>
                            <TextInput
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Например: Консультация астролога"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                maxLength={100}
                            />
                        </View>

                        {/* Description */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Описание *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Опишите, что получит клиент..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                multiline
                                maxLength={2000}
                            />
                        </View>

                        {/* Category Picker */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Категория</Text>
                            <TouchableOpacity
                                style={styles.pickerButton}
                                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                            >
                                <Text style={styles.pickerButtonText}>
                                    {CATEGORY_ICONS[category]} {CATEGORY_LABELS[category]}
                                </Text>
                                <ChevronDown size={20} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                            {showCategoryPicker && (
                                <View style={styles.pickerOptions}>
                                    {CATEGORIES.map((cat) => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.pickerOption, category === cat && styles.pickerOptionActive]}
                                            onPress={() => {
                                                setCategory(cat);
                                                setShowCategoryPicker(false);
                                            }}
                                        >
                                            <Text style={styles.pickerOptionText}>
                                                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Channel Picker */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Формат проведения</Text>
                            <TouchableOpacity
                                style={styles.pickerButton}
                                onPress={() => setShowChannelPicker(!showChannelPicker)}
                            >
                                <View style={styles.channelIcon}>
                                    {channel === 'offline' ? (
                                        <MapPin size={16} color="#FFD700" />
                                    ) : (
                                        <Video size={16} color="#FFD700" />
                                    )}
                                </View>
                                <Text style={styles.pickerButtonText}>{CHANNEL_LABELS[channel]}</Text>
                                <ChevronDown size={20} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                            {showChannelPicker && (
                                <View style={styles.pickerOptions}>
                                    {CHANNELS.map((ch) => (
                                        <TouchableOpacity
                                            key={ch}
                                            style={[styles.pickerOption, channel === ch && styles.pickerOptionActive]}
                                            onPress={() => {
                                                setChannel(ch);
                                                setShowChannelPicker(false);
                                            }}
                                        >
                                            <Text style={styles.pickerOptionText}>{CHANNEL_LABELS[ch]}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Channel Link (for online) */}
                        {channel !== 'offline' && channel !== 'file' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Ссылка на канал (опционально)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={channelLink}
                                    onChangeText={setChannelLink}
                                    placeholder="https://..."
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    keyboardType="url"
                                    autoCapitalize="none"
                                />
                            </View>
                        )}

                        {/* Offline Address */}
                        {channel === 'offline' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Адрес *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={offlineAddress}
                                    onChangeText={setOfflineAddress}
                                    placeholder="Город, улица, дом"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                />
                            </View>
                        )}

                        {/* Access Type */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Тип доступа</Text>
                            <TouchableOpacity
                                style={styles.pickerButton}
                                onPress={() => setShowAccessPicker(!showAccessPicker)}
                            >
                                <Globe size={16} color="#FFD700" />
                                <Text style={styles.pickerButtonText}>{ACCESS_LABELS[accessType]}</Text>
                                <ChevronDown size={20} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                            {showAccessPicker && (
                                <View style={styles.pickerOptions}>
                                    {ACCESS_TYPES.map((at) => (
                                        <TouchableOpacity
                                            key={at}
                                            style={[styles.pickerOption, accessType === at && styles.pickerOptionActive]}
                                            onPress={() => {
                                                setAccessType(at);
                                                setShowAccessPicker(false);
                                            }}
                                        >
                                            <Text style={styles.pickerOptionText}>{ACCESS_LABELS[at]}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Tariffs Section */}
                        <View style={styles.tariffsSection}>
                            <View style={styles.tariffsSectionHeader}>
                                <Text style={styles.sectionTitle}>Тарифы</Text>
                                <TouchableOpacity style={styles.addTariffButton} onPress={handleAddTariff}>
                                    <Plus size={18} color="#FFD700" />
                                    <Text style={styles.addTariffText}>Добавить</Text>
                                </TouchableOpacity>
                            </View>

                            {tariffs.map((tariff, index) => (
                                <View key={index} style={styles.tariffCard}>
                                    <View style={styles.tariffHeader}>
                                        <TouchableOpacity
                                            style={[styles.defaultCheckbox, tariff.isDefault && styles.defaultCheckboxActive]}
                                            onPress={() => handleTariffChange(index, 'isDefault', true)}
                                        >
                                            {tariff.isDefault && <Text style={styles.checkmark}>✓</Text>}
                                        </TouchableOpacity>
                                        <Text style={styles.tariffDefaultLabel}>
                                            {tariff.isDefault ? 'По умолчанию' : 'Сделать основным'}
                                        </Text>
                                        {tariffs.length > 1 && (
                                            <TouchableOpacity
                                                style={styles.removeTariffButton}
                                                onPress={() => handleRemoveTariff(index)}
                                            >
                                                <Trash2 size={16} color="#F44336" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <TextInput
                                        style={styles.tariffInput}
                                        value={tariff.name}
                                        onChangeText={(v) => handleTariffChange(index, 'name', v)}
                                        placeholder="Название тарифа"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                    />

                                    <View style={styles.tariffRow}>
                                        <View style={styles.tariffField}>
                                            <Text style={styles.tariffFieldLabel}>Цена (₽)</Text>
                                            <TextInput
                                                style={styles.tariffFieldInput}
                                                value={tariff.price}
                                                onChangeText={(v) => handleTariffChange(index, 'price', v.replace(/[^0-9]/g, ''))}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                            />
                                        </View>
                                        <View style={styles.tariffField}>
                                            <Text style={styles.tariffFieldLabel}>Минут</Text>
                                            <TextInput
                                                style={styles.tariffFieldInput}
                                                value={tariff.durationMinutes}
                                                onChangeText={(v) => handleTariffChange(index, 'durationMinutes', v.replace(/[^0-9]/g, ''))}
                                                keyboardType="numeric"
                                                placeholder="60"
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                            />
                                        </View>
                                        <View style={styles.tariffField}>
                                            <Text style={styles.tariffFieldLabel}>Сессий</Text>
                                            <TextInput
                                                style={styles.tariffFieldInput}
                                                value={tariff.sessionsCount}
                                                onChangeText={(v) => handleTariffChange(index, 'sessionsCount', v.replace(/[^0-9]/g, ''))}
                                                keyboardType="numeric"
                                                placeholder="1"
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
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
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 12,
    },
    saveButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFD700',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    content: {
        flex: 1,
    },
    coverSection: {
        marginHorizontal: 16,
        marginBottom: 24,
        height: 160,
        borderRadius: 16,
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 16,
    },
    coverPlaceholderText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        marginTop: 8,
    },
    inputGroup: {
        marginHorizontal: 16,
        marginBottom: 20,
    },
    label: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 14,
        color: '#fff',
        fontSize: 15,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 14,
        gap: 10,
    },
    channelIcon: {
        width: 24,
        alignItems: 'center',
    },
    pickerButtonText: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
    },
    pickerOptions: {
        marginTop: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        overflow: 'hidden',
    },
    pickerOption: {
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    pickerOptionActive: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
    },
    pickerOptionText: {
        color: '#fff',
        fontSize: 14,
    },
    tariffsSection: {
        marginHorizontal: 16,
        marginTop: 8,
    },
    tariffsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    addTariffButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
    },
    addTariffText: {
        color: '#FFD700',
        fontSize: 13,
        fontWeight: '500',
    },
    tariffCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    tariffHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    defaultCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    defaultCheckboxActive: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
    },
    checkmark: {
        color: '#1a1a2e',
        fontSize: 12,
        fontWeight: '700',
    },
    tariffDefaultLabel: {
        flex: 1,
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
    },
    removeTariffButton: {
        padding: 8,
    },
    tariffInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
        padding: 12,
        color: '#fff',
        fontSize: 14,
        marginBottom: 12,
    },
    tariffRow: {
        flexDirection: 'row',
        gap: 12,
    },
    tariffField: {
        flex: 1,
    },
    tariffFieldLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
        marginBottom: 4,
    },
    tariffFieldInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
        padding: 10,
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
    },
});
