import apiClient from '../lib/apiClient';

interface NearbyUsersRequest {
	latitude: number;
	longitude: number;
	radiusKm?: number;
}

export interface UserWithDistance {
	ID: number;
	karmicName: string;
	spiritualName: string;
	email: string;
	avatarUrl: string;
	lastSeen: string;
	identity: string;
	city: string;
	country: string;
	latitude?: number;
	longitude?: number;
	distance: number;
}

export const nearbyService = {
	async getNearbyUsers(
		latitude: number,
		longitude: number,
		radiusKm: number = 50
	): Promise<{ users: UserWithDistance[]; count: number; radiusKm: number }> {
		const payload: NearbyUsersRequest = { latitude, longitude, radiusKm };
		const response = await apiClient.post('/location/nearby', payload);
		return response.data;
	},

	async searchByCity(city: string): Promise<{ users: any[]; count: number }> {
		const response = await apiClient.get('/location/by-city', {
			params: { city },
		});
		return response.data;
	},

	async getUsersByCountry(country: string): Promise<{ users: any[]; count: number }> {
		const response = await apiClient.get('/location/by-country', {
			params: { country },
		});
		return response.data;
	},

	formatDistance(km: number): string {
		if (km < 1) {
			return `${Math.round(km * 1000)} m`;
		}
		return `${km.toFixed(1)} km`;
	},
};
