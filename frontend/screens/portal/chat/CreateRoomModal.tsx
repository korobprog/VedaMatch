import React, { useState } from 'react';
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
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { user } = useUser();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<any>(PRESET_IMAGES[0]);

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
            const response = await fetch(`${API_PATH}/rooms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    description,
                    isPublic,
                    ownerId: user.ID,
                    imageUrl: selectedImage.id, // Store preset ID for now
                }),
            });

            if (response.ok) {
                onRoomCreated();
                onClose();
                setName('');
                setDescription('');
                setSelectedImage(PRESET_IMAGES[0]);
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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{t('chat.createRoom')}</Text>

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

                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('chat.roomImage')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                        {PRESET_IMAGES.map(preset => (
                            <TouchableOpacity
                                key={preset.id}
                                style={[
                                    styles.presetItem,
                                    { backgroundColor: theme.header },
                                    selectedImage.id === preset.id && { borderColor: theme.accent, borderWidth: 2 }
                                ]}
                                onPress={() => setSelectedImage(preset)}
                            >
                                <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                                <Text style={[styles.presetLabel, { color: theme.subText }]}>
                                    {t(`chat.presets.${preset.id}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

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
        marginBottom: 24,
    },
    presetItem: {
        width: 75,
        height: 75,
        marginRight: 12,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    presetEmoji: {
        fontSize: 28,
    },
    presetLabel: {
        fontSize: 10,
        marginTop: 4,
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 0.48,
        height: 50,
        borderRadius: 12,
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
});
