import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, useColorScheme, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { COLORS } from '../../../components/chat/ChatConstants';
import { contactService, UserContact } from '../../../services/contactService';
import { useUser } from '../../../context/UserContext';
import { useChat } from '../../../context/ChatContext';
import { API_BASE_URL } from '../../../config/api.config';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactProfile'>;

export const ContactProfileScreen: React.FC<Props> = ({ route, navigation }) => {
    const { userId } = route.params;
    const isDarkMode = useColorScheme() === 'dark';
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
            const allContacts = await contactService.getContacts();
            const found = allContacts.find(c => c.ID === userId);
            if (found) {
                setContact(found);
                if (currentUser?.ID) {
                    const friends = await contactService.getFriends(currentUser.ID);
                    setIsFriend(friends.some(f => f.ID === userId));
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

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    if (!contact) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.text }}>User not found</Text>
            </View>
        );
    }

    const avatarUrl = contact.avatarUrl
        ? `${API_BASE_URL}${contact.avatarUrl}`
        : null;

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View style={[styles.avatarContainer, { borderColor: theme.borderColor }]}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.button }]}>
                            <Text style={[styles.avatarInitial, { color: theme.buttonText }]}>
                                {(contact.spiritualName || contact.karmicName)[0]}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.name, { color: theme.text }]}>
                    {contact.spiritualName || contact.karmicName}
                </Text>
                {contact.spiritualName && (
                    <Text style={[styles.karmicName, { color: theme.subText }]}>
                        ({contact.karmicName})
                    </Text>
                )}
            </View>

            <View style={styles.infoSection}>
                <InfoItem label="Identity" value={contact.identity || 'Devotee'} theme={theme} />
                <InfoItem label="Location" value={`${contact.city}, ${contact.country}`} theme={theme} />
                <InfoItem label="Email" value={contact.email} theme={theme} />
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: isFriend ? theme.borderColor : theme.accent }]}
                    onPress={toggleFriend}
                >
                    <Text style={[styles.actionButtonText, { color: isFriend ? theme.text : '#FFF' }]}>
                        {isFriend ? 'Remove Friend' : 'Add Friend'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: isFriend ? theme.button : theme.borderColor, marginTop: 12 }]}
                    onPress={handleSendMessage}
                    disabled={!isFriend}
                >
                    <Text style={[styles.actionButtonText, { color: isFriend ? theme.buttonText : theme.subText, opacity: isFriend ? 1 : 0.5 }]}>
                        {t('contacts.sendMessage')}
                    </Text>
                    {!isFriend && (
                        <Text style={{ fontSize: 10, color: theme.subText, marginTop: 2 }}>
                            {t('contacts.friendsOnly')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const InfoItem = ({ label, value, theme }: { label: string, value: string, theme: any }) => (
    <View style={[styles.infoItem, { borderBottomColor: theme.borderColor }]}>
        <Text style={[styles.infoLabel, { color: theme.subText }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        padding: 4,
        marginBottom: 20,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    karmicName: {
        fontSize: 16,
        marginTop: 4,
    },
    infoSection: {
        paddingHorizontal: 20,
        marginTop: 20,
    },
    infoItem: {
        paddingVertical: 15,
        borderBottomWidth: 0.5,
    },
    infoLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 17,
    },
    actions: {
        padding: 20,
        marginTop: 20,
    },
    actionButton: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
