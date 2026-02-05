import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { X, Lock, CheckCircle2 } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

interface FrozenBalanceModalProps {
    visible: boolean;
    onClose: () => void;
    amount: number;
}

const { height } = Dimensions.get('window');

export const FrozenBalanceModal: React.FC<FrozenBalanceModalProps> = ({ visible, onClose, amount }) => {
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

                        <Text style={styles.title}>Замороженный баланс</Text>
                        <Text style={styles.bigAmount}>{amount} LKM</Text>

                        <Text style={styles.description}>
                            Эта сумма временно заблокирована под активные бронирования или услуги.
                        </Text>

                        <View style={styles.scenarios}>
                            <View style={styles.scenarioRow}>
                                <CheckCircle2 size={16} color="#10B981" />
                                <Text style={styles.scenarioText}>Спишется — когда услуга будет оказана</Text>
                            </View>
                            <View style={styles.scenarioRow}>
                                <CheckCircle2 size={16} color="#10B981" />
                                <Text style={styles.scenarioText}>Вернется — если вы отмените запись вовремя</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeText}>Понятно</Text>
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
