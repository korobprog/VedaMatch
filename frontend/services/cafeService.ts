import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_PATH } from '../config/api.config';
import {
    Cafe, CafeFilters, CafeCategory, Dish, DishFilters,
    DishModifier, DishIngredient, CafeTable, CafeOrder,
    CafeOrderStatus, CafeOrderType, CafeOrderCreateData,
    CafeOrderFilters, ActiveOrdersResponse, OrderStatsResponse,
    MenuResponse, QRCodeScanResult, WaiterCallReason
} from '../types/cafe';

class CafeService {
    getImageUrl(path: string | null): string {
        if (!path) return 'https://via.placeholder.com/400x200';
        if (path.startsWith('http')) return path;
        return `${API_PATH}${path.startsWith('/') ? '' : '/'}${path}`.replace('/api/', '/');
    }

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

    // ==================== CAFE ENDPOINTS ====================

    async getCafes(filters?: CafeFilters): Promise<{ cafes: Cafe[], total: number, page: number, totalPages: number }> {
        try {
            const response = await axios.get(`${API_PATH}/cafes`, { params: filters });
            const data = response.data;

            // Normalize cafe data to handle potential field name variations from backend
            const normalizedCafes = (data.cafes || []).map((cafe: any) => ({
                ...cafe,
                // Handle both 'ID' (GORM default) and 'id' (expected by frontend)
                id: cafe.id ?? cafe.ID ?? 0,
                // Ensure rating and reviewsCount have default values
                rating: cafe.rating ?? 0,
                reviewsCount: cafe.reviewsCount ?? 0,
                ordersCount: cafe.ordersCount ?? 0,
                avgPrepTime: cafe.avgPrepTime ?? 0,
            }));

            return {
                cafes: normalizedCafes,
                total: data.total ?? 0,
                page: data.page ?? 1,
                totalPages: data.totalPages ?? 1,
            };
        } catch (error) {
            console.error('Error fetching cafes:', error);
            throw error;
        }
    }

    async getCafe(id: number): Promise<Cafe> {
        try {
            const response = await axios.get(`${API_PATH}/cafes/${id}`);
            const cafe = response.data;

            // Normalize cafe data to handle potential field name variations from backend
            return {
                ...cafe,
                // Handle both 'ID' (GORM default) and 'id' (expected by frontend)
                id: cafe.id ?? cafe.ID ?? id,
                rating: cafe.rating ?? 0,
                reviewsCount: cafe.reviewsCount ?? 0,
                ordersCount: cafe.ordersCount ?? 0,
                avgPrepTime: cafe.avgPrepTime ?? 0,
            };
        } catch (error) {
            console.error(`Error fetching cafe ${id}:`, error);
            throw error;
        }
    }

    // Alias for getCafe
    async getCafeById(id: number): Promise<Cafe> {
        return this.getCafe(id);
    }

    async getCafeBySlug(slug: string): Promise<Cafe> {
        try {
            const response = await axios.get(`${API_PATH}/cafes/slug/${slug}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching cafe by slug ${slug}:`, error);
            throw error;
        }
    }

