import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    Switch,
    useColorScheme,
    Alert,
    Image,
    ScrollView,
    Animated,
    Easing,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell, Clock, Info, Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DatePicker from 'react-native-date-picker';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { usePressFeedback } from '../../../hooks/usePressFeedback';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';
import { authorizedFetch } from '../../../services/authSessionService';

interface CreateRoomModalProps {
    visible: boolean;
    onClose: () => void;
    onRoomCreated: () => void;
}

const PRESET_IMAGES = [
    { id: 'krishna', emoji: '🕉️', label: 'Krishna' },
    { id: 'japa', emoji: '📿', label: 'Japa' },
    { id: 'kirtan', emoji: '🪈', label: 'Kirtan' },
    { id: 'scriptures', emoji: '📖', label: 'Scriptures' },
    { id: 'lotus', emoji: '🌺', label: 'Lotus' },
    { id: 'tulasi', emoji: '🌿', label: 'Tulasi' },
    { id: 'deity', emoji: '🙏', label: 'Puja' },
    { id: 'peacock', emoji: '🦚', label: 'Peacock' },
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ visible, onClose, onRoomCreated }) => {
    const { t, i18n } = useTranslation();
    const { isDarkMode, vTheme, portalBackgroundType } = useSettings();
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { user } = useUser();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const isPhotoBg = portalBackgroundType === 'image';
    const triggerTapFeedback = usePressFeedback();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState<string>(PRESET_IMAGES[0].id);
    const [uploadingImage, setUploadingImage] = useState(false);

    // New Fields
    const [location, setLocation] = useState('');
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedBook, setSelectedBook] = useState<string>('bg');
    const [enableReading, setEnableReading] = useState(true);
    const [books, setBooks] = useState<any[]>([]);

    // Load books on mount
    React.useEffect(() => {
        fetch(`${API_PATH}/library/books`)
            .then(res => res.json())
            .then(data => setBooks(data))
            .catch(err => console.log('Error loading books', err));
    }, []);

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert(t('common.error'), t('chat.roomName') + ' ' + t('registration.required'));
            return;
        }

        if (!user?.ID) {
            Alert.alert(t('common.error'), 'Please log in to create a room');
            onClose();
            return;
        }

        setLoading(true);
        try {
            const response = await authorizedFetch(`${API_PATH}/rooms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    description,
                    isPublic,
                    ownerId: user.ID,
                    location: enableReading ? location : '',
                    startTime: (enableReading && startTime) ? startTime.toISOString() : '',
                    bookCode: enableReading ? selectedBook : '',
                }),
            });

            if (response.ok) {
                const newRoom = await response.json();

                // If custom image was picked, upload it now
                if (imageUrl === 'custom' && customImageUri) {
                    const formData = new FormData();
                    formData.append('image', {
                        uri: customImageUri,
                        type: 'image/jpeg',
                        name: 'room_image.jpg',
                    } as any);

                    await authorizedFetch(`${API_PATH}/rooms/${newRoom.ID}/image`, {
                        method: 'POST',
                        body: formData,
                    });
                }

                onRoomCreated();
                onClose();
                setName('');
                setDescription('');
                setImageUrl(PRESET_IMAGES[0].id);
                setCustomImageUri(null);
                setStartTime(null);
                setLocation('');
                setSelectedBook('');
            } else {
                const data = await response.json();
                Alert.alert(t('common.error'), data.error || 'Failed to create room');
            }
        } catch (error) {
            Alert.alert(t('common.error'), 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadImage = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.6,
            maxWidth: 1024,
            maxHeight: 1024,
            includeBase64: false,
        });

        if (result.didCancel || !result.assets || result.assets.length === 0) return;

        const asset = result.assets[0];
        if (!asset.uri) return;

        setUploadingImage(true);
        try {
            setCustomImageUri(asset.uri);
            setImageUrl('custom'); // Flag that we have a custom image
        } catch (error) {
            console.error('Pick image error:', error);
        } finally {
            setUploadingImage(false);
        }
    };

    const [customImageUri, setCustomImageUri] = useState<string | null>(null);
    const modalOpacity = useRef(new Animated.Value(0)).current;
    const modalScale = useRef(new Animated.Value(0.96)).current;

    useEffect(() => {
        if (!visible) return;
        modalOpacity.setValue(0);
        modalScale.setValue(0.96);
        Animated.parallel([
            Animated.timing(modalOpacity, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(modalScale, {
                toValue: 1,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [visible, modalOpacity, modalScale]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <KeyboardAwareContainer style={{ width: '100%' }} useTopInset={false}>
                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: isPhotoBg ? 'rgba(15,23,42,0.84)' : colors.surfaceElevated,
                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.26)' : colors.border,
                            },
                            {
                                opacity: modalOpacity,
                                transform: [{ scale: modalScale }],
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <X size={24} color={isPhotoBg ? '#FFFFFF' : colors.textPrimary} />
                        </TouchableOpacity>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Text style={[styles.modalTitle, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>{t('chat.createRoom')}</Text>

                            <Text style={[styles.sectionTitle, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary, marginTop: 10 }]}>{t('chat.roomImage') || 'Room Image'}</Text>

                            <View style={styles.imageSelectionContainer}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScrollContent}>
                                    <TouchableOpacity
                                        activeOpacity={0.88}
                                        style={[
                                            styles.presetItem,
                                            {
                                                backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.14)' : colors.surface,
                                                borderColor: imageUrl === 'custom' ? colors.accent : (isPhotoBg ? 'rgba(255,255,255,0.24)' : colors.border)
                                            }
                                        ]}
                                        onPress={() => {
                                            triggerTapFeedback();
                                            handleUploadImage();
                                        }}
                                    >
                                        {uploadingImage ? (
                                            <ActivityIndicator size="small" color={isPhotoBg ? '#FFFFFF' : colors.accent} />
                                        ) : customImageUri ? (
                                            <Image source={{ uri: customImageUri }} style={styles.customImagePreview} />
                                        ) : (
                                            <>
                                                <Camera size={26} color={isPhotoBg ? 'rgba(255,255,255,0.84)' : colors.textSecondary} />
                                                <Text style={[styles.presetLabel, { color: isPhotoBg ? 'rgba(255,255,255,0.84)' : colors.textSecondary }]}>
                                                    {t('chat.upload')}
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    {PRESET_IMAGES.map(preset => (
                                        <TouchableOpacity
                                            key={preset.id}
                                            activeOpacity={0.88}
                                            style={[
                                                styles.presetItem,
                                                {
                                                    backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.14)' : colors.surface,
                                                    borderColor: isPhotoBg ? 'rgba(255,255,255,0.24)' : colors.border
                                                },
                                                imageUrl === preset.id && { borderColor: colors.accent }
                                            ]}
                                            onPress={() => {
                                                triggerTapFeedback();
                                                setImageUrl(preset.id);
                                                setCustomImageUri(null);
                                            }}
                                        >
                                            <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                                            <Text style={[styles.presetLabel, { color: isPhotoBg ? 'rgba(255,255,255,0.84)' : colors.textSecondary }]}>
                                                {t(`chat.presets.${preset.id}`)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        color: isPhotoBg ? '#FFFFFF' : colors.textPrimary,
                                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.26)' : colors.border,
                                        backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.12)' : colors.surface,
                                    }
                                ]}
                                placeholder={t('chat.roomName')}
                                placeholderTextColor={isPhotoBg ? 'rgba(255,255,255,0.72)' : colors.textSecondary}
                                value={name}
                                onChangeText={setName}
                            />

                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        color: isPhotoBg ? '#FFFFFF' : colors.textPrimary,
                                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.26)' : colors.border,
                                        backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.12)' : colors.surface,
                                        height: 84
                                    }
                                ]}
                                placeholder={t('chat.roomDesc')}
                                placeholderTextColor={isPhotoBg ? 'rgba(255,255,255,0.72)' : colors.textSecondary}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />

                            <View style={[styles.switchRow, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.12)' : colors.surface, borderColor: isPhotoBg ? 'rgba(255,255,255,0.26)' : colors.border }]}>
                                <View style={styles.switchLabelWrap}>
                                    <Text style={[styles.switchLabel, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>
                                        {t('chat.publicRoom')}
                                    </Text>
                                    <Text style={[styles.switchHint, { color: isPhotoBg ? 'rgba(255,255,255,0.74)' : colors.textSecondary }]}>
                                        {isPublic ? (t('chat.publicRoomDesc') || 'Комнату видят все пользователи') : (t('chat.privateRoomDesc') || 'Вход только по приглашению')}
                                    </Text>
                                </View>
                                <Switch
                                    testID="create-room-public-switch"
                                    style={styles.switchControl}
                                    value={isPublic}
                                    onValueChange={setIsPublic}
                                    trackColor={{ false: colors.border, true: colors.accent }}
                                />
                            </View>

                            <View style={[styles.switchRow, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.12)' : colors.surface, borderColor: isPhotoBg ? 'rgba(255,255,255,0.26)' : colors.border }]}>
                                <View style={styles.switchLabelWrap}>
                                    <Text style={[styles.switchLabel, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>
                                        {t('chat.enableReading') || 'Enable Scripture Reading'}
                                    </Text>
                                </View>
                                <Switch
                                    style={styles.switchControl}
                                    value={enableReading}
                                    onValueChange={setEnableReading}
                                    trackColor={{ false: colors.border, true: colors.accent }}
                                />
                            </View>

                            {enableReading && (
                                <>
                                    {/* Shared Reading Fields */}
                                    <Text style={[styles.sectionTitle, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>{t('chat.readingSettings')}</Text>

                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                color: isPhotoBg ? '#FFFFFF' : colors.textPrimary,
                                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.26)' : colors.border,
                                                backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.12)' : colors.surface,
                                            }
                                        ]}
                                        placeholder={t('chat.locationPlaceholder')}
                                        placeholderTextColor={isPhotoBg ? 'rgba(255,255,255,0.72)' : colors.textSecondary}
                                        value={location}
                                        onChangeText={setLocation}
                                    />

                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={{ color: isPhotoBg ? 'rgba(255,255,255,0.84)' : colors.textSecondary, marginBottom: 8 }}>{t('chat.selectScripture')}</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50 }}>
                                            {books.map((book) => (
                                                <TouchableOpacity
                                                    key={book.id}
                                                    style={[
                                                        styles.bookItem,
                                                        {
                                                            backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.12)' : colors.surface,
                                                            borderColor: isPhotoBg ? 'rgba(255,255,255,0.26)' : colors.border
                                                        },
                                                        selectedBook === book.code && { backgroundColor: colors.accent, borderColor: colors.accent }
                                                    ]}
                                                    onPress={() => setSelectedBook(book.code === selectedBook ? '' : book.code)}
                                                >
                                                    <Text style={[
                                                        styles.bookText,
                                                        { color: selectedBook === book.code ? '#fff' : (isPhotoBg ? '#FFFFFF' : colors.textPrimary) }
                                                    ]}>
                                                        {i18n.language === 'ru' ? (book.name_ru || book.name_en) : (book.name_en || book.name_ru)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    <Text style={[styles.sectionTitle, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>{t('chat.readingSchedule') || 'Reading Schedule'}</Text>
                                    <TouchableOpacity
                                        activeOpacity={0.88}
                                        style={[
                                            styles.scheduleButton,
                                            {
                                                backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.12)' : colors.surface,
                                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.26)' : colors.border
                                            }
                                        ]}
                                        onPress={() => {
                                            triggerTapFeedback();
                                            setShowDatePicker(true);
                                        }}
                                    >
                                        <Bell size={18} color={colors.accent} />
                                        <Text style={[styles.scheduleValue, { color: startTime ? (isPhotoBg ? '#FFFFFF' : colors.textPrimary) : (isPhotoBg ? 'rgba(255,255,255,0.72)' : colors.textSecondary) }]}>
                                            {startTime ? startTime.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : t('chat.setStartTime') || 'Set Start Time'}
                                        </Text>
                                        {startTime && (
                                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); setStartTime(null); }}>
                                                <Text style={{ color: colors.accent, fontSize: 12 }}>{t('common.clear') || 'Clear'}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 }}>
                                        <Info size={12} color={isPhotoBg ? 'rgba(255,255,255,0.84)' : colors.textSecondary} />
                                        <Text style={[styles.scheduleSubLabel, { color: vTheme.colors.textSecondary }]}>
                                            {t('chat.notificationHint') || 'Friends will be notified 15 minutes before'}
                                        </Text>
                                    </View>
                                </>
                            )}

                            <DatePicker
                                modal
                                open={showDatePicker}
                                date={startTime || new Date()}
                                title={t('chat.selectStartTime') || "Select Start Time"}
                                onConfirm={(date) => {
                                    setShowDatePicker(false);
                                    setStartTime(date);
                                }}
                                onCancel={() => {
                                    setShowDatePicker(false);
                                }}
                            />

                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[
                                        styles.button,
                                        styles.cancelButton,
                                        {
                                            backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.14)' : colors.surface,
                                            borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : colors.border
                                        }
                                    ]}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        onClose();
                                    }}
                                >
                                    <Text style={[styles.buttonText, { color: isPhotoBg ? '#FFFFFF' : colors.textPrimary }]}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    testID="create-room-submit-button"
                                    activeOpacity={0.88}
                                    style={[styles.button, { backgroundColor: colors.accent, borderColor: colors.accent }]}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        handleCreate();
                                    }}
                                    disabled={loading}
                                >
                                    <Text style={styles.buttonText}>{loading ? t('common.loading') : t('chat.create')}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </Animated.View>
                </KeyboardAwareContainer>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2,6,23,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxHeight: '90%',
        borderRadius: 24,
        borderWidth: 1,
        padding: 24,
        paddingTop: 48, // Increased top padding for the close button
        elevation: 5,
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 4,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 18,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        fontSize: 16,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    switchLabelWrap: {
        flex: 1,
        paddingRight: 12,
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '500',
        flexShrink: 1,
    },
    switchHint: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 16,
    },
    switchControl: {
        marginLeft: 10,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12,
    },
    presetScroll: {
        marginBottom: 20,
    },
    imageSelectionContainer: {
        marginBottom: 24,
    },
    imageScrollContent: {
        paddingRight: 20,
    },
    presetItem: {
        width: 80,
        height: 80,
        marginRight: 10,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    presetEmoji: {
        fontSize: 32,
    },
    presetLabel: {
        fontSize: 11,
        marginTop: 4,
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        flex: 0.48,
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {},
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    bookItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#ccc',
        marginRight: 8,
    },
    bookText: {
        fontSize: 14,
    },
    scheduleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 8,
    },
    scheduleValue: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
    },
    scheduleSubLabel: {
        fontSize: 11,
        marginLeft: 6,
    },
    customImagePreview: {
        width: '100%',
        height: '100%',
    },
});
