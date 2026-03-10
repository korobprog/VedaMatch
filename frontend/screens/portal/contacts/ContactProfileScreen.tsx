import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FastImage from 'react-native-fast-image';
import { useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../../../types/navigation';
import { contactService, UserContact } from '../../../services/contactService';
import { useUser } from '../../../context/UserContext';
import { useChat } from '../../../context/ChatContext';
import { useSettings } from '../../../context/SettingsContext'; // Added useSettings
import { BlurView } from '@react-native-community/blur'; // Added BlurView
import LinearGradient from 'react-native-linear-gradient'; // Added LinearGradient
import { resolveEffectivePerformanceMode } from '../../../utils/androidVisualPolicy';
import { AtSign, ChevronLeft, Mail, MapPin, Shield, MessageCircle, UserPlus, UserMinus } from 'lucide-react-native'; // Icons

import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../../utils/url';
import OrganizerBadge from '../../../components/travel/OrganizerBadge';
import {
    CONTACTS_CACHE_GC_TIME_MS,
    CONTACTS_CACHE_STALE_TIME_MS,
    invalidateContactsCaches,
} from '../../../lib/contactCache';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactProfile'>;

export const ContactProfileScreen: React.FC<Props> = ({ route, navigation }) => {
    const { userId } = route.params;
    const { vTheme, isDarkMode, portalBackground, portalBackgroundType, performanceMode, runtimePerformanceState } = useSettings();
    const { user: currentUser } = useUser();
    const { setChatRecipient } = useChat();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const [contact, setContact] = useState<UserContact | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFriend, setIsFriend] = useState(false);
    const effectivePerformanceMode = resolveEffectivePerformanceMode(performanceMode, runtimePerformanceState);
    const isAndroidReducedEffects = Platform.OS === 'android' && effectivePerformanceMode !== 'high_quality';
    const allowBlurEffects = !isAndroidReducedEffects;

    const handleBackNavigation = useCallback(() => {
        const state = navigation.getState();
        const routes = state?.routes || [];
        const prevRoute = routes.length > 1 ? routes[routes.length - 2] : null;

        if (navigation.canGoBack() && prevRoute?.name) {
            navigation.goBack();
            return;
        }

        navigation.reset({
            index: 0,
            routes: [{ name: 'Portal', params: { initialTab: 'contacts' } as any }],
        });
    }, [navigation]);

    const fetchContactData = useCallback(async () => {
        try {
            setLoading(true);
            const found = await contactService.getUserById(userId);

            if (found) {
                setContact(found);
                if (currentUser?.ID) {
                    try {
                        const friends = await queryClient.fetchQuery({
                            queryKey: ['contacts-meta', 'friends'],
                            queryFn: () => contactService.getFriends(currentUser.ID!),
                            staleTime: CONTACTS_CACHE_STALE_TIME_MS,
                            gcTime: CONTACTS_CACHE_GC_TIME_MS,
                        });
                        setIsFriend(friends.some(f => f.ID === userId));
                    } catch {
                        console.log('Could not fetch friends list');
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching contact profile:', error);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.ID, queryClient, userId]);

    useEffect(() => {
        fetchContactData().catch(() => undefined);
    }, [fetchContactData]);

    const toggleFriend = useCallback(async () => {
        if (!currentUser?.ID || !contact) return;
        try {
            if (isFriend) {
                await contactService.removeFriend(currentUser.ID, contact.ID);
                setIsFriend(false);
            } else {
                await contactService.addFriend(currentUser.ID, contact.ID);
                setIsFriend(true);
            }
            await invalidateContactsCaches(queryClient);
        } catch (error) {
            console.error('Error toggling friend:', error);
        }
    }, [contact, currentUser?.ID, isFriend, queryClient]);

    const handleSendMessage = () => {
        if (!contact) return;
        setChatRecipient(contact);
        navigation.navigate('Chat');
    };

    // Background Wrapper Logic
    const BackgroundWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        if (portalBackgroundType === 'gradient' && portalBackground) {
            const colors = portalBackground.split('|');
            return (
                <LinearGradient
                    colors={colors}
                    style={styles.container}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {children}
                </LinearGradient>
            );
        }

        return (
            <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
                {children}
            </View>
        );
    };

    if (loading) {
        return (
            <BackgroundWrapper>
                <View style={[styles.centerContent]}>
                    <ActivityIndicator size="large" color={vTheme.colors.primary} />
                </View>
            </BackgroundWrapper>
        );
    }

    if (!contact) {
        return (
            <BackgroundWrapper>
                <View style={styles.centerContent}>
                    <Text style={{ color: vTheme.colors.text }}>User not found</Text>
                </View>
            </BackgroundWrapper>
        );
    }

    const avatarUrl = getMediaUrl(contact.avatarUrl);
    const textColor = vTheme.colors.text;
    const subTextColor = vTheme.colors.textSecondary;
    const cardBg = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)';
    const cardBorder = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)';
    return (
        <BackgroundWrapper>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: vTheme.colors.backgroundSecondary }]}
                    onPress={handleBackNavigation}
                >
                    <ChevronLeft size={24} color={vTheme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textColor }]}>{t('contacts.profile')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Profile Card */}
                <View style={[styles.cardContainer, isAndroidReducedEffects && { elevation: 2 }]}>
                    <View style={[styles.glassCard, isAndroidReducedEffects && styles.glassCardReduced, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        {isDarkMode && allowBlurEffects && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType={isDarkMode ? "dark" : "light"}
                                blurAmount={10}
                                reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                            />
                        )}

                        <View style={[styles.avatarWrapper, isAndroidReducedEffects && { elevation: 2 }]}>
                            <View style={styles.avatarContainer}>
                                {avatarUrl ? (
                                    <FastImage
                                        source={{
                                            uri: avatarUrl,
                                            priority: FastImage.priority.normal,
                                            cache: FastImage.cacheControl.immutable,
                                        }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: '#404040' }]}>
                                        <Text style={[styles.avatarInitial, { color: '#FFF' }]}>
                                            {(contact.spiritualName || contact.karmicName)[0]}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <Text style={[styles.name, { color: textColor }]}>
                            {contact.spiritualName || contact.karmicName}
                        </Text>

                        {contact.spiritualName && (
                            <Text style={[styles.karmicName, { color: subTextColor }]}>
                                ({contact.karmicName})
                            </Text>
                        )}

                        {/* Status / Tagline placeholder if available later */}
                        <View style={{ paddingHorizontal: 20, marginTop: 15, marginBottom: 5 }}>
                            <OrganizerBadge userId={contact.ID} variant="full" />
                        </View>
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.infoContainer}>
                    <InfoItem
                        icon={<Shield size={20} color={vTheme.colors.primary} />}
                        label={t('contacts.identity') || "Identity"}
                        value={contact.identity || 'Devotee'}
                        textColor={textColor}
                        subTextColor={subTextColor}
                        bg={cardBg}
                        border={cardBorder}
                        isDark={isDarkMode}
                        allowBlur={allowBlurEffects}
                    />
                    <InfoItem
                        icon={<MapPin size={20} color={vTheme.colors.primary} />}
                        label={t('contacts.location') || "Location"}
                        value={`${contact.city || ''}, ${contact.country || ''}`}
                        textColor={textColor}
                        subTextColor={subTextColor}
                        bg={cardBg}
                        border={cardBorder}
                        isDark={isDarkMode}
                        allowBlur={allowBlurEffects}
                    />
                    <InfoItem
                        icon={<AtSign size={20} color={vTheme.colors.primary} />}
                        label="Nickname"
                        value={contact.nickname ? `@${contact.nickname}` : '—'}
                        textColor={textColor}
                        subTextColor={subTextColor}
                        bg={cardBg}
                        border={cardBorder}
                        isDark={isDarkMode}
                        allowBlur={allowBlurEffects}
                    />
                    <InfoItem
                        icon={<Mail size={20} color={vTheme.colors.primary} />}
                        label={t('contacts.email') || "Email"}
                        value={contact.email}
                        textColor={textColor}
                        subTextColor={subTextColor}
                        bg={cardBg}
                        border={cardBorder}
                        isDark={isDarkMode}
                        allowBlur={allowBlurEffects}
                    />
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: isFriend ? 'rgba(239, 68, 68, 0.2)' : vTheme.colors.primary, borderWidth: isFriend ? 1 : 0, borderColor: '#EF4444' }]}
                        onPress={toggleFriend}
                    >
                        {isFriend ? <UserMinus size={20} color="#EF4444" style={{ marginRight: 8 }} /> : <UserPlus size={20} color="#FFF" style={{ marginRight: 8 }} />}
                        <Text style={[styles.actionButtonText, { color: isFriend ? '#EF4444' : '#FFF' }]}>
                            {isFriend ? t('contacts.removeFriend') || 'Remove Friend' : t('contacts.addFriend') || 'Add Friend'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            {
                                backgroundColor: isFriend ? 'rgba(16, 185, 129, 0.2)' : 'rgba(150, 150, 150, 0.2)',
                                marginTop: 12,
                                borderWidth: 1,
                                borderColor: isFriend ? '#10B981' : 'rgba(150, 150, 150, 0.3)'
                            }
                        ]}
                        onPress={handleSendMessage}
                        disabled={!isFriend}
                    >
                        <MessageCircle size={20} color={isFriend ? '#10B981' : subTextColor} style={{ marginRight: 8 }} />
                        <Text style={[styles.actionButtonText, { color: isFriend ? '#10B981' : subTextColor }]}>
                            {t('contacts.sendMessage')}
                        </Text>
                    </TouchableOpacity>

                    {!isFriend && (
                        <Text style={{ fontSize: 12, color: subTextColor, marginTop: 8, textAlign: 'center' }}>
                            {t('contacts.friendsOnly')}
                        </Text>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </BackgroundWrapper>
    );
};

