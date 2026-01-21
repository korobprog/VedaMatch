import { PermissionsAndroid, Platform, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

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
		const hasPermission = await this.requestLocationPermission();
		if (!hasPermission) {
			throw new Error('Location permission denied');
		}

		return new Promise((resolve, reject) => {
			Geolocation.getCurrentPosition(
				async (position) => {
					const { latitude, longitude } = position.coords;
					try {
						const locationData = await this.reverseGeocode(latitude, longitude);
						resolve(locationData);
					} catch (error) {
						console.error('Reverse geocoding failed, returning coords only', error);
						resolve({
							country: '',
							city: '',
							latitude,
							longitude,
						});
					}
				},
				(error) => {
					console.error('Geolocation error:', error);
					reject(new Error(error.message));
				},
				{ enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
			);
		});
	},

	async requestLocationPermission(): Promise<boolean> {
		if (Platform.OS === 'ios') {
			Geolocation.requestAuthorization();
			return true; // iOS permissions are handled by the OS prompt flow mostly
		}

		try {
			const granted = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
				{
					title: 'Location Permission',
					message: 'App needs access to your location to find nearby users and places.',
					buttonNeutral: 'Ask Me Later',
					buttonNegative: 'Cancel',
					buttonPositive: 'OK',
				}
			);
			return granted === PermissionsAndroid.RESULTS.GRANTED;
		} catch (err) {
			console.warn(err);
			return false;
		}
	},

	async reverseGeocode(lat: number, lon: number): Promise<LocationData> {
		try {
			const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'RagAgent/1.0', // Nominatim requires User-Agent
					'Accept-Language': 'en-US,en;q=0.9',
				}
			});

			if (!response.ok) throw new Error('Network response was not ok');

			const data = await response.json();
			const address = data.address || {};

			// Try to find city in various fields
			const city = address.city || address.town || address.village || address.municipality || address.state_district || '';
			const country = address.country || '';

			return {
				country,
				city,
				latitude: lat,
				longitude: lon
			};
		} catch (error) {
			console.error('Reverse geocode error:', error);
			throw error;
		}
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
					'User-Agent': 'RagAgent/1.0',
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
