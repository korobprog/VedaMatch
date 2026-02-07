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
    Platform,
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
    ShoppingCart,
    Minus,
    Plus,
    Trash2,
    ArrowLeft,
    Utensils,
    ShoppingBag,
    Truck,
    Banknote,
    CreditCard,
    X,
    MapPin,
    QrCode,
    Clock,
    User,
    MessageSquare,
    ChevronRight,
    MapPinned
} from 'lucide-react-native';
import { useCart } from '../../../contexts/CafeCartContext';
import { cafeService } from '../../../services/cafeService';
import { CafeOrderType } from '../../../types/cafe';

const { width } = Dimensions.get('window');

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
            <LinearGradient colors={['#0a0a14', '#12122b']} style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <ShoppingCart size={80} color="rgba(245, 158, 11, 0.2)" strokeWidth={1} />
                </View>
                <Text style={styles.emptyTitle}>{t('cafe.cart.empty')}</Text>
                <Text style={styles.emptyText}>{t('cafe.cart.emptyInfo')}</Text>
                <TouchableOpacity
                    style={styles.backToMenuBtn}
                    onPress={() => navigation.goBack()}
                >
                    <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.backToMenuGradient}
                    >
                        <Text style={styles.backToMenuText}>{t('cafe.cart.backToMenu')}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </LinearGradient>
        );
    }

    const handleOrderTypeChange = (type: CafeOrderType) => {
        setOrderType(type);
    };

    const handleSubmitOrder = async () => {
        if (!cart) return;

        if (cart.orderType === 'dine_in' && !cart.tableId) {
            Alert.alert(t('common.error'), t('cafe.cart.errorTable'));
            return;
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

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0a0a14', '#12122b']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.header} edges={['top']}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('cafe.cart.cart')}</Text>
                <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
                    <Text style={styles.clearBtnText}>{t('cafe.cart.clear')}</Text>
                </TouchableOpacity>
            </SafeAreaView>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Cafe & Order Type */}
                <View style={styles.sectionGlass}>
                    <View style={styles.cafeHeader}>
                        <View style={styles.cafeIcon}>
                            <Utensils size={18} color="#F59E0B" />
                        </View>
                        <Text style={styles.cafeName}>{cart.cafeName}</Text>
                    </View>

                    <Text style={styles.sectionLabel}>{t('cafe.cart.type')}</Text>
                    <View style={styles.typeSelector}>
                        {(['dine_in', 'takeaway', 'delivery'] as CafeOrderType[]).map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.typeBtn,
                                    cart.orderType === type && styles.typeBtnActive,
                                ]}
                                onPress={() => handleOrderTypeChange(type)}
                            >
                                {type === 'dine_in' && <Utensils size={18} color={cart.orderType === type ? '#1a1a2e' : 'rgba(255,255,255,0.4)'} />}
                                {type === 'takeaway' && <ShoppingBag size={18} color={cart.orderType === type ? '#1a1a2e' : 'rgba(255,255,255,0.4)'} />}
                                {type === 'delivery' && <Truck size={18} color={cart.orderType === type ? '#1a1a2e' : 'rgba(255,255,255,0.4)'} />}
                                <Text style={[
                                    styles.typeBtnText,
                                    cart.orderType === type && styles.typeBtnTextActive,
                                ]}>
                                    {t(`cafe.form.${type === 'dine_in' ? 'dineIn' : type}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {cart.orderType === 'dine_in' && (
                        <TouchableOpacity
                            style={[styles.tablePicker, !cart.tableId && styles.tablePickerWarning]}
                            onPress={handleOpenTablePicker}
                        >
                            <View style={styles.tablePickerInfo}>
                                <MapPin size={18} color={cart.tableId ? '#F59E0B' : '#EF4444'} />
                                <Text style={[styles.tablePickerText, !cart.tableId && styles.tablePickerTextWarning]}>
                                    {cart.tableId
                                        ? t('cafe.detail.tableInfo', { tableNumber: cart.tableNumber })
                                        : t('cafe.cart.selectTable')
                                    }
                                </Text>
                            </View>
                            <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Delivery details if needed */}
                {cart.orderType === 'delivery' && (
                    <View style={styles.sectionGlass}>
                        <Text style={styles.sectionLabel}>{t('cafe.cart.deliveryAddress')}</Text>
                        <View style={styles.inputContainer}>
                            <MapPinned size={18} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder={t('cafe.cart.addressPlaceholder')}
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                value={deliveryAddress}
                                onChangeText={setDeliveryAddress}
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Clock size={18} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder={t('cafe.cart.phonePlaceholder')}
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                value={deliveryPhone}
                                onChangeText={setDeliveryPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                )}

                {/* Main Order Items */}
                <View style={styles.itemsSection}>
                    <Text style={styles.sectionHeadline}>{t('cafe.cart.yourOrder')}</Text>
                    {cart.items.map((item, index) => (
                        <View key={`${item.dish.id}-${index}`} style={styles.cartItemGlass}>
                            {item.dish.imageUrl ? (
                                <Image source={{ uri: item.dish.imageUrl }} style={styles.itemImg} />
                            ) : (
                                <View style={styles.itemImgPlaceholder}>
                                    <Utensils size={24} color="rgba(255,255,255,0.1)" />
                                </View>
                            )}

                            <View style={styles.itemDetails}>
                                <View style={styles.itemHeader}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.dish.name}</Text>
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromCart(item.dish.id)}>
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>

                                {(item.removedIngredients.length > 0 || item.selectedModifiers.length > 0 || item.note) && (
                                    <View style={styles.customizationBox}>
                                        {item.removedIngredients.length > 0 && (
                                            <Text style={styles.customizationText}>
                                                <Text style={{ color: '#EF4444' }}>- </Text>{item.removedIngredients.join(', ')}
                                            </Text>
                                        )}
                                        {item.selectedModifiers.length > 0 && (
                                            <Text style={styles.customizationText}>
                                                <Text style={{ color: '#10B981' }}>+ </Text>
                                                {item.selectedModifiers.map(m => m.quantity > 1 ? `${m.modifier.name} x${m.quantity}` : m.modifier.name).join(', ')}
                                            </Text>
                                        )}
                                        {item.note && <Text style={styles.itemNoteText}>💬 {item.note}</Text>}
                                    </View>
                                )}

                                <View style={styles.itemFooter}>
                                    <View style={styles.qtyBox}>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => updateQuantity(item.dish.id, item.quantity - 1)}
                                        >
                                            <Minus size={14} color="#fff" />
                                        </TouchableOpacity>
                                        <Text style={styles.qtyVal}>{item.quantity}</Text>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => updateQuantity(item.dish.id, item.quantity + 1)}
                                        >
                                            <Plus size={14} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={styles.itemPrice}>{item.itemTotal} ₽</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Additional Info */}
                <View style={styles.sectionGlass}>
                    <Text style={styles.sectionLabel}>{t('cafe.cart.additional')}</Text>
                    <View style={styles.inputContainer}>
                        <User size={18} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder={t('cafe.cart.namePlaceholder')}
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={customerName}
                            onChangeText={setCustomerName}
                        />
                    </View>
                    <View style={[styles.inputContainer, { alignItems: 'flex-start', paddingTop: 12 }]}>
                        <MessageSquare size={18} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                            placeholder={t('cafe.cart.commentPlaceholder')}
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={customerNote}
                            onChangeText={setCustomerNote}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                </View>

                {/* Payment */}
                <View style={styles.sectionGlass}>
                    <Text style={styles.sectionLabel}>{t('cafe.cart.paymentMethod')}</Text>
                    <View style={styles.paymentSelector}>
                        <TouchableOpacity
                            style={[styles.paymentBtn, paymentMethod === 'cash' && styles.paymentBtnActive]}
                            onPress={() => setPaymentMethod('cash')}
                        >
                            <Banknote size={20} color={paymentMethod === 'cash' ? '#1a1a2e' : 'rgba(255,255,255,0.4)'} />
                            <Text style={[styles.paymentBtnText, paymentMethod === 'cash' && styles.paymentBtnTextActive]}>
                                {t('cafe.cart.cash')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.paymentBtn, paymentMethod === 'card' && styles.paymentBtnActive]}
                            onPress={() => setPaymentMethod('card')}
                        >
                            <CreditCard size={20} color={paymentMethod === 'card' ? '#1a1a2e' : 'rgba(255,255,255,0.4)'} />
                            <Text style={[styles.paymentBtnText, paymentMethod === 'card' && styles.paymentBtnTextActive]}>
                                {t('cafe.cart.card')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Summary */}
                <View style={styles.summaryGlass}>
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
                    <View style={styles.divider} />
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{t('cafe.cart.total')}</Text>
                        <Text style={styles.totalValue}>{cart.total} ₽</Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footerContainer}>
                <TouchableOpacity
                    style={[styles.checkoutBtn, loading && styles.disabledBtn]}
                    onPress={handleSubmitOrder}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.checkoutGradient}
                    >
                        {loading ? (
                            <ActivityIndicator color="#1a1a2e" />
                        ) : (
                            <>
                                <Text style={styles.checkoutText}>{t('cafe.cart.placeOrder')}</Text>
                                <View style={styles.checkoutPriceBox}>
                                    <Text style={styles.checkoutPrice}>{cart.total} ₽</Text>
                                    <ChevronRight size={20} color="#1a1a2e" />
                                </View>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Table Modal */}
            <Modal
                visible={tableModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setTableModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <LinearGradient colors={['#0a0a14', '#12122b']} style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('cafe.staff.tables.title')}</Text>
                            <View style={styles.modalControls}>
                                <TouchableOpacity
                                    style={styles.qrBtn}
                                    onPress={() => {
                                        setTableModalVisible(false);
                                        navigation.navigate('QRScanner');
                                    }}
                                >
                                    <QrCode size={20} color="#F59E0B" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setTableModalVisible(false)}>
                                    <X size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {loadingTables ? (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator size="large" color="#F59E0B" />
                            </View>
                        ) : (
                            <FlatList
                                data={tables}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={styles.tableGrid}
                                numColumns={3}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.tableCard,
                                            cart.tableId === item.id && styles.tableCardActive,
                                            item.upcomingReservation && styles.tableCardReserved
                                        ]}
                                        onPress={() => handleSelectTable(item)}
                                    >
                                        <Utensils size={20} color={cart.tableId === item.id ? '#1a1a2e' : (item.upcomingReservation ? '#EF4444' : '#F59E0B')} />
                                        <Text style={[styles.tableNum, cart.tableId === item.id && styles.tableNumActive]}>
                                            {item.number}
                                        </Text>
                                        <Text style={[styles.tableSeats, cart.tableId === item.id && styles.tableSeatsActive]}>
                                            {item.seats} 🪑
                                        </Text>
                                        {item.upcomingReservation && (
                                            <View style={styles.resBadge}>
                                                <Text style={styles.resTime}>
                                                    {new Date(item.upcomingReservation.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </LinearGradient>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 10,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    clearBtn: {
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    clearBtnText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 120,
    },
    sectionGlass: {
        backgroundColor: 'rgba(25, 25, 45, 0.5)',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 20,
    },
    cafeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    cafeIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cafeName: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    sectionLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    typeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    typeBtnActive: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    typeBtnText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '700',
    },
    typeBtnTextActive: {
        color: '#1a1a2e',
    },
    tablePicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginTop: 8,
    },
    tablePickerWarning: {
        borderColor: 'rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    tablePickerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tablePickerText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    tablePickerTextWarning: {
        color: '#EF4444',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        height: 52,
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    itemsSection: {
        marginBottom: 20,
    },
    sectionHeadline: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 16,
        paddingHorizontal: 5,
    },
    cartItemGlass: {
        backgroundColor: 'rgba(25, 25, 45, 0.5)',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 12,
    },
    itemImg: {
        width: 70,
        height: 70,
        borderRadius: 16,
        marginRight: 16,
    },
    itemImgPlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    itemDetails: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    itemName: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Cinzel-Bold',
        flex: 1,
    },
    removeBtn: {
        padding: 5,
    },
    customizationBox: {
        marginBottom: 10,
        gap: 2,
    },
    customizationText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontWeight: '600',
    },
    itemNoteText: {
        color: '#F59E0B',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    qtyBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 4,
        gap: 12,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyVal: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        minWidth: 15,
        textAlign: 'center',
    },
    itemPrice: {
        color: '#F59E0B',
        fontSize: 16,
        fontWeight: '900',
    },
    paymentSelector: {
        flexDirection: 'row',
        gap: 12,
    },
    paymentBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    paymentBtnActive: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    paymentBtnText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontWeight: '700',
    },
    paymentBtnTextActive: {
        color: '#1a1a2e',
    },
    summaryGlass: {
        backgroundColor: 'rgba(25, 25, 45, 0.5)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginTop: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontWeight: '600',
    },
    summaryValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    totalValue: {
        color: '#F59E0B',
        fontSize: 22,
        fontWeight: '900',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
        backgroundColor: 'rgba(10, 10, 20, 0.95)',
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    checkoutBtn: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
    },
    checkoutGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 25,
    },
    checkoutText: {
        color: '#1a1a2e',
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
        flex: 1,
        textAlign: 'center',
        marginLeft: 40,
    },
    checkoutPriceBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    checkoutPrice: {
        color: '#1a1a2e',
        fontSize: 16,
        fontWeight: '900',
    },
    disabledBtn: {
        opacity: 0.7,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 24,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    backToMenuBtn: {
        width: '100%',
        borderRadius: 18,
        overflow: 'hidden',
    },
    backToMenuGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    backToMenuText: {
        color: '#1a1a2e',
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 32,
        padding: 24,
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'Cinzel-Bold',
    },
    modalControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    qrBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalLoading: {
        padding: 60,
    },
    tableGrid: {
        gap: 12,
        paddingBottom: 20,
    },
    tableCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        margin: 4,
        paddingVertical: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    tableCardActive: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    tableCardReserved: {
        borderColor: 'rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    tableNum: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        marginTop: 8,
    },
    tableNumActive: {
        color: '#1a1a2e',
    },
    tableSeats: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
    },
    tableSeatsActive: {
        color: 'rgba(26, 26, 46, 0.6)',
    },
    resBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    resTime: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '900',
    }
});

export default CafeCartScreen;
