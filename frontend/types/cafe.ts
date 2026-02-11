// ==================== CAFE TYPES ====================

export interface Cafe {
    id: number;
    ownerId: number;
    name: string;
    slug: string;
    description: string;
    city: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    phone: string;
    email: string;
    website: string;
    telegram: string;
    instagram: string;
    workingHours: string;
    logoUrl: string;
    coverUrl: string;
    hasDelivery: boolean;
    hasTakeaway: boolean;
    hasDineIn: boolean;
    deliveryRadiusM: number;
    minOrderAmount: number;
    deliveryFee: number;
    avgPrepTime: number;
    status: CafeStatus;
    rating: number;
    reviewsCount: number;
    ordersCount: number;
    viewsCount: number;
    createdAt: string;
    updatedAt: string;
    // Relations
    ownerInfo?: CafeOwnerInfo;
    categories?: CafeCategory[];
    tables?: CafeTable[];
}

export type CafeStatus = 'pending' | 'active' | 'suspended' | 'closed';

export interface CafeOwnerInfo {
    id: number;
    spiritualName: string;
    karmicName: string;
    avatarUrl: string;
}

export interface CafeFilters {
    city?: string;
    status?: CafeStatus;
    search?: string;
    minRating?: number;
    hasDelivery?: boolean;
    sort?: 'rating' | 'popular' | 'newest';
    page?: number;
    limit?: number;
}

// ==================== CATEGORY & DISH TYPES ====================

export interface CafeCategory {
    id: number;
    cafeId: number;
    name: string;
    description: string;
    imageUrl: string;
    sortOrder: number;
    isActive: boolean;
    dishes?: Dish[];
}

export interface Dish {
    id: number;
    cafeId: number;
    categoryId: number;
    name: string;
    description: string;
    type: DishType;
    price: number;
    oldPrice: number | null;
    imageUrl: string;
    thumbUrl: string;
    calories: number | null;
    weight: number | null;
    cookingTime: number | null;
    isVegetarian: boolean;
    isVegan: boolean;
    isSpicy: boolean;
    isGlutenFree: boolean;
    isActive: boolean;
    isAvailable: boolean;
    isFeatured: boolean;
    sortOrder: number;
    rating: number;
    ordersCount: number;
    // Relations
    category?: CafeCategory;
    ingredients?: DishIngredient[];
    modifiers?: DishModifier[];
}

export type DishType = 'food' | 'drink' | 'dessert' | 'snack';

export interface DishFilters {
    categoryId?: number;
    type?: DishType;
    search?: string;
    isVegetarian?: boolean;
    isVegan?: boolean;
    isFeatured?: boolean;
    minPrice?: number;
    maxPrice?: number;
    sort?: 'popular' | 'price_asc' | 'price_desc' | 'rating';
    page?: number;
    limit?: number;
}

export interface DishIngredient {
    id: number;
    dishId: number;
    name: string;
    isRemovable: boolean;
    isAllergen: boolean;
}

export interface DishModifier {
    id: number;
    dishId: number;
    name: string;
    price: number;
    isDefault: boolean;
    isAvailable: boolean;
    maxQuantity: number;
    groupName: string;
    isRequired: boolean;
}

export interface MenuResponse {
    categories: CafeCategory[];
    totalDishes: number;
}

// ==================== TABLE TYPES ====================

export interface CafeTable {
    id: number;
    cafeId: number;
    number: string;
    name: string;
    posX: number;
    posY: number;
    seats: number;
    isActive: boolean;
    isOccupied: boolean;
    qrCodeId: string;
    currentOrderId: number | null;
    occupiedSince: string | null;
    upcomingReservation?: TableReservation;
}

export interface TableReservation {
    id: number;
    tableId: number;
    cafeId: number;
    userId: number;
    customerName: string;
    customerPhone: string;
    startTime: string;
    endTime: string;
    guestsCount: number;
    status: 'confirmed' | 'cancelled' | 'completed';
    note: string;
}

export interface QRCodeScanResult {
    cafeId: number;
    cafeName: string;
    tableId: number;
    tableNumber: string;
    orderType: CafeOrderType;
    activeOrder?: CafeOrder;
    table?: CafeTable;
}

// ==================== ORDER TYPES ====================

export interface CafeOrder {
    id: number;
    orderNumber: string;
    cafeId: number;
    customerId: number | null;
    customerName: string;
    orderType: CafeOrderType;
    tableId: number | null;
    deliveryAddress: string;
    deliveryPhone: string;
    status: CafeOrderStatus;
    itemsCount: number;
    subtotal: number;
    deliveryFee: number;
    total: number;
    currency: string;
    paymentMethod: string;
    isPaid: boolean;
    paidAt: string | null;
    customerNote: string;
    estimatedReadyAt: string | null;
    createdAt: string;
    updatedAt: string;
    // Timestamps
    confirmedAt: string | null;
    preparingAt: string | null;
    readyAt: string | null;
    servedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    // Relations
    items?: CafeOrderItem[];
    cafeInfo?: CafeOrderCafeInfo;
    customerInfo?: CafeOrderCustomerInfo;
    tableInfo?: CafeOrderTableInfo;
}