const InfoItem = ({ icon, label, value, textColor, subTextColor, bg, border, isDark, allowBlur = true }: any) => (
    <View style={[styles.infoItemContainer, { backgroundColor: bg, borderColor: border }]}>
        {isDark && allowBlur && (
            <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={10}
                reducedTransparencyFallbackColor="rgba(0,0,0,0.1)"
            />
        )}
        <View style={styles.infoIconContainer}>
            {icon}
        </View>
        <View style={styles.infoTextContainer}>
            <Text style={[styles.infoLabel, { color: subTextColor }]}>{label}</Text>
            <Text style={[styles.infoValue, { color: textColor }]} numberOfLines={1}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        fontFamily: 'Cinzel-Bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    cardContainer: {
        alignItems: 'center',
        marginBottom: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
            },
            android: {
                elevation: 10,
            }
        })
    },
    glassCard: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    glassCardReduced: {
        borderWidth: 0.5,
    },
    avatarWrapper: {
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            }
        })
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.8)',
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 48,
        fontWeight: 'bold',
        fontFamily: 'Cinzel-Bold',
    },
    name: {
        fontSize: 26,
        fontWeight: 'bold',
        fontFamily: 'Cinzel-Bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    karmicName: {
        fontSize: 16,
        fontFamily: 'Nunito',
        textAlign: 'center',
    },
    infoContainer: {
        gap: 12,
        marginBottom: 24,
    },
    infoItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    infoIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        marginBottom: 2,
        fontFamily: 'Nunito',
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Nunito',
    },
    actions: {
        marginTop: 0,
    },
    actionButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Nunito',
    },
});
