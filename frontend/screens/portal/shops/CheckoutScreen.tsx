import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    Image, ActivityIndicator, Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { marketService } from '../../../services/marketService';
import { CartItem, DeliveryType, ProductVariant } from '../../../types/market';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { getMediaUrl } from '../../../utils/url';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

type RouteParams = {
    Checkout: {
        items?: CartItem[];
        shopId?: number;
        source?: string;
        sourcePostId?: number;
        sourceChannelId?: number;
        prefillBuyerNote?: string;
    };
};

export const CheckoutScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'Checkout'>>();
    const initialItems = route.params?.items || [];
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [cartItems, setCartItems] = useState<CartItem[]>(initialItems);
    const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryNote, setDeliveryNote] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [buyerEmail, setBuyerEmail] = useState('');
    const [buyerNote, setBuyerNote] = useState(route.params?.prefillBuyerNote || '');

    useEffect(() => {
        // Load products details if not available
        if (initialItems.length > 0 && !initialItems[0].product) {
            loadProductDetails();
        }
    }, []);

    const loadProductDetails = async () => {
        setLoading(true);
        try {
            const updatedItems = await Promise.all(
                initialItems.map(async (item) => {
                    const product = await marketService.getProduct(item.productId);
                    let variant: ProductVariant | undefined;
                    if (item.variantId && product.variants) {
                        variant = product.variants.find(v => v.ID === item.variantId);
                    }
                    return { ...item, product, variant };
                })
            );
            setCartItems(updatedItems);
        } catch (error) {
            console.error('Error loading products:', error);
            Alert.alert('Error', 'Failed to load cart items');
        } finally {
            setLoading(false);
        }
    };

    const getItemPrice = (item: CartItem): number => {
        if (item.variant) {
            if (item.variant.salePrice && item.variant.salePrice > 0) {
                return item.variant.salePrice;
            }
            if (item.variant.price) {
                return item.variant.price;
            }
        }
        if (item.product?.salePrice && item.product.salePrice > 0) {
            return item.product.salePrice;
        }
        return item.product?.basePrice || 0;
    };

    const getSubtotal = (): number => {
        return cartItems.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
    };

    const getTotal = (): number => {
        // For now, no delivery fee
        return getSubtotal();
    };

    const getShopId = (): number => {
        return route.params?.shopId || cartItems[0]?.product?.shopId || 0;
    };

    const handleRemoveItem = (index: number) => {
        if (cartItems.length === 1) {
            Alert.alert('Empty Cart', 'Cannot remove last item', [
                { text: 'Cancel' },
                { text: 'Go Back', onPress: () => navigation.goBack() }
            ]);
            return;
        }
        setCartItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleQuantityChange = (index: number, delta: number) => {
        setCartItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const newQty = item.quantity + delta;
            if (newQty < 1) return item;
            // Check stock
            const maxStock = item.variant ? item.variant.stock : (item.product?.stock || 999);
            if (newQty > maxStock) return item;
            return { ...item, quantity: newQty };
        }));
    };

    const handleSubmitOrder = async () => {
        // Validation
        if (!buyerName.trim()) {
            return Alert.alert('Required', 'Please enter your name');
        }
        if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
            return Alert.alert('Required', 'Please enter delivery address');
        }

        setSubmitting(true);
        try {
            const orderData = {
                shopId: getShopId(),
                items: cartItems.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                })),
                deliveryType,
                deliveryAddress: deliveryAddress.trim(),
                deliveryNote: deliveryNote.trim(),
                buyerName: buyerName.trim(),
                buyerPhone: buyerPhone.trim(),
                buyerEmail: buyerEmail.trim(),
                buyerNote: buyerNote.trim(),
            };

            const hasChannelAttribution = Boolean(route.params?.sourcePostId || route.params?.sourceChannelId || route.params?.source === 'channel_post');
            const resultWithAttribution = hasChannelAttribution
                ? await marketService.createOrderFromChannel(orderData, {
                    source: route.params?.source || 'channel_post',
                    sourcePostId: route.params?.sourcePostId,
                    sourceChannelId: route.params?.sourceChannelId,
                })
                : await marketService.createOrder(orderData);

            navigation.replace('OrderSuccess', {
                orderId: resultWithAttribution.orderId,
                orderNumber: resultWithAttribution.orderNumber,
            });
        } catch (error: any) {
            console.error('Error creating order:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <ProtectedScreen>
            <View style={styles.screen}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.headerTitle}>
                        Checkout
                    </Text>

                    {/* Cart Items */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Your Items ({cartItems.length})
                        </Text>

                        {cartItems.map((item, index) => (
                            <View
                                key={`${item.productId}-${item.variantId || 0}`}
                                style={styles.cartItem}
                            >
                                <View style={styles.itemImageContainer}>
                                    {item.product?.mainImageUrl ? (
                                        <Image
                                            source={{ uri: getMediaUrl(item.product.mainImageUrl) || '' }}
                                            style={styles.itemImage}
                                        />
                                    ) : (
                                        <View style={styles.itemPlaceholder}>
                                            <Text style={{ fontSize: 24 }}>📦</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName} numberOfLines={2}>
                                        {item.product?.name}
                                    </Text>
                                    {item.variant && (
                                        <Text style={[styles.itemVariant, { color: colors.textSecondary }]}>
                                            {item.variant.name || item.variant.sku}
                                        </Text>
                                    )}
                                    <Text style={styles.itemPrice}>
                                        {getItemPrice(item).toLocaleString()} {item.product?.currency || 'RUB'}
                                    </Text>
                                </View>

                                <View style={styles.itemActions}>
                                    <View style={styles.quantityRow}>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => handleQuantityChange(index, -1)}
                                        >
                                            <Text style={{ color: colors.textPrimary }}>−</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.qtyValue}>
                                            {item.quantity}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => handleQuantityChange(index, 1)}
                                        >
                                            <Text style={{ color: colors.textPrimary }}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                                        <Text style={{ color: colors.danger, fontSize: 12 }}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Delivery Type */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Delivery Method
                        </Text>

                        <View style={styles.deliveryOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.deliveryOption,
                                    {
                                        backgroundColor: deliveryType === 'delivery' ? colors.accent : colors.surfaceElevated,
                                        borderColor: deliveryType === 'delivery' ? colors.accent : 'transparent'
                                    }
                                ]}
                                onPress={() => setDeliveryType('delivery')}
                            >
                                <Text style={{ fontSize: 24 }}>🚚</Text>
                                <Text style={[styles.deliveryLabel, { color: colors.textPrimary }]}>
                                    Delivery
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.deliveryOption,
                                    {
                                        backgroundColor: deliveryType === 'pickup' ? colors.accent : colors.surfaceElevated,
                                        borderColor: deliveryType === 'pickup' ? colors.accent : 'transparent'
                                    }
                                ]}
                                onPress={() => setDeliveryType('pickup')}
                            >
                                <Text style={{ fontSize: 24 }}>🏪</Text>
                                <Text style={[styles.deliveryLabel, { color: colors.textPrimary }]}>
                                    Pickup
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {deliveryType === 'delivery' && (
                            <>
                                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
                                    Delivery Address *
                                </Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={deliveryAddress}
                                    onChangeText={setDeliveryAddress}
                                    placeholder="Street, building, apartment..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    numberOfLines={2}
                                />

                                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
                                    Delivery Notes
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    value={deliveryNote}
                                    onChangeText={setDeliveryNote}
                                    placeholder="Intercom, floor, etc."
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </>
                        )}
                    </View>

                    {/* Contact Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Contact Information
                        </Text>

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Your Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={buyerName}
                            onChangeText={setBuyerName}
                            placeholder="How should we call you?"
                            placeholderTextColor={colors.textSecondary}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Phone</Text>
                        <TextInput
                            style={styles.input}
                            value={buyerPhone}
                            onChangeText={setBuyerPhone}
                            placeholder="+7 999 123 45 67"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="phone-pad"
                        />

                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={buyerEmail}
                            onChangeText={setBuyerEmail}
                            placeholder="your@email.com"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Note for Seller</Text>
                        <TextInput
                            style={styles.input}
                            value={buyerNote}
                            onChangeText={setBuyerNote}
                            placeholder="Any special requests?"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    {/* Order Summary */}
                    <View style={styles.summaryCard}>
                        <Text style={styles.sectionTitle}>
                            Order Summary
                        </Text>

                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                                Subtotal ({cartItems.reduce((s, i) => s + i.quantity, 0)} items)
                            </Text>
                            <Text style={styles.summaryValue}>
                                {getSubtotal().toLocaleString()} RUB
                            </Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Delivery</Text>
                            <Text style={[styles.summaryValue, { color: colors.success }]}>
                                {deliveryType === 'delivery' ? 'Discuss with seller' : 'Free (Pickup)'}
                            </Text>
                        </View>

                        <View style={[styles.summaryRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>
                                {getTotal().toLocaleString()} RUB
                            </Text>
                        </View>
                    </View>

                    {/* Info notice */}
                    <View style={styles.infoCard}>
                        <Text style={{ fontSize: 20 }}>💬</Text>
                        <Text style={styles.infoText}>
                            Payment and delivery details will be arranged with the seller via messenger after order confirmation.
                        </Text>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleSubmitOrder}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={colors.textPrimary} />
                        ) : (
                            <Text style={styles.submitText}>Place Order</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </ProtectedScreen>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    container: {
        padding: 16,
        paddingBottom: 40,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: colors.textPrimary,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 12,
        color: colors.textPrimary,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    input: {
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        color: colors.textPrimary,
    },
    textArea: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    cartItem: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 14,
        marginBottom: 10,
        elevation: 2,
        backgroundColor: colors.surface,
    },
    itemImageContainer: {
        width: 70,
        height: 70,
        borderRadius: 10,
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    itemPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.accentSoft,
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    itemVariant: {
        fontSize: 12,
        marginTop: 2,
    },
    itemPrice: {
        fontSize: 15,
        fontWeight: 'bold',
        marginTop: 4,
        color: colors.accent,
    },
    itemActions: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
    },
    qtyValue: {
        fontSize: 15,
        fontWeight: '600',
        minWidth: 24,
        textAlign: 'center',
        color: colors.textPrimary,
    },
    deliveryOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    deliveryOption: {
        flex: 1,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 2,
    },
    deliveryLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 6,
    },
    summaryCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        backgroundColor: colors.surfaceElevated,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    totalRow: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    totalLabel: {
        fontSize: 17,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    totalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.accent,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 12,
        gap: 12,
        marginBottom: 20,
        alignItems: 'center',
        backgroundColor: colors.accentSoft,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        color: colors.accent,
    },
    submitBtn: {
        padding: 18,
        borderRadius: 30,
        alignItems: 'center',
        elevation: 6,
        backgroundColor: colors.accent,
    },
    submitText: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
