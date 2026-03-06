import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { CharityProject } from '../../types/charity';

interface DonateModalProps {
    visible: boolean;
    onClose: () => void;
    project: CharityProject;
    userBalance: number;
    onDonate: (amount: number, tips: boolean, isAnonymous: boolean, message: string) => Promise<void>;
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

export const DonateModal: React.FC<DonateModalProps> = ({
    visible,
    onClose,
    project,
    userBalance,
    onDonate
}) => {
    const { i18n } = useTranslation();
    const [amount, setAmount] = useState<string>('');
    const [includeTips, setIncludeTips] = useState(true);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Confirmation checkboxes
    const [confirmDebit, setConfirmDebit] = useState(false);
    const [understandRefund, setUnderstandRefund] = useState(false);

    const selectedAmount = parseInt(amount) || 0;
    const tipsAmount = includeTips ? Math.round(selectedAmount * 0.05) : 0;
    const totalAmount = selectedAmount + tipsAmount;
    const canAfford = userBalance >= totalAmount;
    const canProceed = confirmDebit && understandRefund && selectedAmount > 0 && canAfford;
    const copy =
        i18n.language === 'ru'
            ? {
                  invalidAmount: 'Некорректная сумма LKM',
                  minAmount: `Минимальная сумма поддержки — ${project.minDonation} LKM`,
                  insufficient: 'Недостаточно LKM',
                  insufficientBody: 'Сначала увеличьте свои баллы активности LKM.',
                  confirmationRequired: 'Требуется подтверждение',
                  confirmationBody: 'Подтвердите оба чекбокса, чтобы продолжить.',
                  success: 'Успешно',
                  successBody: 'Спасибо за вашу поддержку!',
                  error: 'Ошибка',
                  errorBody: 'Не удалось выполнить поддержку',
                  title: 'Поддержать Seva',
                  amountLabel: 'Выберите сумму LKM',
                  customAmount: 'Своя сумма LKM',
                  donation: 'Пожертвование:',
                  supportPlatform: `Поддержать платформу VedaMatch (+5%, ${tipsAmount} LKM)`,
                  total: 'Итого:',
                  balance: 'Ваш баланс LKM:',
                  anonymous: 'Поддержать анонимно',
                  message: 'Сообщение (необязательно)',
                  important: '⚠️ Важно!',
                  warningBody: `LKM будут использованы из ваших баллов активности и начислены организации ${project.organization?.name}.`,
                  refundWindow: 'У вас есть 24 часа, чтобы отменить передачу.',
                  confirmDebit: `Я подтверждаю использование ${totalAmount} LKM`,
                  understandRefund: 'Я понимаю, что могу отменить передачу в течение 24 часов',
                  refundPolicyTitle: 'Условия отмены',
                  refundPolicyBody: 'Вы можете отменить передачу LKM в течение 24 часов с момента пожертвования. После этого срока LKM закрепляются за благотворительной организацией и отмена недоступна.',
                  refundPolicyLink: 'Условия отмены передачи LKM',
                  donate: `Поддержать ${totalAmount > 0 ? `${totalAmount} LKM` : ''}`.trim(),
              }
            : i18n.language === 'hi'
              ? {
                    invalidAmount: 'अमान्य LKM राशि',
                    minAmount: `न्यूनतम समर्थन राशि ${project.minDonation} LKM है`,
                    insufficient: 'पर्याप्त LKM नहीं',
                    insufficientBody: 'कृपया पहले अपने LKM एक्टिविटी पॉइंट्स बढ़ाएं।',
                    confirmationRequired: 'पुष्टि आवश्यक',
                    confirmationBody: 'आगे बढ़ने के लिए दोनों चेकबॉक्स की पुष्टि करें।',
                    success: 'सफल',
                    successBody: 'आपके समर्थन के लिए धन्यवाद!',
                    error: 'त्रुटि',
                    errorBody: 'समर्थन प्रक्रिया पूरी नहीं हो सकी',
                    title: 'Seva का समर्थन करें',
                    amountLabel: 'LKM राशि चुनें',
                    customAmount: 'कस्टम LKM राशि',
                    donation: 'दान:',
                    supportPlatform: `VedaMatch प्लेटफ़ॉर्म का समर्थन करें (+5%, ${tipsAmount} LKM)`,
                    total: 'कुल:',
                    balance: 'आपका LKM बैलेंस:',
                    anonymous: 'गुमनाम रूप से समर्थन करें',
                    message: 'संदेश (वैकल्पिक)',
                    important: '⚠️ महत्वपूर्ण!',
                    warningBody: `LKM आपके एक्टिविटी पॉइंट्स से उपयोग होंगे और संगठन ${project.organization?.name} को दिए जाएंगे।`,
                    refundWindow: 'आपके पास ट्रांसफर रद्द करने के लिए 24 घंटे हैं।',
                    confirmDebit: `मैं ${totalAmount} LKM के उपयोग की पुष्टि करता हूँ`,
                    understandRefund: 'मैं समझता हूँ कि मैं 24 घंटे के भीतर ट्रांसफर रद्द कर सकता हूँ',
                    refundPolicyTitle: 'रद्द करने की शर्तें',
                    refundPolicyBody: 'आप दान के 24 घंटे के भीतर LKM ट्रांसफर रद्द कर सकते हैं। इसके बाद LKM चैरिटी संगठन को स्थायी रूप से सौंप दिए जाते हैं और रद्दीकरण उपलब्ध नहीं रहता।',
                    refundPolicyLink: 'LKM ट्रांसफर रद्द करने की शर्तें',
                    donate: `समर्थन करें ${totalAmount > 0 ? `${totalAmount} LKM` : ''}`.trim(),
                }
              : {
                    invalidAmount: 'Invalid LKM amount',
                    minAmount: `Minimum support amount is ${project.minDonation} LKM`,
                    insufficient: 'Insufficient LKM',
                    insufficientBody: 'Please increase your LKM activity points first.',
                    confirmationRequired: 'Confirmation required',
                    confirmationBody: 'Please confirm both checkboxes to proceed.',
                    success: 'Success',
                    successBody: 'Thank you for your support!',
                    error: 'Error',
                    errorBody: 'Failed to process support action',
                    title: 'Support Seva',
                    amountLabel: 'Choose LKM amount',
                    customAmount: 'Custom LKM amount',
                    donation: 'Donation:',
                    supportPlatform: `Support the VedaMatch platform (+5%, ${tipsAmount} LKM)`,
                    total: 'Total:',
                    balance: 'Your LKM balance:',
                    anonymous: 'Support anonymously',
                    message: 'Message (optional)',
                    important: '⚠️ Important!',
                    warningBody: `LKM will be used from your activity points and credited to the organization ${project.organization?.name}.`,
                    refundWindow: 'You have 24 hours to cancel the transfer.',
                    confirmDebit: `I confirm the use of ${totalAmount} LKM`,
                    understandRefund: 'I understand that I can cancel the transfer within 24 hours',
                    refundPolicyTitle: 'Cancellation terms',
                    refundPolicyBody: 'You can cancel the LKM transfer within 24 hours from the time of donation. After that, the LKM is assigned to the charity organization and cancellation is unavailable.',
                    refundPolicyLink: 'LKM transfer cancellation terms',
                    donate: `Support ${totalAmount > 0 ? `${totalAmount} LKM` : ''}`.trim(),
                };

    const handleDonate = async () => {
        if (!selectedAmount || selectedAmount < (project.minDonation || 10)) {
            Alert.alert(copy.invalidAmount, copy.minAmount);
            return;
        }

        if (!canAfford) {
            Alert.alert(copy.insufficient, copy.insufficientBody);
            return;
        }

        if (!confirmDebit || !understandRefund) {
            Alert.alert(copy.confirmationRequired, copy.confirmationBody);
            return;
        }

        setLoading(true);
        try {
            await onDonate(selectedAmount, includeTips, isAnonymous, message);
            setAmount('');
            setMessage('');
            setConfirmDebit(false);
            setUnderstandRefund(false);
            onClose();
            Alert.alert(copy.success, copy.successBody);
        } catch (error: any) {
            Alert.alert(copy.error, error.message || copy.errorBody);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{copy.title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        <Text style={styles.projectTitle}>{project.title}</Text>
                        <Text style={styles.orgName}>{project.organization?.name}</Text>

                        <Text style={styles.label}>{copy.amountLabel}</Text>
                        <View style={styles.presetsRow}>
                            {PRESET_AMOUNTS.map((val) => (
                                <TouchableOpacity
                                    key={val}
                                    style={[styles.presetBtn, selectedAmount === val && styles.activePreset]}
                                    onPress={() => setAmount(val.toString())}
                                >
                                    <Text style={[styles.presetText, selectedAmount === val && styles.activePresetText]}>
                                        {val}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder={copy.customAmount}
                            placeholderTextColor="#666"
                            keyboardType="number-pad"
                            value={amount}
                            onChangeText={setAmount}
                        />

                        <View style={styles.summaryBox}>
                            <View style={styles.row}>
                                <Text style={styles.summaryLabel}>{copy.donation}</Text>
                                <Text style={styles.summaryValue}>{selectedAmount} LKM</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.tipsRow}
                                onPress={() => setIncludeTips(!includeTips)}
                            >
                                <View style={styles.checkbox}>
                                    {includeTips && <Check size={16} color="#000" />}
                                </View>
                                <Text style={styles.tipsText}>{copy.supportPlatform}</Text>
                            </TouchableOpacity>

                            <View style={[styles.row, styles.totalRow]}>
                                <Text style={styles.totalLabel}>{copy.total}</Text>
                                <Text style={styles.totalValue}>{totalAmount} LKM</Text>
                            </View>
                        </View>

                        <Text style={styles.balanceText}>
                            {copy.balance} <Text style={{ color: canAfford ? '#4CAF50' : '#FF4444' }}>{userBalance} LKM</Text>
                        </Text>

                        <View style={styles.optionsContainer}>
                            <TouchableOpacity
                                style={styles.optionRow}
                                onPress={() => setIsAnonymous(!isAnonymous)}
                            >
                                <View style={[styles.checkbox, isAnonymous && styles.activeCheckbox]}>
                                    {isAnonymous && <Check size={16} color="#000" />}
                                </View>
                                <Text style={styles.optionText}>{copy.anonymous}</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[styles.input, styles.messageInput]}
                            placeholder={copy.message}
                            placeholderTextColor="#666"
                            multiline
                            value={message}
                            onChangeText={setMessage}
                        />

                        {/* Warning & Confirmation Section */}
                        <View style={styles.warningBox}>
                            <Text style={styles.warningTitle}>{copy.important}</Text>
                            <Text style={styles.warningText}>{copy.warningBody}</Text>
                            <Text style={styles.warningText}>{copy.refundWindow}</Text>

                            {/* Checkbox 1: Confirm Debit */}
                            <TouchableOpacity
                                style={styles.confirmRow}
                                onPress={() => setConfirmDebit(!confirmDebit)}
                            >
                                <View style={[styles.checkbox, confirmDebit && styles.activeCheckbox]}>
                                    {confirmDebit && <Check size={16} color="#000" />}
                                </View>
                                <Text style={styles.confirmText}>{copy.confirmDebit}</Text>
                            </TouchableOpacity>

                            {/* Checkbox 2: Understand Refund */}
                            <TouchableOpacity
                                style={styles.confirmRow}
                                onPress={() => setUnderstandRefund(!understandRefund)}
                            >
                                <View style={[styles.checkbox, understandRefund && styles.activeCheckbox]}>
                                    {understandRefund && <Check size={16} color="#000" />}
                                </View>
                                <Text style={styles.confirmText}>{copy.understandRefund}</Text>
                            </TouchableOpacity>

                            {/* Refund Policy Link */}
                            <TouchableOpacity onPress={() => Alert.alert(copy.refundPolicyTitle, copy.refundPolicyBody)}>
                                <Text style={styles.linkText}>{copy.refundPolicyLink}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.donateBtn,
                                !canProceed && styles.disabledBtn
                            ]}
                            onPress={handleDonate}
                            disabled={loading || !canProceed}
                        >
                            {loading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.donateBtnText}>{copy.donate}</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#1E1E1E',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    content: {
        padding: 20,
    },
    projectTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    orgName: {
        fontSize: 14,
        color: '#888',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#AAA',
        marginBottom: 10,
    },
    presetsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    presetBtn: {
        flex: 1,
        backgroundColor: '#333',
        paddingVertical: 12,
        marginHorizontal: 4,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activePreset: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
    },
    presetText: {
        color: '#FFF',
        fontWeight: '600',
    },
    activePresetText: {
        color: '#000',
    },
    input: {
        backgroundColor: '#2C2C2C',
        borderRadius: 8,
        padding: 16,
        color: '#FFF',
        fontSize: 16,
        marginBottom: 20,
    },
    summaryBox: {
        backgroundColor: '#252525',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: { color: '#AAA' },
    summaryValue: { color: '#FFF', fontWeight: 'bold' },
    optionsContainer: {
        marginBottom: 20,
    },
    tipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: '#FFF',
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeCheckbox: {
        backgroundColor: '#FFD700',
    },
    tipsText: {
        color: '#AAA',
        fontSize: 12,
    },
    totalRow: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#444',
    },
    totalLabel: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    totalValue: {
        color: '#FFD700',
        fontSize: 18,
        fontWeight: 'bold',
    },
    balanceText: {
        color: '#AAA',
        textAlign: 'center',
        marginBottom: 20,
        fontSize: 12,
    },
    donateBtn: {
        backgroundColor: '#FFD700',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 30,
    },
    disabledBtn: {
        backgroundColor: '#555',
        opacity: 0.7,
    },
    donateBtnText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    messageInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    optionText: {
        color: '#FFF',
    },
    warningBox: {
        backgroundColor: '#2C2C2C',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#FFD700',
    },
    warningTitle: {
        color: '#FFD700',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    warningText: {
        color: '#CCC',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    boldText: {
        fontWeight: 'bold',
        color: '#FFF',
    },
    confirmRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 12,
        marginBottom: 8,
    },
    confirmText: {
        color: '#FFF',
        fontSize: 14,
        flex: 1,
        marginLeft: 10,
        lineHeight: 20,
    },
    linkText: {
        color: '#FFD700',
        fontSize: 13,
        textDecorationLine: 'underline',
        marginTop: 12,
    },
});
