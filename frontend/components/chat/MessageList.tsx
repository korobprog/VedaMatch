import React, { useRef, useState } from 'react';
import {
    View,
    FlatList,
    ActivityIndicator,
    Text,
    Image,
    ImageBackground,
    Keyboard,
    StyleSheet,
    useColorScheme,
    Dimensions,
    TouchableOpacity,
    Alert,
    Linking,
    Platform,
} from 'react-native';
import { FileText, File, Download, Music, Video, Image as ImageIcon, MapPin } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from 'react-i18next';
import { ChatImage } from '../ChatImage';
import { Message, COLORS } from './ChatConstants';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import { WebView } from 'react-native-webview';
import { mediaService } from '../../services/mediaService';
import { AudioPlayer } from './AudioPlayer';
import peacockAssistant from '../../assets/peacockAssistant.png';
import krishnaAssistant from '../../assets/krishnaAssistant.png';

interface MessageListProps {
    onDownloadImage: (imageUrl: string, imageName?: string) => void;
    onShareImage: (url: string) => void;
    onNavigateToTab: (tab: any) => void;
    onNavigateToMap?: (mapData: Message['mapData']) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const MessageList: React.FC<MessageListProps> = ({
    onDownloadImage,
    onShareImage,
    onNavigateToTab,
    onNavigateToMap,
}) => {
    const { t, i18n } = useTranslation();
    const { messages, isLoading, isTyping, recipientUser, deleteMessage } = useChat();
    const { imageSize, assistantType } = useSettings();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const flatListRef = useRef<FlatList>(null);

    const formatMessageTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
    };

    const groupMessagesByDate = (msgs: Message[]) => {
        const groups: { title: string; data: Message[] }[] = [];
        msgs.forEach(msg => {
            const date = msg.createdAt ? new Date(msg.createdAt) : new Date();
            const dateStr = date.toDateString();
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();

            let title = dateStr;
            if (dateStr === today) title = t('chat.today');
            else if (dateStr === yesterday) title = t('chat.yesterday');

            const group = groups.find(g => g.title === title);
            if (group) group.data.push(msg);
            else groups.push({ title, data: [msg] });
        });
        return groups;
    };

    // Flatten messages with date headers
    const messagesWithHeaders = (() => {
        const result: (Message | { type: 'header', title: string, id: string })[] = [];
        let lastDate = '';

        messages.forEach((msg, index) => {
            const date = msg.createdAt ? new Date(msg.createdAt) : new Date();
            const dateStr = date.toDateString();
            if (dateStr !== lastDate) {
                const today = new Date().toDateString();
                const yesterday = new Date(Date.now() - 86400000).toDateString();
                let title = date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' });
                if (dateStr === today) title = t('chat.today');
                else if (dateStr === yesterday) title = t('chat.yesterday');

                // Append index to key to ensure uniqueness even if dateStr repeats unexpectedly or across re-renders
                result.push({ type: 'header', title, id: `header-${dateStr}-${index}` });
                lastDate = dateStr;
            }
            result.push(msg);
        });
        return result;
    })();

