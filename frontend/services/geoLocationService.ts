import { PermissionsAndroid, Platform, Alert } from 'react-native';

interface LocationCoords {
	latitude: number;
	longitude: number;
}

interface LocationData {
	country: string;
	city: string;
	latitude?: number;
	longitude?: number;
}

export const geoLocationService = {
	async requestLocationPermission(): Promise<boolean> {
		if (Platform.OS === 'android') {
			try {
				const granted = await PermissionsAndroid.request(
					PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
					{
						title: 'Location Permission Required',
						message: 'We need your location to find devotees near you',
						buttonNeutral: 'Ask Me Later',
						buttonNegative: 'Cancel',
						buttonPositive: 'OK',
					}
				);
				return granted === PermissionsAndroid.RESULTS.GRANTED;
			} catch (err) {
				console.warn('Permission request error:', err);
				return false;
			}
		}
		return true;
	},

	async getCurrentPosition(): Promise<LocationCoords | null> {
		try {
			const hasPermission = await this.requestLocationPermission();
			if (!hasPermission) {
				return null;
			}

			return new Promise((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(
					(position) => {
						resolve({
							latitude: position.coords.latitude,
							longitude: position.coords.longitude,
						});
					},
					(error) => {
						console.warn('Geolocation error:', error.message);
						reject(error);
					},
					{
						enableHighAccuracy: true,
						timeout: 15000,
						maximumAge: 10000,
					}
				);
			});
		} catch (error) {
			console.error('Error getting position:', error);
			return null;
		}
	},

	async reverseGeocode(latitude: number, longitude: number): Promise<LocationData | null> {
		try {
			// Используем OpenStreetMap Nominatim API (бесплатный)
			const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;

			const response = await fetch(url, {
				headers: {
					'Accept-Language': 'en-US,en;q=0.9',
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data && data.address) {
				const address = data.address;
				let country = '';
				let city = '';

				// Определяем страну
				country = address.country || '';
				if (!country) {
					country = address.country_code || '';
				}

				// Определяем город (приоритет: city -> town -> village -> hamlet)
				city = address.city || address.town || address.village || address.hamlet || address.suburb || '';

				// Фоллбэк к округу/району если город не найден
				if (!city && address.county) {
					city = address.county;
				}

				return {
					country,
					city,
					latitude,
					longitude,
				};
			}

			return null;
		} catch (error: any) {
			console.error('Error reverse geocoding:', error);
			return null;
		}
	},

	async detectLocation(): Promise<LocationData | null> {
		try {
			const position = await this.getCurrentPosition();
			if (!position) {
				return null;
			}

			const location = await this.reverseGeocode(position.latitude, position.longitude);
			return location;
		} catch (error) {
			console.error('Error detecting location:', error);
			return null;
		}
	},

	async calculateDistance(
		lat1: number,
		lon1: number,
		lat2: number,
		lon2: number
	): Promise<number> {
		const R = 6371; // Радиус Земли в км
		const dLat = this.deg2rad(lat2 - lat1);
		const dLon = this.deg2rad(lon2 - lon1);

		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(this.deg2rad(lat1)) *
			Math.cos(this.deg2rad(lat2)) *
			Math.sin(dLon / 2) * Math.sin(dLon / 2);

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		const d = R * c;

		return d;
	},

	deg2rad(deg: number): number {
		return deg * (Math.PI / 180);
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
