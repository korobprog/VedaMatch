import { API_PATH } from '../config/api.config';

interface NearbyUsersRequest {
	latitude: number;
	longitude: number;
	radiusKm?: number;
}

interface UserWithDistance {
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
		const response = await fetch(`${API_PATH}/location/nearby`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				latitude,
				longitude,
				radiusKm,
			}),
		});
		if (!response.ok) throw new Error('Failed to fetch nearby users');
		return response.json();
	},

	async searchByCity(city: string): Promise<{ users: any[]; count: number }> {
		const response = await fetch(`${API_PATH}/location/by-city?city=${encodeURIComponent(city)}`);
		if (!response.ok) throw new Error('Failed to search by city');
		return response.json();
	},

	async getUsersByCountry(country: string): Promise<{ users: any[]; count: number }> {
		const response = await fetch(`${API_PATH}/location/by-country?country=${encodeURIComponent(country)}`);
		if (!response.ok) throw new Error('Failed to fetch users by country');
		return response.json();
	},

	formatDistance(km: number): string {
		if (km < 1) {
			return `${Math.round(km * 1000)} m`;
		}
		return `${km.toFixed(1)} km`;
	},
};
