import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    TouchableOpacity,
    TextInput,
    Text,
    Platform,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Vibration,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { MENU_OPTIONS, FRIEND_MENU_OPTIONS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useUser } from '../../context/UserContext';
import { useSettings } from '../../context/SettingsContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { Image } from 'react-native';
import { getMediaUrl } from '../../utils/url';
import { mediaService } from '../../services/mediaService';
import { AudioRecorder } from './AudioRecorder';
import { Mic, Send, Camera, Paperclip, User, Search, VolumeX, Pin, Share2, Trash2, Ban, Flag, Image as LucideImage } from 'lucide-react-native';

interface ChatInputProps {
    onMenuOption: (option: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onMenuOption,
}) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const {
        handleSendMessage,
        handleStopRequest,
        handleSendMedia,
        isLoading,
        showMenu,
        setShowMenu,
        recipientUser,
        isUploading,
    } = useChat();
    const { sendTypingIndicator } = useWebSocket();
    const { user: currentUser } = useUser();
    const { vTheme, isDarkMode, portalBackgroundType } = useSettings();
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const longPressTriggeredRef = useRef(false);
    const { colors } = useRoleTheme(currentUser?.role, isDarkMode);
    const isPhotoBg = portalBackgroundType === 'image';

    const {
        isRecording,
        startRecording,
        stopRecording,
        cancelRecording,
    } = useChat();

    // Local states for new logic
    const [draftText, setDraftText] = useState('');
    const [isFocused, setIsFocused] = useState(false);

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

    const onSendPress = async () => {
        if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false;
            return;
        }

        if (isLoading) {
            handleStopRequest();
            return;
        }
        const sent = await handleSendMessage(draftText);
        if (sent) {
            setDraftText('');
        }
    };

    const onLockedSend = () => {
        stopRecording();
    };

    const onLockedCancel = () => {
        cancelRecording();
    };

    const onMicPress = async () => {
        setShowMenu(false);
        Vibration.vibrate(30);
        if (isRecording) {
            await stopRecording();
            return;
        }
        await startRecording();
    };

    const onSendLongPress = async () => {
        if (isLoading || isUploading || draftText.trim().length > 0) {
            return;
        }

        longPressTriggeredRef.current = true;
        await onMicPress();
    };

    const avatarUrl = getMediaUrl(recipientUser?.avatarUrl);

    const handleTextChange = (text: string) => {
        setDraftText(text);

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

    const showSendButton = (draftText.length > 0 || isFocused) && !isRecording;
    const panelBg = isPhotoBg ? 'rgba(15,23,42,0.58)' : colors.surfaceElevated;
    const panelBorder = isPhotoBg ? 'rgba(255,255,255,0.24)' : colors.border;
    const inputBg = isPhotoBg ? 'rgba(255,255,255,0.14)' : colors.surface;
    const inputBorder = isPhotoBg ? 'rgba(255,255,255,0.24)' : colors.border;
    const inputColor = isPhotoBg ? '#F8FAFC' : colors.textPrimary;
    const placeholderColor = isPhotoBg ? 'rgba(248,250,252,0.72)' : colors.textSecondary;
    const iconColor = isPhotoBg ? 'rgba(248,250,252,0.88)' : colors.textSecondary;

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
        <View
            style={[styles.inputWrapper, { backgroundColor: 'transparent', paddingBottom: 4 }]}
        >
            {/* Menu Pop-up */}
            {showMenu && (
                <View style={[styles.menuPopup, { backgroundColor: isPhotoBg ? 'rgba(15,23,42,0.95)' : colors.surfaceElevated, borderColor: panelBorder }]}>
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType={isDarkMode ? 'dark' : 'light'}
                        blurAmount={20}
                        reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.95)' : colors.surfaceElevated}
                    />
                    <View
                        style={[
                            styles.menuHeader,
                            { borderBottomWidth: 1, borderBottomColor: panelBorder }
                        ]}
                    >
                        <Text style={{ color: inputColor, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
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
                        const itemColor = isDestructive
                            ? '#F87171'
                            : (isPhotoBg ? '#F8FAFC' : colors.textPrimary);

                        return (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.menuItem,
                                    index < array.length - 1 && {
                                        borderBottomWidth: 0.5,
                                        borderBottomColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : panelBorder,
                                    },
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

            <View style={[
                styles.inputContainer,
                {
                    backgroundColor: panelBg,
                    borderColor: panelBorder,
                }
            ]}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType={isDarkMode ? 'dark' : 'light'}
                    blurAmount={15}
                    reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.72)' : colors.surfaceElevated}
                />
                {isRecording ? (
                    // Spacer to maintain height, but content hidden
                    <View style={{ height: 48, flex: 1 }} />
                ) : (
                    <>
                        <TouchableOpacity
                            style={styles.plusButton}
                            onPress={() => setShowMenu(!showMenu)}
                            activeOpacity={0.86}
                        >
                            {recipientUser ? (
                                avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.miniAvatar} />
                                ) : (
                                    <View style={[styles.miniAvatar, { backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                                            {(recipientUser.spiritualName || recipientUser.karmicName || '?')[0]}
                                        </Text>
                                    </View>
                                )
                            ) : (
                                <Text style={[styles.plusText, { color: iconColor }]}>•••</Text>
                            )}
                        </TouchableOpacity>

                        <TextInput
                            style={[
                                styles.input,
                                {
                                    color: inputColor,
                                    backgroundColor: inputBg,
                                    borderColor: inputBorder,
                                },
                            ]}
                            placeholder={t('chat.placeholder')}
                            placeholderTextColor={placeholderColor}
                            value={draftText}
                            onChangeText={handleTextChange}
                            onSubmitEditing={onSendPress}
                            textContentType="none"
                            autoComplete="off"
                            importantForAutofill="no"
                            multiline
                            blurOnSubmit={false}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            editable={!isLoading && !isRecording} // Unblocked isUploading
                        />
                    </>
                )}

                {showSendButton ? (
                    <TouchableOpacity
                        onPress={onSendPress}
                        onLongPress={onSendLongPress}
                        delayLongPress={350}
                        style={[styles.sendButton, styles.primaryButton, { backgroundColor: colors.accent, borderColor: isPhotoBg ? 'rgba(255,255,255,0.36)' : 'transparent' }]}
                        disabled={false} // Unblocked isUploading
                        activeOpacity={0.86}
                    >
                        {isUploading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : isLoading ? (
                            <View style={{ width: 14, height: 14, backgroundColor: '#FFFFFF', borderRadius: 2 }} />
                        ) : (
                            <Send size={20} color="#FFFFFF" />
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={onMicPress}
                        style={[styles.sendButton, styles.secondaryButton, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : colors.surface, borderColor: panelBorder }]}
                        activeOpacity={0.8}
                    >
                        <Mic size={20} color={isRecording ? '#F87171' : (isPhotoBg ? '#F8FAFC' : colors.textPrimary)} />
                    </TouchableOpacity>
                )}
            </View>

            <AudioRecorder
                isLocked
                onSend={onLockedSend}
                onCancel={onLockedCancel}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    inputWrapper: {
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 22,
        paddingHorizontal: 10,
        paddingVertical: 7,
        minHeight: 56,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        overflow: 'hidden',
    },
    plusButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    plusText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    menuPopup: {
        position: 'absolute',
        bottom: 86,
        left: 8,
        width: 254,
        borderRadius: 18,
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
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    input: {
        flex: 1,
        fontSize: 16,
        lineHeight: 20,
        paddingTop: Platform.OS === 'ios' ? 9 : 7,
        paddingBottom: Platform.OS === 'ios' ? 9 : 7,
        paddingHorizontal: 12,
        textAlignVertical: 'center',
        maxHeight: 120,
        borderWidth: 1,
        borderRadius: 16,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    primaryButton: {
        borderWidth: 1,
    },
    secondaryButton: {
        borderWidth: 1,
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
