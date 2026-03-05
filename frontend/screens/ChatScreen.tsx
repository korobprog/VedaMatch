import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StatusBar, StyleSheet, Alert, BackHandler, Animated, TouchableOpacity, ImageBackground, Image, KeyboardAvoidingView, Platform, Modal, Text, TextInput, FlatList, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useSettings as usePortalSettings } from '../context/SettingsContext';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import { useRoleTheme } from '../hooks/useRoleTheme';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { ProtectedScreen } from '../components/ProtectedScreen';
import { shareImage, downloadImage } from '../services/fileService';
import { contactService } from '../services/contactService';
import { messageService, P2PMessage } from '../services/messageService';
import LinearGradient from 'react-native-linear-gradient';
import { isColorLight, isGradientLight } from '../utils/chatBackgroundContrast';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export const ChatScreen: React.FC<Props> = ({ navigation, route }) => {
    const { setIsMenuOpen, isDarkMode, chatBackground, chatBackgroundType } = usePortalSettings();
    const { handleMenuOption, recipientUser, setShowMenu, showMenu, setChatRecipient } = useChat();
    const { user: currentUser } = useUser();
    const { t } = useTranslation();
    const { colors } = useRoleTheme(currentUser?.role, isDarkMode);
    const insets = useSafeAreaInsets();
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const [mediaModalVisible, setMediaModalVisible] = useState(false);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [mediaItems, setMediaItems] = useState<P2PMessage[]>([]);
    const [searchModalVisible, setSearchModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<P2PMessage[]>([]);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const [shareContacts, setShareContacts] = useState<Array<{ id: number; title: string; subtitle: string }>>([]);
    const [chatPreference, setChatPreference] = useState<{ muted?: boolean; pinned?: boolean }>({});
    const isImageBackground = chatBackgroundType === 'image' && Boolean(chatBackground);
    const isGradientBackground = chatBackgroundType === 'gradient' && typeof chatBackground === 'string' && chatBackground.includes('|');
    const backgroundSource = useMemo(() => {
        if (!isImageBackground || !chatBackground) return undefined;
        const isRemoteUri = /^https?:\/\//i.test(chatBackground);
        return isRemoteUri
            ? { uri: chatBackground, cache: 'force-cache' as const }
            : { uri: chatBackground };
    }, [chatBackground, isImageBackground]);
    const gradientBackgroundColors = useMemo(() => {
        if (!isGradientBackground || !chatBackground) {
            return ['#F2EFE6', '#E9E5DA'];
        }
        const parts = chatBackground.split('|').map((part) => part.trim()).filter(Boolean);
        return parts.length >= 2 ? parts : ['#F2EFE6', '#E9E5DA'];
    }, [chatBackground, isGradientBackground]);
    const useDarkStatusBar =
        (chatBackgroundType === 'color' && isColorLight(chatBackground)) ||
        (chatBackgroundType === 'gradient' && isGradientLight(chatBackground));

    useEffect(() => {
        if (showMenu) {
            Animated.timing(overlayOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [showMenu, overlayOpacity]);

    const handleBackNavigation = React.useCallback(() => {
        const state = navigation.getState();
        const routes = state?.routes || [];
        const prevRoute = routes.length > 1 ? routes[routes.length - 2] : null;

        if (navigation.canGoBack() && prevRoute?.name) {
            navigation.goBack();
        } else {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Portal', params: { initialTab: 'contacts' } }],
            });
        }
    }, [navigation]);

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                handleBackNavigation();
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [handleBackNavigation]),
    );

    useEffect(() => {
        if (!isImageBackground || !chatBackground || !chatBackground.startsWith('http')) return;
        Image.prefetch(chatBackground).catch(() => { });
    }, [chatBackground, isImageBackground]);

    useEffect(() => {
        const targetUserId = route.params?.userId;
        if (!targetUserId || !currentUser?.ID || targetUserId === currentUser.ID) {
            return;
        }
        if (recipientUser?.ID === targetUserId) {
            return;
        }

        let isActive = true;
        const fallbackName = route.params?.name?.trim() || `User ${targetUserId}`;

        const bindRecipient = async () => {
            const contact = await contactService.getUserById(targetUserId);
            if (!isActive) return;

            if (contact) {
                setChatRecipient(contact);
                return;
            }

            setChatRecipient({
                ID: targetUserId,
                karmicName: fallbackName,
                spiritualName: route.params?.name?.trim() || '',
                email: '',
                avatarUrl: '',
                lastSeen: '',
                identity: '',
                city: '',
                country: '',
            });
        };

        void bindRecipient();
        return () => {
            isActive = false;
        };
    }, [route.params?.userId, route.params?.name, currentUser?.ID, recipientUser?.ID, setChatRecipient]);

    const handleBlockUser = () => {
        if (!currentUser?.ID || !recipientUser?.ID) return;

        Alert.alert(
            t('contacts.blockConfirmTitle'),
            t('contacts.blockConfirmMsg'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('contacts.block'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await contactService.blockUser(currentUser.ID!, recipientUser.ID);
                            setShowMenu(false);
                            navigation.goBack(); // Close chat after blocking
                        } catch {
                            Alert.alert(t('error'), 'Failed to block user');
                        }
                    }
                }
            ]
        );
    };

    const handleReportUser = () => {
        if (!recipientUser?.ID) return;
        setShowMenu(false);
        navigation.navigate('SupportTicketForm', {
            entryPoint: 'abuse_report',
            reportType: 'user',
            reportedUserId: recipientUser.ID,
            reportedUserName: recipientUser.spiritualName || recipientUser.karmicName || `User ${recipientUser.ID}`,
        });
    };


    const handleCallPress = () => {
        if (recipientUser?.ID) {
            navigation.navigate('CallScreen', {
                targetId: recipientUser.ID,
                isIncoming: false,
                callerName: recipientUser.spiritualName || recipientUser.karmicName || 'User'
            });
        }
    };

    const openMediaIndex = async () => {
        if (!recipientUser?.ID) return;
        setMediaLoading(true);
        try {
            const response = await messageService.getMediaIndex({
                peerUserId: recipientUser.ID,
                limit: 100,
                types: ['image', 'audio', 'document', 'video_circle'],
            });
            setMediaItems(response.items || []);
            setMediaModalVisible(true);
        } catch (error) {
            console.error('Failed to load media index', error);
            Alert.alert(t('error'), 'Failed to load media and files');
        } finally {
            setMediaLoading(false);
        }
    };

    const runChatSearch = async () => {
        if (!recipientUser?.ID || !searchQuery.trim()) return;
        setSearchLoading(true);
        try {
            const response = await messageService.searchMessages({
                peerUserId: recipientUser.ID,
                q: searchQuery.trim(),
                limit: 50,
                includeTranscripts: true,
            });
            setSearchResults(response.items || []);
        } catch (error) {
            console.error('Failed to search messages', error);
            Alert.alert(t('error'), 'Failed to search in chat');
        } finally {
            setSearchLoading(false);
        }
    };

    const togglePreference = async (key: 'muted' | 'pinned') => {
        if (!recipientUser?.ID) return;
        const currentValue = Boolean(chatPreference[key]);
        const nextValue = !currentValue;
        try {
            const updated = await messageService.updateChatPreference(recipientUser.ID, { [key]: nextValue });
            setChatPreference({
                muted: updated.muted,
                pinned: updated.pinned,
            });
            Alert.alert(
                t('common.success'),
                key === 'muted'
                    ? (updated.muted ? 'Chat muted' : 'Chat unmuted')
                    : (updated.pinned ? 'Chat pinned' : 'Chat unpinned'),
            );
        } catch (error) {
            console.error('Failed to update chat preference', error);
            Alert.alert(t('error'), 'Failed to update chat settings');
        }
    };

    const openShareContactModal = async () => {
        if (!recipientUser?.ID) return;
        setShareLoading(true);
        try {
            const contacts = await contactService.getContacts();
            const prepared = contacts
                .filter((contact) => contact.ID !== recipientUser.ID)
                .map((contact) => ({
                    id: contact.ID,
                    title: contact.spiritualName || contact.karmicName || contact.nickname || `User ${contact.ID}`,
                    subtitle: [contact.city, contact.country].filter(Boolean).join(', '),
                }))
                .slice(0, 50);
            setShareContacts(prepared);
            setShareModalVisible(true);
        } catch (error) {
            console.error('Failed to load contacts for sharing', error);
            Alert.alert(t('error'), 'Failed to load contacts');
        } finally {
            setShareLoading(false);
        }
    };

    const shareContactCard = async (targetUserId: number) => {
        if (!recipientUser?.ID) return;
        try {
            await messageService.shareContact({
                recipientId: recipientUser.ID,
                targetUserId,
            });
            setShareModalVisible(false);
            Alert.alert(t('common.success'), 'Contact sent');
        } catch (error) {
            console.error('Failed to share contact', error);
            Alert.alert(t('error'), 'Failed to send contact');
        }
    };

    const content = (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
            <StatusBar barStyle={useDarkStatusBar ? 'dark-content' : 'light-content'} backgroundColor="transparent" translucent />

            {showMenu && (
                <Animated.View
                    style={[
                        styles.overlayWrapper,
                        { opacity: overlayOpacity }
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowMenu(false)}
                    >
                        <LinearGradient
                            colors={
                                isImageBackground
                                    ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.78)']
                                    : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.35)']
                            }
                            style={StyleSheet.absoluteFill}
                        />
                    </TouchableOpacity>
                </Animated.View>
            )}
            <ChatHeader
                title={recipientUser ? `${recipientUser.spiritualName || recipientUser.karmicName}` : "VedaMatch"}
                onSettingsPress={() => setIsMenuOpen(true)}
                onCallPress={handleCallPress}
                topInset={insets.top}
                onBackPress={() => {
                    handleBackNavigation();
                }}
            />

            <View style={styles.messagesWrap}>
                <MessageList
                    onDownloadImage={downloadImage}
                    onShareImage={shareImage}
                    onNavigateToTab={(tab) => navigation.navigate('Portal', { initialTab: tab as any })}
                    onNavigateToMap={(mapData) => {
                        navigation.navigate('MapGeoapify', {
                            focusMarker: mapData?.markers?.[0] ? {
                                id: mapData.markers[0].id,
                                type: mapData.markers[0].type,
                                latitude: mapData.markers[0].latitude,
                                longitude: mapData.markers[0].longitude,
                            } : undefined,
                        });
                    }}
                />
            </View>

            <View style={{ zIndex: 10 }}>
                <ChatInput
                    onMenuOption={(option) => {
                        if (option === 'contacts.viewProfile') {
                            if (recipientUser) {
                                navigation.navigate('ContactProfile', { userId: recipientUser.ID });
                            }
                            setShowMenu(false);
                            return;
                        }
                        if (option === 'contacts.block') {
                            handleBlockUser();
                            return;
                        }
                        if (option === 'contacts.report') {
                            handleReportUser();
                            return;
                        }
                        if (option === 'contacts.media') {
                            setShowMenu(false);
                            void openMediaIndex();
                            return;
                        }
                        if (option === 'contacts.search') {
                            setShowMenu(false);
                            setSearchModalVisible(true);
                            return;
                        }
                        if (option === 'contacts.mute') {
                            setShowMenu(false);
                            void togglePreference('muted');
                            return;
                        }
                        if (option === 'contacts.pin') {
                            setShowMenu(false);
                            void togglePreference('pinned');
                            return;
                        }
                        if (option === 'contacts.share') {
                            setShowMenu(false);
                            void openShareContactModal();
                            return;
                        }
                        handleMenuOption(option,
                            (tab) => navigation.navigate('Portal', { initialTab: tab as any })
                        )
                    }}
                />
            </View>

            <Modal visible={mediaModalVisible} transparent animationType="fade" onRequestClose={() => setMediaModalVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }]}>
                        <Text style={[styles.modalTitle, { color: isDarkMode ? '#F9FAFB' : '#111827' }]}>Media and files</Text>
                        {mediaLoading ? (
                            <ActivityIndicator size="small" color={colors.accent} />
                        ) : (
                            <FlatList
                                data={mediaItems}
                                keyExtractor={(item, index) => (item.id || item.ID || `media_${index}`).toString()}
                                renderItem={({ item }) => {
                                    const title = item.fileName || item.type || 'File';
                                    const subtitle = item.content || '';
                                    return (
                                        <TouchableOpacity
                                            style={styles.modalListItem}
                                            onPress={() => {
                                                if (subtitle.startsWith('http')) {
                                                    Linking.openURL(subtitle).catch(() => {
                                                        Alert.alert(t('error'), 'Failed to open file');
                                                    });
                                                }
                                            }}
                                        >
                                            <Text style={[styles.modalItemTitle, { color: isDarkMode ? '#F9FAFB' : '#111827' }]} numberOfLines={1}>
                                                {title}
                                            </Text>
                                            <Text style={[styles.modalItemSubtitle, { color: isDarkMode ? '#D1D5DB' : '#6B7280' }]} numberOfLines={1}>
                                                {subtitle || item.type}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={<Text style={[styles.modalEmptyText, { color: isDarkMode ? '#D1D5DB' : '#6B7280' }]}>No media</Text>}
                            />
                        )}
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setMediaModalVisible(false)}>
                            <Text style={styles.modalCloseButtonText}>{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={searchModalVisible} transparent animationType="fade" onRequestClose={() => setSearchModalVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }]}>
                        <Text style={[styles.modalTitle, { color: isDarkMode ? '#F9FAFB' : '#111827' }]}>Chat search</Text>
                        <View style={styles.searchRow}>
                            <TextInput
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Enter text"
                                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
                                style={[styles.searchInput, { color: isDarkMode ? '#F9FAFB' : '#111827', borderColor: isDarkMode ? '#374151' : '#D1D5DB' }]}
                            />
                            <TouchableOpacity style={styles.searchButton} onPress={() => void runChatSearch()}>
                                <Text style={styles.searchButtonText}>Search</Text>
                            </TouchableOpacity>
                        </View>
                        {searchLoading ? (
                            <ActivityIndicator size="small" color={colors.accent} />
                        ) : (
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item, index) => (item.id || item.ID || `search_${index}`).toString()}
                                renderItem={({ item }) => (
                                    <View style={styles.modalListItem}>
                                        <Text style={[styles.modalItemTitle, { color: isDarkMode ? '#F9FAFB' : '#111827' }]} numberOfLines={2}>
                                            {item.content || '(no text)'}
                                        </Text>
                                        <Text style={[styles.modalItemSubtitle, { color: isDarkMode ? '#D1D5DB' : '#6B7280' }]} numberOfLines={1}>
                                            {item.type || 'text'}
                                        </Text>
                                    </View>
                                )}
                                ListEmptyComponent={<Text style={[styles.modalEmptyText, { color: isDarkMode ? '#D1D5DB' : '#6B7280' }]}>No matches found</Text>}
                            />
                        )}
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSearchModalVisible(false)}>
                            <Text style={styles.modalCloseButtonText}>{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={shareModalVisible} transparent animationType="fade" onRequestClose={() => setShareModalVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }]}>
                        <Text style={[styles.modalTitle, { color: isDarkMode ? '#F9FAFB' : '#111827' }]}>Share contact</Text>
                        {shareLoading ? (
                            <ActivityIndicator size="small" color={colors.accent} />
                        ) : (
                            <FlatList
                                data={shareContacts}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.modalListItem} onPress={() => void shareContactCard(item.id)}>
                                        <Text style={[styles.modalItemTitle, { color: isDarkMode ? '#F9FAFB' : '#111827' }]} numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                        <Text style={[styles.modalItemSubtitle, { color: isDarkMode ? '#D1D5DB' : '#6B7280' }]} numberOfLines={1}>
                                            {item.subtitle || `ID ${item.id}`}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={<Text style={[styles.modalEmptyText, { color: isDarkMode ? '#D1D5DB' : '#6B7280' }]}>No available contacts</Text>}
                            />
                        )}
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShareModalVisible(false)}>
                            <Text style={styles.modalCloseButtonText}>{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );

    return (
        <ProtectedScreen>
            {isImageBackground && backgroundSource ? (
                <ImageBackground
                    source={backgroundSource}
                    style={styles.container}
                    resizeMode="cover"
                    fadeDuration={0}
                >
                    <View style={[styles.imageOverlay, { backgroundColor: 'rgba(7,12,23,0.38)' }]}>
                        {content}
                    </View>
                </ImageBackground>
            ) : isGradientBackground ? (
                <LinearGradient
                    colors={gradientBackgroundColors}
                    style={styles.container}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {content}
                </LinearGradient>
            ) : (
                <View style={[styles.container, { backgroundColor: chatBackgroundType === 'color' ? chatBackground : colors.background }]}>
                    {content}
                </View>
            )}
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    imageOverlay: {
        flex: 1,
    },
    messagesWrap: {
        flex: 1,
        marginTop: 6,
    },
    overlayWrapper: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    modalCard: {
        borderRadius: 16,
        padding: 16,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    modalListItem: {
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(148,163,184,0.35)',
    },
    modalItemTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalItemSubtitle: {
        fontSize: 12,
        marginTop: 3,
    },
    modalEmptyText: {
        textAlign: 'center',
        paddingVertical: 20,
        fontSize: 13,
    },
    modalCloseButton: {
        marginTop: 12,
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#3B82F6',
    },
    modalCloseButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        marginRight: 8,
    },
    searchButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13,
    },
});
