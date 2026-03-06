import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import apiClient from '../lib/apiClient';
import i18n from '../i18n';

interface LocationData {
	country: string;
	city: string;
	latitude: number;
	longitude: number;
}

const getGeoCopy = () => {
	const language = String(i18n.language || '').trim().toLowerCase();
	if (language.startsWith('ru')) {
		return {
			locationPermissionDenied: 'Доступ к геолокации запрещён',
			locationPermissionTitle: 'Разрешение на геолокацию',
			locationPermissionMessage: 'Приложению нужен доступ к вашей геолокации, чтобы находить людей и места рядом.',
			askLater: 'Позже',
			cancel: 'Отмена',
			ok: 'OK',
			unknownLocation: 'Неизвестное место',
		};
	}
	if (language.startsWith('hi')) {
		return {
			locationPermissionDenied: 'लोकेशन की अनुमति अस्वीकृत है',
			locationPermissionTitle: 'लोकेशन अनुमति',
			locationPermissionMessage: 'नज़दीकी लोगों और स्थानों को खोजने के लिए ऐप को आपकी लोकेशन चाहिए।',
			askLater: 'बाद में पूछें',
			cancel: 'रद्द करें',
			ok: 'ठीक है',
			unknownLocation: 'अज्ञात स्थान',
		};
	}
	return {
		locationPermissionDenied: 'Location permission denied',
		locationPermissionTitle: 'Location Permission',
		locationPermissionMessage: 'The app needs access to your location to find nearby users and places.',
		askLater: 'Ask Me Later',
		cancel: 'Cancel',
		ok: 'OK',
		unknownLocation: 'Unknown location',
	};
};

export const geoLocationService = {
	async detectLocation(): Promise<LocationData | null> {
		const hasPermission = await this.requestLocationPermission();
		if (!hasPermission) {
			throw new Error(getGeoCopy().locationPermissionDenied);
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
			const copy = getGeoCopy();
			const granted = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
				{
					title: copy.locationPermissionTitle,
					message: copy.locationPermissionMessage,
					buttonNeutral: copy.askLater,
					buttonNegative: copy.cancel,
					buttonPositive: copy.ok,
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
			const response = await apiClient.get('https://nominatim.openstreetmap.org/reverse', {
				params: {
					format: 'json',
					lat,
					lon,
					zoom: 10,
					addressdetails: 1,
				},
				headers: {
					'User-Agent': 'RagAgent/1.0', // Nominatim requires User-Agent
					'Accept-Language': 'en-US,en;q=0.9',
				},
				timeout: 7000,
				...({ __skipAuthSession: true } as any),
			});
			const data = response.data || {};
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
		_radiusKm: number = 50
	): Promise<number[]> {
		// Базовый фильтр по координатам
		// На сервере будет более точный расчет
		const userIDs: number[] = [];
		return userIDs;
	},

	async searchLocation(query: string): Promise<LocationData[]> {
		try {
			const response = await apiClient.get('https://nominatim.openstreetmap.org/search', {
				params: {
					format: 'json',
					q: query,
					addressdetails: 1,
					limit: 5,
				},
				headers: {
					'User-Agent': 'RagAgent/1.0',
					'Accept-Language': 'en-US,en;q=0.9',
				},
				timeout: 7000,
				...({ __skipAuthSession: true } as any),
			});
			const data = response.data;

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
			return getGeoCopy().unknownLocation;
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
