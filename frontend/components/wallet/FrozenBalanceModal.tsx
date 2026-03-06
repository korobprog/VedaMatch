import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { Lock, CheckCircle2 } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';

interface FrozenBalanceModalProps {
    visible: boolean;
    onClose: () => void;
    regularAmount: number;
    bonusAmount: number;
}

export const FrozenBalanceModal: React.FC<FrozenBalanceModalProps> = ({
    visible,
    onClose,
    regularAmount,
    bonusAmount,
}) => {
    const { i18n } = useTranslation();
    const totalAmount = regularAmount + bonusAmount;
    const lang = i18n.language?.startsWith('ru') ? 'ru' : i18n.language?.startsWith('hi') ? 'hi' : 'en';
    const locale = lang === 'ru' ? 'ru-RU' : lang === 'hi' ? 'hi-IN' : 'en-US';
    const copy = {
        en: {
            title: 'Reserved LKM',
            regular: 'Regular',
            bonus: 'Bonus',
            description: 'LKM are temporarily reserved for active bookings and pending operations.',
            scenarioConfirmed: 'Used when the service is confirmed',
            scenarioCancelled: 'Returned if the booking is cancelled in time',
            close: 'Got it',
        },
        ru: {
            title: 'Зарезервированные LKM',
            regular: 'Основной',
            bonus: 'Бонусный',
            description: 'LKM временно зарезервированы под активные бронирования и операции в ожидании.',
            scenarioConfirmed: 'Используются — когда услуга подтверждена',
            scenarioCancelled: 'Возвращаются — если запись отменена вовремя',
            close: 'Понятно',
        },
        hi: {
            title: 'आरक्षित LKM',
            regular: 'नियमित',
            bonus: 'बोनस',
            description: 'LKM सक्रिय बुकिंग और लंबित कार्रवाइयों के लिए अस्थायी रूप से आरक्षित हैं।',
            scenarioConfirmed: 'सेवा की पुष्टि होने पर उपयोग किए जाते हैं',
            scenarioCancelled: 'यदि बुकिंग समय पर रद्द हो जाए तो वापस कर दिए जाते हैं',
            close: 'समझ गया',
        },
    }[lang];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['#1F2937', '#111827']}
                        style={styles.modalContent}
                    >
                        <View style={styles.iconWrapper}>
                            <Lock size={32} color="#EF4444" />
                        </View>

                        <Text style={styles.title}>{copy.title}</Text>
                        <Text style={styles.bigAmount}>{totalAmount.toLocaleString(locale)} LKM</Text>

                        <View style={styles.amountSplitCard}>
                            <View style={styles.amountSplitRow}>
                                <Text style={styles.amountSplitLabel}>{copy.regular}</Text>
                                <Text style={styles.amountSplitValue}>{regularAmount.toLocaleString(locale)} LKM</Text>
                            </View>
                            <View style={styles.amountSplitRow}>
                                <Text style={styles.amountSplitLabel}>{copy.bonus}</Text>
                                <Text style={styles.amountSplitValue}>{bonusAmount.toLocaleString(locale)} LKM</Text>
                            </View>
                        </View>

                        <Text style={styles.description}>
                            {copy.description}
                        </Text>

                        <View style={styles.scenarios}>
                            <View style={styles.scenarioRow}>
                                <CheckCircle2 size={16} color="#10B981" />
                                <Text style={styles.scenarioText}>{copy.scenarioConfirmed}</Text>
                            </View>
                            <View style={styles.scenarioRow}>
                                <CheckCircle2 size={16} color="#10B981" />
                                <Text style={styles.scenarioText}>{copy.scenarioCancelled}</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeText}>{copy.close}</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center', // Center content
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 20,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalContent: {
        padding: 24,
        alignItems: 'center',
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    bigAmount: {
        fontSize: 32,
        fontWeight: '900',
        color: '#EF4444',
        marginBottom: 12,
        fontFamily: 'Cinzel-Bold',
    },
    amountSplitCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: 8,
    },
    amountSplitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    amountSplitLabel: {
        color: '#D1D5DB',
        fontSize: 13,
        fontWeight: '600',
    },
    amountSplitValue: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    description: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    scenarios: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        marginBottom: 24,
    },
    scenarioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    scenarioText: {
        fontSize: 13,
        color: '#E5E7EB',
        flex: 1,
    },
    closeButton: {
        width: '100%',
        backgroundColor: '#374151',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    closeText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default FrozenBalanceModal;
