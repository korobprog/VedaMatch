import apiClient from '../lib/apiClient';

export interface LocationData {
	country: string;
	city: string;
	latitude?: number;
	longitude?: number;
}

export const profileService = {
	updateLocation: async (_userId: number, location: LocationData) => {
		try {
			const response = await apiClient.put('/update-location', location); // API group /api/ with Protected middleware uses /update-location
			return response.data;
		} catch (error: any) {
			if (error?.response?.status === 401) {
				console.error('[profileService] Unauthorized: Session expired or invalid token');
				throw new Error('UNAUTHORIZED');
			}
			throw new Error('Failed to update location');
		}
	},
};
