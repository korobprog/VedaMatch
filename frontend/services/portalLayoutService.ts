// Portal Layout Service - Hybrid storage (AsyncStorage + Server)
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { PortalLayout, PortalFolder, PortalItem, PortalPage, PortalWidget, createDefaultLayout, DEFAULT_SERVICES } from '../types/portal';
import { API_PATH } from '../config/api.config';



const STORAGE_KEY = 'portal_layout';
const SYNC_DEBOUNCE_MS = 5000; // Sync to server after 5 seconds of inactivity

let syncTimeout: NodeJS.Timeout | null = null;

// Load layout from local storage (fast)
export const loadLocalLayout = async (): Promise<PortalLayout> => {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && stored !== 'undefined' && stored !== 'null') {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.warn('Failed to load portal layout from storage:', error);
    }
    return createDefaultLayout();
};

// Save layout to local storage (immediate)
export const saveLocalLayout = async (layout: PortalLayout): Promise<void> => {
    try {
        layout.lastModified = Date.now();
        layout.syncedWithServer = false;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(layout));

        // Debounced sync to server
        scheduleSyncToServer(layout);
    } catch (error) {
        console.error('Failed to save portal layout:', error);
    }
};

// Schedule sync to server (debounced)
const scheduleSyncToServer = (layout: PortalLayout) => {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    syncTimeout = setTimeout(() => {
        syncToServer(layout);
    }, SYNC_DEBOUNCE_MS);
};

// Get auth headers helper
const getAuthHeaders = async () => {
    let token = await AsyncStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
        token = await AsyncStorage.getItem('userToken');
    }
    return {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
    };
};

// Sync to server
const syncToServer = async (layout: PortalLayout): Promise<void> => {
    try {
        const headers = await getAuthHeaders();
        await axios.put(`${API_PATH}/user/portal-layout`, { layout }, { headers });
        layout.syncedWithServer = true;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
        console.log('Portal layout synced to server');
    } catch (error) {
        console.warn('Failed to sync portal layout to server:', error);
        // Will retry on next change
    }
};

// Fetch layout from server (on login)
export const fetchServerLayout = async (): Promise<PortalLayout | null> => {
    try {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_PATH}/user/portal-layout`, { headers });
        if (response.data?.layout) {
            return response.data.layout as PortalLayout;
        }
    } catch (error) {
        console.warn('Failed to fetch portal layout from server:', error);
    }
    return null;
};

// Ensure all default services are present in the layout
const ensureDefaultServices = (layout: PortalLayout): PortalLayout => {
    const existingServiceIds = new Set<string>();

    layout.pages.forEach(page => {
        page.items.forEach(item => {
            if (item.type === 'service') {
                existingServiceIds.add(item.serviceId);
            } else if (item.type === 'folder') {
                (item as PortalFolder).items.forEach(subItem => {
                    existingServiceIds.add(subItem.serviceId);
                });
            }
        });
    });

    let modified = false;
    const newItems: PortalItem[] = [];

    DEFAULT_SERVICES.forEach((service: any) => {
        if (!existingServiceIds.has(service.id)) {
            newItems.push({
                id: `item-${service.id}-${Date.now()}`,
                serviceId: service.id,
                type: 'service',
                position: 0,
            });
            modified = true;
        }
    });

    if (modified && layout.pages.length > 0) {
        const firstPage = layout.pages[0];
        const startPos = firstPage.items.length;
        newItems.forEach((item, index) => {
            item.position = startPos + index;
            firstPage.items.push(item);
        });
        layout.lastModified = Date.now();
        layout.syncedWithServer = false;
    }

    return layout;
};

// Merge local and server layouts (server wins if newer)
export const initializeLayout = async (): Promise<PortalLayout> => {
    let localLayout = await loadLocalLayout();

    try {
        const serverLayout = await fetchServerLayout();

        if (serverLayout) {
            // Server has newer data
            if (serverLayout.lastModified > localLayout.lastModified) {
                const updatedServer = ensureDefaultServices(serverLayout);
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedServer));
                return updatedServer;
            }
            // Local has unsync'd changes, sync them
            if (!localLayout.syncedWithServer) {
                syncToServer(localLayout);
            }
        }
    } catch (error) {
        console.warn('Server sync failed, using local layout');
    }

    const updatedLocal = ensureDefaultServices(localLayout);
    if (updatedLocal.lastModified !== localLayout.lastModified) {
        await saveLocalLayout(updatedLocal);
    }
    return updatedLocal;
};

// Helper: Create new folder
export const createFolder = (name: string, color: string, items: PortalItem[] = []): PortalFolder => ({
    id: `folder-${Date.now()}`,
    name,
    type: 'folder',
    color,
    items,
    position: 0,
});

// Helper: Create new page
export const createPage = (): PortalPage => ({
    id: `page-${Date.now()}`,
    items: [],
    widgets: [],
    order: 0,
});

// Helper: Add item to folder
export const addItemToFolder = (
    layout: PortalLayout,
    pageIndex: number,
    folderId: string,
    item: PortalItem
): PortalLayout => {
    const newLayout = { ...layout };
    const page = newLayout.pages[pageIndex];

    // Find folder FIRST before removing item
    const folder = page.items.find(i => i.id === folderId) as PortalFolder | undefined;

    if (folder && folder.type === 'folder') {
        console.log('[addItemToFolder] Found folder:', folderId, 'Adding item:', item.id);

        // Remove item from current position
        page.items = page.items.filter(i => i.id !== item.id);

        // Add item to folder
        folder.items.push({ ...item, position: folder.items.length });
        console.log('[addItemToFolder] Folder now has', folder.items.length, 'items');
    } else {
        console.log('[addItemToFolder] Folder not found:', folderId);
    }

    return newLayout;
};

// Helper: Remove item from folder
export const removeItemFromFolder = (
    layout: PortalLayout,
    pageIndex: number,
    folderId: string,
    itemId: string
): PortalLayout => {
    const newLayout = { ...layout };
    const page = newLayout.pages[pageIndex];

    const folder = page.items.find(i => i.id === folderId) as PortalFolder | undefined;
    if (folder && folder.type === 'folder') {
        const item = folder.items.find(i => i.id === itemId);
        if (item) {
            folder.items = folder.items.filter(i => i.id !== itemId);
            // Add item back to main grid
            page.items.push({ ...item, position: page.items.length });
        }
    }

    return newLayout;
};

// Helper: Reorder items
export const reorderItems = (
    layout: PortalLayout,
    pageIndex: number,
    fromIndex: number,
    toIndex: number
): PortalLayout => {
    const newLayout = { ...layout };
    const items = [...newLayout.pages[pageIndex].items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);

    // Update positions
    items.forEach((item, index) => {
        item.position = index;
    });

    newLayout.pages[pageIndex].items = items;
    return newLayout;
};

// Helper: Add widget
export const addWidget = (
    layout: PortalLayout,
    pageIndex: number,
    widget: PortalWidget
): PortalLayout => {
    const newLayout = { ...layout };
    newLayout.pages[pageIndex].widgets.push(widget);
    return newLayout;
};

// Helper: Remove widget
export const removeWidget = (
    layout: PortalLayout,
    pageIndex: number,
    widgetId: string
): PortalLayout => {
    const newLayout = { ...layout };
    newLayout.pages[pageIndex].widgets = newLayout.pages[pageIndex].widgets.filter(
        w => w.id !== widgetId
    );
    return newLayout;
};
