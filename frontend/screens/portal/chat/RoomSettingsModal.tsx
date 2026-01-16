import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    useColorScheme,
    Switch,
    ActivityIndicator,
    Alert,
    ScrollView,
    TextInput,
    Image,
    ImageBackground,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, X, Bell, Camera, Image as ImageIcon } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DatePicker from 'react-native-date-picker';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { getMediaUrl } from '../../../utils/url';

interface RoomSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    roomId: number;
    roomName: string;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({ visible, onClose, roomId, roomName }) => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isPublic, setIsPublic] = useState(true);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [bookCode, setBookCode] = useState('');
    const [chapter, setChapter] = useState(1);
    const [verse, setVerse] = useState(1);
    const [readingLanguage, setReadingLanguage] = useState('ru');
    const [showPurport, setShowPurport] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const [isBold, setIsBold] = useState(false);

    // Basic Info Settings
    const [editName, setEditName] = useState(roomName);
    const [editDescription, setEditDescription] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [roomImage, setRoomImage] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const PRESET_IMAGES = [
        { id: 'krishna', emoji: '🕉️' },
        { id: 'japa', emoji: '📿' },
        { id: 'kirtan', emoji: '🪈' },
        { id: 'scriptures', emoji: '📖' },
        { id: 'lotus', emoji: '🌺' },
        { id: 'tulasi', emoji: '🌿' },
        { id: 'deity', emoji: '🙏' },
        { id: 'peacock', emoji: '🦚' },
    ];

    const EMOJI_MAP: any = {
        'krishna': '🕉️',
        'om': '🕉️',
        'japa': '📿',
        'kirtan': '🪈',
        'scriptures': '📖',
        'lotus': '🌺',
        'tulasi': '🌿',
        'deity': '🙏',
        'peacock': '🦚',
        'general': '🕉️',
    };

    const AVAILABLE_BOOKS = [
        { code: 'bg', name: 'Bhagavad Gita' },
        { code: 'sb', name: 'Srimad Bhagavatam' },
        { code: 'cc', name: 'Caitanya Caritamrta' },
        { code: 'iso', name: 'Isopanisad' },
        { code: 'nod', name: 'Nectar of Devotion' },
    ];

    const fetchSettings = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_PATH}/rooms/${roomId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const currentRoom = await response.json();
                setIsPublic(currentRoom.isPublic);
                setAiEnabled(currentRoom.aiEnabled);
                setBookCode(currentRoom.bookCode || '');
                setChapter(currentRoom.currentChapter || 1);
                setVerse(currentRoom.currentVerse || 1);
                setReadingLanguage(currentRoom.language || 'ru');
                setShowPurport(currentRoom.showPurport || false);
                setEditName(currentRoom.name || roomName);
                setEditDescription(currentRoom.description || '');
                setEditLocation(currentRoom.location || '');
                setRoomImage(currentRoom.imageUrl || null);
                if (currentRoom.startTime) {
                    setStartTime(new Date(currentRoom.startTime));
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchSettings();
            loadFontSettings();
        }
    }, [visible]);

    const loadFontSettings = async () => {
        try {
            const size = await AsyncStorage.getItem('reader_font_size');
            const bold = await AsyncStorage.getItem('reader_font_bold');
            if (size) setFontSize(parseInt(size));
            if (bold) setIsBold(bold === 'true');
        } catch (e) {
            console.error('Failed to load font settings', e);
        }
    };

    const saveFontSettings = async (size: number, bold: boolean) => {
        try {
            await AsyncStorage.setItem('reader_font_size', size.toString());
            await AsyncStorage.setItem('reader_font_bold', bold.toString());
        } catch (e) {
            console.error('Failed to save font settings', e);
        }
    };

    const handleUpdateSettings = async (updates: any) => {
        setSaving(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_PATH}/rooms/${roomId}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                Alert.alert(t('common.error'), errorData.error || 'Failed to update settings');
            }
        } catch (error) {
            Alert.alert(t('common.error'), 'Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePublic = (value: boolean) => {
        setIsPublic(value);
        handleUpdateSettings({ isPublic: value });
    };

    const handleToggleAi = (value: boolean) => {
        setAiEnabled(value);
        handleUpdateSettings({ aiEnabled: value });
    };

    const handleSaveReading = async () => {
        await handleUpdateSettings({
            bookCode,
            currentChapter: Number(chapter),
            currentVerse: Number(verse),
            language: readingLanguage,
            showPurport: showPurport,
            name: editName,
            description: editDescription,
            location: editLocation,
            startTime: startTime ? startTime.toISOString() : null
        });
        onClose();
    };

    const handleSelectPreset = (presetId: string) => {
        setRoomImage(presetId);
        handleUpdateSettings({ imageUrl: presetId });
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
                name: asset.fileName || 'room_image.jpg',
            } as any);

            const response = await fetch(`${API_PATH}/rooms/${roomId}/image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setRoomImage(data.imageUrl);
                Alert.alert(t('common.success'), t('chat.imageUpdated') || 'Image updated');
            } else {
                Alert.alert(t('common.error'), 'Failed to upload image');
            }
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert(t('common.error'), 'Upload failed');
        } finally {
            setUploadingImage(false);
        }
    };


    // Helper to render book items
    const renderBookItem = (item: { code: string; name: string }) => (
        <TouchableOpacity
            key={item.code}
            style={[
                styles.bookItem,
                bookCode === item.code && { backgroundColor: theme.accent, borderColor: theme.accent }
            ]}
            onPress={() => setBookCode(item.code)}
        >
            <Text style={[
                styles.bookItemText,
                bookCode === item.code ? { color: '#fff' } : { color: theme.text }
            ]}>
                {t(`reader.books.${item.code}`) || item.name}
            </Text>
        </TouchableOpacity>
    );

    // ... (inside render)

    const handleGetSummary = async () => {
        setSummaryLoading(true);
        try {
            const response = await fetch(`${API_PATH}/rooms/${roomId}/summary`);
            const data = await response.json();
            if (response.ok) {
                Alert.alert(t('chat.summary') || 'Chat Summary', data.summary);
            } else {
                Alert.alert(t('common.error'), data.error || 'Failed to get summary');
            }
        } catch (error) {
            Alert.alert(t('common.error'), 'Network error');
        } finally {
            setSummaryLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.headerIcon}>
                            <X size={28} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>
                            {roomName} - {t('common.settings')}
                        </Text>
                        <TouchableOpacity onPress={handleSaveReading} style={styles.headerIcon}>
                            <Check size={28} color={theme.accent} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={theme.accent} style={{ margin: 20 }} />
                    ) : (
                        <ScrollView
                            style={styles.settingsContainer}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >
                            {/* Image Selection Section */}
                            <Text style={[styles.sectionHeader, { color: theme.text, textAlign: 'center', marginBottom: 12 }]}>{t('chat.roomImage') || 'Room Image'}</Text>
                            <View style={styles.imageSection}>
                                <TouchableOpacity
                                    style={[styles.imagePreviewContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                    onPress={handleUploadImage}
                                    disabled={uploadingImage}
                                >
                                    {uploadingImage ? (
                                        <ActivityIndicator color={theme.accent} />
                                    ) : roomImage && !EMOJI_MAP[roomImage] ? (
                                        <Image source={{ uri: getMediaUrl(roomImage) || '' }} style={styles.roomImagePreview} />
                                    ) : roomImage && EMOJI_MAP[roomImage] ? (
                                        <Text style={styles.roomImageEmoji}>{EMOJI_MAP[roomImage]}</Text>
                                    ) : (
                                        <Camera size={40} color={theme.subText} />
                                    )}
                                    <View style={styles.cameraIconBadge}>
                                        <Camera size={14} color="#fff" />
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.presetContainer}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {PRESET_IMAGES.map(item => (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[
                                                    styles.presetItem,
                                                    roomImage === item.id && { backgroundColor: theme.accent + '30', borderColor: theme.accent }
                                                ]}
                                                onPress={() => handleSelectPreset(item.id)}
                                            >
                                                <Text style={styles.presetEmoji}>{item.emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            {/* Basic Info Section */}
                            <Text style={[styles.sectionHeader, { color: theme.text }]}>{t('chat.roomName') || 'Room Name'}</Text>
                            <TextInput
                                style={[styles.textInput, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder={t('chat.roomName')}
                                placeholderTextColor={theme.subText}
                            />

                            <Text style={[styles.sectionHeader, { color: theme.text }]}>{t('chat.roomDesc') || 'Description'}</Text>
                            <TextInput
                                style={[styles.textInput, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground, height: 60 }]}
                                value={editDescription}
                                onChangeText={setEditDescription}
                                placeholder={t('chat.roomDesc')}
                                placeholderTextColor={theme.subText}
                                multiline
                            />

                            <Text style={[styles.sectionHeader, { color: theme.text }]}>Location (City, Yatra)</Text>
                            <TextInput
                                style={[styles.textInput, { color: theme.text, borderColor: theme.borderColor, backgroundColor: theme.inputBackground }]}
                                value={editLocation}
                                onChangeText={setEditLocation}
                                placeholder={t('chat.locationPlaceholder') || "E.g. Moscow, ISKCON"}
                                placeholderTextColor={theme.subText}
                            />

                            <View style={styles.divider} />

                            {/* Shared Reading Section */}
                            <Text style={[styles.sectionHeader, { color: theme.text }]}>{t('reader.settings') || 'Shared Reading'}</Text>

                            <View style={styles.bookList}>
                                {AVAILABLE_BOOKS.map(renderBookItem)}
                            </View>

                            <View style={styles.verseInputContainer}>
                                <View style={styles.inputWrapper}>
                                    <Text style={{ color: theme.text }}>{t('reader.chapter') || 'Chapter'}</Text>
                                    <View style={[styles.numberInput, { backgroundColor: theme.inputBackground }]}>
                                        <TouchableOpacity onPress={() => setChapter(Math.max(1, chapter - 1))}>
                                            <Text style={{ fontSize: 20, color: theme.text }}>-</Text>
                                        </TouchableOpacity>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{chapter}</Text>
                                        <TouchableOpacity onPress={() => setChapter(chapter + 1)}>
                                            <Text style={{ fontSize: 20, color: theme.text }}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputWrapper}>
                                    <Text style={{ color: theme.text }}>{t('reader.verse') || 'Verse'}</Text>
                                    <View style={[styles.numberInput, { backgroundColor: theme.inputBackground }]}>
                                        <TouchableOpacity onPress={() => setVerse(Math.max(1, verse - 1))}>
                                            <Text style={{ fontSize: 20, color: theme.text }}>-</Text>
                                        </TouchableOpacity>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{verse}</Text>
                                        <TouchableOpacity onPress={() => setVerse(verse + 1)}>
                                            <Text style={{ fontSize: 20, color: theme.text }}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Font Settings Section - LOCAL ONLY */}
                            <Text style={[styles.sectionHeader, { color: theme.text }]}>{t('reader.fontSettings') || 'Font Settings'}</Text>

                            <View style={styles.fontSettingsRow}>
                                <View style={styles.fontControl}>
                                    <Text style={{ color: theme.text, fontSize: 12, marginBottom: 4 }}>{t('reader.fontSize') || 'Size'}</Text>
                                    <View style={[styles.numberInput, { backgroundColor: theme.inputBackground }]}>
                                        <TouchableOpacity onPress={() => {
                                            const newSize = Math.max(12, fontSize - 2);
                                            setFontSize(newSize);
                                            saveFontSettings(newSize, isBold);
                                        }}>
                                            <Text style={{ fontSize: 20, color: theme.text }}>A-</Text>
                                        </TouchableOpacity>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{fontSize}</Text>
                                        <TouchableOpacity onPress={() => {
                                            const newSize = Math.min(30, fontSize + 2);
                                            setFontSize(newSize);
                                            saveFontSettings(newSize, isBold);
                                        }}>
                                            <Text style={{ fontSize: 20, color: theme.text }}>A+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.fontControl}>
                                    <Text style={{ color: theme.text, fontSize: 12, marginBottom: 4 }}>{t('reader.fontStyle') || 'Style'}</Text>
                                    <TouchableOpacity
                                        style={[styles.boldButton, isBold && { backgroundColor: theme.accent }]}
                                        onPress={() => {
                                            const newBold = !isBold;
                                            setIsBold(newBold);
                                            saveFontSettings(fontSize, newBold);
                                        }}
                                    >
                                        <Text style={[styles.boldButtonText, { color: isBold ? '#fff' : theme.text }]}>
                                            {t('reader.bold') || 'BOLD'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Language & Purport Settings */}
                            <View style={styles.settingItem}>
                                <View>
                                    <Text style={[styles.settingLabel, { color: theme.text }]}>
                                        {t('reader.language') || 'Reading Language'}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {['ru', 'en'].map(lang => (
                                        <TouchableOpacity
                                            key={lang}
                                            style={[
                                                styles.langButton,
                                                readingLanguage === lang && { backgroundColor: theme.accent }
                                            ]}
                                            onPress={() => setReadingLanguage(lang)}
                                        >
                                            <Text style={{
                                                color: readingLanguage === lang ? '#fff' : theme.text,
                                                fontWeight: 'bold'
                                            }}>{lang.toUpperCase()}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.settingItem}>
                                <View>
                                    <Text style={[styles.settingLabel, { color: theme.text }]}>
                                        {t('reader.showPurport') || 'Show Purport'}
                                    </Text>
                                    <Text style={[styles.settingSubLabel, { color: theme.subText }]}>
                                        {t('reader.showPurportDesc') || 'Display verse commentaries'}
                                    </Text>
                                </View>
                                <Switch
                                    value={showPurport}
                                    onValueChange={setShowPurport}
                                    trackColor={{ false: '#767577', true: theme.accent }}
                                    thumbColor={showPurport ? '#fff' : '#f4f3f4'}
                                />
                            </View>



                            <View style={styles.divider} />
                            <View style={styles.divider} />

                            {/* Schedule Section */}
                            <Text style={[styles.sectionHeader, { color: theme.text }]}>
                                {t('chat.readingSchedule') || 'Reading Schedule'}
                            </Text>

                            <TouchableOpacity
                                style={[styles.scheduleButton, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Bell size={20} color={theme.primary || theme.accent} />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={[styles.scheduleValue, { color: theme.text }]}>
                                        {startTime ? startTime.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : (t('chat.setStartTime') || 'Set Start Time')}
                                    </Text>
                                    <Text style={[styles.scheduleSubLabel, { color: theme.subText }]}>
                                        {t('chat.notificationHint') || 'Friends will be notified 15 minutes before'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <DatePicker
                                modal
                                open={showDatePicker}
                                date={startTime || new Date()}
                                onConfirm={(date) => {
                                    setShowDatePicker(false);
                                    setStartTime(date);
                                }}
                                onCancel={() => {
                                    setShowDatePicker(false);
                                }}
                                title={t('chat.selectStartTime') || "Select Start Time"}
                                confirmText={t('common.confirm') || "Confirm"}
                                cancelText={t('common.cancel') || "Cancel"}
                            />

                            <View style={styles.divider} />
                            <View style={styles.settingItem}>
                                <View>
                                    <Text style={[styles.settingLabel, { color: theme.text }]}>
                                        {t('chat.publicRoom') || 'Public Room'}
                                    </Text>
                                    <Text style={[styles.settingSubLabel, { color: theme.subText }]}>
                                        {t('chat.publicRoomDesc') || 'Anyone can find and join'}
                                    </Text>
                                </View>
                                <Switch
                                    value={isPublic}
                                    onValueChange={(val) => { setIsPublic(val); handleUpdateSettings({ isPublic: val }); }}
                                    trackColor={{ false: '#767577', true: theme.accent }}
                                    thumbColor={isPublic ? '#fff' : '#f4f3f4'}
                                    disabled={saving}
                                />
                            </View>

                            <View style={styles.settingItem}>
                                <View>
                                    <Text style={[styles.settingLabel, { color: theme.text }]}>
                                        {t('chat.aiAssistant') || 'AI Assistant'}
                                    </Text>
                                    <Text style={[styles.settingSubLabel, { color: theme.subText }]}>
                                        {t('chat.aiAssistantDesc') || 'AI joins the conversation'}
                                    </Text>
                                </View>
                                <Switch
                                    value={aiEnabled}
                                    onValueChange={handleToggleAi}
                                    trackColor={{ false: '#767577', true: theme.accent }}
                                    thumbColor={aiEnabled ? '#fff' : '#f4f3f4'}
                                    disabled={saving}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: theme.header }]}
                                onPress={handleGetSummary}
                                disabled={summaryLoading}
                            >
                                {summaryLoading ? (
                                    <ActivityIndicator size="small" color={theme.accent} />
                                ) : (
                                    <Text style={[styles.actionButtonText, { color: theme.text }]}>
                                        📝 {t('chat.getSummary') || 'Get Chat Summary'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    )}
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
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    headerIcon: {
        padding: 4,
        width: 40,
        alignItems: 'center',
    },
    settingsContainer: {
        flex: 1,
        marginBottom: 8,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#ccc',
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    settingSubLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    actionButton: {
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    scheduleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    scheduleValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    scheduleSubLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    imagePreviewContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: 16,
    },
    roomImagePreview: {
        width: '100%',
        height: '100%',
    },
    roomImageEmoji: {
        fontSize: 50,
    },
    cameraIconBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: COLORS.dark.accent,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    presetContainer: {
        width: '100%',
        paddingHorizontal: 10,
    },
    presetItem: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    presetEmoji: {
        fontSize: 24,
    },
    closeButton: {
        alignItems: 'center',
        padding: 12,
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    // New Styles
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 12,
    },
    bookList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    bookItem: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },
    bookItemText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    verseInputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    inputWrapper: {
        width: '48%',
        alignItems: 'center',
    },
    numberInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginTop: 8,
    },
    saveButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#ccc',
        marginVertical: 10,
        opacity: 0.5,
    },
    langButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    fontSettingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    fontControl: {
        width: '48%',
        alignItems: 'center',
    },
    boldButton: {
        width: '100%',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        alignItems: 'center',
        marginTop: 8,
    },
    boldButtonText: {
        fontWeight: 'bold',
        fontSize: 14,
    }
});