export type CafeOrderType = 'dine_in' | 'takeaway' | 'delivery';

export type CafeOrderStatus =
    | 'new'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'served'
    | 'delivering'
    | 'completed'
    | 'cancelled';

export interface CafeOrderItem {
    id: number;
    orderId: number;
    dishId: number;
    dishName: string;
    imageUrl: string;
    unitPrice: number;
    quantity: number;
    total: number;
    removedIngredients: string;
    customerNote: string;
    status: string;
    modifiers?: CafeOrderItemModifier[];
}

export interface CafeOrderItemModifier {
    id: number;
    orderItemId: number;
    modifierId: number;
    modifierName: string;
    price: number;
    quantity: number;
    total: number;
}

export interface CafeOrderCafeInfo {
    id: number;
    name: string;
    logoUrl: string;
    address: string;
}

export interface CafeOrderCustomerInfo {
    id: number;
    spiritualName: string;
    karmicName: string;
    avatarUrl: string;
}

export interface CafeOrderTableInfo {
    id: number;
    number: string;
    name: string;
}

export interface CafeOrderFilters {
    status?: CafeOrderStatus;
    orderType?: CafeOrderType;
    tableId?: number;
    isPaid?: boolean;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    sort?: 'newest' | 'oldest';
    page?: number;
    limit?: number;
}

export interface CafeOrderCreateData {
    cafeId: number;
    orderType: CafeOrderType;
    tableId?: number;
    deliveryAddress?: string;
    deliveryLat?: number;
    deliveryLng?: number;
    deliveryPhone?: string;
    customerName?: string;
    customerNote?: string;
    paymentMethod?: string;
    items: CafeOrderItemCreateData[];
}

export interface CafeOrderItemCreateData {
    dishId: number;
    quantity: number;
    removedIngredients?: string[];
    modifiers?: CafeOrderModifierCreateData[];
    note?: string;
}

export interface CafeOrderModifierCreateData {
    modifierId: number;
    quantity?: number;
}

export interface ActiveOrdersResponse {
    new: CafeOrder[];
    preparing: CafeOrder[];
    ready: CafeOrder[];
    total: number;
}

export interface OrderStatsResponse {
    todayOrders: number;
    todayRevenue: number;
    pendingOrders: number;
    avgPrepTime: number;
    totalOrders: number;
    totalRevenue: number;
}

// ==================== WAITER CALL TYPES ====================

export type WaiterCallReason = 'bill' | 'help' | 'cleanup' | 'reorder' | 'problem';

export interface WaiterCall {
    id: number;
    cafeId: number;
    tableId: number;
    userId: number | null;
    reason: WaiterCallReason;
    note: string;
    status: WaiterCallStatus;
    handledBy: number | null;
    handledAt: string | null;
    completedAt: string | null;
    createdAt: string;
    // Relations
    table?: CafeTable;
}

export type WaiterCallStatus = 'pending' | 'acknowledged' | 'completed';

// ==================== CART TYPES ====================

export interface CartItem {
    dish: Dish;
    quantity: number;
    removedIngredients: string[];
    selectedModifiers: SelectedModifier[];
    note: string;
    itemTotal: number;
}

export interface SelectedModifier {
    modifier: DishModifier;
    quantity: number;
}

export interface Cart {
    cafeId: number;
    cafeName: string;
    items: CartItem[];
    tableId?: number;
    tableNumber?: string;
    orderType: CafeOrderType;
    subtotal: number;
    deliveryFee: number;
    total: number;
}

// ==================== HELPER FUNCTIONS ====================

export function getOrderStatusLabel(status: CafeOrderStatus): string {
    const labels: Record<CafeOrderStatus, string> = {
        new: 'Новый',
        confirmed: 'Подтверждён',
        preparing: 'Готовится',
        ready: 'Готов',
        served: 'Подан',
        delivering: 'Доставляется',
        completed: 'Завершён',
        cancelled: 'Отменён',
    };
    return labels[status] || status;
}

export function getOrderStatusColor(status: CafeOrderStatus): string {
    const colors: Record<CafeOrderStatus, string> = {
        new: '#FF9500',
        confirmed: '#007AFF',
        preparing: '#5856D6',
        ready: '#34C759',
        served: '#32ADE6',
        delivering: '#AF52DE',
        completed: '#8E8E93',
        cancelled: '#FF3B30',
    };
    return colors[status] || '#8E8E93';
}

export function getOrderTypeLabel(type: CafeOrderType): string {
    const labels: Record<CafeOrderType, string> = {
        dine_in: 'В заведении',
        takeaway: 'Навынос',
        delivery: 'Доставка',
    };
    return labels[type] || type;
}

export function getWaiterCallReasonLabel(reason: WaiterCallReason): string {
    const labels: Record<WaiterCallReason, string> = {
        bill: 'Счёт',
        help: 'Нужна помощь',
        cleanup: 'Убрать стол',
        reorder: 'Дозаказ',
        problem: 'Проблема',
    };
    return labels[reason] || reason;
}
