import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { ArrowDownLeft, ArrowUpRight, PhoneMissed, Phone, User as UserIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';

export const CallHistoryScreen = () => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { vTheme, isDarkMode, portalBackgroundType } = useSettings();
    const isPhotoBg = portalBackgroundType === 'image';

    // Mock data with User IDs for call back
    const calls = [
        { id: '1', userId: 101, name: 'Krishna Das', time: 'Today, 10:00 AM', type: 'incoming' },
        { id: '2', userId: 102, name: 'Radha', time: 'Yesterday, 8:30 PM', type: 'missed' },
        { id: '3', userId: 103, name: 'Arjuna', time: 'Yesterday, 6:15 PM', type: 'outgoing' },
    ];

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

    const handleCall = (contact: any) => {
        navigation.navigate('CallScreen', {
            targetId: contact.userId,
            isIncoming: false,
            callerName: contact.name
        });
    };

    const renderItem = ({ item }: { item: any }) => {
        const status = getStatusConfig(item.type);
        const nameColor = isPhotoBg ? '#ffffff' : vTheme.colors.text;
        const subColor = isPhotoBg ? 'rgba(255,255,255,0.7)' : vTheme.colors.textSecondary;

        return (
            <View style={[
                styles.callItemContainer,
                {
                    backgroundColor: 'transparent', // The shadow caster needs to be transparent here to let inner content show, but it might not cast shadow if purely transparent?
                    // Actually, for shadow to be cast, the view casting it needs a background. 
                    // But we want the shadow to appear 'around' the item.
                    // If we set backgroundColor to 'transparent', iOS shadow works if shadowOpacity is set.
                    // But React Native warns about efficiency.
                    // We can set a very low opacity background for the shadow caster or just ignore the warning if it works.
                    // However, we can also use the inner view's layout for shadow by not clipping overflow on the wrapper.
                }
            ]}>
                <View style={[
                    styles.callItem,
                    {
                        backgroundColor: isPhotoBg ? 'transparent' : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'),
                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                    }
                ]}>
                    {(isPhotoBg || isDarkMode) && (
                        <BlurView
                            style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
                            blurType={isDarkMode ? "dark" : "light"}
                            blurAmount={15}
                            reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                        />
                    )}

                    <View style={[styles.avatarContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <UserIcon size={24} color={isPhotoBg ? '#ffffff' : vTheme.colors.textSecondary} />
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={[styles.name, { color: nameColor }]} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
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
                                {item.time} • {t(`calls.${item.type}`)}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.callButton,
                            {
                                backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.15)' : vTheme.colors.primary,
                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : 'transparent',
                                borderWidth: isPhotoBg ? 1 : 0
                            }
                        ]}
                        onPress={() => handleCall(item)}
                        activeOpacity={0.7}
                    >
                        <Phone size={20} color="#ffffff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={[styles.header, {
                    color: isPhotoBg ? '#ffffff' : vTheme.colors.text,
                    fontFamily: 'Cinzel-Bold',
                }]}>
                    {t('calls.history')}
                </Text>
            </View>

            <FlatList
                data={calls}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
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
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 16,
    },
    callItemContainer: {
        borderRadius: 22,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            },
            android: {
                elevation: 4,
            }
        })
    },
    callItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 22,
        borderWidth: 1,
        overflow: 'hidden',
    },
    avatarContainer: {
        width: 54,
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
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
