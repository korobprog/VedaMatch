import React, { useState } from 'react';
import {
    SafeAreaView,
    StatusBar,
    StyleSheet,
    useColorScheme,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { SettingsDrawer } from '../SettingsDrawer';
import { useSettings } from '../context/SettingsContext';
import { ChatProvider, useChat } from '../context/ChatContext';
import { COLORS } from '../components/chat/ChatConstants';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { shareImage, downloadImage } from '../services/fileService';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export const ChatScreen: React.FC<Props> = ({ navigation }) => {
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { currentModel, currentProvider, selectModel } = useSettings();
    const { handleMenuOption } = useChat();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor={theme.header}
            />

            <ChatHeader
                title="Vedic AI"
                onSettingsPress={() => setIsSettingsOpen(true)}
            />

            <MessageList
                onDownloadImage={downloadImage}
                onShareImage={shareImage}
                onNavigateToTab={(tab) => navigation.navigate('Portal', { initialTab: tab })}
            />

            <ChatInput
                onMenuOption={(option) =>
                    handleMenuOption(option,
                        (tab) => navigation.navigate('Portal', { initialTab: tab })
                    )
                }
            />

            <SettingsDrawer
                isVisible={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                isDarkMode={isDarkMode}
                currentModel={currentModel}
                onSelectModel={(model: any) => {
                    selectModel(model.id, model.provider);
                }}
                onNavigateToPortal={(tab) => {
                    setIsSettingsOpen(false);
                    navigation.navigate('Portal', { initialTab: tab });
                }}
                onNavigateToSettings={() => {
                    setIsSettingsOpen(false);
                    navigation.navigate('AppSettings');
                }}
                onNavigateToRegistration={() => {
                    setIsSettingsOpen(false);
                    navigation.navigate('Registration', { isDarkMode });
                }}
            />
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
