import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/chat/ChatConstants';
import { API_PATH } from '../../../config/api.config';

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
    const [summaryLoading, setSummaryLoading] = useState(false);

    const fetchSettings = async () => {
        try {
            const response = await fetch(`${API_PATH}/rooms`);
            if (response.ok) {
                const rooms = await response.json();
                const currentRoom = rooms.find((r: any) => r.ID === roomId);
                if (currentRoom) {
                    setIsPublic(currentRoom.isPublic);
                    setAiEnabled(currentRoom.aiEnabled);
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
        }
    }, [visible]);

    const handleUpdateSettings = async (updates: { isPublic?: boolean; aiEnabled?: boolean }) => {
        setSaving(true);
        try {
            const response = await fetch(`${API_PATH}/rooms/${roomId}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                Alert.alert(t('common.error'), 'Failed to update settings');
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
                    <Text style={[styles.modalTitle, { color: theme.text }]}>
                        {roomName} - {t('common.settings')}
                    </Text>

                    {loading ? (
                        <ActivityIndicator size="large" color={theme.accent} style={{ margin: 20 }} />
                    ) : (
                        <View style={styles.settingsContainer}>
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
                                    onValueChange={handleTogglePublic}
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
                        </View>
                    )}

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={[styles.closeButtonText, { color: theme.accent }]}>
                            {t('common.close')}
                        </Text>
                    </TouchableOpacity>
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
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    settingsContainer: {
        marginBottom: 24,
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
    closeButton: {
        alignItems: 'center',
        padding: 12,
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
