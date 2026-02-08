import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, CalendarDays, CheckCircle2, XCircle, Clock } from 'lucide-react-native';
import { CharityDonation } from '../../types/charity';
import { charityService } from '../../services/charityService';

const MyDonationsScreen: React.FC = () => {
    const navigation = useNavigation();
    const [donations, setDonations] = useState<CharityDonation[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadDonations();
    }, []);

    const loadDonations = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            const data = await charityService.getMyDonations(token);
            setDonations(data);
        } catch (e) {
            console.error('Failed to load donations:', e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDonations();
        setRefreshing(false);
    };

    const handleRefund = async (donationId: number) => {
        Alert.alert(
            "Вернуть пожертвование?",
            "Вы уверены, что хотите вернуть средства? Эта операция необратима.",
            [
                { text: "Отмена", style: "cancel" },
                {
                    text: "Вернуть",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('token');
                            if (!token) return;

                            await charityService.refundDonation(token, donationId);
                            Alert.alert("Успешно", "Средства возвращены на ваш кошелек");
                            loadDonations(); // Refresh list
                        } catch (error: any) {
                            Alert.alert("Ошибка", error.message || "Не удалось вернуть средства");
                        }
                    }
                }
            ]
        );
    };

    const canRefund = (donation: CharityDonation): boolean => {
        if (donation.status !== 'pending' || !donation.canRefundUntil) return false;
        const deadline = new Date(donation.canRefundUntil);
        return new Date() < deadline;
    };

    const getTimeLeft = (canRefundUntil?: string): string => {
        if (!canRefundUntil) return '';
        const deadline = new Date(canRefundUntil);
        const now = new Date();
        const hoursLeft = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
        if (hoursLeft < 0) return 'Истек срок';
        if (hoursLeft < 1) return 'Менее часа';
        return `${hoursLeft}ч осталось`;
    };

    const renderDonation = ({ item }: { item: CharityDonation }) => {
        const refundable = canRefund(item);
        const timeLeft = getTimeLeft(item.canRefundUntil);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.statusBadge}>
                        {item.status === 'pending' && <Clock size={14} color="#FFD700" />}
                        {item.status === 'confirmed' && <CheckCircle2 size={14} color="#4CAF50" />}
                        {item.status === 'refunded' && <XCircle size={14} color="#FF4444" />}
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {getStatusLabel(item.status)}
                        </Text>
                    </View>
                    <Text style={styles.dateText}>
                        {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                    </Text>
                </View>

                <Text style={styles.projectTitle}>{item.project?.title || 'Проект'}</Text>
                <Text style={styles.orgName}>{item.project?.organization?.name}</Text>

                <View style={styles.amountRow}>
                    <Text style={styles.label}>Пожертвовано:</Text>
                    <Text style={styles.amount}>{item.amount} LKM</Text>
                </View>

                {item.tipsAmount > 0 && (
                    <View style={styles.amountRow}>
                        <Text style={styles.labelSmall}>Чаевые платформе:</Text>
                        <Text style={styles.amountSmall}>{item.tipsAmount} LKM</Text>
                    </View>
                )}

                <View style={styles.amountRow}>
                    <Text style={styles.labelTotal}>Всего:</Text>
                    <Text style={styles.amountTotal}>{item.totalPaid} LKM</Text>
                </View>

                {refundable && (
                    <View style={styles.refundSection}>
                        <Text style={styles.refundText}>⏰ {timeLeft}</Text>
                        <TouchableOpacity
                            style={styles.refundButton}
                            onPress={() => handleRefund(item.id)}
                        >
                            <Text style={styles.refundButtonText}>Вернуть средства</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {item.karmaMessage && (
                    <View style={styles.messageBox}>
                        <Text style={styles.messageLabel}>Сообщение:</Text>
                        <Text style={styles.messageText}>{item.karmaMessage}</Text>
                    </View>
                )}
            </View>
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#FFD700';
            case 'confirmed': return '#4CAF50';
            case 'refunded': return '#FF4444';
            default: return '#888';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Ожидает';
            case 'confirmed': return 'Подтверждено';
            case 'refunded': return 'Возвращено';
            default: return status;
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeHeader}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <ChevronLeft color="#FFF" size={28} />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>Мои пожертвования</Text>
                    <View style={{ width: 28 }} />
                </View>
            </SafeAreaView>

            <FlatList
                data={donations}
                renderItem={renderDonation}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <CalendarDays size={64} color="#666" />
                            <Text style={styles.emptyText}>У вас пока нет пожертвований</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    safeHeader: {
        backgroundColor: '#1E1E1E',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFD700',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2C',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        marginLeft: 6,
        fontSize: 12,
        fontWeight: '600',
    },
    dateText: {
        color: '#888',
        fontSize: 12,
    },
    projectTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    orgName: {
        fontSize: 13,
        color: '#888',
        marginBottom: 16,
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    label: {
        color: '#CCC',
        fontSize: 14,
    },
    amount: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    labelSmall: {
        color: '#888',
        fontSize: 12,
    },
    amountSmall: {
        color: '#888',
        fontSize: 12,
    },
    labelTotal: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
    amountTotal: {
        color: '#FFD700',
        fontSize: 16,
        fontWeight: 'bold',
    },
    refundSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    refundText: {
        color: '#FFD700',
        fontSize: 13,
        marginBottom: 10,
        textAlign: 'center',
    },
    refundButton: {
        backgroundColor: '#FF4444',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    refundButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    messageBox: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#2C2C2C',
        borderRadius: 8,
    },
    messageLabel: {
        color: '#888',
        fontSize: 12,
        marginBottom: 4,
    },
    messageText: {
        color: '#CCC',
        fontSize: 13,
        lineHeight: 18,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
        marginTop: 16,
    },
});

export default MyDonationsScreen;
