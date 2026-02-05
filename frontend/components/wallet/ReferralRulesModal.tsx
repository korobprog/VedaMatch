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
import { X, Gift, ShieldCheck, Zap, AlertTriangle, Users } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

interface ReferralRulesModalProps {
    visible: boolean;
    onClose: () => void;
}

const { height } = Dimensions.get('window');

export const ReferralRulesModal: React.FC<ReferralRulesModalProps> = ({ visible, onClose }) => {
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
                        colors={['#1a1b2e', '#16213e']}
                        style={styles.modalContent}
                    >
                        <View style={styles.header}>
                            <View style={styles.headerTitleRow}>
                                <View style={styles.iconContainer}>
                                    <Users size={20} color="#F59E0B" />
                                </View>
                                <Text style={styles.title}>Программа «Самбандха»</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                            <Text style={styles.mainDescription}>
                                «Самбандха» — это программа роста сообщества Vedamatch через личные связи и рекомендации.
                            </Text>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Награды</Text>
                                <View style={styles.ruleItem}>
                                    <View style={[styles.ruleIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                        <Gift size={18} color="#10B981" />
                                    </View>
                                    <View style={styles.ruleInfo}>
                                        <Text style={styles.ruleLabel}>Другу: +50 LKM</Text>
                                        <Text style={styles.ruleSubtext}>Начисляются сразу после регистрации по вашему коду (Pending).</Text>
                                    </View>
                                </View>

                                <View style={styles.ruleItem}>
                                    <View style={[styles.ruleIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                        <Zap size={18} color="#F59E0B" />
                                    </View>
                                    <View style={styles.ruleInfo}>
                                        <Text style={styles.ruleLabel}>Вам: +100 LKM</Text>
                                        <Text style={styles.ruleSubtext}>Начисляются за «Активацию» друга (его первая любая оплата в приложении).</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Честная игра</Text>
                                <View style={styles.ruleItem}>
                                    <View style={[styles.ruleIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                        <ShieldCheck size={18} color="#EF4444" />
                                    </View>
                                    <View style={styles.ruleInfo}>
                                        <Text style={styles.ruleLabel}>Защита от фрода</Text>
                                        <Text style={styles.ruleSubtext}>Регистрация собственных дополнительных аккаунтов запрещена и ведет к блокировке бонусов.</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.infoBox}>
                                <View style={styles.infoBoxHeader}>
                                    <AlertTriangle size={16} color="#F59E0B" />
                                    <Text style={styles.infoBoxTitle}>Важно знать</Text>
                                </View>
                                <Text style={styles.infoBoxText}>
                                    Валюта LKM является внутренней расчетной единицей благодарности и не подлежит обмену на реальные деньги (фиат).
                                </Text>
                            </View>

                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.understandButton} onPress={onClose}>
                                <Text style={styles.understandButtonText}>Понятно</Text>
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        height: height * 0.7,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    modalContent: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    mainDescription: {
        fontSize: 16,
        color: '#9CA3AF',
        lineHeight: 24,
        marginBottom: 32,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#F59E0B',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 20,
    },
    ruleItem: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    ruleIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ruleInfo: {
        flex: 1,
    },
    ruleLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    ruleSubtext: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    infoBox: {
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.1)',
    },
    infoBoxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    infoBoxTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#F59E0B',
    },
    infoBoxText: {
        fontSize: 14,
        color: '#9CA3AF',
        lineHeight: 20,
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    understandButton: {
        backgroundColor: '#F59E0B',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    understandButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ReferralRulesModal;
