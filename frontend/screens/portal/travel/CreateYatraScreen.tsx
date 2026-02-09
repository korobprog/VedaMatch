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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { ArrowLeft, Camera, MapPin, Plus, Trash, Calendar, DollarSign } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { yatraService } from '../../../services/yatraService';
import { YATRA_THEME_LABELS, YatraTheme } from '../../../types/yatra';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

type CreateYatraScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateYatra'>;

const THEMES = Object.keys(YATRA_THEME_LABELS).map(key => ({
    key,
    label: YATRA_THEME_LABELS[key as keyof typeof YATRA_THEME_LABELS]
}));

const CreateYatraScreen = () => {
    const navigation = useNavigation<CreateYatraScreenNavigationProp>();
    const route = useRoute<any>();
    const yatraId = route.params?.yatraId;
    const isEditing = !!yatraId;
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [loading, setLoading] = useState(isEditing);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [theme, setTheme] = useState<YatraTheme>('vrindavan');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [requirements, setRequirements] = useState('');
    const [costEstimate, setCostEstimate] = useState('');
    const [maxParticipants, setMaxParticipants] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);

    // Route Points
    const [routePoints, setRoutePoints] = useState<Array<{ id: number, name: string, description: string }>>([
        { id: 1, name: '', description: '' }
    ]);

    useEffect(() => {
        if (isEditing) {
            loadYatraData();
        }
    }, [yatraId]);

    const loadYatraData = async () => {
        try {
            const yatra = await yatraService.getYatra(yatraId);
            setTitle(yatra.title);
            setTheme(yatra.theme);
            setStartDate(yatra.startDate);
            setEndDate(yatra.endDate);
            setDescription(yatra.description || '');
            setRequirements(yatra.requirements || '');
            setCostEstimate(yatra.costEstimate || '');
            setMaxParticipants(yatra.maxParticipants?.toString() || '');
            setCoverImage(yatra.coverImageUrl || null);

            if (yatra.routePoints) {
                try {
                    const parsed = JSON.parse(yatra.routePoints);
                    if (Array.isArray(parsed)) {
                        setRoutePoints(parsed.map((p: any, index: number) => ({
                            id: index + 1,
                            name: p.name || '',
                            description: p.description || ''
                        })));
                    }
                } catch (e) {
                    console.error("Error parsing route points", e);
                }
            }
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось загрузить данные тура');
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
            maxHeight: 675,
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
                    const url = await yatraService.uploadPhoto(asset, 'yatra');
                    setCoverImage(url);
                } catch (error) {
                    Alert.alert('Ошибка', 'Не удалось загрузить фото');
                }
            }
        });
    };

    const handleAddPoint = () => {
        setRoutePoints([...routePoints, { id: Date.now(), name: '', description: '' }]);
    };

    const handleRemovePoint = (id: number) => {
        setRoutePoints(routePoints.filter(p => p.id !== id));
    };

    const handlePointChange = (id: number, field: 'name' | 'description', value: string) => {
        setRoutePoints(routePoints.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    const handleSubmit = async () => {
        if (!title || !startDate || !endDate || !description) {
            Alert.alert('Ошибка', 'Пожалуйста, заполните обязательные поля');
            return;
        }

        setSubmitting(true);
        const data = {
            title,
            theme,
            startDate,
            endDate,
            description,
            requirements,
            costEstimate,
            maxParticipants: parseInt(maxParticipants) || 0,
            coverImageUrl: coverImage || undefined,
            routePoints: JSON.stringify(routePoints),
            status: 'planning' as const
        };

        try {
            if (isEditing) {
                await yatraService.updateYatra(yatraId, data);
                Alert.alert('Успех', 'Тур обновлен');
            } else {
                await yatraService.createYatra(data);
                Alert.alert('Успех', 'Тур создан');
            }
            navigation.goBack();
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось сохранить тур');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
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
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Редактировать Тур' : 'Создать Новый Тур'}</Text>
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
                            <Camera size={40} color={colors.textSecondary} />
                            <Text style={styles.uploadText}>Добавить обложку</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Title */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Название Тура</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Например: Вриндаван - Путешествие к сердцу"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Theme Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Направление (Дхама)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeScroll}>
                        {THEMES.map((t) => (
                            <TouchableOpacity
                                key={t.key}
                                style={[styles.themeChip, theme === t.key && styles.themeChipActive, theme === t.key && { borderColor: colors.accent }]}
                                onPress={() => setTheme(t.key as YatraTheme)}
                            >
                                <Text style={[styles.themeText, theme === t.key && styles.themeTextActive, theme === t.key && { color: colors.accent }]}>
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Dates & Capacity */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Детали Поездки</Text>
                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Начало (YYYY-MM-DD)</Text>
                            <View style={styles.inputContainer}>
                                <Calendar size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIcon}
                                    placeholder="2024-11-01"
                                    value={startDate}
                                    onChangeText={setStartDate}
                                />
                            </View>
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Окончание</Text>
                            <View style={styles.inputContainer}>
                                <Calendar size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIcon}
                                    placeholder="2024-11-14"
                                    value={endDate}
                                    onChangeText={setEndDate}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Макс. участников</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="15"
                                value={maxParticipants}
                                onChangeText={setMaxParticipants}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Стоимость (примерно)</Text>
                            <View style={styles.inputContainer}>
                                <DollarSign size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIcon}
                                    placeholder="50000 rub"
                                    value={costEstimate}
                                    onChangeText={setCostEstimate}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Описание и Требования</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Опишите программу тура, ключевые точки, атмосферу..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                    />
                    <TextInput
                        style={[styles.input, styles.textArea, { marginTop: 12 }]}
                        placeholder="Требования к участникам (опыт, здоровье, стандарты)..."
                        value={requirements}
                        onChangeText={setRequirements}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Route Points */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Маршрут</Text>
                        <TouchableOpacity onPress={handleAddPoint} style={[styles.addButton, { backgroundColor: colors.accent }]}>
                            <Plus size={16} color={colors.textPrimary} />
                            <Text style={styles.addButtonText}>Добавить</Text>
                        </TouchableOpacity>
                    </View>

                    {routePoints.map((point, index) => (
                        <View key={point.id} style={styles.pointCard}>
                            <View style={styles.pointHeader}>
                                <View style={[styles.pointNumber, { backgroundColor: colors.accent }]}>
                                    <Text style={styles.pointNumberText}>{index + 1}</Text>
                                </View>
                                <TextInput
                                    style={styles.pointNameInput}
                                    placeholder="Название места (Vrindavan)"
                                    value={point.name}
                                    onChangeText={(text) => handlePointChange(point.id, 'name', text)}
                                />
                                {routePoints.length > 1 && (
                                    <TouchableOpacity onPress={() => handleRemovePoint(point.id)}>
                                        <Trash size={18} color={colors.danger} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TextInput
                                style={styles.pointDescInput}
                                placeholder="Что мы будем здесь делать?"
                                value={point.description}
                                onChangeText={(text) => handlePointChange(point.id, 'description', text)}
                                multiline
                            />
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.accent, shadowColor: colors.accent }, submitting && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.textPrimary} />
                    ) : (
                        <Text style={styles.submitButtonText}>
                            {isEditing ? 'Сохранить Изменения' : 'Создать Тур'}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 12,
        color: colors.textPrimary,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    coverUpload: {
        height: 200,
        backgroundColor: colors.surfaceElevated,
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
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    section: {
        marginTop: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: colors.surface,
        borderRadius: 0,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    input: {
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: colors.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
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
        color: colors.textPrimary,
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
    halfInput: {
        width: '48%',
    },
    themeScroll: {
        marginBottom: 8,
    },
    themeChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surfaceElevated,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    themeChipActive: {
        backgroundColor: colors.accentSoft,
        borderColor: colors.accent,
    },
    themeText: {
        color: colors.textSecondary,
        fontWeight: '500',
    },
    themeTextActive: {
        color: colors.accent,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    addButtonText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    pointCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pointHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    pointNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    pointNumberText: {
        color: colors.textPrimary,
        fontWeight: 'bold',
        fontSize: 12,
    },
    pointNameInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 4,
        marginRight: 8,
    },
    pointDescInput: {
        fontSize: 14,
        color: colors.textSecondary,
        padding: 0,
    },
    submitButton: {
        backgroundColor: colors.accent,
        margin: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    disabledButton: {
        backgroundColor: 'rgba(253,186,116,1)',
    },
    submitButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CreateYatraScreen;
