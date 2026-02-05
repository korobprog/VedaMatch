import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Platform,
    Share,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import LinearGradient from 'react-native-linear-gradient';
import {
    X,
    Share2,
    Download,
    CheckCircle,
    ArrowDownCircle,
    ArrowUpCircle,
    Gift,
    RefreshCw,
    Lock,
    Unlock,
    Sparkles,
} from 'lucide-react-native';
import { TransactionType } from '../../services/walletService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReceiptModalProps {
    visible: boolean;
    onClose: () => void;
    transaction: {
        id: number;
        type: TransactionType;
        amount: number;
        description: string;
        createdAt: string;
        balanceAfter: number;
    } | null;
    currencyName?: string;
}

const TRANSACTION_ICONS: Record<TransactionType, React.ComponentType<any>> = {
    credit: ArrowDownCircle,
    debit: ArrowUpCircle,
    bonus: Gift,
    refund: RefreshCw,
    hold: Lock,
    release: Unlock,
    admin_charge: Sparkles,
    admin_seize: ArrowUpCircle,
};

const TRANSACTION_COLORS: Record<TransactionType, string[]> = {
    credit: ['#10B981', '#059669'],
    debit: ['#EF4444', '#DC2626'],
    bonus: ['#F59E0B', '#D97706'],
    refund: ['#3B82F6', '#2563EB'],
    hold: ['#6B7280', '#4B5563'],
    release: ['#10B981', '#059669'],
    admin_charge: ['#F59E0B', '#D97706'],
    admin_seize: ['#EF4444', '#DC2626'],
};

