import { PermissionsAndroid, Platform } from 'react-native';

interface LocationCoords {
	latitude: number;
	longitude: number;
}

interface LocationData {
	country: string;
	city: string;
	latitude: number;
	longitude: number;
}

export const geoLocationService = {
	async detectLocation(): Promise<LocationData | null> {
		// TODO: Restore lost implementation.
		// Requires a geolocation library or logic using PermissionsAndroid/navigator.geolocation
		return null;
	},

	async getNearbyUsers(
		userLat: number,
		userLon: number,
		radiusKm: number = 50
	): Promise<number[]> {
		// Базовый фильтр по координатам
		// На сервере будет более точный расчет
		const userIDs: number[] = [];

		return userIDs;
	},

	async searchLocation(query: string): Promise<LocationData[]> {
		try {
			// Поиск локации по названию
			const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`;

			const response = await fetch(url, {
				headers: {
					'Accept-Language': 'en-US,en;q=0.9',
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (Array.isArray(data)) {
				return data.map((item: any) => {
					const address = item.address || {};
					return {
						country: address.country || '',
						city: address.city || address.town || address.village || '',
						latitude: parseFloat(item.lat),
						longitude: parseFloat(item.lon),
					};
				});
			}

			return [];
		} catch (error: any) {
			console.error('Error searching location:', error);
			return [];
		}
	},

	formatLocation(location: LocationData): string {
		if (!location.city && !location.country) {
			return 'Unknown location';
		}
		if (!location.city) {
			return location.country;
		}
		if (!location.country) {
			return location.city;
		}
		return `${location.city}, ${location.country}`;
	},
};
