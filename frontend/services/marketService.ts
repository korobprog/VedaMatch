import { AxiosError } from 'axios';
import apiClient from '../lib/apiClient';
import {
    Shop,
    ShopFormData,
    ShopFilters,
    ShopStats,
    ShopCategoryConfig,
    Product,
    ProductFormData,
    ProductFilters,
    ProductCategoryConfig,
    Order,
    OrderCreateData,
    OrderStatus,
} from '../types/market';
import { getGodModeQueryParams } from './godModeService';

const getApiErrorMessage = (error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<any>;
    const payload = axiosError?.response?.data;
    if (typeof payload === 'string' && payload.trim()) {
        return payload;
    }
    if (payload && typeof payload === 'object') {
        const message = payload.error || payload.message;
        if (message && typeof message === 'string') {
            return message;
        }
    }
    return axiosError?.message || fallback;
};

class MarketService {
    private async uploadFile(endpoint: string, file: any): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('photo', {
                uri: file.uri,
                type: file.type || 'image/jpeg',
                name: file.fileName || `image_${Date.now()}.jpg`,
            } as any);

            const response = await apiClient.post<{ url: string }>(endpoint, formData, {
                headers: { Accept: 'application/json' },
            });

            return response.data.url;
        } catch (error) {
            console.error(`Error uploading to ${endpoint}:`, error);
            throw new Error(getApiErrorMessage(error, 'Upload failed'));
        }
    }

    // ==================== UPLOAD ENDPOINTS ====================

    async uploadShopLogo(file: any): Promise<string> {
        return this.uploadFile('/shops/upload-logo', file);
    }

    async uploadShopCover(file: any): Promise<string> {
        return this.uploadFile('/shops/upload-cover', file);
    }

    async uploadProductImage(file: any): Promise<string> {
        return this.uploadFile('/products/upload-photo', file);
    }

    // ==================== SHOP ENDPOINTS ====================

    async getShops(filters?: ShopFilters): Promise<{ shops: Shop[], total: number, page: number, totalPages: number }> {
        try {
            const godModeParams = await getGodModeQueryParams();
            const response = await apiClient.get('/shops', { params: { ...(filters || {}), ...godModeParams } });
            return response.data;
        } catch (error) {
            console.error('Error fetching shops:', error);
            throw error;
        }
    }

    async getShop(id: number): Promise<Shop> {
        try {
            const response = await apiClient.get(`/shops/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching shop ${id}:`, error);
            throw error;
        }
    }

    async getShopBySlug(slug: string): Promise<Shop> {
        try {
            const response = await apiClient.get(`/shops/slug/${slug}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching shop by slug ${slug}:`, error);
            throw error;
        }
    }

    async getShopCategories(): Promise<ShopCategoryConfig[]> {
        try {
            const response = await apiClient.get('/shops/categories');
            return response.data;
        } catch (error) {
            console.error('Error fetching shop categories:', error);
            throw error;
        }
    }

    // ==================== SELLER ENDPOINTS ====================

    async getMyShop(): Promise<{ hasShop: boolean, shop?: Shop }> {
        try {
            const response = await apiClient.get('/shops/my');
            return response.data;
        } catch (error: any) {
            if ((error as AxiosError)?.response?.status === 404) {
                return { hasShop: false };
            }
            console.error('Error fetching my shop:', error);
            throw error;
        }
    }

    async canCreateShop(): Promise<{ canCreate: boolean, reason?: string, message?: string }> {
        try {
            const response = await apiClient.get('/shops/can-create');
            return response.data;
        } catch (error) {
            console.error('Error checking create shop permission:', error);
            throw error;
        }
    }

    async createShop(data: ShopFormData): Promise<{ id: number, slug: string, message: string }> {
        try {
            const response = await apiClient.post('/shops', data);
            return response.data;
        } catch (error) {
            console.error('Error creating shop:', error);
            throw error;
        }
    }

    async updateShop(id: number, data: Partial<ShopFormData>): Promise<{ success: boolean, shop: Shop }> {
        try {
            const response = await apiClient.put(`/shops/${id}`, data);
            return response.data;
        } catch (error) {
            console.error(`Error updating shop ${id}:`, error);
            throw error;
        }
    }

    async getSellerStats(): Promise<ShopStats> {
        try {
            const response = await apiClient.get('/shops/seller/stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching seller stats:', error);
            throw error;
        }
    }

    // ==================== PRODUCT ENDPOINTS ====================

    async getProducts(filters?: ProductFilters): Promise<{ products: Product[], total: number, page: number, totalPages: number }> {
        try {
            const godModeParams = await getGodModeQueryParams();
            const response = await apiClient.get('/products', { params: { ...(filters || {}), ...godModeParams } });
            return response.data;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    }

    async getProduct(id: number): Promise<Product> {
        try {
            const response = await apiClient.get(`/products/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching product ${id}:`, error);
            throw error;
        }
    }

    async getShopProducts(shopId: number, page = 1, limit = 20): Promise<{ products: Product[], total: number, page: number, totalPages: number }> {
        try {
            const godModeParams = await getGodModeQueryParams();
            const response = await apiClient.get(`/shops/${shopId}/products`, { params: { page, limit, ...godModeParams } });
            return response.data;
        } catch (error) {
            console.error(`Error fetching products for shop ${shopId}:`, error);
            throw error;
        }
    }

    async getProductCategories(): Promise<ProductCategoryConfig[]> {
        try {
            const response = await apiClient.get('/products/categories');
            return response.data;
        } catch (error) {
            console.error('Error fetching product categories:', error);
            throw error;
        }
    }

    async getMyProducts(page = 1, limit = 20): Promise<{ products: Product[], total: number, page: number, totalPages: number }> {
        try {
            const response = await apiClient.get('/products/my', { params: { page, limit } });
            return response.data;
        } catch (error) {
            console.error('Error fetching my products:', error);
            throw error;
        }
    }

    async createProduct(data: ProductFormData): Promise<{ id: number, slug: string, message: string }> {
        try {
            const response = await apiClient.post('/products', data);
            return response.data;
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    }

    async updateProduct(id: number, data: Partial<ProductFormData>): Promise<{ success: boolean, product: Product }> {
        try {
            const response = await apiClient.put(`/products/${id}`, data);
            return response.data;
        } catch (error) {
            console.error(`Error updating product ${id}:`, error);
            throw error;
        }
    }

    async deleteProduct(id: number): Promise<void> {
        try {
            await apiClient.delete(`/products/${id}`);
        } catch (error) {
            console.error(`Error deleting product ${id}:`, error);
            throw error;
        }
    }

    async updateStock(productId: number, stock: number, variantId?: number): Promise<void> {
        try {
            await apiClient.put(`/products/${productId}/stock`, { stock, variantId });
        } catch (error) {
            console.error(`Error updating stock for product ${productId}:`, error);
            throw error;
        }
    }

    async toggleFavorite(id: number): Promise<{ isFavorite: boolean }> {
        try {
            const response = await apiClient.post(`/products/${id}/favorite`, {});
            return response.data;
        } catch (error) {
            console.error(`Error toggling favorite for product ${id}:`, error);
            throw error;
        }
    }

    // ==================== REVIEW ENDPOINTS ====================

    async getProductReviews(productId: number, page = 1, limit = 10): Promise<{ reviews: any[], total: number, page: number }> {
        try {
            const response = await apiClient.get(`/products/${productId}/reviews`, { params: { page, limit } });
            return response.data;
        } catch (error) {
            console.error(`Error fetching reviews for product ${productId}:`, error);
            throw error;
        }
    }

    async addProductReview(productId: number, data: { rating: number, title?: string, comment?: string }): Promise<any> {
        try {
            const response = await apiClient.post(`/products/${productId}/reviews`, data);
            return response.data;
        } catch (error) {
            console.error(`Error adding review for product ${productId}:`, error);
            throw error;
        }
    }

    // ==================== ORDER ENDPOINTS ====================

    async createOrder(data: OrderCreateData): Promise<{ orderId: number, orderNumber: string, message: string }> {
        try {
            const response = await apiClient.post('/orders', data);
            return response.data;
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }

    async createOrderFromChannel(
        data: OrderCreateData,
        attribution: { source?: string; sourcePostId?: number; sourceChannelId?: number } = {}
    ): Promise<{ orderId: number, orderNumber: string, message: string }> {
        const payload: OrderCreateData = {
            ...data,
            source: attribution.source ?? data.source ?? 'channel_post',
            sourcePostId: attribution.sourcePostId ?? data.sourcePostId,
            sourceChannelId: attribution.sourceChannelId ?? data.sourceChannelId,
        };
        return this.createOrder(payload);
    }

    async getMyOrders(
        page = 1,
        limit = 20,
        status?: OrderStatus,
        extraFilters: { source?: string; sourcePostId?: number; sourceChannelId?: number } = {}
    ): Promise<{ orders: Order[], total: number, page: number, totalPages: number }> {
        try {
            const response = await apiClient.get('/orders/my', {
                params: { page, limit, status, ...extraFilters },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching my orders:', error);
            throw error;
        }
    }

    async getOrder(id: number): Promise<Order> {
        try {
            const response = await apiClient.get(`/orders/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching order ${id}:`, error);
            throw error;
        }
    }

    async cancelOrder(id: number, reason: string): Promise<{ success: boolean, order: Order }> {
        try {
            const response = await apiClient.post(`/orders/${id}/cancel`, { reason });
            return response.data;
        } catch (error) {
            console.error(`Error cancelling order ${id}:`, error);
            throw error;
        }
    }

    // Seller order endpoints
    async getSellerOrders(
        page = 1,
        limit = 20,
        status?: OrderStatus,
        extraFilters: { source?: string; sourcePostId?: number; sourceChannelId?: number } = {}
    ): Promise<{ orders: Order[], total: number, page: number, totalPages: number }> {
        try {
            const response = await apiClient.get('/orders/seller', {
                params: { page, limit, status, ...extraFilters },
            });
            return response.data;
        } catch (error: any) {
            const statusCode = typeof error?.response?.status === 'number' ? error.response.status : 'n/a';
            const responseData = error?.response?.data;
            const details = typeof responseData === 'string'
                ? responseData.trim()
                : typeof responseData?.error === 'string'
                    ? responseData.error
                    : typeof responseData?.message === 'string'
                        ? responseData.message
                        : (error?.message || 'Unknown error');
            const logMessage = `[SellerOrders] fetch failed (status=${statusCode}): ${details}`;
            if (__DEV__) {
                console.log(logMessage);
            } else {
                console.warn(logMessage);
            }
            throw error;
        }
    }

    async updateOrderStatus(id: number, status: OrderStatus): Promise<{ success: boolean, order: Order }> {
        try {
            const response = await apiClient.put(`/orders/${id}/status`, { status });
            return response.data;
        } catch (error) {
            console.error(`Error updating order ${id} status:`, error);
            throw error;
        }
    }

    async contactBuyer(orderId: number): Promise<{ buyerId: number, buyerName: string, deepLink: string }> {
        try {
            const response = await apiClient.get(`/orders/${orderId}/contact-buyer`);
            return response.data;
        } catch (error) {
            console.error(`Error getting buyer contact for order ${orderId}:`, error);
            throw error;
        }
    }
}

export const marketService = new MarketService();