const TRANSACTION_LABELS: Record<TransactionType, string> = {
    credit: 'Пополнение',
    debit: 'Списание',
    bonus: 'Бонус',
    refund: 'Возврат',
    hold: 'Заморозка',
    release: 'Разморозка',
    admin_charge: 'Начисление',
    admin_seize: 'Списание',
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
    visible,
    onClose,
    transaction,
    currencyName = 'LKM',
}) => {
    const receiptRef = useRef<View>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    if (!transaction) return null;

    const Icon = TRANSACTION_ICONS[transaction.type] || ArrowDownCircle;
    const colors = TRANSACTION_COLORS[transaction.type] || TRANSACTION_COLORS.credit;
    const label = TRANSACTION_LABELS[transaction.type] || 'Транзакция';
    const isPositive = ['credit', 'bonus', 'refund', 'admin_charge', 'release'].includes(transaction.type);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleShare = async () => {
        if (!receiptRef.current) return;

        setIsSharing(true);
        try {
            const uri = await captureRef(receiptRef, {
                format: 'png',
                quality: 1,
            });

            await Share.share({
                url: Platform.OS === 'ios' ? uri : `file://${uri}`,
                message: `${label}: ${isPositive ? '+' : '-'}${transaction.amount} ${currencyName}`,
            });
        } catch (error) {
            console.error('Share error:', error);
        } finally {
            setIsSharing(false);
        }
    };

    const handleSave = async () => {
        if (!receiptRef.current) return;

        setIsSharing(true);
        try {
            // For now just show success - could integrate with CameraRoll
            await captureRef(receiptRef, {
                format: 'png',
                quality: 1,
            });
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Чек транзакции</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Receipt Card - Capturable */}
                    <View
                        ref={receiptRef}
                        style={styles.receiptWrapper}
                        collapsable={false}
                    >
                        <LinearGradient
                            colors={['#1F2937', '#111827']}
                            style={styles.receipt}
                        >
                            {/* App Branding */}
                            <View style={styles.brandingRow}>
                                <Text style={styles.brandingText}>VedicAI</Text>
                                <Text style={styles.brandingSubtext}>Духовный Кошелёк</Text>
                            </View>

                            {/* Decorative Divider */}
                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <View style={styles.dividerCircle}>
                                    <Icon size={20} color="#FFF" />
                                </View>
                                <View style={styles.dividerLine} />
                            </View>

                            {/* Transaction Type */}
                            <LinearGradient
                                colors={colors}
                                style={styles.typeBadge}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Icon size={16} color="#FFF" />
                                <Text style={styles.typeText}>{label}</Text>
                            </LinearGradient>

                            {/* Amount */}
                            <View style={styles.amountContainer}>
                                <Text style={[
                                    styles.amountSign,
                                    { color: isPositive ? '#10B981' : '#EF4444' }
                                ]}>
                                    {isPositive ? '+' : '-'}
                                </Text>
                                <Text style={styles.amountValue}>
                                    {transaction.amount.toLocaleString('ru-RU')}
                                </Text>
                                <Text style={styles.currencyText}>{currencyName}</Text>
                            </View>

                            {/* Details */}
                            <View style={styles.detailsContainer}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Описание</Text>
                                    <Text style={styles.detailValue} numberOfLines={2}>
                                        {transaction.description || '—'}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Дата</Text>
                                    <Text style={styles.detailValue}>
                                        {formatDate(transaction.createdAt)}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Баланс после</Text>
                                    <Text style={[styles.detailValue, styles.balanceValue]}>
                                        {transaction.balanceAfter.toLocaleString('ru-RU')} {currencyName}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>ID транзакции</Text>
                                    <Text style={styles.detailValueMono}>
                                        #{transaction.id}
                                    </Text>
                                </View>
                            </View>

                            {/* Footer */}
                            <View style={styles.receiptFooter}>
                                <View style={styles.statusBadge}>
                                    <CheckCircle size={14} color="#10B981" />
                                    <Text style={styles.statusText}>Выполнено</Text>
                                </View>
                            </View>

                            {/* Decorative Elements */}
                            <View style={styles.cornerTL} />
                            <View style={styles.cornerTR} />
                            <View style={styles.cornerBL} />
                            <View style={styles.cornerBR} />
                        </LinearGradient>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.shareButton]}
                            onPress={handleShare}
                            disabled={isSharing}
                        >
                            {isSharing ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Share2 size={20} color="#FFF" />
                                    <Text style={styles.actionButtonText}>Поделиться</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.saveButton]}
                            onPress={handleSave}
                            disabled={isSharing}
                        >
                            {isSaved ? (
                                <>
                                    <CheckCircle size={20} color="#10B981" />
                                    <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Сохранено</Text>
                                </>
                            ) : (
                                <>
                                    <Download size={20} color="#6B7280" />
                                    <Text style={[styles.actionButtonText, { color: '#6B7280' }]}>Сохранить</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    receiptWrapper: {
        padding: 20,
    },
    receipt: {
        borderRadius: 20,
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    brandingRow: {
        alignItems: 'center',
        marginBottom: 16,
    },
    brandingText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#F59E0B',
        letterSpacing: 2,
    },
    brandingSubtext: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dividerCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 12,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 8,
        marginBottom: 16,
    },
    typeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: 24,
    },
    amountSign: {
        fontSize: 32,
        fontWeight: '700',
        marginRight: 4,
    },
    amountValue: {
        fontSize: 48,
        fontWeight: '900',
        color: '#FFF',
    },
    currencyText: {
        fontSize: 20,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginLeft: 8,
    },
    detailsContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    detailLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        flex: 1,
    },
    detailValue: {
        fontSize: 13,
        color: '#FFF',
        fontWeight: '500',
        flex: 2,
        textAlign: 'right',
    },
    detailValueMono: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        flex: 2,
        textAlign: 'right',
    },
    balanceValue: {
        color: '#F59E0B',
        fontWeight: '700',
    },
    receiptFooter: {
        alignItems: 'center',
        marginTop: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
    cornerTL: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderTopLeftRadius: 20,
    },
    cornerTR: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 40,
        height: 40,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderTopRightRadius: 20,
    },
    cornerBL: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderBottomLeftRadius: 20,
    },
    cornerBR: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderBottomRightRadius: 20,
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    shareButton: {
        backgroundColor: '#F59E0B',
    },
    saveButton: {
        backgroundColor: '#F3F4F6',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
});

export default ReceiptModal;
