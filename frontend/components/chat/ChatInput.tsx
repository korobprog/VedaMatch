import React from 'react';
import {
    View,
    TouchableOpacity,
    TextInput,
    Text,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    useColorScheme,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, MENU_OPTIONS, FRIEND_MENU_OPTIONS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';
import { Image } from 'react-native';
import { API_BASE_URL } from '../../config/api.config';

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
        isLoading,
        showMenu,
        setShowMenu,
        handleNewChat,
        recipientUser,
    } = useChat();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const avatarUrl = recipientUser?.avatarUrl ? `${API_BASE_URL}${recipientUser.avatarUrl}` : null;

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
                        const isImplemented = !recipientUser || option === 'contacts.viewProfile' || option === 'contacts.block';
                        return (
                            <TouchableOpacity
                                key={option}
                                style={[
                                    styles.menuItem,
                                    index < array.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.borderColor },
                                    !isImplemented && { opacity: 0.3 }
                                ]}
                                onPress={() => isImplemented && onMenuOption(option)}
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
                    onChangeText={setInputText}
                    onSubmitEditing={handleSendMessage}
                    multiline
                    editable={!isLoading}
                />
                <TouchableOpacity
                    onPress={isLoading ? handleStopRequest : handleSendMessage}
                    style={styles.sendButton}
                >
                    {isLoading ? (
                        <View style={{ width: 14, height: 14, backgroundColor: theme.iconColor, borderRadius: 2 }} />
                    ) : (
                        <Text style={[styles.sendButtonText, { color: theme.iconColor }]}>↑</Text>
                    )}
                </TouchableOpacity>
            </View>
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
});
