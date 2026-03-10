import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActivityIndicator, Image } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { ArrowDownLeft, ArrowUpRight, PhoneMissed, Phone, ArrowLeft, PhoneOff, Contact } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { callHistoryService, CallHistoryEntry, formatCallHistoryTime } from '../../services/callHistoryService';
import { contactService, UserContact } from '../../services/contactService';
import { getMediaUrl } from '../../utils/url';

type ContactsById = Record<number, UserContact | null>;

interface EnrichedCallHistoryItem extends CallHistoryEntry {
    contact: UserContact | null;
    displayName: string;
    avatarUrl: string | null;
    isOnline: boolean;
    subtitle: string;
}

const CONTACT_FETCH_CONCURRENCY = 4;
const CONTACT_ENRICH_MAX_ITEMS = 50;

export const CallHistoryScreen = () => {
    const navigation = useNavigation<any>();
    const { t, i18n } = useTranslation();
    const { vTheme, isDarkMode, portalBackgroundType } = useSettings();
    const isPhotoBg = portalBackgroundType === 'image' && isDarkMode;
    const [calls, setCalls] = React.useState<CallHistoryEntry[]>([]);
    const [contactsById, setContactsById] = React.useState<ContactsById>({});
    const [isLoading, setIsLoading] = React.useState(true);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const contactsByIdRef = React.useRef<ContactsById>({});

    React.useEffect(() => {
        contactsByIdRef.current = contactsById;
    }, [contactsById]);

    const isOnline = React.useCallback((lastSeen: string | undefined) => {
        if (!lastSeen) return false;
        const lastSeenDate = new Date(lastSeen);
        if (Number.isNaN(lastSeenDate.getTime())) return false;
        const diffMinutes = (Date.now() - lastSeenDate.getTime()) / 60000;
        return diffMinutes < 5;
    }, []);

    const formatLastSeen = React.useCallback((lastSeen: string | undefined) => {
        if (!lastSeen) return '';
        const date = new Date(lastSeen);
        if (Number.isNaN(date.getTime())) return '';

        const now = new Date();
        const isToday = now.toDateString() === date.toDateString();
        if (isToday) {
            return t('contacts.lastSeenToday', {
                time: date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
            });
        }

        return t('contacts.lastSeenDate', {
            date: date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        });
    }, [i18n.language, t]);

    const formatLocation = React.useCallback((contact: UserContact | null) => {
        if (!contact) return '';
        if (contact.country && contact.city) return `${contact.country}, ${contact.city}`;
        return contact.country || contact.city || '';
    }, []);

    const buildSubtitle = React.useCallback((contact: UserContact | null, online: boolean) => {
        if (!contact) return '';
        const nicknamePart = contact.nickname ? `@${contact.nickname}` : '';
        const presencePart = online ? t('calls.onlineNow') : formatLastSeen(contact.lastSeen);
        const locationPart = formatLocation(contact);

        if (nicknamePart && presencePart) return `${nicknamePart} · ${presencePart}`;
        if (nicknamePart && locationPart) return `${nicknamePart} · ${locationPart}`;
        return presencePart || locationPart || nicknamePart || '';
    }, [formatLastSeen, formatLocation, t]);

    const enrichContacts = React.useCallback(async (history: CallHistoryEntry[]) => {
        const userIds = Array.from(
            new Set(
                history
                    .map((item) => item.userId)
                    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
            ),
        ).slice(0, CONTACT_ENRICH_MAX_ITEMS);

        const missingIds = userIds.filter((id) => !(id in contactsByIdRef.current));
        if (missingIds.length === 0) {
            return;
        }

        const updates: ContactsById = {};
        for (let i = 0; i < missingIds.length; i += CONTACT_FETCH_CONCURRENCY) {
            const chunk = missingIds.slice(i, i + CONTACT_FETCH_CONCURRENCY);
            const chunkResults = await Promise.all(
                chunk.map(async (userId) => {
                    try {
                        const contact = await contactService.getUserById(userId);
                        return [userId, contact] as const;
                    } catch (error) {
                        console.warn('[CallHistoryScreen] Failed to enrich contact', { userId, error });
                        return [userId, null] as const;
                    }
                }),
            );

            chunkResults.forEach(([userId, contact]) => {
                updates[userId] = contact;
            });
        }

        setContactsById((prev) => ({ ...prev, ...updates }));
    }, []);

    const loadCalls = React.useCallback(async (refresh = false) => {
        try {
            if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            const history = await callHistoryService.getHistory();
            setCalls(history);
            void enrichContacts(history);
        } catch (error) {
            console.warn('[CallHistoryScreen] Failed to load call history', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [enrichContacts]);

    useFocusEffect(
        React.useCallback(() => {
            void loadCalls();
        }, [loadCalls]),
    );

    const getStatusConfig = (type: string) => {
        switch (type) {
            case 'incoming':
                return {
                    icon: <ArrowDownLeft size={18} color="#10B981" />,
                    color: '#10B981',
                    bgColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: 'rgba(16, 185, 129, 0.4)'
                };
            case 'outgoing':
                return {
                    icon: <ArrowUpRight size={18} color="#3B82F6" />,
                    color: '#3B82F6',
                    bgColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgba(59, 130, 246, 0.4)'
                };
            case 'missed':
                return {
                    icon: <PhoneMissed size={18} color="#FF4500" />, // Orange Red - very bright
                    color: '#FF4500',
                    bgColor: 'rgba(255, 69, 0, 0.25)', // Higher opacity
                    borderColor: 'rgba(255, 69, 0, 0.6)' // Stronger border
                };
            default:
                return {
                    icon: <Phone size={18} color={vTheme.colors.textSecondary} />,
                    color: vTheme.colors.textSecondary,
                    bgColor: 'rgba(150, 150, 150, 0.2)',
                    borderColor: 'rgba(150, 150, 150, 0.4)'
                };
        }
    };

    const handleCall = (contact: CallHistoryEntry) => {
        if (typeof contact.userId !== 'number' || !Number.isFinite(contact.userId)) {
            return;
        }
        navigation.navigate('CallScreen', {
            targetId: contact.userId,
            isIncoming: false,
            callerName: contact.name
        });
    };

    const stringToColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    };

    const renderItem = ({ item }: { item: CallHistoryEntry }) => {
        const contact = typeof item.userId === 'number' ? contactsById[item.userId] ?? null : null;
        const online = isOnline(contact?.lastSeen);
        const enrichedItem: EnrichedCallHistoryItem = {
            ...item,
            contact,
            displayName: (contact?.spiritualName || contact?.karmicName || item.name || '').trim() || 'User',
            avatarUrl: getMediaUrl(contact?.avatarUrl),
            isOnline: online,
            subtitle: buildSubtitle(contact, online),
        };
        const status = getStatusConfig(enrichedItem.type);
        const nameColor = isPhotoBg ? '#ffffff' : vTheme.colors.text;
        const subColor = isPhotoBg ? 'rgba(255,255,255,0.7)' : vTheme.colors.textSecondary;
        const canCallBack = typeof item.userId === 'number' && Number.isFinite(item.userId);
        const canOpenProfile = typeof item.userId === 'number' && Number.isFinite(item.userId);
        const titleInitial = (enrichedItem.displayName[0] || '?').toUpperCase();
        const avatarBgColor = stringToColor(enrichedItem.displayName || item.userId?.toString() || item.id);

        return (
            <View style={[
                styles.callItemContainer,
                {
                    backgroundColor: isPhotoBg ? 'transparent' : vTheme.colors.background,
                    borderBottomColor: isPhotoBg ? 'rgba(255,255,255,0.15)' : vTheme.colors.divider,
                }
            ]}>
                <TouchableOpacity
                    activeOpacity={canOpenProfile ? 0.85 : 1}
                    onPress={() => {
                        if (!canOpenProfile) return;
                        navigation.navigate('ContactProfile', { userId: item.userId });
                    }}
                    disabled={!canOpenProfile}
                    style={[styles.callItem]}>
                    {(isPhotoBg || isDarkMode) && (
                        <BlurView
                            style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
                            blurType={isDarkMode ? "dark" : "light"}
                            blurAmount={15}
                            reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                        />
                    )}

                    <View style={styles.avatarContainer}>
                        {enrichedItem.avatarUrl ? (
                            <Image source={{ uri: enrichedItem.avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: avatarBgColor }]}>
                                <Text style={styles.avatarPlaceholderText}>{titleInitial}</Text>
                            </View>
                        )}
                        {enrichedItem.isOnline && <View style={styles.onlineStatus} />}
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={[styles.name, { color: nameColor }]} numberOfLines={1} ellipsizeMode="tail">{enrichedItem.displayName}</Text>
                        {!!enrichedItem.subtitle && (
                            <Text
                                style={[styles.subtitleText, { color: subColor }]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {enrichedItem.subtitle}
                            </Text>
                        )}
                        <View style={styles.typeContainer}>
                            <View style={[
                                styles.statusTag,
                                {
                                    backgroundColor: status.bgColor,
                                    borderColor: status.borderColor,
                                    borderWidth: 1
                                }
                            ]}>
                                {status.icon}
                            </View>
                            <Text
                                style={[styles.timeText, { color: subColor, flex: 1 }]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {formatCallHistoryTime(enrichedItem.timestamp, i18n.language)} • {t(`calls.${enrichedItem.type}`)}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.callButton,
                            {
                                backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.15)' : vTheme.colors.primary,
                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : 'transparent',
                                borderWidth: isPhotoBg ? 1 : 0,
                                opacity: canCallBack ? 1 : 0.5,
                            }
                        ]}
                        onPress={() => handleCall(item)}
                        disabled={!canCallBack}
                        activeOpacity={0.7}
                    >
                        <Phone size={20} color="#ffffff" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <TouchableOpacity
                    style={styles.screenBackButton}
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                            return;
                        }
                        navigation.navigate('Portal', { resetToGridAt: Date.now() });
                    }}
                >
                    <ArrowLeft size={24} color={isPhotoBg ? '#FFFFFF' : vTheme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.header, {
                    color: isPhotoBg ? '#ffffff' : vTheme.colors.text,
                    fontFamily: 'Cinzel-Bold',
                }]}>
                    {t('calls.history')}
                </Text>
                <TouchableOpacity
                    style={styles.screenHeaderAction}
                    onPress={() => navigation.navigate('ContactsHome')}
                >
                    <Contact size={24} color={isPhotoBg ? '#FFFFFF' : vTheme.colors.text} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={calls}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                onRefresh={() => {
                    void loadCalls(true);
                }}
                refreshing={isRefreshing}
                ListEmptyComponent={(
                    <View style={styles.emptyWrap}>
                        {isLoading ? (
                            <ActivityIndicator color={vTheme.colors.primary} />
                        ) : (
                            <>
                                <PhoneOff size={48} color={isPhotoBg ? 'rgba(255,255,255,0.5)' : vTheme.colors.textSecondary} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Text style={[styles.emptyText, { color: isPhotoBg ? '#ffffff' : vTheme.colors.textSecondary }]}>
                                    {t('calls.empty')}
                                </Text>
                            </>
                        )}
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
    },
    screenBackButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -8, // Compensate for padding to align with edge
    },
    screenHeaderAction: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        fontSize: 18,
        fontWeight: '700',
    },
    list: {
        paddingBottom: 40,
    },
    emptyWrap: {
        paddingTop: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
    },
    callItemContainer: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    callItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    avatarContainer: {
        width: 54,
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        position: 'relative',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarPlaceholderText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    onlineStatus: {
        position: 'absolute',
        right: 2,
        bottom: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#22C55E',
        borderWidth: 1.5,
        borderColor: '#ffffff',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitleText: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusTag: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginRight: 10,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    callButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#D67D3E',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
            },
            android: {
                elevation: 6,
            }
        })
    },
});
