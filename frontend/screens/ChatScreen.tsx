import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StatusBar, StyleSheet, Alert, BackHandler, Animated, TouchableOpacity, ImageBackground, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
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
    }, [showMenu]);

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
    }, [route.params?.userId, route.params?.name, currentUser?.ID, recipientUser?.ID]);

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
                        } catch (error) {
                            Alert.alert(t('error'), 'Failed to block user');
                        }
                    }
                }
            ]
        );
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
                        handleMenuOption(option,
                            (tab) => navigation.navigate('Portal', { initialTab: tab as any })
                        )
                    }}
                />
            </View>
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
});
