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
    Dimensions,
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
    ServiceScheduleType,
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

const { width } = Dimensions.get('window');

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
        if (!newTariffs.some(t => t.isDefault)) {
            newTariffs[0].isDefault = true;
        }
        setTariffs(newTariffs);
    };

    const handleTariffChange = (index: number, field: keyof TariffForm, value: string | boolean) => {
        const newTariffs = [...tariffs];
        if (field === 'isDefault' && value === true) {
            newTariffs.forEach(t => t.isDefault = false);
        }
        (newTariffs[index] as any)[field] = value;
        setTariffs(newTariffs);
    };

    const validateForm = (): boolean => {
        if (!title.trim()) {
            Alert.alert('Ошибка', 'Введите название');
            return false;
        }
        if (!description.trim()) {
            Alert.alert('Ошибка', 'Введите описание');
            return false;
        }
        if (channel === 'offline' && !offlineAddress.trim()) {
            Alert.alert('Ошибка', 'Укажите адрес');
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setSaving(true);
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
                isEditing ? 'Сохранено!' : 'Создано! 🎉',
                isEditing ? 'Изменения успешно сохранены' : 'Теперь настройте расписание и слоты',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Ошибка', error.message || 'Не удалось сохранить');
        } finally {
            setSaving(false);
        }
    };

    return (
        <LinearGradient colors={['#0a0a14', '#12122b', '#0a0a14']} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Fixed Premium Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerCircleButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>
                            {isEditing ? 'Правка услуги' : 'Новое творение'}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            {isEditing ? 'Обновите детали вашего сервиса' : 'Создайте уникальное предложение'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.saveButton, (saving || loading) && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving || loading}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <Save size={20} color="#000" />
                        )}
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#F59E0B" />
                    </View>
                ) : (
                    <KeyboardAvoidingView
                        style={styles.content}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                                                <Camera size={20} color="#F59E0B" />
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
                                            <Camera size={28} color="#F59E0B" />
                                        </View>
                                        <Text style={styles.coverPlaceholderText}>Добавить обложку</Text>
                                        <Text style={styles.coverPlaceholderSubtext}>Рекомендуем 1200x800px</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Main Form Mastery */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeaderRow}>
                                    <View style={styles.headingIndicator} />
                                    <Text style={styles.formSectionTitle}>Основная информация</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Название вашего сервиса</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder="Напр: Консультация по Джйотиш"
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Глубокое описание</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder="Раскройте суть вашего предложения..."
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                        multiline
                                        numberOfLines={4}
                                    />
                                </View>

                                {/* Sophisticated Pickers */}
                                <View style={styles.pickerRow}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>Предназначение</Text>
                                        <TouchableOpacity
                                            style={styles.glassPicker}
                                            activeOpacity={0.7}
                                            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                                        >
                                            <View style={styles.pickerIconCircle}>
                                                <CategoryIcon name={CATEGORY_ICON_NAMES[category]} size={14} color="#F59E0B" />
                                            </View>
                                            <Text style={styles.pickerText}>{CATEGORY_LABELS[category]}</Text>
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
                                                    <CategoryIcon name={CATEGORY_ICON_NAMES[cat]} size={16} color={category === cat ? '#000' : '#F59E0B'} />
                                                    <Text style={[styles.pickerItemText, category === cat && styles.pickerItemTextActive]}>
                                                        {CATEGORY_LABELS[cat]}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                <View style={styles.pickerRow}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>Канал связи</Text>
                                        <TouchableOpacity
                                            style={styles.glassPicker}
                                            activeOpacity={0.7}
                                            onPress={() => setShowChannelPicker(!showChannelPicker)}
                                        >
                                            <View style={styles.pickerIconCircle}>
                                                {channel === 'offline' ? <MapPin size={14} color="#F59E0B" /> : <Video size={14} color="#F59E0B" />}
                                            </View>
                                            <Text style={styles.pickerText}>{CHANNEL_LABELS[channel]}</Text>
                                            <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>Уровень доступа</Text>
                                        <TouchableOpacity
                                            style={styles.glassPicker}
                                            activeOpacity={0.7}
                                            onPress={() => setShowAccessPicker(!showAccessPicker)}
                                        >
                                            <View style={styles.pickerIconCircle}>
                                                <Globe size={14} color="#F59E0B" />
                                            </View>
                                            <Text style={styles.pickerText}>{ACCESS_LABELS[accessType]}</Text>
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
                                                        {CHANNEL_LABELS[ch]}
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
                                                        {ACCESS_LABELS[at]}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {channel === 'offline' && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Адрес проведения</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={offlineAddress}
                                            onChangeText={setOfflineAddress}
                                            placeholder="Город, улица, кабинет..."
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Tariffs Masterclass */}
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionHeaderRow}>
                                    <View style={styles.headingIndicator} />
                                    <Text style={styles.formSectionTitle}>Тарифная сетка</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.addTariffButton}
                                    onPress={handleAddTariff}
                                    activeOpacity={0.7}
                                >
                                    <Plus size={14} color="#F59E0B" />
                                    <Text style={styles.addTariffText}>Добавить</Text>
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
                                            placeholder="Название тарифа"
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
                                            <Text style={styles.paramLabel}>Цена (₵)</Text>
                                            <TextInput
                                                style={styles.paramInput}
                                                value={tariff.price}
                                                onChangeText={(v) => handleTariffChange(index, 'price', v.replace(/[^0-9]/g, ''))}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={styles.paramDivider} />
                                        <View style={styles.paramItem}>
                                            <Text style={styles.paramLabel}>Время (мин)</Text>
                                            <TextInput
                                                style={styles.paramInput}
                                                value={tariff.durationMinutes}
                                                onChangeText={(v) => handleTariffChange(index, 'durationMinutes', v.replace(/[^0-9]/g, ''))}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={styles.paramDivider} />
                                        <View style={styles.paramItem}>
                                            <Text style={styles.paramLabel}>Сессий</Text>
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
                    </KeyboardAvoidingView>
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
        color: '#fff',
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
        backgroundColor: '#F59E0B',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F59E0B',
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
        color: '#fff',
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
        backgroundColor: '#F59E0B',
        borderRadius: 2,
    },
    formSectionTitle: {
        color: '#fff',
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
        color: '#fff',
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
        color: '#fff',
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
        shadowColor: '#000',
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
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    pickerItemText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '700',
    },
    pickerItemTextActive: {
        color: '#000',
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
        color: '#F59E0B',
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
        borderColor: '#F59E0B',
    },
    customRadioDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#F59E0B',
    },
    tariffTitleInput: {
        flex: 1,
        color: '#fff',
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
        color: '#fff',
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