    const openImage = (uri: string) => {
        Alert.alert(
            t('chat.viewImage'),
            t('chat.viewImagePrompt'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('chat.download'), onPress: () => onDownloadImage(uri) },
                { text: t('chat.share'), onPress: () => onShareImage(uri) },
            ]
        );
    };

    const openDocument = (url: string, fileName?: string) => {
        Alert.alert(
            t('chat.document'),
            t('chat.downloadFilePrompt', { fileName: fileName || t('chat.document') }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('chat.download'), onPress: () => Linking.openURL(url) },
            ]
        );
    };

    const mdStyles: any = {
        body: { color: theme.text, fontSize: 16, lineHeight: 22 },
        paragraph: { marginTop: 0, marginBottom: 8 },
        imageContainer: { marginVertical: 8, alignItems: 'center' as const },
        markdownImage: { width: '100%', maxWidth: 300, height: 200, borderRadius: 8, marginBottom: 8 },
    };

    const mdRules = {
        image: (node: any) => {
            const imageUrl = node.attributes?.src || '';
            const altText = node.attributes?.alt || 'Изображение';
            return (
                <ChatImage
                    key={node.key}
                    imageUrl={imageUrl}
                    altText={altText}
                    onDownload={onDownloadImage}
                    onShare={onShareImage}
                    theme={theme}
                />
            );
        },
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon size={24} color={theme.primary} />;
        if (['mp3', 'wav', 'm4a', 'aac'].includes(ext || '')) return <Music size={24} color={theme.primary} />;
        if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) return <Video size={24} color={theme.primary} />;
        if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <FileText size={24} color={theme.primary} />;
        return <File size={24} color={theme.primary} />;
    };

    const renderAudioPlayer = (url: string, key: string | number) => {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>
                    body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                    audio { width: 95%; max-width: 400px; height: 40px; border-radius: 20px; }
                </style>
            </head>
            <body>
                <audio controls controlsList="nodownload">
                    <source src="${url}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </body>
            </html>
        `;

        return (
            <View key={key} style={{ height: 60, width: 220, marginVertical: 5, borderRadius: 12, overflow: 'hidden', backgroundColor: 'transparent' }}>
                <WebView
                    originWhitelist={['*']}
                    source={{ html }}
                    style={{ backgroundColor: 'transparent' }}
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    scalesPageToFit={false}
                    androidLayerType="hardware"
                    mediaPlaybackRequiresUserAction={false}
                    allowsInlineMediaPlayback={true}
                    javaScriptEnabled={true}
                />
            </View>
        );
    };

    const handleDeleteMessage = (msg: Message) => {
        if (msg.sender !== 'user') return;
        Alert.alert(
            t('chat.deleteTitle'),
            t('chat.deleteMsg'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('chat.delete'), style: 'destructive', onPress: () => deleteMessage(msg.id) }
            ]
        );
    };

    const renderMessage = ({ item: rawItem }: { item: any }) => {
        if (rawItem.type === 'header') {
            return (
                <View style={styles.dateHeader}>
                    <View style={[styles.dateLine, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                    <Text style={[styles.dateText, { color: theme.subText }]}>{rawItem.title}</Text>
                    <View style={[styles.dateLine, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                </View>
            );
        }

        const item = rawItem as Message;
        const isUser = item.sender === 'user';
        const text = item.text || '';
        const isImageOnly = !isUser && text.trim().startsWith('![') && text.trim().endsWith(')') && !text.trim().includes('\n', 2);
        const time = formatMessageTime(item.createdAt);

        const bubbleStyle = [
            styles.bubble,
            isUser ? styles.userBubble : styles.botBubble,
            {
                backgroundColor: isUser
                    ? (isDarkMode ? 'rgba(214, 125, 62, 0.25)' : 'rgba(214, 125, 62, 0.15)')
                    : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.85)'),
                borderColor: isUser
                    ? 'rgba(214, 125, 62, 0.3)'
                    : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'),
                borderWidth: 1,
            }
        ];

        const MessageWrapper = ({ children }: { children: React.ReactNode }) => (
            <TouchableOpacity
                activeOpacity={0.9}
                onLongPress={() => handleDeleteMessage(item)}
                delayLongPress={500}
                style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}
            >
                {children}
            </TouchableOpacity>
        );

        if (item.uploading) {
            return (
                <MessageWrapper>
                    <View style={bubbleStyle}>
                        <View style={styles.uploadingContainer}>
                            <ActivityIndicator size="small" color={theme.primary} />
                            <Text style={[styles.uploadingText, { color: theme.text }]}>{t('chat.uploading')}</Text>
                        </View>
                    </View>
                </MessageWrapper>
            );
        }

        return (
            <MessageWrapper>
                {!isUser && (
                    <View style={styles.avatar}>
                        <Image
                            source={assistantType === 'feather' ? peacockAssistant : krishnaAssistant}
                            style={styles.avatarImage}
                        />
                    </View>
                )}
                <View style={bubbleStyle}>
                    {item.type === 'image' && item.content ? (
                        <TouchableOpacity onPress={() => openImage(item.content!)}>
                            <Image source={{ uri: item.content }} style={styles.messageImage} />
                        </TouchableOpacity>
                    ) : item.type === 'audio' && item.content ? (
                        <AudioPlayer url={item.content} duration={item.duration} isDarkMode={isDarkMode} />
                    ) : (item.type === 'document' || item.type === 'file') && item.content ? (
                        <TouchableOpacity onPress={() => openDocument(item.content!, item.fileName)} style={styles.documentCard}>
                            <View style={[styles.documentIconContainer, { backgroundColor: theme.primary + '20' }]}>
                                {getFileIcon(item.fileName || '')}
                            </View>
                            <View style={styles.documentInfo}>
                                <Text style={[styles.documentName, { color: theme.text }]} numberOfLines={1}>{item.fileName || t('chat.document')}</Text>
                                <View style={styles.documentMeta}>
                                    <Text style={[styles.documentSize, { color: theme.subText }]}>
                                        {item.fileSize ? mediaService.formatFileSize(item.fileSize) : 'File'}
                                    </Text>
                                    <View style={styles.extensionBadge}>
                                        <Text style={styles.extensionText}>{(item.fileName?.split('.').pop() || 'FILE').toUpperCase()}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={[styles.downloadBtn, { backgroundColor: theme.primary }]}>
                                <Download size={16} color="#FFF" />
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View>
                            {/* Text content split by audio player if present */}
                            {text.split(/(<audio\s+[^>]*src="[^"]+"[^>]*>.*?<\/audio>)/gi).map((part, index) => {
                                const audioMatch = part.match(/<audio\s+[^>]*src="([^"]+)"[^>]*>/i);
                                if (audioMatch) return renderAudioPlayer(audioMatch[1], index);
                                if (!part.trim() && index > 0) return null;
                                return (
                                    <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: '100%' }}>
                                        <Markdown style={mdStyles} rules={mdRules}>
                                            {part}
                                        </Markdown>
                                        <Text style={[styles.timeText, { color: theme.subText, marginLeft: 6, marginBottom: 2 }]}>{time}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {!text && !item.uploading && (
                        <View style={styles.timeOverlay}>
                            <Text style={[styles.timeText, { color: theme.subText }]}>{time}</Text>
                        </View>
                    )}

                    {item.navTab && (
                        <TouchableOpacity
                            style={[styles.navButton, { backgroundColor: theme.primary }]}
                            onPress={() => onNavigateToTab(item.navTab)}
                        >
                            <Text style={[styles.navButtonText, { color: '#FFF' }]}>{t('chat.goToSection')}</Text>
                        </TouchableOpacity>
                    )}

                    {/* Map button for AI geo-intents */}
                    {item.mapData && onNavigateToMap && (
                        <TouchableOpacity
                            style={[styles.mapButton, { backgroundColor: '#059669' }]}
                            onPress={() => onNavigateToMap(item.mapData)}
                        >
                            <MapPin size={16} color="#FFF" />
                            <Text style={[styles.navButtonText, { color: '#FFF', marginLeft: 6 }]}>
                                {t('chat.showOnMap', 'Показать на карте')}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </MessageWrapper>
        );
    };

    return (
        <View style={styles.chatContainer}>
            <ImageBackground
                source={require('../../assets/krishna_bg.png')}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            >
                <View style={[styles.overlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.65)' }]}>
                    <FlatList
                        ref={flatListRef}
                        data={messagesWithHeaders}
                        renderItem={renderMessage}
                        keyExtractor={(item: any) => item.id}
                        contentContainerStyle={styles.listContent}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onScrollBeginDrag={() => Keyboard.dismiss()}
                    />
                    {isLoading && (
                        <View style={styles.statusBox}>
                            <ActivityIndicator size="small" color={theme.primary} />
                            <Text style={[styles.statusText, { color: theme.subText }]}>Отправка...</Text>
                        </View>
                    )}
                    {isTyping && recipientUser && (
                        <View style={styles.statusBox}>
                            <ActivityIndicator size="small" color={theme.primary} />
                            <Text style={[styles.statusText, { color: theme.subText }]}>
                                {recipientUser.spiritualName || recipientUser.karmicName} {t('chat.isTyping')}
                            </Text>
                        </View>
                    )}
                </View>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    chatContainer: { flex: 1 },
    overlay: { flex: 1 },
    listContent: { paddingVertical: 20, paddingHorizontal: 16, paddingBottom: 40 },
    messageRow: { marginBottom: 12, flexDirection: 'row', width: '100%', alignItems: 'flex-end' },
    userRow: { justifyContent: 'flex-end' },
    botRow: { justifyContent: 'flex-start' },
    bubble: {
        borderRadius: 20,
        maxWidth: '85%',
        paddingVertical: 8,
        paddingHorizontal: 12,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
            android: { elevation: 2 }
        })
    },
    userBubble: { borderBottomRightRadius: 4 },
    botBubble: { borderBottomLeftRadius: 4 },
    timeText: { fontSize: 10, fontWeight: '500' },
    timeOverlay: { position: 'absolute', bottom: 6, right: 12 },
    avatar: { width: 34, height: 34, borderRadius: 10, marginRight: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)' },
    avatarImage: { width: '100%', height: '100%' },
    messageText: { fontSize: 16, lineHeight: 22 },
    dateHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, paddingHorizontal: 20 },
    dateLine: { flex: 1, height: 1, borderRadius: 0.5 },
    dateText: { marginHorizontal: 12, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    statusBox: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    statusText: { marginLeft: 8, fontSize: 13 },
    messageImage: { width: 240, height: 240, borderRadius: 12, marginBottom: 4 },
    documentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 8, marginVertical: 4, width: 250 },
    documentIconContainer: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    documentInfo: { flex: 1, marginRight: 8 },
    documentMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    documentName: { fontSize: 13, fontWeight: '600' },
    documentSize: { fontSize: 11 },
    extensionBadge: { marginLeft: 6, paddingHorizontal: 4, paddingVertical: 1, backgroundColor: 'rgba(128,128,128,0.2)', borderRadius: 4 },
    extensionText: { fontSize: 8, fontWeight: 'bold', color: '#666' },
    downloadBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    navButton: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
    navButtonText: { fontSize: 13, fontWeight: 'bold' },
    mapButton: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    uploadingContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    uploadingText: { marginLeft: 8, fontSize: 14 }
});
