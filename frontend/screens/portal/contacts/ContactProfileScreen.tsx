import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, useColorScheme, ActivityIndicator, Dimensions, Platform, StatusBar, ImageBackground } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../../types/navigation';
import { COLORS } from '../../../components/chat/ChatConstants';
import { contactService, UserContact } from '../../../services/contactService';
import { useUser } from '../../../context/UserContext';
import { useChat } from '../../../context/ChatContext';
import { useSettings } from '../../../context/SettingsContext'; // Added useSettings
import { BlurView } from '@react-native-community/blur'; // Added BlurView
import LinearGradient from 'react-native-linear-gradient'; // Added LinearGradient
import { ChevronLeft, Mail, MapPin, User, Shield, MessageCircle, UserPlus, UserMinus } from 'lucide-react-native'; // Icons

import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '../../../utils/url';
import OrganizerBadge from '../../../components/travel/OrganizerBadge';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactProfile'>;
const { width } = Dimensions.get('window');

export const ContactProfileScreen: React.FC<Props> = ({ route, navigation }) => {
    const { userId } = route.params;
    const { vTheme, isDarkMode, portalBackground, portalBackgroundType } = useSettings();
    const isPhotoBg = portalBackgroundType === 'image';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const { user: currentUser } = useUser();
    const { setChatRecipient } = useChat();
    const { t } = useTranslation();

    const [contact, setContact] = useState<UserContact | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFriend, setIsFriend] = useState(false);

    useEffect(() => {
        fetchContactData();
    }, [userId]);

    const fetchContactData = async () => {
        try {
            setLoading(true);

            // First try to find in contacts list
            let found: UserContact | null = null;
            try {
                const allContacts = await contactService.getContacts();
                found = allContacts.find(c => c.ID === userId) || null;
            } catch (err) {
                console.log('Could not fetch contacts list, trying direct fetch');
            }

            // If not found in contacts, try to fetch directly by ID
            if (!found) {
                found = await contactService.getUserById(userId);
            }

            if (found) {
                setContact(found);
                if (currentUser?.ID) {
                    try {
                        const friends = await contactService.getFriends(currentUser.ID);
                        setIsFriend(friends.some(f => f.ID === userId));
                    } catch (err) {
                        console.log('Could not fetch friends list');
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching contact profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFriend = async () => {
        if (!currentUser?.ID || !contact) return;
        try {
            if (isFriend) {
                await contactService.removeFriend(currentUser.ID, contact.ID);
                setIsFriend(false);
            } else {
                await contactService.addFriend(currentUser.ID, contact.ID);
                setIsFriend(true);
            }
        } catch (error) {
            console.error('Error toggling friend:', error);
        }
    };

    const handleSendMessage = () => {
        if (!contact) return;
        setChatRecipient(contact);
        navigation.navigate('Chat');
    };

    // Background Wrapper Logic
    const BackgroundWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        if (portalBackgroundType === 'image' && portalBackground) {
            return (
                <ImageBackground
                    source={{ uri: portalBackground }}
                    style={styles.container}
                    resizeMode="cover"
                >
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="dark"
                        blurAmount={10}
                        reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                    />
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
                        {children}
                    </View>
                </ImageBackground>
            );
        }

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
                    <Text style={{ color: isPhotoBg ? '#fff' : vTheme.colors.text }}>User not found</Text>
                </View>
            </BackgroundWrapper>
        );
    }

    const avatarUrl = getMediaUrl(contact.avatarUrl);
    const textColor = isPhotoBg ? '#FFFFFF' : vTheme.colors.text;
    const subTextColor = isPhotoBg ? 'rgba(255,255,255,0.7)' : vTheme.colors.textSecondary;
    const cardBg = isPhotoBg ? 'rgba(255,255,255,0.1)' : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)');
    const cardBorder = isPhotoBg ? 'rgba(255,255,255,0.2)' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)');

    return (
        <BackgroundWrapper>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.15)' : vTheme.colors.backgroundSecondary }]}
                    onPress={() => navigation.goBack()}
                >
                    <ChevronLeft size={24} color={isPhotoBg ? '#FFF' : vTheme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textColor }]}>{t('contacts.profile')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Profile Card */}
                <View style={styles.cardContainer}>
                    <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        {(isPhotoBg || isDarkMode) && (
                            <BlurView
                                style={StyleSheet.absoluteFill}
                                blurType={isDarkMode ? "dark" : "light"}
                                blurAmount={20}
                                reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                            />
                        )}

                        <View style={styles.avatarWrapper}>
                            <View style={styles.avatarContainer}>
                                {avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
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
                        theme={vTheme}
                        textColor={textColor}
                        subTextColor={subTextColor}
                        bg={cardBg}
                        border={cardBorder}
                        isDark={isDarkMode || isPhotoBg}
                    />
                    <InfoItem
                        icon={<MapPin size={20} color={vTheme.colors.primary} />}
                        label={t('contacts.location') || "Location"}
                        value={`${contact.city || ''}, ${contact.country || ''}`}
                        theme={vTheme}
                        textColor={textColor}
                        subTextColor={subTextColor}
                        bg={cardBg}
                        border={cardBorder}
                        isDark={isDarkMode || isPhotoBg}
                    />
                    <InfoItem
                        icon={<Mail size={20} color={vTheme.colors.primary} />}
                        label={t('contacts.email') || "Email"}
                        value={contact.email}
                        theme={vTheme}
                        textColor={textColor}
                        subTextColor={subTextColor}
                        bg={cardBg}
                        border={cardBorder}
                        isDark={isDarkMode || isPhotoBg}
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

const InfoItem = ({ icon, label, value, theme, textColor, subTextColor, bg, border, isDark }: any) => (
    <View style={[styles.infoItemContainer, { backgroundColor: bg, borderColor: border }]}>
        {isDark && (
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
