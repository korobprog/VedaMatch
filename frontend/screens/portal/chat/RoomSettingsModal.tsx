import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Switch,
    ActivityIndicator,
    Alert,
    ScrollView,
    TextInput,
    Image,
    Animated,
    Easing,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, X, Bell, Camera } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DatePicker from 'react-native-date-picker';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { getMediaUrl } from '../../../utils/url';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { usePressFeedback } from '../../../hooks/usePressFeedback';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';
import { authorizedFetch } from '../../../services/authSessionService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RoomSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    roomId: number;
    roomName: string;
}

const extractApiErrorMessage = (payload: unknown, fallback: string): string => {
    if (typeof payload === 'object' && payload !== null) {
        const maybePayload = payload as { error?: string; message?: string };
        if (maybePayload.error) return maybePayload.error;
        if (maybePayload.message) return maybePayload.message;
    }
    return fallback;
};

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({ visible, onClose, roomId, roomName }) => {
    const { t } = useTranslation();
    const { isDarkMode, vTheme, portalBackgroundType } = useSettings();
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { colors } = useRoleTheme(undefined, isDarkMode);
    const isPhotoBg = portalBackgroundType === 'image';
    const triggerTapFeedback = usePressFeedback();
    const textPrimary = isPhotoBg ? '#F8FAFC' : colors.textPrimary;
    const textSecondary = isPhotoBg ? 'rgba(226,232,240,0.92)' : colors.textSecondary;
    const surfaceStrong = isPhotoBg ? 'rgba(30,41,59,0.92)' : colors.surface;
    const surfaceMuted = isPhotoBg ? 'rgba(30,41,59,0.95)' : vTheme.colors.backgroundSecondary;
    const borderStrong = isPhotoBg ? 'rgba(148,163,184,0.58)' : colors.border;
    const dividerStrong = isPhotoBg ? 'rgba(148,163,184,0.42)' : vTheme.colors.divider;
    const modalSurface = isPhotoBg ? 'rgba(15,23,42,0.97)' : colors.surfaceElevated;
    const modalBorder = isPhotoBg ? 'rgba(148,163,184,0.45)' : colors.border;

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
    const [enableReading, setEnableReading] = useState(true);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [roomImage, setRoomImage] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const modalOpacity = useRef(new Animated.Value(0)).current;
    const modalTranslateY = useRef(new Animated.Value(400)).current;
    const isMountedRef = useRef(true);
    const latestSettingsRequestRef = useRef(0);
    const latestUpdateRequestRef = useRef(0);

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

    const EMOJI_MAP: Record<string, string> = {
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

    const loadFontSettings = useCallback(async () => {
        try {
            const size = await AsyncStorage.getItem('reader_font_size');
            const bold = await AsyncStorage.getItem('reader_font_bold');
            const parsedSize = Number.parseInt(String(size ?? ''), 10);
            if (Number.isFinite(parsedSize) && parsedSize >= 12 && parsedSize <= 30 && isMountedRef.current) {
                setFontSize(parsedSize);
            }
            if (bold && isMountedRef.current) setIsBold(bold === 'true');
        } catch (e) {
            console.error('Failed to load font settings', e);
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        const requestId = ++latestSettingsRequestRef.current;
        try {
            const response = await authorizedFetch(`${API_PATH}/rooms/${roomId}`);
            if (response.ok) {
                const currentRoom = await response.json();
                if (!isMountedRef.current || requestId !== latestSettingsRequestRef.current) {
                    return;
                }
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
                setEnableReading(!!currentRoom.bookCode);
                if (currentRoom.startTime) {
                    setStartTime(new Date(currentRoom.startTime));
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            if (isMountedRef.current && requestId === latestSettingsRequestRef.current) {
                setLoading(false);
            }
        }
    }, [roomId, roomName]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestSettingsRequestRef.current += 1;
            latestUpdateRequestRef.current += 1;
        };
    }, []);

    useEffect(() => {
        if (visible) {
            setLoading(true);
            fetchSettings();
            loadFontSettings();
        }
    }, [fetchSettings, loadFontSettings, visible]);

    useEffect(() => {
        if (!visible) return;
        modalOpacity.setValue(0);
        modalTranslateY.setValue(400);
        Animated.parallel([
            Animated.timing(modalOpacity, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.spring(modalTranslateY, {
                toValue: 0,
                damping: 24,
                stiffness: 240,
                mass: 0.8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [visible, modalOpacity, modalTranslateY]);

    const saveFontSettings = async (size: number, bold: boolean) => {
        try {
            await AsyncStorage.setItem('reader_font_size', size.toString());
            await AsyncStorage.setItem('reader_font_bold', bold.toString());
        } catch (e) {
            console.error('Failed to save font settings', e);
        }
    };

    const handleToggleAi = (val: boolean) => {
        if (saving) {
            return;
        }
        const previous = aiEnabled;
        setAiEnabled(val);
        void handleUpdateSettings({ aiEnabled: val }).then((updated) => {
            if (!updated && isMountedRef.current) {
                setAiEnabled(previous);
            }
        });
    };

    const handleTogglePublic = (val: boolean) => {
        if (saving) {
            return;
        }
        const previous = isPublic;
        setIsPublic(val);
        void handleUpdateSettings({ isPublic: val }).then((updated) => {
            if (!updated && isMountedRef.current) {
                setIsPublic(previous);
            }
        });
    };

    const handleUpdateSettings = async (updates: Record<string, unknown>): Promise<boolean> => {
        const requestId = ++latestUpdateRequestRef.current;
        if (isMountedRef.current) {
            setSaving(true);
        }
        try {
            const response = await authorizedFetch(`${API_PATH}/rooms/${roomId}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                if (isMountedRef.current) {
                    Alert.alert(t('common.error'), extractApiErrorMessage(errorData, 'Failed to update settings'));
                }
                return false;
            }
            return true;
        } catch (error) {
            console.error('Failed to update room settings', error);
            if (isMountedRef.current) {
                Alert.alert(t('common.error'), 'Network error');
            }
            return false;
        } finally {
            if (isMountedRef.current && requestId === latestUpdateRequestRef.current) {
                setSaving(false);
            }
        }
    };

    const handleSaveReading = async () => {
        const normalizedName = editName.trim();
        const normalizedDescription = editDescription.trim();
        const normalizedLocation = editLocation.trim();
        if (!normalizedName) {
            Alert.alert(t('common.error'), t('chat.roomNameRequired') || 'Room name is required');
            return;
        }
        if (enableReading && !bookCode.trim()) {
            Alert.alert(t('common.error'), t('reader.selectBook') || 'Select a scripture first');
            return;
        }
        const nextChapter = Math.max(1, Number(chapter) || 1);
        const nextVerse = Math.max(1, Number(verse) || 1);
        const updated = await handleUpdateSettings({
            bookCode: enableReading ? bookCode : '',
            currentChapter: enableReading ? nextChapter : 1,
            currentVerse: enableReading ? nextVerse : 1,
            language: readingLanguage,
            showPurport: showPurport,
            name: normalizedName,
            description: normalizedDescription,
            location: enableReading ? normalizedLocation : '',
            startTime: (enableReading && startTime) ? startTime.toISOString() : null
        });
        if (updated) {
            onClose();
        }
    };

    const handleSelectPreset = (presetId: string) => {
        const previousImage = roomImage;
        setRoomImage(presetId);
        void handleUpdateSettings({ imageUrl: presetId }).then((updated) => {
            if (!updated && isMountedRef.current) {
                setRoomImage(previousImage);
            }
        });
    };

    const handleUploadImage = async () => {
        if (uploadingImage) return;
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                includeBase64: false,
            });

            if (result.didCancel || !result.assets || result.assets.length === 0) return;

            const asset = result.assets[0];
            if (!asset.uri) return;

            if (isMountedRef.current) {
                setUploadingImage(true);
            }
            const formData = new FormData();
            formData.append('image', {
                uri: asset.uri,
                type: asset.type || 'image/jpeg',
                name: asset.fileName || 'room_image.jpg',
            } as any);

            const response = await authorizedFetch(`${API_PATH}/rooms/${roomId}/image`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                if (isMountedRef.current) {
                    setRoomImage(data.imageUrl);
                    Alert.alert(t('common.success'), t('chat.imageUpdated') || 'Image updated');
                }
            } else {
                const errorData = await response.json().catch(() => null);
                if (isMountedRef.current) {
                    Alert.alert(t('common.error'), extractApiErrorMessage(errorData, 'Failed to upload image'));
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            if (isMountedRef.current) {
                Alert.alert(t('common.error'), 'Upload failed');
            }
        } finally {
            if (isMountedRef.current) {
                setUploadingImage(false);
            }
        }
    };


    // Helper to render book items
    const renderBookItem = (item: { code: string; name: string }) => (
        <TouchableOpacity
            key={item.code}
            style={[
                styles.bookItem,
                { backgroundColor: surfaceStrong, borderColor: borderStrong },
                bookCode === item.code && { backgroundColor: theme.accent, borderColor: theme.accent }
            ]}
            onPress={() => setBookCode(item.code)}
        >
            <Text style={[
                styles.bookItemText,
                bookCode === item.code ? { color: '#fff' } : { color: textPrimary }
            ]}>
                {t(`reader.books.${item.code}`) || item.name}
            </Text>
        </TouchableOpacity>
    );

    const handleGetSummary = async () => {
        if (isMountedRef.current) {
            setSummaryLoading(true);
        }
        try {
            const response = await authorizedFetch(`${API_PATH}/rooms/${roomId}/summary`);
            const data = await response.json();
            if (response.ok) {
                if (isMountedRef.current) {
                    Alert.alert(t('chat.summary') || 'Chat Summary', data.summary);
                }
            } else {
                if (isMountedRef.current) {
                    Alert.alert(t('common.error'), data.error || 'Failed to get summary');
                }
            }
        } catch (error) {
            console.error('Failed to get chat summary', error);
            if (isMountedRef.current) {
                Alert.alert(t('common.error'), 'Network error');
            }
        } finally {
            if (isMountedRef.current) {
                setSummaryLoading(false);
            }
        }
    };

    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <KeyboardAwareContainer style={{ width: '100%' }} useTopInset={false}>
                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: modalSurface,
                                borderColor: modalBorder,
                                paddingBottom: Math.max(insets.bottom, 16) + 16,
                            },
                            {
                                opacity: modalOpacity,
                                transform: [{ translateY: modalTranslateY }],
                            },
                        ]}
                    >
                        <View style={styles.header}>
                            <TouchableOpacity
                                activeOpacity={0.88}
                                onPress={() => {
                                    triggerTapFeedback();
                                    onClose();
                                }}
                                style={[
                                    styles.headerIcon,
                                    {
                                        backgroundColor: surfaceStrong,
                                        borderColor: borderStrong,
                                    }
                                ]}
                            >
                                <X size={20} color={textPrimary} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: textPrimary }]} numberOfLines={1}>
                                {roomName} - {t('common.settings')}
                            </Text>
                            <TouchableOpacity
                                activeOpacity={0.88}
                                onPress={() => {
                                    triggerTapFeedback();
                                    handleSaveReading();
                                }}
                                disabled={saving || uploadingImage}
                                style={[
                                    styles.headerIcon,
                                    {
                                        backgroundColor: colors.accent,
                                        borderColor: colors.accent,
                                        opacity: saving || uploadingImage ? 0.6 : 1,
                                    }
                                ]}
                            >
                                <Check size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color={theme.accent} style={{ margin: 20 }} />
                        ) : (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* Image Selection Section */}
                                <Text style={[styles.sectionHeader, { color: textPrimary, textAlign: 'center', marginBottom: 12 }]}>{t('chat.roomImage') || 'Room Image'}</Text>
                                <View style={styles.imageSection}>
                                    <TouchableOpacity
                                        activeOpacity={0.88}
                                        style={[
                                            styles.imagePreviewContainer,
                                            {
                                                backgroundColor: surfaceStrong,
                                                borderColor: borderStrong,
                                            }
                                        ]}
                                        onPress={() => {
                                            triggerTapFeedback();
                                            handleUploadImage();
                                        }}
                                        disabled={uploadingImage}
                                    >
                                        {uploadingImage ? (
                                            <ActivityIndicator color={theme.accent} />
                                        ) : roomImage && !EMOJI_MAP[roomImage] ? (
                                            <Image source={{ uri: getMediaUrl(roomImage) || '' }} style={styles.roomImagePreview} />
                                        ) : roomImage && EMOJI_MAP[roomImage] ? (
                                            <Text style={styles.roomImageEmoji}>{EMOJI_MAP[roomImage]}</Text>
                                        ) : (
                                            <Camera size={40} color={textSecondary} />
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
                                                    activeOpacity={0.88}
                                                    style={[
                                                        styles.presetItem,
                                                        {
                                                            backgroundColor: surfaceStrong,
                                                            borderColor: borderStrong,
                                                        },
                                                        roomImage === item.id && { backgroundColor: colors.accentSoft, borderColor: colors.accent }
                                                    ]}
                                                    onPress={() => {
                                                        triggerTapFeedback();
                                                        handleSelectPreset(item.id);
                                                    }}
                                                >
                                                    <Text style={styles.presetEmoji}>{item.emoji}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>

                                {/* Basic Info Section */}
                                <Text style={[styles.sectionHeader, { color: textPrimary }]}>{t('chat.roomName') || 'Room Name'}</Text>
                                <TextInput
                                    style={[
                                        styles.textInput,
                                        {
                                            color: textPrimary,
                                            borderColor: borderStrong,
                                            backgroundColor: surfaceStrong,
                                        }
                                    ]}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder={t('chat.roomName')}
                                    placeholderTextColor={textSecondary}
                                />

                                <Text style={[styles.sectionHeader, { color: textPrimary }]}>{t('chat.roomDesc') || 'Description'}</Text>
                                <TextInput
                                    style={[
                                        styles.textInput,
                                        {
                                            color: textPrimary,
                                            borderColor: borderStrong,
                                            backgroundColor: surfaceStrong,
                                            height: 72
                                        }
                                    ]}
                                    value={editDescription}
                                    onChangeText={setEditDescription}
                                    placeholder={t('chat.roomDesc')}
                                    placeholderTextColor={textSecondary}
                                    multiline
                                />

                                <View style={[styles.switchRow, { borderBottomColor: dividerStrong, borderBottomWidth: 0.5, paddingVertical: 12 }]}>
                                    <View style={styles.settingTextBlock}>
                                        <Text style={[styles.settingLabel, { color: textPrimary }]}>
                                            {t('chat.enableReading') || 'Enable Scripture Reading'}
                                        </Text>
                                        <Text style={[styles.settingSubLabel, { color: textSecondary }]}>
                                            {t('chat.enableReadingDesc') || 'Focus room on studying scriptures'}
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
                                        <Text style={[styles.sectionHeader, { color: textPrimary }]}>Location (City, Yatra)</Text>
                                        <TextInput
                                            style={[
                                                styles.textInput,
                                                {
                                                    color: textPrimary,
                                                    borderColor: borderStrong,
                                                    backgroundColor: surfaceStrong,
                                                }
                                            ]}
                                            value={editLocation}
                                            onChangeText={setEditLocation}
                                            placeholder={t('chat.locationPlaceholder') || "E.g. Moscow, ISKCON"}
                                            placeholderTextColor={textSecondary}
                                        />

                                        <View style={[styles.divider, { backgroundColor: dividerStrong }]} />

                                        {/* Shared Reading Section */}
                                        <Text style={[styles.sectionHeader, { color: textPrimary }]}>{t('reader.settings') || 'Shared Reading'}</Text>

                                        <View style={styles.bookList}>
                                            {AVAILABLE_BOOKS.map(renderBookItem)}
                                        </View>

                                        <View style={styles.verseInputContainer}>
                                            <View style={styles.inputWrapper}>
                                                <Text style={{ color: textPrimary }}>{t('reader.chapter') || 'Chapter'}</Text>
                                                <View style={[styles.numberInput, { backgroundColor: surfaceMuted, borderColor: borderStrong }]}>
                                                    <TouchableOpacity onPress={() => setChapter(Math.max(1, chapter - 1))}>
                                                        <Text style={{ fontSize: 20, color: textPrimary }}>-</Text>
                                                    </TouchableOpacity>
                                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: textPrimary }}>{chapter}</Text>
                                                    <TouchableOpacity onPress={() => setChapter(chapter + 1)}>
                                                        <Text style={{ fontSize: 20, color: textPrimary }}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            <View style={styles.inputWrapper}>
                                                <Text style={{ color: textPrimary }}>{t('reader.verse') || 'Verse'}</Text>
                                                <View style={[styles.numberInput, { backgroundColor: surfaceMuted, borderColor: borderStrong }]}>
                                                    <TouchableOpacity onPress={() => setVerse(Math.max(1, verse - 1))}>
                                                        <Text style={{ fontSize: 20, color: textPrimary }}>-</Text>
                                                    </TouchableOpacity>
                                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: textPrimary }}>{verse}</Text>
                                                    <TouchableOpacity onPress={() => setVerse(verse + 1)}>
                                                        <Text style={{ fontSize: 20, color: textPrimary }}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    </>
                                )}

                                <View style={[styles.divider, { backgroundColor: dividerStrong }]} />

                                {/* Font Settings Section - LOCAL ONLY */}
                                <Text style={[styles.sectionHeader, { color: textPrimary }]}>{t('reader.fontSettings') || 'Font Settings'}</Text>

                                <View style={styles.fontSettingsRow}>
                                    <View style={styles.fontControl}>
                                        <Text style={{ color: textPrimary, fontSize: 12, marginBottom: 4 }}>{t('reader.fontSize') || 'Size'}</Text>
                                        <View style={[styles.numberInput, { backgroundColor: surfaceMuted, borderColor: borderStrong }]}>
                                            <TouchableOpacity onPress={() => {
                                                const newSize = Math.max(12, fontSize - 2);
                                                setFontSize(newSize);
                                                saveFontSettings(newSize, isBold);
                                            }}>
                                                <Text style={{ fontSize: 20, color: textPrimary }}>A-</Text>
                                            </TouchableOpacity>
                                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: textPrimary }}>{fontSize}</Text>
                                            <TouchableOpacity onPress={() => {
                                                const newSize = Math.min(30, fontSize + 2);
                                                setFontSize(newSize);
                                                saveFontSettings(newSize, isBold);
                                            }}>
                                                <Text style={{ fontSize: 20, color: textPrimary }}>A+</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.fontControl}>
                                        <Text style={{ color: textPrimary, fontSize: 12, marginBottom: 4 }}>{t('reader.fontStyle') || 'Style'}</Text>
                                        <TouchableOpacity
                                            style={[styles.boldButton, isBold && { backgroundColor: theme.accent }]}
                                            onPress={() => {
                                                const newBold = !isBold;
                                                setIsBold(newBold);
                                                saveFontSettings(fontSize, newBold);
                                            }}
                                        >
                                            <Text style={[styles.boldButtonText, { color: isBold ? '#fff' : textPrimary }]}>
                                                {t('reader.bold') || 'BOLD'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={[styles.divider, { backgroundColor: dividerStrong }]} />

                                {/* Language & Purport Settings */}
                                <View style={[styles.settingItem, { borderBottomColor: borderStrong }]}>
                                    <View style={styles.settingTextBlock}>
                                        <Text style={[styles.settingLabel, { color: textPrimary }]}>
                                            {t('reader.language') || 'Reading Language'}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {['ru', 'en'].map(lang => (
                                            <TouchableOpacity
                                                key={lang}
                                                activeOpacity={0.88}
                                                style={[
                                                    styles.langButton,
                                                    {
                                                        backgroundColor: surfaceStrong,
                                                        borderColor: borderStrong,
                                                    },
                                                    readingLanguage === lang && { backgroundColor: colors.accent, borderColor: colors.accent }
                                                ]}
                                                onPress={() => {
                                                    triggerTapFeedback();
                                                    setReadingLanguage(lang);
                                                }}
                                            >
                                                <Text style={{
                                                    color: readingLanguage === lang ? '#fff' : textPrimary,
                                                    fontWeight: 'bold'
                                                }}>{lang.toUpperCase()}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={[styles.settingItem, { borderBottomColor: borderStrong }]}>
                                    <View style={styles.settingTextBlock}>
                                        <Text style={[styles.settingLabel, { color: textPrimary }]}>
                                            {t('reader.showPurport') || 'Show Purport'}
                                        </Text>
                                        <Text style={[styles.settingSubLabel, { color: textSecondary }]}>
                                            {t('reader.showPurportDesc') || 'Display verse commentaries'}
                                        </Text>
                                    </View>
                                    <Switch
                                        style={styles.switchControl}
                                        value={showPurport}
                                        onValueChange={setShowPurport}
                                        trackColor={{ false: colors.border, true: colors.accent }}
                                        thumbColor={showPurport ? '#fff' : '#f4f3f4'}
                                    />
                                </View>



                                <View style={[styles.divider, { backgroundColor: dividerStrong }]} />

                                {/* Schedule Section */}
                                <Text style={[styles.sectionHeader, { color: textPrimary }]}>
                                    {t('chat.readingSchedule') || 'Reading Schedule'}
                                </Text>

                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[
                                        styles.scheduleButton,
                                        {
                                            backgroundColor: surfaceStrong,
                                            borderColor: borderStrong,
                                        }
                                    ]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Bell size={20} color={colors.accent} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={[styles.scheduleValue, { color: textPrimary }]}>
                                            {startTime ? startTime.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : (t('chat.setStartTime') || 'Set Start Time')}
                                        </Text>
                                        <Text style={[styles.scheduleSubLabel, { color: textSecondary }]}>
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

                                <View style={[styles.divider, { backgroundColor: dividerStrong }]} />
                                <View style={[styles.settingItem, { borderBottomColor: borderStrong }]}>
                                    <View style={styles.settingTextBlock}>
                                        <Text style={[styles.settingLabel, { color: textPrimary }]}>
                                            {t('chat.publicRoom') || 'Public Room'}
                                        </Text>
                                        <Text style={[styles.settingSubLabel, { color: textSecondary }]}>
                                            {t('chat.publicRoomDesc') || 'Anyone can find and join'}
                                        </Text>
                                    </View>
                                    <Switch
                                        style={styles.switchControl}
                                        value={isPublic}
                                        onValueChange={handleTogglePublic}
                                        trackColor={{ false: colors.border, true: colors.accent }}
                                        thumbColor={isPublic ? '#fff' : '#f4f3f4'}
                                        disabled={saving}
                                    />
                                </View>

                                <View style={[styles.settingItem, { borderBottomColor: borderStrong }]}>
                                    <View style={styles.settingTextBlock}>
                                        <Text style={[styles.settingLabel, { color: textPrimary }]}>
                                            {t('chat.aiAssistant') || 'AI Assistant'}
                                        </Text>
                                        <Text style={[styles.settingSubLabel, { color: textSecondary }]}>
                                            {t('chat.aiAssistantDesc') || 'AI joins the conversation'}
                                        </Text>
                                    </View>
                                    <Switch
                                        style={styles.switchControl}
                                        value={aiEnabled}
                                        onValueChange={handleToggleAi}
                                        trackColor={{ false: colors.border, true: colors.accent }}
                                        thumbColor={aiEnabled ? '#fff' : '#f4f3f4'}
                                        disabled={saving}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        {
                                            backgroundColor: surfaceStrong,
                                            borderColor: borderStrong,
                                        }
                                    ]}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        handleGetSummary();
                                    }}
                                    disabled={summaryLoading}
                                >
                                    {summaryLoading ? (
                                        <ActivityIndicator size="small" color={colors.accent} />
                                    ) : (
                                        <Text style={[styles.actionButtonText, { color: textPrimary }]}>
                                            📝 {t('chat.getSummary') || 'Get Chat Summary'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        )}
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
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 0,
        paddingBottom: 0,
    },
    modalContent: {
        width: '100%',
        maxHeight: '92%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderWidth: 1,
        borderBottomWidth: 0,
        padding: 16,
        paddingTop: 24,
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: '800',
        lineHeight: 24,
        textAlign: 'center',
        flex: 1,
        paddingHorizontal: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
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
        paddingVertical: 14,
        paddingLeft: 4,
        paddingRight: 8,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 4,
        paddingRight: 8,
    },
    settingTextBlock: {
        flex: 1,
        paddingRight: 10,
        justifyContent: 'center',
    },
    switchControl: {
        marginRight: 8,
        transform: [{ scale: 0.9 }],
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        flexShrink: 1,
    },
    settingSubLabel: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
    },
    actionButton: {
        marginTop: 24,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    scheduleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    scheduleValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    scheduleSubLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    imagePreviewContainer: {
        width: 104,
        height: 104,
        borderRadius: 52,
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
        fontSize: 52,
    },
    cameraIconBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: COLORS.dark.accent,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    presetContainer: {
        width: '100%',
        paddingHorizontal: 0,
    },
    presetItem: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 6,
    },
    presetEmoji: {
        fontSize: 26,
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
        fontSize: 15,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 10,
        paddingLeft: 4,
    },
    bookList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    bookItem: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },
    bookItemText: {
        fontSize: 14,
        fontWeight: '700',
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        fontSize: 16,
        lineHeight: 22,
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
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.5)',
        marginTop: 8,
    },
    saveButton: {
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#ccc',
        marginVertical: 12,
        opacity: 0.3,
    },
    langButton: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        minWidth: 56,
        alignItems: 'center',
        borderRadius: 12,
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
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.5)',
        alignItems: 'center',
        marginTop: 8,
    },
    boldButtonText: {
        fontWeight: '700',
        fontSize: 15,
    }
});
