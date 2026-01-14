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
    PanResponder,
    Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, MENU_OPTIONS, FRIEND_MENU_OPTIONS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useUser } from '../../context/UserContext';
import { Image } from 'react-native';
import { getMediaUrl } from '../../utils/url';
import { mediaService, MediaFile } from '../../services/mediaService';
import { AudioRecorder } from './AudioRecorder';
import { Mic, Send, Camera, Paperclip, User, Search, VolumeX, Pin, Share2, Trash2, Ban, Flag, Image as LucideImage } from 'lucide-react-native';

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
        cancelRecording,
    } = useChat();

    // Local states for new logic
    const [isFocused, setIsFocused] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const lockedRef = useRef(false);
    const lockAnim = useRef(new Animated.Value(0)).current;

    // Sync ref with state
    useEffect(() => {
        lockedRef.current = isLocked;
    }, [isLocked]);

    // Reset lock state when recording ends
    useEffect(() => {
        if (!isRecording) {
            setIsLocked(false);
            lockedRef.current = false;
        }
    }, [isRecording]);

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
            console.error('ChatInput takePhoto error:', e);
            if (e.message !== 'Cancelled') {
                Alert.alert('Ошибка', `Не удалось сделать фото: ${e.message || 'Unknown error'}`);
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

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                Vibration.vibrate(50);
                startRecording();
                setIsLocked(false);
                lockedRef.current = false;
                lockAnim.setValue(0);
            },
            onPanResponderMove: (_, gestureState) => {
                // If dragged up significantly, lock
                if (gestureState.dy < -50 && !lockedRef.current) {
                    setIsLocked(true);
                    lockedRef.current = true;
                    Vibration.vibrate(50); // Feedback
                    Animated.spring(lockAnim, {
                        toValue: 1,
                        useNativeDriver: true
                    }).start();
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (lockedRef.current) {
                    // Stay recording
                } else {
                    // Stop and send
                    stopRecording();
                }
            },
            onPanResponderTerminate: () => {
                if (!lockedRef.current) {
                    cancelRecording();
                }
            },
        })
    ).current;


    const onSendPress = () => {
        if (isLoading) {
            handleStopRequest();
        } else {
            handleSendMessage();
        }
    };

    const onLockedSend = () => {
        stopRecording();
    };

    const onLockedCancel = () => {
        cancelRecording();
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

    const showSendButton = (inputText.length > 0 || isFocused) && !isRecording;

    const getMenuIcon = (option: string, color: string) => {
        switch (option) {
            case 'contacts.viewProfile': return <User size={20} color={color} />;
            case 'contacts.takePhoto': return <Camera size={20} color={color} />;
            case 'contacts.attachFile': return <Paperclip size={20} color={color} />;
            case 'contacts.media': return <LucideImage size={20} color={color} />;
            case 'contacts.search': return <Search size={20} color={color} />;
            case 'contacts.mute': return <VolumeX size={20} color={color} />;
            case 'contacts.pin': return <Pin size={20} color={color} />;
            case 'contacts.share': return <Share2 size={20} color={color} />;
            case 'contacts.clearHistory': return <Trash2 size={20} color={color} />;
            case 'contacts.block': return <Ban size={20} color={color} />;
            case 'contacts.report': return <Flag size={20} color={color} />;
            default: return null;
        }
    };

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
                        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
                            {recipientUser ? (recipientUser.spiritualName || recipientUser.karmicName) : t('chat.newChat')}
                        </Text>
                    </View>
                    {(recipientUser ? FRIEND_MENU_OPTIONS : MENU_OPTIONS).map((option, index, array) => {
                        const isImplemented = !recipientUser ||
                            option === 'contacts.viewProfile' ||
                            option === 'contacts.block' ||
                            option === 'contacts.takePhoto' ||
                            option === 'contacts.attachFile' ||
                            option === 'contacts.clearHistory';

                        const isDestructive = option.includes('block') || option.includes('report') || option.includes('clearHistory');
                        const itemColor = isDestructive ? theme.error : theme.text;

                        return (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.menuItem,
                                    index < array.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.borderColor },
                                    !isImplemented && { opacity: 0.5 }
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
                                <View style={styles.menuIconContainer}>
                                    {getMenuIcon(option, itemColor)}
                                </View>
                                <Text style={{
                                    color: itemColor,
                                    fontSize: 15,
                                    fontWeight: '500' // slightly bold
                                }}>
                                    {t(option)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                {isRecording ? (
                    // Spacer to maintain height, but content hidden
                    <View style={{ height: 48, flex: 1 }} />
                ) : (
                    <>
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
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            editable={!isLoading && !isRecording} // Unblocked isUploading
                        />
                    </>
                )}

                {showSendButton ? (
                    <TouchableOpacity
                        onPress={onSendPress}
                        style={styles.sendButton}
                        disabled={false} // Unblocked isUploading
                    >
                        {isUploading ? (
                            <ActivityIndicator size="small" color={theme.iconColor} />
                        ) : isLoading ? (
                            <View style={{ width: 14, height: 14, backgroundColor: theme.iconColor, borderRadius: 2 }} />
                        ) : (
                            <Send size={24} color={theme.primary} />
                        )}
                    </TouchableOpacity>
                ) : (
                    <View
                        {...panResponder.panHandlers}
                        style={styles.micButtonContainer}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            style={styles.sendButton}
                        >
                            <Mic size={24} color={isRecording ? theme.error : theme.text} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <AudioRecorder
                isLocked={isLocked}
                onSend={onLockedSend}
                onCancel={onLockedCancel}
            />
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
        left: 12,
        width: 240,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 10,
        paddingBottom: 0,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    menuIconContainer: {
        width: 32,
        alignItems: 'flex-start',
    },
    menuHeader: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.03)',
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
    micButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
