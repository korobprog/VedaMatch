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
import { useTranslation } from 'react-i18next';

interface ReferralRulesModalProps {
    visible: boolean;
    onClose: () => void;
}

const { height } = Dimensions.get('window');

export const ReferralRulesModal: React.FC<ReferralRulesModalProps> = ({ visible, onClose }) => {
    const { i18n } = useTranslation();
    const copy =
        i18n.language === 'ru'
            ? {
                  title: 'Программа «Самбандха»',
                  description: '«Самбандха» — это программа роста сообщества Vedamatch через личные связи и рекомендации.',
                  rewards: 'Награды',
                  friendReward: 'Другу: +50 LKM',
                  friendRewardHint: 'Начисляются сразу после регистрации по вашему коду (Pending).',
                  yourReward: 'Вам: +100 LKM',
                  yourRewardHint: 'Начисляются за «Активацию» друга (его первое использование функций приложения).',
                  fairPlay: 'Честная игра',
                  antiFraud: 'Защита от фрода',
                  antiFraudHint: 'Регистрация собственных дополнительных аккаунтов запрещена и ведет к блокировке бонусов.',
                  important: 'Важно знать',
                  importantBody: 'LKM — внутренняя единица активности. LKM начисляются за участие и используются для доступа к функциям портала. LKM не имеют денежной стоимости и не подлежат обмену.',
                  cta: 'Понятно',
              }
            : i18n.language === 'hi'
              ? {
                    title: '“सम्बन्ध” कार्यक्रम',
                    description: '“सम्बन्ध” Vedamatch समुदाय को व्यक्तिगत संबंधों और सिफारिशों के माध्यम से बढ़ाने का कार्यक्रम है।',
                    rewards: 'पुरस्कार',
                    friendReward: 'मित्र को: +50 LKM',
                    friendRewardHint: 'आपके कोड से पंजीकरण के तुरंत बाद दिए जाते हैं (Pending)।',
                    yourReward: 'आपको: +100 LKM',
                    yourRewardHint: 'मित्र के “Activation” पर दिए जाते हैं (ऐप फ़ंक्शनों का उसका पहला उपयोग)।',
                    fairPlay: 'निष्पक्ष खेल',
                    antiFraud: 'फ्रॉड सुरक्षा',
                    antiFraudHint: 'अपने अतिरिक्त अकाउंट बनाना प्रतिबंधित है और इससे बोनस ब्लॉक हो जाते हैं।',
                    important: 'महत्वपूर्ण',
                    importantBody: 'LKM एक आंतरिक एक्टिविटी यूनिट है। LKM भागीदारी के लिए दिए जाते हैं और पोर्टल की सुविधाओं तक पहुंच के लिए उपयोग होते हैं। LKM का कोई मौद्रिक मूल्य नहीं है और इन्हें बदला नहीं जा सकता।',
                    cta: 'समझ गया',
                }
              : {
                    title: 'Sambandha Program',
                    description: 'Sambandha is a Vedamatch community growth program built through personal connections and recommendations.',
                    rewards: 'Rewards',
                    friendReward: 'Friend: +50 LKM',
                    friendRewardHint: 'Granted immediately after registration using your code (Pending).',
                    yourReward: 'You: +100 LKM',
                    yourRewardHint: 'Granted for your friend’s activation (their first use of app features).',
                    fairPlay: 'Fair play',
                    antiFraud: 'Anti-fraud protection',
                    antiFraudHint: 'Registering your own extra accounts is prohibited and leads to bonus blocking.',
                    important: 'Important',
                    importantBody: 'LKM is an internal activity unit. LKM is awarded for participation and used to access portal features. LKM has no monetary value and cannot be exchanged.',
                    cta: 'Got it',
                };
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
                                <Text style={styles.title}>{copy.title}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                            <Text style={styles.mainDescription}>{copy.description}</Text>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{copy.rewards}</Text>
                                <View style={styles.ruleItem}>
                                    <View style={[styles.ruleIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                        <Gift size={18} color="#10B981" />
                                    </View>
                                    <View style={styles.ruleInfo}>
                                        <Text style={styles.ruleLabel}>{copy.friendReward}</Text>
                                        <Text style={styles.ruleSubtext}>{copy.friendRewardHint}</Text>
                                    </View>
                                </View>

                                <View style={styles.ruleItem}>
                                    <View style={[styles.ruleIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                        <Zap size={18} color="#F59E0B" />
                                    </View>
                                    <View style={styles.ruleInfo}>
                                        <Text style={styles.ruleLabel}>{copy.yourReward}</Text>
                                        <Text style={styles.ruleSubtext}>{copy.yourRewardHint}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{copy.fairPlay}</Text>
                                <View style={styles.ruleItem}>
                                    <View style={[styles.ruleIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                        <ShieldCheck size={18} color="#EF4444" />
                                    </View>
                                    <View style={styles.ruleInfo}>
                                        <Text style={styles.ruleLabel}>{copy.antiFraud}</Text>
                                        <Text style={styles.ruleSubtext}>{copy.antiFraudHint}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.infoBox}>
                                <View style={styles.infoBoxHeader}>
                                    <AlertTriangle size={16} color="#F59E0B" />
                                    <Text style={styles.infoBoxTitle}>{copy.important}</Text>
                                </View>
                                <Text style={styles.infoBoxText}>{copy.importantBody}</Text>
                            </View>

                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.understandButton} onPress={onClose}>
                                <Text style={styles.understandButtonText}>{copy.cta}</Text>
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
