import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useColorScheme,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSettings } from '../../../context/SettingsContext';
import { authorizedFetch } from '../../../services/authSessionService';

interface EditRoomImageModalProps {
    visible: boolean;
    onClose: () => void;
    roomId: number;
    currentImageUrl?: string;
    onImageUpdated: () => void;
}

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

export const EditRoomImageModal: React.FC<EditRoomImageModalProps> = ({
    visible,
    onClose,
    roomId,
    currentImageUrl,
    onImageUpdated,
}) => {
    const { t } = useTranslation();
    const { isDarkMode, vTheme } = useSettings();
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const [selectedPreset, setSelectedPreset] = useState<string>(currentImageUrl || 'general');
    const [uploading, setUploading] = useState(false);

    const handlePresetSelect = (presetId: string) => {
        setSelectedPreset(presetId);
    };

    const handleUploadCustomImage = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                includeBase64: false,
            });

            if (result.didCancel) {
                return;
            }

            if (result.errorCode) {
                Alert.alert(t('chat.error'), result.errorMessage || t('chat.imagePickError'));
                return;
            }

            if (result.assets && result.assets[0]) {
                await uploadImage(result.assets[0].uri!);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert(t('chat.error'), t('chat.imagePickError'));
        }
    };

    const uploadImage = async (uri: string) => {
        setUploading(true);
        try {
            const formData = new FormData();
            const filename = uri.split('/').pop() || 'room-image.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('image', {
                uri,
                name: filename,
                type,
            } as any);

            const response = await authorizedFetch(`${API_PATH}/rooms/${roomId}/image`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                Alert.alert(t('common.success'), t('chat.imageUpdated'));
                onImageUpdated();
                onClose();
            } else {
                const errorData = await response.json();
                Alert.alert(t('common.error'), errorData.error || t('chat.uploadError'));
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert(t('common.error'), t('chat.uploadError'));
        } finally {
            setUploading(false);
        }
    };

    const handleSavePreset = async () => {
        setUploading(true);
        try {
            const response = await authorizedFetch(`${API_PATH}/rooms/${roomId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageUrl: selectedPreset,
                }),
            });

            if (response.ok) {
                Alert.alert(t('common.success'), t('chat.imageUpdated'));
                onImageUpdated();
                onClose();
            } else {
                const errorData = await response.json();
                Alert.alert(t('common.error'), errorData.error || t('chat.updateError'));
            }
        } catch (error) {
            console.error('Error updating preset:', error);
            Alert.alert(t('common.error'), t('chat.updateError'));
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: vTheme.colors.background }]}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <X size={24} color={vTheme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: vTheme.colors.text }]}>
                        {t('chat.editRoomImage')}
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                        {/* Preset Images */}
                        <Text style={[styles.sectionTitle, { color: vTheme.colors.text }]}>
                            {t('chat.presetImages')}
                        </Text>
                        <View style={styles.presetGrid}>
                            {PRESET_IMAGES.map((preset) => (
                                <TouchableOpacity
                                    key={preset.id}
                                    style={[
                                        styles.presetItem,
                                        {
                                            backgroundColor: vTheme.colors.backgroundSecondary,
                                            borderColor: selectedPreset === preset.id ? theme.accent : 'transparent',
                                            borderWidth: 2,
                                        },
                                    ]}
                                    onPress={() => handlePresetSelect(preset.id)}
                                >
                                    <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                                    <Text style={[styles.presetLabel, { color: vTheme.colors.textSecondary }]}>
                                        {t(`chat.presets.${preset.id}`)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Custom Upload */}
                        <Text style={[styles.sectionTitle, { color: vTheme.colors.text, marginTop: 20 }]}>
                            {t('chat.customImage')}
                        </Text>
                        <TouchableOpacity
                            style={[styles.uploadButton, { backgroundColor: vTheme.colors.backgroundSecondary }]}
                            onPress={handleUploadCustomImage}
                            disabled={uploading}
                        >
                            <Text style={[styles.uploadButtonText, { color: theme.accent }]}>
                                📤 {t('chat.uploadImage')}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: vTheme.colors.backgroundSecondary, borderColor: vTheme.colors.divider, borderWidth: 1 }]}
                            onPress={onClose}
                            disabled={uploading}
                        >
                            <Text style={[styles.buttonText, { color: vTheme.colors.text }]}>
                                {t('common.cancel')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.accent }]}
                            onPress={handleSavePreset}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={[styles.buttonText, { color: '#fff' }]}>
                                    {t('common.save') || 'Save'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxHeight: '80%',
        borderRadius: 16,
        padding: 20,
        paddingTop: 48,
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    content: {
        maxHeight: 400,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },
    presetItem: {
        width: '22%',
        aspectRatio: 1,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
    presetEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    presetLabel: {
        fontSize: 10,
        textAlign: 'center',
    },
    uploadButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    uploadButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    button: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#ccc',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
