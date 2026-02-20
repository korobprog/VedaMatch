import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
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

    const handleDonate = async () => {
        if (!selectedAmount || selectedAmount < (project.minDonation || 10)) {
            Alert.alert("Invalid LKM Amount", `Minimum support amount is ${project.minDonation} LKM`);
            return;
        }

        if (!canAfford) {
            Alert.alert("Insufficient LKM", "Please increase your LKM activity points first.");
            return;
        }

        if (!confirmDebit || !understandRefund) {
            Alert.alert("Confirmation Required", "Please confirm both checkboxes to proceed.");
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
            Alert.alert("Success", "Thank you for your support!");
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to process support action");
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
                        <Text style={styles.title}>Поддержать Seva</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        <Text style={styles.projectTitle}>{project.title}</Text>
                        <Text style={styles.orgName}>{project.organization?.name}</Text>

                        <Text style={styles.label}>Выберите сумму LKM</Text>
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
                            placeholder="Custom LKM amount"
                            placeholderTextColor="#666"
                            keyboardType="number-pad"
                            value={amount}
                            onChangeText={setAmount}
                        />

                        <View style={styles.summaryBox}>
                            <View style={styles.row}>
                                <Text style={styles.summaryLabel}>Пожертвование:</Text>
                                <Text style={styles.summaryValue}>{selectedAmount} LKM</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.tipsRow}
                                onPress={() => setIncludeTips(!includeTips)}
                            >
                                <View style={styles.checkbox}>
                                    {includeTips && <Check size={16} color="#000" />}
                                </View>
                                <Text style={styles.tipsText}>Поддержать платформу VedaMatch (+5%, {tipsAmount} LKM)</Text>
                            </TouchableOpacity>

                            <View style={[styles.row, styles.totalRow]}>
                                <Text style={styles.totalLabel}>Total:</Text>
                                <Text style={styles.totalValue}>{totalAmount} LKM</Text>
                            </View>
                        </View>

                        <Text style={styles.balanceText}>
                            Ваш баланс LKM: <Text style={{ color: canAfford ? '#4CAF50' : '#FF4444' }}>{userBalance} LKM</Text>
                        </Text>

                        <View style={styles.optionsContainer}>
                            <TouchableOpacity
                                style={styles.optionRow}
                                onPress={() => setIsAnonymous(!isAnonymous)}
                            >
                                <View style={[styles.checkbox, isAnonymous && styles.activeCheckbox]}>
                                    {isAnonymous && <Check size={16} color="#000" />}
                                </View>
                                <Text style={styles.optionText}>Поддержать анонимно</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[styles.input, styles.messageInput]}
                            placeholder="Сообщение (необязательно)"
                            placeholderTextColor="#666"
                            multiline
                            value={message}
                            onChangeText={setMessage}
                        />

                        {/* Warning & Confirmation Section */}
                        <View style={styles.warningBox}>
                            <Text style={styles.warningTitle}>⚠️ Важно!</Text>
                            <Text style={styles.warningText}>
                                LKM будут использованы из ваших баллов активности и начислены организации{' '}
                                <Text style={styles.boldText}>{project.organization?.name}</Text>.
                            </Text>
                            <Text style={styles.warningText}>
                                У вас есть <Text style={styles.boldText}>24 часа</Text>, чтобы отменить передачу.
                            </Text>

                            {/* Checkbox 1: Confirm Debit */}
                            <TouchableOpacity
                                style={styles.confirmRow}
                                onPress={() => setConfirmDebit(!confirmDebit)}
                            >
                                <View style={[styles.checkbox, confirmDebit && styles.activeCheckbox]}>
                                    {confirmDebit && <Check size={16} color="#000" />}
                                </View>
                                <Text style={styles.confirmText}>
                                    Я подтверждаю использование {totalAmount} LKM
                                </Text>
                            </TouchableOpacity>

                            {/* Checkbox 2: Understand Refund */}
                            <TouchableOpacity
                                style={styles.confirmRow}
                                onPress={() => setUnderstandRefund(!understandRefund)}
                            >
                                <View style={[styles.checkbox, understandRefund && styles.activeCheckbox]}>
                                    {understandRefund && <Check size={16} color="#000" />}
                                </View>
                                <Text style={styles.confirmText}>
                                    Я понимаю, что могу отменить передачу в течение 24 часов
                                </Text>
                            </TouchableOpacity>

                            {/* Refund Policy Link */}
                            <TouchableOpacity onPress={() => Alert.alert("Условия отмены", "Вы можете отменить передачу LKM в течение 24 часов с момента пожертвования. После этого срока LKM закрепляются за благотворительной организацией и отмена недоступна.")}>
                                <Text style={styles.linkText}>Условия отмены передачи LKM</Text>
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
                                <Text style={styles.donateBtnText}>
                                    Поддержать {totalAmount > 0 ? `${totalAmount} LKM` : ''}
                                </Text>
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
