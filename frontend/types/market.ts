// Shop types

export type ShopCategory =
    | 'food'
    | 'clothing'
    | 'books'
    | 'handicrafts'
    | 'incense'
    | 'jewelry'
    | 'ayurveda'
    | 'musical_instruments'
    | 'art'
    | 'digital_goods'
    | 'services'
    | 'other';

export type ShopStatus = 'pending' | 'active' | 'suspended' | 'closed';

export type ProductType = 'physical' | 'digital';

export type ProductStatus = 'draft' | 'active' | 'inactive' | 'sold_out';

export type ProductCategory =
    | 'books'
    | 'clothing'
    | 'food'
    | 'incense'
    | 'jewelry'
    | 'ayurveda'
    | 'music_instruments'
    | 'art'
    | 'home_decor'
    | 'cosmetics'
    | 'digital_courses'
    | 'digital_books'
    | 'accessories'
    | 'other';

export type OrderStatus =
    | 'new'
    | 'confirmed'
    | 'paid'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled'
    | 'dispute';

export type DeliveryType = 'pickup' | 'delivery' | 'digital';

// Shop interfaces
export interface ShopOwnerInfo {
    id: number;
    spiritualName: string;
    karmicName: string;
    avatarUrl: string;
    isVerified?: boolean;
}

export interface Shop {
    ID: number;
    ownerId: number;
    name: string;
    slug: string;
    description: string;
    category: ShopCategory;
    logoUrl: string;
    coverUrl: string;
    city: string;
    address: string;
    latitude?: number;
    longitude?: number;
    phone: string;
    email: string;
    website: string;
    telegram: string;
    instagram: string;
    vk: string;
    workingHours: string;
    status: ShopStatus;
    viewsCount: number;
    ordersCount: number;
    rating: number;
    reviewsCount: number;
    productsCount: number;
    CreatedAt: string;
    ownerInfo?: ShopOwnerInfo;
    distance?: number; // km when geo filter is used
}

export interface ShopFormData {
    name: string;
    description?: string;
    category: ShopCategory;
    city: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    website?: string;
    telegram?: string;
    instagram?: string;
    vk?: string;
    workingHours?: string;
    logoUrl?: string;
    coverUrl?: string;
}

export interface ShopFilters {
    category?: ShopCategory;
    city?: string;
    status?: ShopStatus;
    search?: string;
    nearLat?: number;
    nearLng?: number;
    radiusKm?: number;
    minRating?: number;
    sort?: 'newest' | 'rating' | 'popular';
    page?: number;
    limit?: number;
}

export interface ShopStats {
    totalViews: number;
    totalOrders: number;
    totalRevenue: number;
    averageRating: number;
    totalProducts: number;
    activeProducts: number;
    pendingOrders: number;
}

// Product interfaces
export interface ProductVariant {
    ID: number;
    productId: number;
    sku: string;
    attributes: string; // JSON string
    name: string;
    price?: number;
    salePrice?: number;
    stock: number;
    reserved: number;
    imageUrl: string;
    isActive: boolean;
}

export interface ProductImage {
    ID: number;
    productId: number;
    imageUrl: string;
    position: number;
    altText: string;
}

export interface ProductShopInfo {
    id: number;
    name: string;
    logoUrl: string;
    city: string;
    rating: number;
}

export interface Product {
    ID: number;
    shopId: number;
    name: string;
    slug: string;
    shortDescription: string;
    fullDescription: string;
    category: ProductCategory;
    tags: string; // JSON array
    productType: ProductType;
    externalUrl?: string;
    digitalUrl?: string;
    basePrice: number;
    salePrice?: number;
    currency: string;
    stock: number;
    trackStock: boolean;
    allowBackorder: boolean;
    status: ProductStatus;
    mainImageUrl: string;
    weight?: number;
    dimensions?: string;
    viewsCount: number;
    salesCount: number;
    rating: number;
    reviewsCount: number;
    favoritesCount: number;
    CreatedAt: string;
    variants?: ProductVariant[];
    images?: ProductImage[];
    shopInfo?: ProductShopInfo;
    isFavorite?: boolean;
    currentPrice?: number;
    isOnSale?: boolean;
}

export interface ProductFormData {
    name: string;
    shortDescription?: string;
    fullDescription?: string;
    category: ProductCategory;
    tags?: string[];
    productType: ProductType;
    externalUrl?: string;
    digitalUrl?: string;
    basePrice: number;
    salePrice?: number;
    currency?: string;
    stock?: number;
    trackStock?: boolean;
    mainImageUrl?: string;
    images?: string[];
    weight?: number;
    dimensions?: string;
    variants?: VariantFormData[];
}

export interface VariantFormData {
    sku: string;
    attributes: Record<string, string>;
    name?: string;
    price?: number;
    salePrice?: number;
    stock: number;
    imageUrl?: string;
}

export interface ProductFilters {
    shopId?: number;
    category?: ProductCategory;
    productType?: ProductType;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    status?: ProductStatus;
    search?: string;
    tags?: string[];
    minRating?: number;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
    page?: number;
    limit?: number;
}

// Order interfaces
export interface OrderItem {
    ID: number;
    orderId: number;
    productId: number;
    variantId?: number;
    productName: string;
    variantName: string;
    sku: string;
    imageUrl: string;
    unitPrice: number;
    quantity: number;
    total: number;
    digitalUrl?: string;
}

export interface OrderUserInfo {
    id: number;
    spiritualName: string;
    karmicName: string;
    avatarUrl: string;
}

export interface OrderShopInfo {
    id: number;
    name: string;
    logoUrl: string;
    city: string;
}

export interface Order {
    ID: number;
    orderNumber: string;
    buyerId: number;
    shopId: number;
    sellerId: number;
    status: OrderStatus;
    itemsCount: number;
    subtotal: number;
    total: number;
    currency: string;
    deliveryType: DeliveryType;
    deliveryAddress: string;
    deliveryNote: string;
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    buyerNote: string;
    notificationSent: boolean;
    CreatedAt: string;
    confirmedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    completedAt?: string;
    cancelledAt?: string;
    cancelReason?: string;
    items?: OrderItem[];
    buyerInfo?: OrderUserInfo;
    shopInfo?: OrderShopInfo;
}

export interface CartItem {
    productId: number;
    variantId?: number;
    quantity: number;
    product?: Product;
    variant?: ProductVariant;
}

export interface OrderCreateData {
    shopId: number;
    items: CartItem[];
    deliveryType: DeliveryType;
    deliveryAddress?: string;
    deliveryNote?: string;
    buyerName: string;
    buyerPhone?: string;
    buyerEmail?: string;
    buyerNote?: string;
}

// Category config
export interface ShopCategoryConfig {
    id: ShopCategory;
    emoji: string;
    label: {
        ru: string;
        en: string;
    };
}

export interface ProductCategoryConfig {
    id: ProductCategory;
    emoji: string;
    label: {
        ru: string;
        en: string;
    };
}
