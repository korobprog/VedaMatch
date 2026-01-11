import axios from 'axios';
import { API_PATH } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

class MarketService {
    private async getHeaders() {
        let token = await AsyncStorage.getItem('token');
        if (!token || token === 'undefined' || token === 'null') {
            token = await AsyncStorage.getItem('userToken');
        }

        const authHeader = (token && token !== 'undefined' && token !== 'null')
            ? `Bearer ${token}`
            : '';

        return {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
        };
    }

    private async uploadFile(endpoint: string, file: any): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('photo', {
                uri: file.uri,
                type: file.type || 'image/jpeg',
                name: file.fileName || `image_${Date.now()}.jpg`,
            } as any);

            let token = await AsyncStorage.getItem('token');
            if (!token || token === 'undefined' || token === 'null') {
                token = await AsyncStorage.getItem('userToken');
            }

            const response = await fetch(`${API_PATH}${endpoint}`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error(`Error uploading to ${endpoint}:`, error);
            throw error;
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
            const response = await axios.get(`${API_PATH}/shops`, { params: filters });
            return response.data;
        } catch (error) {
            console.error('Error fetching shops:', error);
            throw error;
        }
    }

    async getShop(id: number): Promise<Shop> {
        try {
            const response = await axios.get(`${API_PATH}/shops/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching shop ${id}:`, error);
            throw error;
        }
    }

    async getShopBySlug(slug: string): Promise<Shop> {
        try {
            const response = await axios.get(`${API_PATH}/shops/slug/${slug}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching shop by slug ${slug}:`, error);
            throw error;
        }
    }

    async getShopCategories(): Promise<ShopCategoryConfig[]> {
        try {
            const response = await axios.get(`${API_PATH}/shops/categories`);
            return response.data;
        } catch (error) {
            console.error('Error fetching shop categories:', error);
            throw error;
        }
    }

    // ==================== SELLER ENDPOINTS ====================

    async getMyShop(): Promise<{ hasShop: boolean, shop?: Shop }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/shops/my`, { headers });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return { hasShop: false };
            }
            console.error('Error fetching my shop:', error);
            throw error;
        }
    }

    async canCreateShop(): Promise<{ canCreate: boolean, reason?: string, message?: string }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/shops/can-create`, { headers });
            return response.data;
        } catch (error) {
            console.error('Error checking create shop permission:', error);
            throw error;
        }
    }

    async createShop(data: ShopFormData): Promise<{ id: number, slug: string, message: string }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/shops`, data, { headers });
            return response.data;
        } catch (error) {
            console.error('Error creating shop:', error);
            throw error;
        }
    }

    async updateShop(id: number, data: Partial<ShopFormData>): Promise<{ success: boolean, shop: Shop }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.put(`${API_PATH}/shops/${id}`, data, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error updating shop ${id}:`, error);
            throw error;
        }
    }

    async getSellerStats(): Promise<ShopStats> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/shops/seller/stats`, { headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching seller stats:', error);
            throw error;
        }
    }

    // ==================== PRODUCT ENDPOINTS ====================

    async getProducts(filters?: ProductFilters): Promise<{ products: Product[], total: number, page: number, totalPages: number }> {
        try {
            const response = await axios.get(`${API_PATH}/products`, { params: filters });
            return response.data;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    }

    async getProduct(id: number): Promise<Product> {
        try {
            const response = await axios.get(`${API_PATH}/products/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching product ${id}:`, error);
            throw error;
        }
    }

    async getShopProducts(shopId: number, page = 1, limit = 20): Promise<{ products: Product[], total: number, page: number, totalPages: number }> {
        try {
            const response = await axios.get(`${API_PATH}/shops/${shopId}/products`, { params: { page, limit } });
            return response.data;
        } catch (error) {
            console.error(`Error fetching products for shop ${shopId}:`, error);
            throw error;
        }
    }

    async getProductCategories(): Promise<ProductCategoryConfig[]> {
        try {
            const response = await axios.get(`${API_PATH}/products/categories`);
            return response.data;
        } catch (error) {
            console.error('Error fetching product categories:', error);
            throw error;
        }
    }

    async getMyProducts(page = 1, limit = 20): Promise<{ products: Product[], total: number, page: number, totalPages: number }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/products/my`, { params: { page, limit }, headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching my products:', error);
            throw error;
        }
    }

    async createProduct(data: ProductFormData): Promise<{ id: number, slug: string, message: string }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/products`, data, { headers });
            return response.data;
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    }

    async updateProduct(id: number, data: Partial<ProductFormData>): Promise<{ success: boolean, product: Product }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.put(`${API_PATH}/products/${id}`, data, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error updating product ${id}:`, error);
            throw error;
        }
    }

    async deleteProduct(id: number): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.delete(`${API_PATH}/products/${id}`, { headers });
        } catch (error) {
            console.error(`Error deleting product ${id}:`, error);
            throw error;
        }
    }

    async updateStock(productId: number, stock: number, variantId?: number): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.put(`${API_PATH}/products/${productId}/stock`, { stock, variantId }, { headers });
        } catch (error) {
            console.error(`Error updating stock for product ${productId}:`, error);
            throw error;
        }
    }

    async toggleFavorite(id: number): Promise<{ isFavorite: boolean }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/products/${id}/favorite`, {}, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error toggling favorite for product ${id}:`, error);
            throw error;
        }
    }

    // ==================== REVIEW ENDPOINTS ====================

    async getProductReviews(productId: number, page = 1, limit = 10): Promise<{ reviews: any[], total: number, page: number }> {
        try {
            const response = await axios.get(`${API_PATH}/products/${productId}/reviews`, { params: { page, limit } });
            return response.data;
        } catch (error) {
            console.error(`Error fetching reviews for product ${productId}:`, error);
            throw error;
        }
    }

    async addProductReview(productId: number, data: { rating: number, title?: string, comment?: string }): Promise<any> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/products/${productId}/reviews`, data, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error adding review for product ${productId}:`, error);
            throw error;
        }
    }

    // ==================== ORDER ENDPOINTS ====================

    async createOrder(data: OrderCreateData): Promise<{ orderId: number, orderNumber: string, message: string }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/orders`, data, { headers });
            return response.data;
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }

    async getMyOrders(page = 1, limit = 20, status?: OrderStatus): Promise<{ orders: Order[], total: number, page: number, totalPages: number }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/orders/my`, { params: { page, limit, status }, headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching my orders:', error);
            throw error;
        }
    }

    async getOrder(id: number): Promise<Order> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/orders/${id}`, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching order ${id}:`, error);
            throw error;
        }
    }

    async cancelOrder(id: number, reason: string): Promise<{ success: boolean, order: Order }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/orders/${id}/cancel`, { reason }, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error cancelling order ${id}:`, error);
            throw error;
        }
    }

    // Seller order endpoints
    async getSellerOrders(page = 1, limit = 20, status?: OrderStatus): Promise<{ orders: Order[], total: number, page: number, totalPages: number }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/orders/seller`, { params: { page, limit, status }, headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching seller orders:', error);
            throw error;
        }
    }

    async updateOrderStatus(id: number, status: OrderStatus): Promise<{ success: boolean, order: Order }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.put(`${API_PATH}/orders/${id}/status`, { status }, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error updating order ${id} status:`, error);
            throw error;
        }
    }

    async contactBuyer(orderId: number): Promise<{ buyerId: number, buyerName: string, deepLink: string }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/orders/${orderId}/contact-buyer`, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error getting buyer contact for order ${orderId}:`, error);
            throw error;
        }
    }
}

export const marketService = new MarketService();