    async getMyCafe(): Promise<{ cafe: Cafe; hasCafe: boolean }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/cafes/my`, { headers });
            const data = response.data;

            // Normalize cafe data to handle potential field name variations from backend
            if (data.hasCafe && data.cafe) {
                const normalizedCafe = {
                    ...data.cafe,
                    // Handle both 'ID' (GORM default) and 'id' (expected by frontend)
                    id: data.cafe.id ?? data.cafe.ID ?? 0,
                    rating: data.cafe.rating ?? 0,
                    reviewsCount: data.cafe.reviewsCount ?? 0,
                    ordersCount: data.cafe.ordersCount ?? 0,
                    avgPrepTime: data.cafe.avgPrepTime ?? 0,
                };
                return { cafe: normalizedCafe, hasCafe: true };
            }

            return { cafe: {} as Cafe, hasCafe: false };
        } catch (error: any) {
            if (error.response?.status === 404) {
                return { cafe: {} as Cafe, hasCafe: false };
            }
            console.error('Error fetching my cafe:', error);
            throw error;
        }
    }

    async createCafe(data: any): Promise<Cafe> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/cafes`, data, { headers });
            return response.data;
        } catch (error) {
            console.error('Error creating cafe:', error);
            throw error;
        }
    }

    async updateCafe(id: number, data: any): Promise<Cafe> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.put(`${API_PATH}/cafes/${id}`, data, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error updating cafe ${id}:`, error);
            throw error;
        }
    }

    async deleteCafe(id: number): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.delete(`${API_PATH}/cafes/${id}`, { headers });
        } catch (error) {
            console.error(`Error deleting cafe ${id}:`, error);
            throw error;
        }
    }

    async uploadLogo(asset: any): Promise<string> {
        try {
            const currentHeaders = await this.getHeaders();
            const formData = new FormData();
            formData.append('file', {
                uri: asset.uri,
                type: asset.type || 'image/jpeg',
                name: asset.fileName || 'logo.jpg',
            } as any);

            const response = await axios.post(`${API_PATH}/shops/upload-logo`, formData, {
                headers: {
                    ...currentHeaders,
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data.url;
        } catch (error) {
            console.error('Error uploading cafe logo:', error);
            throw error;
        }
    }

    async uploadCover(asset: any): Promise<string> {
        try {
            const currentHeaders = await this.getHeaders();
            const formData = new FormData();
            formData.append('file', {
                uri: asset.uri,
                type: asset.type || 'image/jpeg',
                name: asset.fileName || 'cover.jpg',
            } as any);

            const response = await axios.post(`${API_PATH}/shops/upload-cover`, formData, {
                headers: {
                    ...currentHeaders,
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data.url;
        } catch (error) {
            console.error('Error uploading cafe cover:', error);
            throw error;
        }
    }

    // ==================== MENU ENDPOINTS ====================

    async getMenu(cafeId: number): Promise<MenuResponse> {
        try {
            const response = await axios.get(`${API_PATH}/cafes/${cafeId}/menu`);
            const data = response.data;

            // Normalize categories and dishes IDs
            if (data && data.categories) {
                data.categories = data.categories.map((cat: any) => ({
                    ...cat,
                    id: cat.id ?? cat.ID ?? 0,
                    dishes: (cat.dishes || []).map((dish: any) => ({
                        ...dish,
                        id: dish.id ?? dish.ID ?? 0,
                        price: typeof dish.price === 'string' ? parseFloat(dish.price) : dish.price,
                    }))
                }));
            }

            return data;
        } catch (error) {
            console.error(`Error fetching menu for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async getCategories(cafeId: number): Promise<CafeCategory[]> {
        try {
            const response = await axios.get(`${API_PATH}/cafes/${cafeId}/categories`);
            const data = response.data || [];
            return data.map((cat: any) => ({
                ...cat,
                id: cat.id ?? cat.ID ?? 0,
            }));
        } catch (error) {
            console.error(`Error fetching categories for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async getDishes(cafeId: number, filters?: DishFilters): Promise<{ dishes: Dish[], total: number, page: number, totalPages: number }> {
        try {
            const response = await axios.get(`${API_PATH}/cafes/${cafeId}/dishes`, { params: filters });
            const data = response.data;
            if (data && data.dishes) {
                data.dishes = data.dishes.map((dish: any) => ({
                    ...dish,
                    id: dish.id ?? dish.ID ?? 0,
                    price: typeof dish.price === 'string' ? parseFloat(dish.price) : dish.price,
                }));
            }
            return data;
        } catch (error) {
            console.error(`Error fetching dishes for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async getDish(cafeId: number, dishId: number): Promise<Dish> {
        try {
            const response = await axios.get(`${API_PATH}/cafes/${cafeId}/dishes/${dishId}`);
            const data = response.data;
            if (data) {
                return {
                    ...data,
                    id: data.id ?? data.ID ?? dishId,
                    price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
                };
            }
            return data;
        } catch (error) {
            console.error(`Error fetching dish ${dishId}:`, error);
            throw error;
        }
    }

    async getFeaturedDishes(cafeId: number, limit = 10): Promise<Dish[]> {
        try {
            const response = await axios.get(`${API_PATH}/cafes/${cafeId}/featured`, { params: { limit } });
            return response.data;
        } catch (error) {
            console.error(`Error fetching featured dishes for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    // ==================== TABLE & QR ENDPOINTS ====================

    async getTables(cafeId: number): Promise<CafeTable[]> {
        try {
            const response = await axios.get(`${API_PATH}/cafes/${cafeId}/tables`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching tables for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async createTable(cafeId: number, data: Partial<CafeTable>): Promise<CafeTable> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/cafes/${cafeId}/tables`, data, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error creating table for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async updateTable(cafeId: number, tableId: number, data: Partial<CafeTable>): Promise<CafeTable> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.put(`${API_PATH}/cafes/${cafeId}/tables/${tableId}`, data, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error updating table ${tableId} for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async deleteTable(cafeId: number, tableId: number): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.delete(`${API_PATH}/cafes/${cafeId}/tables/${tableId}`, { headers });
        } catch (error) {
            console.error(`Error deleting table ${tableId} for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async updateFloorLayout(cafeId: number, tables: any[]): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.put(`${API_PATH}/cafes/${cafeId}/floor-layout`, { tables }, { headers });
        } catch (error) {
            console.error(`Error updating floor layout for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async scanQRCode(qrCode: string): Promise<QRCodeScanResult> {
        try {
            const response = await axios.get(`${API_PATH}/cafes/scan/${qrCode}`);
            return response.data;
        } catch (error) {
            console.error(`Error scanning QR code ${qrCode}:`, error);
            throw error;
        }
    }

    // ==================== ORDER ENDPOINTS ====================

    async createOrder(data: CafeOrderCreateData): Promise<CafeOrder> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/cafe-orders`, data, { headers });
            return response.data;
        } catch (error) {
            console.error('Error creating cafe order:', error);
            throw error;
        }
    }

    async getOrder(orderId: number): Promise<CafeOrder> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/cafe-orders/${orderId}`, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching cafe order ${orderId}:`, error);
            throw error;
        }
    }

    async getMyOrders(limit = 10): Promise<CafeOrder[]> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/cafe-orders/my`, { params: { limit }, headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching my cafe orders:', error);
            throw error;
        }
    }

    async cancelOrder(orderId: number, reason: string): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.post(`${API_PATH}/cafe-orders/${orderId}/cancel`, { reason }, { headers });
        } catch (error) {
            console.error(`Error cancelling cafe order ${orderId}:`, error);
            throw error;
        }
    }

    async repeatOrder(orderId: number): Promise<CafeOrder> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/cafe-orders/${orderId}/repeat`, {}, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error repeating cafe order ${orderId}:`, error);
            throw error;
        }
    }

    // ==================== WAITER CALL ====================

    async callWaiter(cafeId: number, tableId: number, reason: WaiterCallReason, note?: string): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.post(`${API_PATH}/cafes/${cafeId}/waiter-call`, { tableId, reason, note }, { headers });
        } catch (error) {
            console.error('Error calling waiter:', error);
            throw error;
        }
    }

    // ==================== STAFF ENDPOINTS ====================

    async getCafeOrders(cafeId: number, filters?: CafeOrderFilters): Promise<{ orders: CafeOrder[], total: number, page: number, totalPages: number }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/cafes/${cafeId}/orders`, { params: filters, headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching orders for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async getActiveOrders(cafeId: number): Promise<ActiveOrdersResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/cafes/${cafeId}/orders/active`, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching active orders for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async getOrderStats(cafeId: number): Promise<OrderStatsResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/cafes/${cafeId}/orders/stats`, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching order stats for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async updateOrderStatus(orderId: number, status: CafeOrderStatus): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.put(`${API_PATH}/cafe-orders/${orderId}/status`, { status }, { headers });
        } catch (error) {
            console.error(`Error updating order ${orderId} status:`, error);
            throw error;
        }
    }

    async markOrderPaid(orderId: number, paymentMethod = 'cash'): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.post(`${API_PATH}/cafe-orders/${orderId}/pay`, { paymentMethod }, { headers });
        } catch (error) {
            console.error(`Error marking order ${orderId} as paid:`, error);
            throw error;
        }
    }

    async getWaiterCalls(cafeId: number): Promise<any[]> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/cafes/${cafeId}/waiter-calls`, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching waiter calls for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async acknowledgeWaiterCall(cafeId: number, callId: number): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.post(`${API_PATH}/cafes/${cafeId}/waiter-calls/${callId}/acknowledge`, {}, { headers });
        } catch (error) {
            console.error(`Error acknowledging waiter call ${callId}:`, error);
            throw error;
        }
    }

    async completeWaiterCall(cafeId: number, callId: number): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.post(`${API_PATH}/cafes/${cafeId}/waiter-calls/${callId}/complete`, {}, { headers });
        } catch (error) {
            console.error(`Error completing waiter call ${callId}:`, error);
            throw error;
        }
    }

    // ==================== STOP LIST (STAFF) ====================

    async getStopList(cafeId: number): Promise<Dish[]> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/cafes/${cafeId}/stop-list`, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching stop-list for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async updateStopList(cafeId: number, dishIds: number[], isAvailable: boolean): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.post(`${API_PATH}/cafes/${cafeId}/stop-list`, { dishIds, isAvailable }, { headers });
        } catch (error) {
            console.error(`Error updating stop-list for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    // ==================== CATEGORY MANAGEMENT ====================

    async createCategory(cafeId: number, data: Partial<CafeCategory>): Promise<CafeCategory> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/cafes/${cafeId}/categories`, data, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error creating category for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async updateCategory(cafeId: number, categoryId: number, data: Partial<CafeCategory>): Promise<CafeCategory> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.put(`${API_PATH}/cafes/${cafeId}/categories/${categoryId}`, data, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error updating category ${categoryId} for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async deleteCategory(cafeId: number, categoryId: number): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.delete(`${API_PATH}/cafes/${cafeId}/categories/${categoryId}`, { headers });
        } catch (error) {
            console.error(`Error deleting category ${categoryId} for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    // ==================== DISH MANAGEMENT ====================

    async createDish(cafeId: number, data: Partial<Dish>): Promise<Dish> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/cafes/${cafeId}/dishes`, data, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error creating dish for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async updateDish(cafeId: number, dishId: number, data: Partial<Dish>): Promise<Dish> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.put(`${API_PATH}/cafes/${cafeId}/dishes/${dishId}`, data, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error updating dish ${dishId} for cafe ${cafeId}:`, error);
            throw error;
        }
    }

    async deleteDish(cafeId: number, dishId: number): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.delete(`${API_PATH}/cafes/${cafeId}/dishes/${dishId}`, { headers });
        } catch (error) {
            console.error(`Error deleting dish ${dishId} for cafe ${cafeId}:`, error);
            throw error;
        }
    }
}

export const cafeService = new CafeService();
