import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    TouchableOpacity,
    TextInput,
    Text,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    useColorScheme,
    Alert,
    ActivityIndicator,
    Vibration,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, MENU_OPTIONS, FRIEND_MENU_OPTIONS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useUser } from '../../context/UserContext';
import { Image } from 'react-native';
import { API_PATH } from '../../config/api.config';
import { getMediaUrl } from '../../utils/url';
import { mediaService, MediaFile } from '../../services/mediaService';
import { AudioRecorder } from './AudioRecorder';

interface ChatInputProps {
    onMenuOption: (option: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onMenuOption,
}) => {
    const { t } = useTranslation();
    const {
        inputText,
        setInputText,
        handleSendMessage,
        handleStopRequest,
        handleSendMedia,
        isLoading,
        showMenu,
        setShowMenu,
        handleNewChat,
        recipientUser,
        isUploading,
    } = useChat();
    const { sendTypingIndicator } = useWebSocket();
    const { user: currentUser } = useUser();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const {
        isRecording,
        startRecording,
        stopRecording,
    } = useChat();
    const micTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handlePickImage = async () => {
        try {
            const media = await mediaService.pickImage();
            await handleSendMedia(media);
        } catch (e: any) {
            if (e.message !== 'Cancelled') {
                Alert.alert('Ошибка', 'Не удалось выбрать фото');
            }
        }
    };

    const handleTakePhoto = async () => {
        try {
            const media = await mediaService.takePhoto();
            await handleSendMedia(media);
        } catch (e: any) {
            if (e.message !== 'Cancelled') {
                Alert.alert('Ошибка', 'Не удалось сделать фото');
            }
        }
    };

    const handlePickDocument = async () => {
        try {
            const media = await mediaService.pickDocument();
            await handleSendMedia(media);
        } catch (e: any) {
            if (e.message !== 'Cancelled') {
                Alert.alert('Ошибка', 'Не удалось выбрать документ');
            }
        }
    };

    const justFinishedRecording = useRef(false);

    const handleMicPressIn = () => {
        micTimeoutRef.current = setTimeout(() => {
            Vibration.vibrate(50);
            startRecording();
            micTimeoutRef.current = null;
        }, 500);
    };

    const handleMicPressOut = () => {
        if (micTimeoutRef.current) {
            clearTimeout(micTimeoutRef.current);
            micTimeoutRef.current = null;
        } else if (isRecording) {
            Vibration.vibrate(50);
            stopRecording();
            justFinishedRecording.current = true;
            setTimeout(() => { justFinishedRecording.current = false; }, 200);
        }
    };

    const onSendPress = () => {
        if (justFinishedRecording.current) return;
        if (isLoading) {
            handleStopRequest();
        } else {
            handleSendMessage();
        }
    };

    const avatarUrl = getMediaUrl(recipientUser?.avatarUrl);

    const handleTextChange = (text: string) => {
        setInputText(text);

        if (recipientUser?.ID && currentUser?.ID && recipientUser.ID !== currentUser.ID) {
            sendTypingIndicator(recipientUser.ID, true);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                sendTypingIndicator(recipientUser.ID, false);
            }, 3000);
        }
    };

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            style={[styles.inputWrapper, { backgroundColor: theme.header, borderTopColor: theme.borderColor }]}
        >
            {/* Menu Pop-up */}
            {showMenu && (
                <View style={[styles.menuPopup, { backgroundColor: theme.menuBackground, borderColor: theme.borderColor }]}>
                    <View
                        style={[
                            styles.menuHeader,
                            { borderBottomWidth: 1, borderBottomColor: theme.borderColor }
                        ]}
                    >
                        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
                            {recipientUser ? (recipientUser.spiritualName || recipientUser.karmicName) : t('chat.newChat')}
                        </Text>
                    </View>
                    {(recipientUser ? FRIEND_MENU_OPTIONS : MENU_OPTIONS).map((option, index, array) => {
                        const isImplemented = !recipientUser ||
                            option === 'contacts.viewProfile' ||
                            option === 'contacts.block' ||
                            option === 'contacts.takePhoto' ||
                            option === 'contacts.attachFile';
                        return (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.menuItem,
                                    index < array.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.borderColor },
                                    !isImplemented && { opacity: 0.3 }
                                ]}
                                onPress={() => {
                                    if (!isImplemented) return;
                                    setShowMenu(false);
                                    if (option === 'contacts.takePhoto') {
                                        handleTakePhoto();
                                        return;
                                    }
                                    if (option === 'contacts.attachFile') {
                                        handlePickDocument();
                                        return;
                                    }
                                    onMenuOption(option);
                                }}
                                disabled={!isImplemented}
                            >
                                <Text style={{
                                    color: option.includes('block') ? '#FF4444' : theme.text,
                                    fontSize: 16
                                }}>
                                    {t(option)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                <TouchableOpacity
                    style={styles.plusButton}
                    onPress={() => setShowMenu(!showMenu)}
                >
                    {recipientUser ? (
                        avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.miniAvatar} />
                        ) : (
                            <View style={[styles.miniAvatar, { backgroundColor: theme.button, justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{ color: theme.buttonText, fontSize: 12, fontWeight: 'bold' }}>
                                    {(recipientUser.spiritualName || recipientUser.karmicName || '?')[0]}
                                </Text>
                            </View>
                        )
                    ) : (
                        <Text style={[styles.plusText, { color: theme.subText }]}>•••</Text>
                    )}
                </TouchableOpacity>

                <TextInput
                    style={[styles.input, { color: theme.inputText }]}
                    placeholder={t('chat.placeholder')}
                    placeholderTextColor={theme.subText}
                    value={inputText}
                    onChangeText={handleTextChange}
                    onSubmitEditing={handleSendMessage}
                    multiline
                    editable={!isLoading && !isUploading && !isRecording}
                />

                <TouchableOpacity
                    onPress={onSendPress}
                    onPressIn={handleMicPressIn}
                    onPressOut={handleMicPressOut}
                    style={styles.sendButton}
                    disabled={isUploading}
                    delayLongPress={500}
                >
                    {isUploading ? (
                        <ActivityIndicator size="small" color={theme.iconColor} />
                    ) : isLoading ? (
                        <View style={{ width: 14, height: 14, backgroundColor: theme.iconColor, borderRadius: 2 }} />
                    ) : (
                        <Text style={[styles.sendButtonText, { color: isRecording ? theme.error : theme.iconColor }]}>
                            {isRecording ? '🎙️' : '↑'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <AudioRecorder />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    inputWrapper: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 0.5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingVertical: 6,
        minHeight: 48,
        borderWidth: 1,
    },
    plusButton: {
        padding: 8,
    },
    plusText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    menuPopup: {
        position: 'absolute',
        bottom: 80,
        left: 20,
        width: 200,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    menuItem: {
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    menuHeader: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 8,
        paddingHorizontal: 8,
        maxHeight: 120,
    },
    sendButton: {
        padding: 8,
        marginLeft: 4,
    },
    sendButtonText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    miniAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    mediaButton: {
        padding: 8,
    },
    mediaIcon: {
        fontSize: 20,
    },
});
