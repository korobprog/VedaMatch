import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StatusBar,
    StyleSheet,
    useColorScheme,
    Alert,
    Platform,
    BackHandler,
    Animated,
    TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useSettings } from '../context/SettingsContext';
import { ChatProvider, useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../components/chat/ChatConstants';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { ProtectedScreen } from '../components/ProtectedScreen';
import { shareImage, downloadImage } from '../services/fileService';
import { contactService } from '../services/contactService';
import LinearGradient from 'react-native-linear-gradient';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export const ChatScreen: React.FC<Props> = ({ navigation }) => {
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { setIsMenuOpen } = useSettings();
    const { handleMenuOption, recipientUser, setShowMenu, showMenu } = useChat();
    const { user: currentUser, isLoggedIn } = useUser();
    const { t } = useTranslation();
    const overlayOpacity = useRef(new Animated.Value(0)).current;

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

    useEffect(() => {
        const backAction = () => {
            if (!navigation.canGoBack()) {
                navigation.navigate('Portal', { initialTab: 'contacts' });
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [navigation]);

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

    return (
        <ProtectedScreen>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {showMenu && (
                    <Animated.View
                        style={[
                            styles.overlayWrapper,
                            { opacity: overlayOpacity }
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        >
                            <TouchableOpacity
                                activeOpacity={1}
                                style={StyleSheet.absoluteFill}
                                onPress={() => setShowMenu(false)}
                            />
                        </LinearGradient>
                    </Animated.View>
                )}
                <ChatHeader
                    title={recipientUser ? `${recipientUser.spiritualName || recipientUser.karmicName}` : "VedaMatch"}
                    onSettingsPress={() => setIsMenuOpen(true)}
                    onCallPress={handleCallPress}
                    onBackPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('Portal');
                        }
                    }}
                />

                <MessageList
                    onDownloadImage={downloadImage}
                    onShareImage={shareImage}
                    onNavigateToTab={(tab) => navigation.navigate('Portal', { initialTab: tab as any })}
                    onNavigateToMap={(mapData) => {
                        // Navigate to map screen with mapData params
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
            </View>
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlayWrapper: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
    },
});
