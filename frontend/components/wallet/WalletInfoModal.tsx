import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Platform,
    Dimensions,
    ScrollView
} from 'react-native';
import { X, Sparkles, AlertCircle, Clock, CheckCircle2 } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';


interface WalletInfoModalProps {
    visible: boolean;
    onClose: () => void;
}

const { height } = Dimensions.get('window');

export const WalletInfoModal: React.FC<WalletInfoModalProps> = ({ visible, onClose }) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['#1F2937', '#111827']}
                        style={styles.modalContent}
                    >
                        <View style={styles.header}>
                            <View style={styles.headerTitleRow}>
                                <View style={styles.iconContainer}>
                                    <Sparkles size={20} color="#F59E0B" fill="#F59E0B" />
                                </View>
                                <Text style={styles.title}>О валюте LKM</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                            <Text style={styles.mainDescription}>
                                "Лакшмани (LKM) — это энергия благодарности внутри экосистемы Vedamatch.
                                Вы получаете её за активность и помощь развитию сообщества."
                            </Text>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Возможности</Text>
                                <View style={styles.featureRow}>
                                    <CheckCircle2 size={18} color="#10B981" style={{ marginTop: 2 }} />
                                    <Text style={styles.featureText}>Тратить на AI-консультации</Text>
                                </View>
                                <View style={styles.featureRow}>
                                    <CheckCircle2 size={18} color="#10B981" style={{ marginTop: 2 }} />
                                    <Text style={styles.featureText}>Дарить мастерам в знак благодарности</Text>
                                </View>
                                <View style={styles.featureRow}>
                                    <CheckCircle2 size={18} color="#10B981" style={{ marginTop: 2 }} />
                                    <Text style={styles.featureText}>Оплачивать дополнительные услуги</Text>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Ограничения</Text>
                                <View style={styles.featureRow}>
                                    <AlertCircle size={18} color="#EF4444" style={{ marginTop: 2 }} />
                                    <Text style={styles.featureText}>Нельзя вывести в фиатные деньги (рубли/доллары) на этапе тестирования</Text>
                                </View>
                                <View style={styles.featureRow}>
                                    <AlertCircle size={18} color="#EF4444" style={{ marginTop: 2 }} />
                                    <Text style={styles.featureText}>Нельзя продавать другим пользователям</Text>
                                </View>
                            </View>

                            <View style={styles.infoBox}>
                                <View style={styles.infoBoxHeader}>
                                    <Clock size={16} color="#F59E0B" />
                                    <Text style={styles.infoBoxTitle}>Срок жизни</Text>
                                </View>
                                <Text style={styles.infoBoxText}>
                                    Бонусы сгорают через 90 дней, если ваш аккаунт неактивен.
                                </Text>
                            </View>

                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.understandButton} onPress={onClose}>
                                <Text style={styles.understandButtonText}>Всё понятно</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        height: height * 0.75,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    modalContent: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        fontFamily: 'Cinzel-Bold',
    },
    closeButton: {
        padding: 5,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    mainDescription: {
        fontSize: 16,
        color: '#E5E7EB',
        lineHeight: 24,
        fontStyle: 'italic',
        marginBottom: 24,
        textAlign: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#9CA3AF',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 12,
    },
    featureText: {
        fontSize: 15,
        color: '#D1D5DB',
        flex: 1,
        lineHeight: 22,
    },
    infoBox: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    infoBoxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    infoBoxTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F59E0B',
    },
    infoBoxText: {
        fontSize: 14,
        color: '#E5E7EB',
        lineHeight: 20,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    understandButton: {
        backgroundColor: '#F59E0B',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    understandButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default WalletInfoModal;
