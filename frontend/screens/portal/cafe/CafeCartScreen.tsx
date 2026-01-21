import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
    FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Minus, Plus, Trash2, ArrowLeft, Utensils, ShoppingBag, Car, Banknote, CreditCard, X, MapPin, QrCode, Clock } from 'lucide-react-native';
import { useCart } from '../../../contexts/CafeCartContext';
import { cafeService } from '../../../services/cafeService';
import { CafeOrderType, getOrderTypeLabel } from '../../../types/cafe';

const CafeCartScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { cart, updateQuantity, removeFromCart, clearCart, setOrderType, setTableInfo } = useCart();

    const [customerName, setCustomerName] = useState('');
    const [customerNote, setCustomerNote] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryPhone, setDeliveryPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [loading, setLoading] = useState(false);
    const [tableModalVisible, setTableModalVisible] = useState(false);
    const [tables, setTables] = useState<any[]>([]);
    const [loadingTables, setLoadingTables] = useState(false);

    const fetchTables = async () => {
        if (!cart) return;
        try {
            setLoadingTables(true);
            const data = await cafeService.getTables(cart.cafeId);
            setTables(data);
        } catch (error) {
            console.error('Error fetching tables:', error);
            Alert.alert(t('common.error'), t('cafe.staff.tables.loadError'));
        } finally {
            setLoadingTables(false);
        }
    };

    const handleOpenTablePicker = () => {
        setTableModalVisible(true);
        fetchTables();
    };

    const handleSelectTable = (table: any) => {
        setTableInfo(table.id, table.number);
        setTableModalVisible(false);
    };

    if (!cart || cart.items.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <ShoppingCart size={80} color="#8E8E93" strokeWidth={1} />
                <Text style={styles.emptyTitle}>{t('cafe.cart.empty')}</Text>
                <Text style={styles.emptyText}>{t('cafe.cart.emptyInfo')}</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>{t('cafe.cart.backToMenu')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleOrderTypeChange = (type: CafeOrderType) => {
        setOrderType(type);
    };

    const handleSubmitOrder = async () => {
        if (!cart) return;

        // Validation
        if (cart.orderType === 'dine_in') {
            if (!cart.tableId) {
                Alert.alert(t('common.error'), t('cafe.cart.errorTable'));
                return;
            }
        }

        if (cart.orderType === 'delivery') {
            if (!deliveryAddress.trim()) {
                Alert.alert(t('common.error'), t('cafe.cart.errorAddress'));
                return;
            }
            if (!deliveryPhone.trim()) {
                Alert.alert(t('common.error'), t('cafe.cart.errorPhone'));
                return;
            }
        }

        try {
            setLoading(true);

            const orderData = {
                cafeId: cart.cafeId,
                orderType: cart.orderType,
                tableId: cart.tableId,
                deliveryAddress: cart.orderType === 'delivery' ? deliveryAddress : undefined,
                deliveryPhone: cart.orderType === 'delivery' ? deliveryPhone : undefined,
                customerName: customerName || undefined,
                customerNote: customerNote || undefined,
                paymentMethod,
                items: cart.items.map(item => ({
                    dishId: item.dish.id,
                    quantity: item.quantity,
                    removedIngredients: item.removedIngredients,
                    modifiers: item.selectedModifiers.map(m => ({
                        modifierId: m.modifier.id,
                        quantity: m.quantity,
                    })),
                    note: item.note || undefined,
                })),
            };

            const order = await cafeService.createOrder(orderData);

            clearCart();

            navigation.replace('CafeOrderSuccess', {
                orderId: order.id,
                orderNumber: order.orderNumber,
            });
        } catch (error: any) {
            console.error('Error creating order:', error);
            const errorMessage = error.response?.data?.error || t('cafe.cart.errorSubmit');
            Alert.alert(t('common.error'), errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const renderCartItem = (item: typeof cart.items[0], index: number) => (
        <View key={`${item.dish.id}-${index}`} style={styles.cartItem}>
            {item.dish.imageUrl && (
                <Image source={{ uri: item.dish.imageUrl }} style={styles.itemImage} />
            )}
            <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.dish.name}</Text>

                {/* Removed ingredients */}
                {item.removedIngredients.length > 0 && (
                    <Text style={styles.itemCustomization}>
                        {t('cafe.cart.without')}: {item.removedIngredients.join(', ')}
                    </Text>
                )}

                {/* Selected modifiers */}
                {item.selectedModifiers.length > 0 && (
                    <Text style={styles.itemCustomization}>
                        + {item.selectedModifiers.map(m =>
                            m.quantity > 1 ? `${m.modifier.name} x${m.quantity}` : m.modifier.name
                        ).join(', ')}
                    </Text>
                )}

                {/* Note */}
                {item.note && (
                    <Text style={styles.itemNote}>💬 {item.note}</Text>
                )}

                <View style={styles.itemFooter}>
                    <View style={styles.quantityControls}>
                        <TouchableOpacity
                            style={styles.qtyButton}
                            onPress={() => updateQuantity(item.dish.id, item.quantity - 1)}
                        >
                            <Minus size={16} color="#FFFFFF" strokeWidth={1.5} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity
                            style={styles.qtyButton}
                            onPress={() => updateQuantity(item.dish.id, item.quantity + 1)}
                        >
                            <Plus size={16} color="#FFFFFF" strokeWidth={1.5} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.itemTotal}>{item.itemTotal} ₽</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFromCart(item.dish.id)}
            >
                <Trash2 size={20} color="#FF3B30" strokeWidth={1.5} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('cafe.cart.cart')}</Text>
                <TouchableOpacity onPress={clearCart}>
                    <Text style={styles.clearButton}>{t('cafe.cart.clear')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Cafe name */}
                <View style={styles.cafeInfo}>
                    <Utensils size={20} color="#FF6B00" strokeWidth={1.5} />
                    <Text style={styles.cafeName}>{cart.cafeName}</Text>
                </View>

                {/* Order type selector */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.cart.type')}</Text>
                    <View style={styles.orderTypeContainer}>
                        {(['dine_in', 'takeaway', 'delivery'] as CafeOrderType[]).map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.orderTypeButton,
                                    cart.orderType === type && styles.orderTypeButtonActive,
                                ]}
                                onPress={() => handleOrderTypeChange(type)}
                            >
                                {type === 'dine_in' && <Utensils size={20} color={cart.orderType === type ? '#FFFFFF' : '#8E8E93'} strokeWidth={1.5} />}
                                {type === 'takeaway' && <ShoppingBag size={20} color={cart.orderType === type ? '#FFFFFF' : '#8E8E93'} strokeWidth={1.5} />}
                                {type === 'delivery' && <Car size={20} color={cart.orderType === type ? '#FFFFFF' : '#8E8E93'} strokeWidth={1.5} />}
                                <Text style={[
                                    styles.orderTypeText,
                                    cart.orderType === type && styles.orderTypeTextActive,
                                ]}>
                                    {t(`cafe.form.${type === 'dine_in' ? 'dineIn' : type}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {cart.tableId && cart.orderType === 'dine_in' && (
                        <View style={styles.tableInfo}>
                            <View style={styles.tableInfoMain}>
                                <Text style={styles.tableInfoText}>📍 {t('cafe.detail.tableInfo', { tableNumber: cart.tableNumber })}</Text>
                                <TouchableOpacity style={styles.tableChangeButton} onPress={handleOpenTablePicker}>
                                    <Text style={styles.tableChangeButtonText}>{t('common.edit')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    {cart.orderType === 'dine_in' && !cart.tableId && (
                        <View style={styles.tableInfoWarning}>
                            <Text style={styles.tableInfoWarningText}>⚠️ {t('cafe.cart.selectTableInfo')}</Text>
                            <TouchableOpacity style={styles.selectTableButton} onPress={handleOpenTablePicker}>
                                <Text style={styles.selectTableButtonText}>{t('cafe.cart.selectTable')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Delivery address (if delivery) */}
                {cart.orderType === 'delivery' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('cafe.cart.deliveryAddress')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('cafe.cart.addressPlaceholder')}
                            placeholderTextColor="#8E8E93"
                            value={deliveryAddress}
                            onChangeText={setDeliveryAddress}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder={t('cafe.cart.phonePlaceholder')}
                            placeholderTextColor="#8E8E93"
                            value={deliveryPhone}
                            onChangeText={setDeliveryPhone}
                            keyboardType="phone-pad"
                        />
                    </View>
                )}

                {/* Cart items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.cart.yourOrder')}</Text>
                    {cart.items.map(renderCartItem)}
                </View>

                {/* Customer info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.cart.additional')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('cafe.cart.namePlaceholder')}
                        placeholderTextColor="#8E8E93"
                        value={customerName}
                        onChangeText={setCustomerName}
                    />
                    <TextInput
                        style={[styles.input, styles.noteInput]}
                        placeholder={t('cafe.cart.commentPlaceholder')}
                        placeholderTextColor="#8E8E93"
                        value={customerNote}
                        onChangeText={setCustomerNote}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Payment method */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.cart.paymentMethod')}</Text>
                    <View style={styles.paymentContainer}>
                        {[
                            { id: 'cash', label: t('cafe.cart.cash'), icon: Banknote },
                            { id: 'card', label: t('cafe.cart.card'), icon: CreditCard },
                        ].map(method => (
                            <TouchableOpacity
                                key={method.id}
                                style={[
                                    styles.paymentButton,
                                    paymentMethod === method.id && styles.paymentButtonActive,
                                ]}
                                onPress={() => setPaymentMethod(method.id)}
                            >
                                <method.icon
                                    size={20}
                                    color={paymentMethod === method.id ? '#FFFFFF' : '#8E8E93'}
                                    strokeWidth={1.5}
                                    style={{ marginRight: 8 }}
                                />
                                <Text style={[
                                    styles.paymentButtonText,
                                    paymentMethod === method.id && styles.paymentButtonTextActive,
                                ]}>
                                    {method.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Summary */}
                <View style={styles.summary}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('cafe.cart.subtotal')}</Text>
                        <Text style={styles.summaryValue}>{cart.subtotal} ₽</Text>
                    </View>
                    {cart.deliveryFee > 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('cafe.cart.deliveryFee')}</Text>
                            <Text style={styles.summaryValue}>{cart.deliveryFee} ₽</Text>
                        </View>
                    )}
                    <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>{t('cafe.cart.total')}</Text>
                        <Text style={styles.totalValue}>{cart.total} ₽</Text>
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Submit button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmitOrder}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>
                            {t('cafe.cart.placeOrder')} · {cart.total} ₽
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
            {/* Table Selector Modal */}
            <Modal
                visible={tableModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setTableModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('cafe.staff.tables.title')}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <TouchableOpacity
                                    style={styles.scanButton}
                                    onPress={() => {
                                        setTableModalVisible(false);
                                        navigation.navigate('QRScanner');
                                    }}
                                >
                                    <QrCode size={24} color="#FF6B00" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setTableModalVisible(false)}>
                                    <X size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {loadingTables ? (
                            <ActivityIndicator size="large" color="#FF6B00" style={{ margin: 40 }} />
                        ) : (
                            <FlatList
                                data={tables}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={styles.tableList}
                                numColumns={3}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.tableItem,
                                            cart.tableId === item.id && styles.tableItemActive,
                                            item.upcomingReservation && styles.tableItemReserved
                                        ]}
                                        onPress={() => handleSelectTable(item)}
                                    >
                                        <Utensils size={24} color={cart.tableId === item.id ? '#FFFFFF' : (item.upcomingReservation ? '#FF3B30' : '#FF6B00')} />
                                        <Text style={[
                                            styles.tableItemNumber,
                                            cart.tableId === item.id && styles.tableItemNumberActive
                                        ]}>
                                            {item.number}
                                        </Text>
                                        <Text style={styles.tableItemSeats}>
                                            {item.seats} <Text style={{ fontSize: 10 }}>🪑</Text>
                                        </Text>
                                        {item.upcomingReservation && (
                                            <View style={styles.reservationBadge}>
                                                <Clock size={10} color="#FFFFFF" />
                                                <Text style={styles.reservationBadgeText}>
                                                    {new Date(item.upcomingReservation.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D0D0D',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0D0D0D',
        padding: 24,
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 20,
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 16,
        marginTop: 8,
    },
    backButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#FF6B00',
        borderRadius: 12,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 48,
        backgroundColor: '#1C1C1E',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    clearButton: {
        color: '#FF3B30',
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    cafeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    cafeName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    section: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    orderTypeContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    orderTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#1C1C1E',
        padding: 12,
        borderRadius: 12,
    },
    orderTypeButtonActive: {
        backgroundColor: '#FF6B00',
    },
    orderTypeButtonDisabled: {
        opacity: 0.5,
    },
    orderTypeText: {
        color: '#8E8E93',
        fontSize: 13,
    },
    orderTypeTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    tableInfo: {
        marginTop: 12,
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        padding: 12,
        borderRadius: 8,
    },
    tableInfoText: {
        color: '#FF6B00',
        fontSize: 14,
        fontWeight: '500',
    },
    tableInfoMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tableChangeButton: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: '#FF6B00',
        borderRadius: 6,
    },
    tableChangeButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    tableInfoWarning: {
        marginTop: 12,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
        alignItems: 'center',
    },
    tableInfoWarningText: {
        color: '#FF3B30',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
    selectTableButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    selectTableButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1C1C1E',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    tableList: {
        paddingBottom: 20,
    },
    tableItem: {
        flex: 1,
        backgroundColor: '#2C2C2E',
        margin: 6,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3A3A3C',
    },
    tableItemActive: {
        backgroundColor: '#FF6B00',
        borderColor: '#FF6B00',
    },
    tableItemNumber: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 8,
    },
    tableItemNumberActive: {
        color: '#FFFFFF',
    },
    tableItemSeats: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 4,
    },
    tableItemReserved: {
        borderColor: '#FF3B30',
        backgroundColor: '#1E1212',
    },
    reservationBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        borderWidth: 1,
        borderColor: '#1C1C1E',
        zIndex: 1,
    },
    reservationBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    scanButton: {
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        padding: 8,
        borderRadius: 12,
    },
    input: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 14,
        color: '#FFFFFF',
        fontSize: 15,
        marginBottom: 8,
    },
    noteInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    cartItem: {
        flexDirection: 'row',
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        marginBottom: 8,
        padding: 12,
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    itemCustomization: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 4,
    },
    itemNote: {
        color: '#FF6B00',
        fontSize: 12,
        marginTop: 4,
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    qtyButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        minWidth: 20,
        textAlign: 'center',
    },
    itemTotal: {
        color: '#FF6B00',
        fontSize: 15,
        fontWeight: 'bold',
    },
    removeButton: {
        padding: 8,
        marginLeft: 8,
    },
    paymentContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    paymentButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: '#1C1C1E',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    paymentButtonActive: {
        backgroundColor: '#FF6B00',
    },
    paymentButtonText: {
        color: '#8E8E93',
        fontSize: 14,
    },
    paymentButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    summary: {
        padding: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        color: '#8E8E93',
        fontSize: 15,
    },
    summaryValue: {
        color: '#FFFFFF',
        fontSize: 15,
    },
    totalRow: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
    },
    totalLabel: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValue: {
        color: '#FF6B00',
        fontSize: 20,
        fontWeight: 'bold',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 32,
        backgroundColor: '#1C1C1E',
        borderTopWidth: 1,
        borderTopColor: '#2C2C2E',
    },
    submitButton: {
        backgroundColor: '#FF6B00',
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
});

export default CafeCartScreen;
