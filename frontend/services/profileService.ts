import { API_PATH } from '../config/api.config';
import { getAuthHeaders } from './contactService';
import { authorizedFetch } from './authSessionService';

export interface LocationData {
	country: string;
	city: string;
	latitude?: number;
	longitude?: number;
}

export const profileService = {
	updateLocation: async (userId: number, location: LocationData) => {
		const headers = await getAuthHeaders();
		const response = await authorizedFetch(`${API_PATH}/update-location`, { // API group /api/ with Protected middleware uses /update-location, not /update-location/:userId
			method: 'PUT',
			headers,
			body: JSON.stringify(location),
		});
		if (response.status === 401) {
			console.error('[profileService] Unauthorized: Session expired or invalid token');
			throw new Error('UNAUTHORIZED');
		}
		if (!response.ok) throw new Error('Failed to update location');
		return response.json();
	},
};
