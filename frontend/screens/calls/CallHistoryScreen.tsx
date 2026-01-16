import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ModernVedicTheme } from '../../theme/ModernVedicTheme';
import { ArrowDownLeft, ArrowUpRight, PhoneMissed, Phone } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';

export const CallHistoryScreen = () => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { vTheme, isDarkMode } = useSettings();

    // Mock data with User IDs for call back
    const calls = [
        { id: '1', userId: 101, name: 'Krishna Das', time: 'Today, 10:00 AM', type: 'incoming' },
        { id: '2', userId: 102, name: 'Radha', time: 'Yesterday, 8:30 PM', type: 'missed' },
        { id: '3', userId: 103, name: 'Arjuna', time: 'Yesterday, 6:15 PM', type: 'outgoing' },
    ];

    const getIcon = (type: string) => {
        switch (type) {
            case 'incoming': return <ArrowDownLeft size={20} color="#4CAF50" />;
            case 'outgoing': return <ArrowUpRight size={20} color="#2196F3" />;
            case 'missed': return <PhoneMissed size={20} color="#F44336" />;
            default: return <Phone size={20} color={vTheme.colors.textSecondary} />;
        }
    };

    const handleCall = (contact: any) => {
        navigation.navigate('CallScreen', {
            targetId: contact.userId,
            isIncoming: false,
            callerName: contact.name
        });
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.callItem, { backgroundColor: vTheme.colors.backgroundSecondary }]}>
            <View style={[styles.iconContainer, { backgroundColor: vTheme.colors.background }]}>
                {getIcon(item.type)}
            </View>
            <View style={styles.infoContainer}>
                <Text style={[styles.name, { color: vTheme.colors.text }]}>{item.name}</Text>
                <View style={styles.typeContainer}>
                    <Text style={[styles.time, { color: vTheme.colors.textSecondary }]}>{item.time}</Text>
                    <Text style={[styles.typeText, { color: item.type === 'missed' ? '#F44336' : vTheme.colors.textSecondary }]}>
                        • {t(`calls.${item.type}`)}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(item)}
            >
                <Phone size={20} color={vTheme.colors.primary} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            <View style={styles.headerContainer}>
                <Text style={[styles.header, { color: vTheme.colors.text }]}>{t('calls.history')}</Text>
            </View>

            <FlatList
                data={calls}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ModernVedicTheme.colors.background,
    },
    headerContainer: {
        padding: 16,
        paddingBottom: 8,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: ModernVedicTheme.colors.text,
    },
    list: {
        padding: 16,
        gap: 12,
    },
    callItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: ModernVedicTheme.colors.backgroundSecondary,
        borderRadius: 12,
        ...ModernVedicTheme.shadows.soft,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: ModernVedicTheme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: ModernVedicTheme.colors.text,
    },
    time: {
        fontSize: 13,
        color: ModernVedicTheme.colors.textSecondary,
        marginTop: 2,
    },
    callButton: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(214, 125, 62, 0.1)', // Primary with transparency
    },
    typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    typeText: {
        fontSize: 12,
        marginLeft: 4,
    },
});
