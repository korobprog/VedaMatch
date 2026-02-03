import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Switch
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { ArrowLeft, Camera, Home, Wifi, Coffee, MapPin, Phone } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { yatraService } from '../../../services/yatraService';
import { SHELTER_TYPE_LABELS, AMENITY_LABELS, ShelterType } from '../../../types/yatra';

type CreateShelterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateShelter'>;

const TYPES = Object.keys(SHELTER_TYPE_LABELS).map(key => ({
    key,
    label: SHELTER_TYPE_LABELS[key as keyof typeof SHELTER_TYPE_LABELS]
}));

const AMENITIES = Object.keys(AMENITY_LABELS).map(key => ({
    key,
    label: AMENITY_LABELS[key as keyof typeof AMENITY_LABELS]
}));

const CreateShelterScreen = () => {
    const navigation = useNavigation<CreateShelterScreenNavigationProp>();
    const route = useRoute<any>();
    const shelterId = route.params?.shelterId;
    const isEditing = !!shelterId;

    const [loading, setLoading] = useState(isEditing);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [type, setType] = useState<ShelterType>('ashram');
    const [description, setDescription] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [pricePerNight, setPricePerNight] = useState('');
    const [capacity, setCapacity] = useState('');
    const [houseRules, setHouseRules] = useState('');
    const [phone, setPhone] = useState('');
    const [sevaDesc, setSevaDesc] = useState('');
    const [isSevaAvailable, setIsSevaAvailable] = useState(false);

    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [coverImage, setCoverImage] = useState<string | null>(null);

    useEffect(() => {
        if (isEditing) {
            loadShelterData();
        }
    }, [shelterId]);

    const loadShelterData = async () => {
        try {
            const shelter = await yatraService.getShelter(shelterId);
            setTitle(shelter.title);
            setType(shelter.type);
            setDescription(shelter.description || '');
            setCity(shelter.city || '');
            setAddress(shelter.address || '');
            setPricePerNight(shelter.pricePerNight || '');
            setCapacity(shelter.capacity.toString());
            setHouseRules(shelter.houseRules || '');
            setPhone(shelter.phone || shelter.whatsapp || '');
            setSevaDesc(shelter.sevaDescription || '');
            setIsSevaAvailable(shelter.sevaExchange || false);
            setCoverImage(shelter.photos ? JSON.parse(shelter.photos)[0] : null);

            if (shelter.amenities) {
                try {
                    setSelectedAmenities(JSON.parse(shelter.amenities));
                } catch (e) {
                    setSelectedAmenities([]);
                }
            }
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось загрузить данные жилья');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        const options = {
            mediaType: 'photo' as const,
            quality: 0.8 as any,
            maxWidth: 1200,
            maxHeight: 800,
        };

        launchImageLibrary(options, async (response) => {
            if (response.didCancel) return;
            if (response.errorMessage) {
                Alert.alert('Ошибка', response.errorMessage);
                return;
            }

            if (response.assets && response.assets.length > 0) {
                const asset = response.assets[0];
                try {
                    const url = await yatraService.uploadPhoto(asset, 'shelter');
                    setCoverImage(url);
                } catch (error) {
                    Alert.alert('Ошибка', 'Не удалось загрузить фото');
                }
            }
        });
    };

    const toggleAmenity = (key: string) => {
        if (selectedAmenities.includes(key)) {
            setSelectedAmenities(selectedAmenities.filter(k => k !== key));
        } else {
            setSelectedAmenities([...selectedAmenities, key]);
        }
    };

    const handleSubmit = async () => {
        if (!title || !city || !pricePerNight) {
            Alert.alert('Ошибка', 'Заполните название, город и цену');
            return;
        }

        setSubmitting(true);
        const data = {
            title,
            type,
            description,
            city,
            address: address || city,
            pricePerNight,
            capacity: parseInt(capacity) || 1,
            amenities: JSON.stringify(selectedAmenities),
            photos: coverImage ? JSON.stringify([coverImage]) : '[]',
            houseRules,
            phone,
            whatsapp: phone, // Assuming same number
            sevaExchange: isSevaAvailable,
            sevaDescription: isSevaAvailable ? sevaDesc : undefined,
        };

        try {
            if (isEditing) {
                await yatraService.updateShelter(shelterId, data);
                Alert.alert('Успех', 'Жилье обновлено');
            } else {
                await yatraService.createShelter(data);
                Alert.alert('Успех', 'Жилье добавлено');
            }
            navigation.goBack();
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось сохранить жилье');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Редактировать Жилье' : 'Добавить Жилье'}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Cover Image */}
                <TouchableOpacity
                    style={styles.coverUpload}
                    onPress={handlePickImage}
                >
                    {coverImage ? (
                        <Image source={{ uri: yatraService.getImageUrl(coverImage) }} style={styles.coverImage} />
                    ) : (
                        <View style={styles.uploadPlaceholder}>
                            <Camera size={40} color="#999" />
                            <Text style={styles.uploadText}>Фото жилья</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Type Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Тип Жилья</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeScroll}>
                        {TYPES.map((t) => (
                            <TouchableOpacity
                                key={t.key}
                                style={[styles.typeChip, type === t.key && styles.typeChipActive]}
                                onPress={() => setType(t.key as ShelterType)}
                            >
                                <Text style={[styles.typeText, type === t.key && styles.typeTextActive]}>
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Basic Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Основное</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Название (например, Radha House)"
                        value={title}
                        onChangeText={setTitle}
                    />
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Описание условий, атмосферы..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* Location & Price */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Локация и Условия</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Город (Vrindavan)"
                        value={city}
                        onChangeText={setCity}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Точный адрес"
                        value={address}
                        onChangeText={setAddress}
                    />

                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Цена за ночь</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="500 rub"
                                value={pricePerNight}
                                onChangeText={setPricePerNight}
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Вместимость</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="2 чел."
                                value={capacity}
                                onChangeText={setCapacity}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </View>

                {/* Amenities */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Удобства</Text>
                    <View style={styles.amenitiesGrid}>
                        {AMENITIES.map((a) => (
                            <TouchableOpacity
                                key={a.key}
                                style={[styles.amenityChip, selectedAmenities.includes(a.key) && styles.amenityChipActive]}
                                onPress={() => toggleAmenity(a.key)}
                            >
                                <Text style={[styles.amenityText, selectedAmenities.includes(a.key) && styles.amenityTextActive]}>
                                    {a.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Seva Option */}
                <View style={styles.section}>
                    <View style={styles.rowCenter}>
                        <Text style={styles.sectionTitle}>Доступно за Севу (Служение)</Text>
                        <Switch
                            value={isSevaAvailable}
                            onValueChange={setIsSevaAvailable}
                            trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                        />
                    </View>
                    {isSevaAvailable && (
                        <TextInput
                            style={[styles.input, { marginTop: 8 }]}
                            placeholder="Какое служение требуется? (уборка, готовка...)"
                            value={sevaDesc}
                            onChangeText={setSevaDesc}
                        />
                    )}
                </View>

                {/* Contacts & Rules */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Контакты и Правила</Text>
                    <View style={styles.inputContainer}>
                        <Phone size={18} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.inputWithIcon}
                            placeholder="WhatsApp / Телефон"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>
                    <TextInput
                        style={[styles.input, styles.textArea, { marginTop: 12 }]}
                        placeholder="Правила дома (не курить, вегетарианство...)"
                        value={houseRules}
                        onChangeText={setHouseRules}
                        multiline
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>
                            {isEditing ? 'Сохранить Изменения' : 'Опубликовать Жилье'}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 12,
        color: '#111',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    coverUpload: {
        height: 200,
        backgroundColor: '#E5E7EB',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    uploadText: {
        marginTop: 8,
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    },
    section: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#FFF',
        borderRadius: 0,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#111',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 10,
    },
    inputIcon: {
        marginRight: 8,
    },
    inputWithIcon: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: '#111',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    rowCenter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    halfInput: {
        width: '48%',
    },
    themeScroll: {
        marginBottom: 8,
    },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    typeChipActive: {
        backgroundColor: '#D1FAE5',
        borderColor: '#10B981',
    },
    typeText: {
        color: '#4B5563',
        fontWeight: '500',
    },
    typeTextActive: {
        color: '#047857',
        fontWeight: '600',
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    amenityChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        margin: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    amenityChipActive: {
        backgroundColor: '#DBEAFE',
        borderColor: '#3B82F6',
    },
    amenityText: {
        fontSize: 13,
        color: '#4B5563',
    },
    amenityTextActive: {
        color: '#1D4ED8',
        fontWeight: '500',
    },
    submitButton: {
        backgroundColor: '#10B981',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: 'green',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    disabledButton: {
        backgroundColor: '#6EE7B7',
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CreateShelterScreen;
