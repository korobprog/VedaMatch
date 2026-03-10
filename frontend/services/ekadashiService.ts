import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';
import type { EkadashiCalendarResponse, EkadashiDay, EkadashiImportStatus, EkadashiOrganization, EkadashiPushPreference } from '../types/ekadashi';
import { EKADASHI_DEFAULT_ORGANIZATION_ID, EKADASHI_FALLBACK_ORGANIZATIONS } from '../utils/ekadashiCalendar';

const STORAGE_KEY_SELECTED_ORGANIZATION = 'ekadashi_selected_organization';

export const ekadashiService = {
    async getOrganizations(): Promise<EkadashiOrganization[]> {
        try {
            const response = await apiClient.get('/ekadashi/organizations');
            return response.data?.organizations || EKADASHI_FALLBACK_ORGANIZATIONS;
        } catch (error) {
            console.warn('Failed to load ekadashi organizations, using fallback list:', error);
            return EKADASHI_FALLBACK_ORGANIZATIONS;
        }
    },

    async getCalendar(params: {
        month: string;
        organizationId?: string;
        timezone?: string;
        city?: string;
        country?: string;
    }): Promise<EkadashiCalendarResponse> {
        const response = await apiClient.get('/ekadashi/calendar', { params });
        return response.data;
    },

    async getDay(params: {
        date: string;
        organizationId?: string;
        timezone?: string;
        city?: string;
        country?: string;
    }): Promise<EkadashiDay> {
        const response = await apiClient.get('/ekadashi/day', { params });
        return response.data;
    },

    async getImportStatus(params: {
        organizationId?: string;
        timezone?: string;
        city?: string;
        country?: string;
    }): Promise<EkadashiImportStatus> {
        const response = await apiClient.get('/ekadashi/import-status', { params });
        return response.data;
    },

    async getPushPreference(): Promise<EkadashiPushPreference> {
        const response = await apiClient.get('/ekadashi/push-preferences');
        return response.data;
    },

    async updatePushPreference(payload: Omit<EkadashiPushPreference, 'userId'>): Promise<EkadashiPushPreference> {
        const response = await apiClient.put('/ekadashi/push-preferences', payload);
        return response.data;
    },

    async getSelectedOrganizationId(): Promise<string> {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY_SELECTED_ORGANIZATION);
            return stored || EKADASHI_DEFAULT_ORGANIZATION_ID;
        } catch {
            return EKADASHI_DEFAULT_ORGANIZATION_ID;
        }
    },

    async setSelectedOrganizationId(organizationId: string): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEY_SELECTED_ORGANIZATION, organizationId || EKADASHI_DEFAULT_ORGANIZATION_ID);
    },
};
