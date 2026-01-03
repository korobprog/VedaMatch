import { API_PATH } from '../config/api.config';

export interface LocationData {
	country: string;
	city: string;
	latitude?: number;
	longitude?: number;
}

export const profileService = {
	updateLocation: async (userId: number, location: LocationData) => {
		const response = await fetch(`${API_PATH}/update-location/${userId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(location),
		});
		if (!response.ok) throw new Error('Failed to update location');
		return response.json();
	},
};
