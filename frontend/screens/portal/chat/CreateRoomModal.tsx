import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell, Clock, Info, Camera, Image as ImageIcon } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DatePicker from 'react-native-date-picker';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { useUser } from '../../../context/UserContext';

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
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { user } = useUser();

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
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_PATH}/rooms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    description,
                    isPublic,
                    ownerId: user.ID,
                    imageUrl,
                    location,
                    startTime: startTime ? startTime.toISOString() : '',
                    bookCode: selectedBook,
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

                    await fetch(`${API_PATH}/rooms/${newRoom.ID}/image`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
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
            quality: 0.8,
            includeBase64: false,
        });

        if (result.didCancel || !result.assets || result.assets.length === 0) return;

        const asset = result.assets[0];
        if (!asset.uri) return;

        setUploadingImage(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const formData = new FormData();
            formData.append('image', {
                uri: asset.uri,
                type: asset.type,
                name: asset.fileName || 'temp_room_image.jpg',
            } as any);

            // We need a roomId to use the existing POST /rooms/:id/image endpoint
            // But we haven't created the room yet. 
            // Alternative: Use a generic upload endpoint if exists, or upload after creation.
            // Actually, the server has UpdateRoomImage(c *fiber.Ctx) which takes :id.

            // For CreateRoom, we might want to just store the uri locally 
            // and upload AFTER room is created, or have a general upload endpoint.

            // Let's check if there is a general upload endpoint.
            // auth_handler has UpdateAvatar but it's for user.

            // Simplest for now: The user might want to see the preview. 
            // Since we don't have a general "upload temp image" endpoint,
            // let's just use the selected image for now or I can add a general upload.

            // Actually, I can just create the room first, then upload the image.
            // Let's change the flow: 
            // 1. handleCreate creates the room.
            // 2. If a custom local image URI is set, upload it to the new room.

            setCustomImageUri(asset.uri);
            setImageUrl('custom'); // Flag that we have a custom image
        } catch (error) {
            console.error('Pick image error:', error);
        } finally {
            setUploadingImage(false);
        }
    };

    const [customImageUri, setCustomImageUri] = useState<string | null>(null);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{t('chat.createRoom')}</Text>

                        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 10 }]}>{t('chat.roomImage') || 'Room Image'}</Text>

                        <View style={styles.imageSelectionContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScrollContent}>
                                <TouchableOpacity
                                    style={[
                                        styles.presetItem,
                                        { backgroundColor: theme.header, borderColor: imageUrl === 'custom' ? theme.accent : 'transparent' }
                                    ]}
                                    onPress={handleUploadImage}
                                >
                                    {customImageUri ? (
                                        <Image source={{ uri: customImageUri }} style={styles.customImagePreview} />
                                    ) : (
                                        <>
                                            <Camera size={26} color={theme.subText} />
                                            <Text style={[styles.presetLabel, { color: theme.subText }]}>
                                                {t('chat.upload')}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                {PRESET_IMAGES.map(preset => (
                                    <TouchableOpacity
                                        key={preset.id}
                                        style={[
                                            styles.presetItem,
                                            { backgroundColor: theme.header },
                                            imageUrl === preset.id && { borderColor: theme.accent }
                                        ]}
                                        onPress={() => {
                                            setImageUrl(preset.id);
                                            setCustomImageUri(null);
                                        }}
                                    >
                                        <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                                        <Text style={[styles.presetLabel, { color: theme.subText }]}>
                                            {t(`chat.presets.${preset.id}`)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.borderColor }]}
                            placeholder={t('chat.roomName')}
                            placeholderTextColor={theme.subText}
                            value={name}
                            onChangeText={setName}
                        />

                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.borderColor, height: 80 }]}
                            placeholder={t('chat.roomDesc')}
                            placeholderTextColor={theme.subText}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />

                        <View style={styles.switchRow}>
                            <Text style={{ color: theme.text }}>{t('chat.isPublic')}</Text>
                            <Switch
                                value={isPublic}
                                onValueChange={setIsPublic}
                                trackColor={{ false: '#767577', true: theme.accent }}
                            />
                        </View>

                        {/* Shared Reading Fields */}
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('chat.readingSettings')}</Text>

                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.borderColor }]}
                            placeholder={t('chat.locationPlaceholder')}
                            placeholderTextColor={theme.subText}
                            value={location}
                            onChangeText={setLocation}
                        />

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: theme.subText, marginBottom: 8 }}>{t('chat.selectScripture')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50 }}>
                                {books.map((book) => (
                                    <TouchableOpacity
                                        key={book.id}
                                        style={[
                                            styles.bookItem,
                                            selectedBook === book.code && { backgroundColor: theme.accent, borderColor: theme.accent }
                                        ]}
                                        onPress={() => setSelectedBook(book.code === selectedBook ? '' : book.code)}
                                    >
                                        <Text style={[
                                            styles.bookText,
                                            { color: selectedBook === book.code ? '#fff' : theme.text }
                                        ]}>
                                            {i18n.language === 'ru' ? (book.name_ru || book.name_en) : (book.name_en || book.name_ru)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('chat.readingSchedule') || 'Reading Schedule'}</Text>
                        <TouchableOpacity
                            style={[styles.scheduleButton, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Bell size={18} color={theme.accent} />
                            <Text style={[styles.scheduleValue, { color: startTime ? theme.text : theme.subText }]}>
                                {startTime ? startTime.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : t('chat.setStartTime') || 'Set Start Time'}
                            </Text>
                            {startTime && (
                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setStartTime(null); }}>
                                    <Text style={{ color: theme.accent, fontSize: 12 }}>{t('common.clear') || 'Clear'}</Text>
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 }}>
                            <Info size={12} color={theme.subText} />
                            <Text style={[styles.scheduleSubLabel, { color: theme.subText }]}>
                                {t('chat.notificationHint') || 'Friends will be notified 15 minutes before'}
                            </Text>
                        </View>

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
                            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                                <Text style={styles.buttonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.accent }]}
                                onPress={handleCreate}
                                disabled={loading}
                            >
                                <Text style={styles.buttonText}>{loading ? t('common.loading') : t('chat.create')}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxHeight: '90%',
        borderRadius: 20,
        padding: 24,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
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
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#666',
    },
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
