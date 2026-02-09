import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useChat } from '../../context/ChatContext';
import { Phone, Menu, ChevronLeft, Sparkles } from 'lucide-react-native';
import { getMediaUrl } from '../../utils/url';
import { BalancePill } from '../wallet/BalancePill';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../../context/SettingsContext';

interface ChatHeaderProps {
    title: string;
    onSettingsPress: () => void;
    onCallPress?: () => void;
    onBackPress?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    title,
    onSettingsPress,
    onCallPress,
    onBackPress,
}) => {
    const navigation = useNavigation<any>();
    const { recipientUser } = useChat();
    const { isDarkMode } = useSettings();

    const displayTitle = recipientUser
        ? (recipientUser.spiritualName || recipientUser.karmicName)
        : title;

    const locationParts = [];
    if (recipientUser?.country) locationParts.push(recipientUser.country);
    if (recipientUser?.city) locationParts.push(recipientUser.city);
    const subTitle = recipientUser
        ? locationParts.join(', ')
        : 'AI-ассистент VedaMatch';

    return (
        <View style={styles.shell}>
            <View style={styles.header}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="dark"
                    blurAmount={18}
                    reducedTransparencyFallbackColor="rgba(15,23,42,0.95)"
                />
                <View style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: 'rgba(15,23,42,0.65)',
                    }
                ]} />

                <View style={styles.headerContent}>
                    {recipientUser ? (
                        <View style={styles.leftGroup}>
                            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                                <ChevronLeft color="#F8FAFC" size={21} />
                            </TouchableOpacity>

                            <View style={[styles.avatarContainer, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                                {recipientUser.avatarUrl && getMediaUrl(recipientUser.avatarUrl) ? (
                                    <Image
                                        source={{ uri: getMediaUrl(recipientUser.avatarUrl)! }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <Text style={{ fontSize: 15, color: '#F8FAFC' }}>
                                        {(recipientUser.spiritualName?.[0] || recipientUser.karmicName?.[0] || '?').toUpperCase()}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={onSettingsPress} style={styles.menuButton}>
                            <Menu color="#F8FAFC" size={20} />
                        </TouchableOpacity>
                    )}

                    <View style={styles.titleContainer}>
                        {recipientUser ? (
                            <View>
                                <Text style={[styles.title, { color: '#F8FAFC' }]} numberOfLines={1}>{displayTitle}</Text>
                                {!!subTitle && (
                                    <Text style={[styles.subTitle, { color: 'rgba(248,250,252,0.82)' }]} numberOfLines={1}>
                                        {subTitle}
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Portal')}
                                activeOpacity={0.8}
                                style={styles.aiTitleWrap}
                            >
                                <Sparkles size={12} color="#FFB74D" />
                                <Text style={[styles.aiTitle, { color: '#F8FAFC' }]}>AI-чат</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.rightActions}>
                        {recipientUser ? (
                            onCallPress && (
                                <TouchableOpacity onPress={onCallPress} style={styles.actionButton}>
                                    <Phone color="#F8FAFC" size={18} />
                                </TouchableOpacity>
                            )
                        ) : (
                            <View style={styles.aiBalanceContainer}>
                                <BalancePill size="small" />
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    shell: {
        paddingHorizontal: 10,
        paddingTop: 0,
        backgroundColor: 'transparent',
    },
    header: {
        height: Platform.OS === 'ios' ? 64 : 50,
        paddingTop: Platform.OS === 'ios' ? 8 : 5,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    leftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 6,
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
    },
    subTitle: {
        fontSize: 9,
        marginTop: 1,
    },
    aiTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 183, 77, 0.15)',
        borderWidth: 1.2,
        borderColor: 'rgba(255, 183, 77, 0.35)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3.5,
        gap: 6,
    },
    aiTitle: {
        fontSize: 12,
        fontWeight: '700',
    },
    backButton: {
        padding: 3,
        marginRight: 3,
    },
    menuButton: {
        padding: 4,
        marginRight: 4,
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    rightActions: {
        minWidth: 44,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    actionButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    aiBalanceContainer: {
        alignItems: 'flex-end',
    },
});
