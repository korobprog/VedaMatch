// Portal Layout Service - Hybrid storage (AsyncStorage + Server)
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { PortalLayout, PortalFolder, PortalItem, PortalPage, PortalWidget, createDefaultLayout, DEFAULT_SERVICES } from '../types/portal';
import { API_PATH } from '../config/api.config';
import { FALLBACK_PORTAL_BLUEPRINTS } from '../constants/portalRoles';
import { MathFilter, PortalBlueprint } from '../types/portalBlueprint';
import { getAccessToken } from './authSessionService';


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
    const token = await getAccessToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
};

const getDefaultQuickAccess = (): PortalItem[] => {
    const quickAccessIds = ['contacts', 'calls', 'groups'];
    return quickAccessIds.map((id, index) => ({
        id: `qa-${id}`,
        serviceId: id,
        type: 'service',
        position: index,
    }));
};

export const fetchPortalBlueprint = async (role?: string): Promise<PortalBlueprint> => {
    const normalizedRole = (role || 'user').toLowerCase();
    try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) {
            return FALLBACK_PORTAL_BLUEPRINTS[normalizedRole] || FALLBACK_PORTAL_BLUEPRINTS.user;
        }
        const response = await axios.get(`${API_PATH}/system/portal-blueprint/${normalizedRole}`, { headers });
        if (response.data?.blueprint) {
            return response.data.blueprint as PortalBlueprint;
        }
    } catch (error) {
        console.warn('Failed to fetch role blueprint, fallback to local map:', error);
    }
    return FALLBACK_PORTAL_BLUEPRINTS[normalizedRole] || FALLBACK_PORTAL_BLUEPRINTS.user;
};

export const fetchGodModeMathFilters = async (): Promise<MathFilter[]> => {
    try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) {
            return [];
        }
        const response = await axios.get(`${API_PATH}/system/god-mode-math-filters`, { headers });
        if (response.data?.mathFilters) {
            return response.data.mathFilters as MathFilter[];
        }
    } catch (error) {
        console.warn('Failed to fetch god-mode math filters:', error);
    }
    return [];
};

export const applyRoleBlueprint = (layout: PortalLayout, blueprint?: PortalBlueprint): PortalLayout => {
    if (!blueprint) return layout;

    const serviceIndex = new Map<string, number>();
    blueprint.heroServices.forEach((id, index) => serviceIndex.set(id, index));

    const newLayout: PortalLayout = {
        ...layout,
        pages: layout.pages.map((page) => ({
            ...page,
            items: [...page.items].sort((a, b) => {
                if (a.type !== 'service' || b.type !== 'service') return 0;
                const ai = serviceIndex.has(a.serviceId) ? serviceIndex.get(a.serviceId)! : 999;
                const bi = serviceIndex.has(b.serviceId) ? serviceIndex.get(b.serviceId)! : 999;
                if (ai !== bi) return ai - bi;
                return a.position - b.position;
            }).map((item, position) => ({ ...item, position })),
        })),
    };

    const quickAccess = blueprint.quickAccess
        .slice(0, 3)
        .map((serviceId, position) => ({
            id: `qa-${serviceId}`,
            serviceId,
            type: 'service' as const,
            position,
        }));

    newLayout.quickAccess = quickAccess.length > 0 ? quickAccess : getDefaultQuickAccess();
    return newLayout;
};

// Sync to server
const syncToServer = async (layout: PortalLayout): Promise<void> => {
    try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) {
            return;
        }
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
        if (!headers.Authorization) {
            return null;
        }
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

    // Check quick access
    if (layout.quickAccess) {
        layout.quickAccess.forEach(item => {
            existingServiceIds.add(item.serviceId);
        });
    }

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

// Handle migration for old layouts
const ensureQuickAccess = (layout: PortalLayout): PortalLayout => {
    if (!layout.quickAccess) {
        const quickAccessIds = ['contacts', 'calls', 'groups'];
        layout.quickAccess = quickAccessIds.map((id, index) => ({
            id: `qa-${id}`,
            serviceId: id,
            type: 'service' as const,
            position: index,
        }));

        // Remove these from pages to avoid duplicates
        layout.pages.forEach(page => {
            page.items = page.items.filter(item =>
                !(item.type === 'service' && quickAccessIds.includes(item.serviceId))
            );
        });
        layout.lastModified = Date.now();
    }
    return layout;
};

// Merge local and server layouts (server wins if newer)
export const initializeLayout = async (role?: string, blueprint?: PortalBlueprint): Promise<PortalLayout> => {
    let localLayout = await loadLocalLayout();

    try {
        const serverLayout = await fetchServerLayout();

        if (serverLayout) {
            // Server has newer data
            if (serverLayout.lastModified > localLayout.lastModified) {
                let updatedServer = ensureQuickAccess(serverLayout);
                updatedServer = ensureDefaultServices(updatedServer);
                updatedServer = applyRoleBlueprint(updatedServer, blueprint);
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

    let updatedLocal = ensureQuickAccess(localLayout);
    updatedLocal = ensureDefaultServices(updatedLocal);
    if (!blueprint && role) {
        blueprint = await fetchPortalBlueprint(role);
    }
    updatedLocal = applyRoleBlueprint(updatedLocal, blueprint);
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

        // Remove item from current position (could be in page or quick access)
        page.items = page.items.filter(i => i.id !== item.id);
        newLayout.quickAccess = newLayout.quickAccess.filter(i => i.id !== item.id);

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
    const newLayout: PortalLayout = {
        ...layout,
        pages: layout.pages.map((p) => ({
            ...p,
            items: p.items.map((it) => it.type === 'folder' ? { ...it, items: [...it.items] } : { ...it }),
            widgets: [...p.widgets],
        })),
        quickAccess: [...layout.quickAccess],
    };
    const page = newLayout.pages[pageIndex];
    if (!page) return layout;

    const folder = page.items.find(i => i.id === folderId) as PortalFolder | undefined;
    if (folder && folder.type === 'folder') {
        const item = folder.items.find(i => i.id === itemId);
        if (item) {
            // Remove from folder and normalize positions
            folder.items = folder.items.filter(i => i.id !== itemId);
            folder.items = folder.items.map((i, idx) => ({ ...i, position: idx }));

            // If service already exists in grid/quick access, avoid duplicate keys/items
            const existsInGrid = page.items.some(i => i.type === 'service' && i.serviceId === item.serviceId);
            const existsInQuickAccess = newLayout.quickAccess.some(i => i.serviceId === item.serviceId);

            if (!existsInGrid && !existsInQuickAccess) {
                page.items.push({
                    ...item,
                    id: `item-${item.serviceId}-${Date.now()}`,
                    position: page.items.length,
                });
            }
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

// Helper: Move item to quick access (dock)
export const moveItemToQuickAccess = (
    layout: PortalLayout,
    pageIndex: number,
    itemId: string,
    targetPosition: number // -1 means move back to grid
): PortalLayout => {
    const newLayout = { ...layout };
    const page = newLayout.pages[pageIndex];
    if (!page) return layout;

    // 1. Find the item
    let item: PortalItem | undefined;
    let fromQuickAccess = false;
    let fromPos = -1;

    // Check in grid
    item = page.items.find(i => i.id === itemId) as PortalItem | undefined;

    // Check in dock
    if (!item) {
        fromPos = newLayout.quickAccess.findIndex(i => i.id === itemId);
        if (fromPos !== -1) {
            item = newLayout.quickAccess[fromPos];
            fromQuickAccess = true;
        }
    }

    if (!item || item.type !== 'service') return layout;

    // 2. Case: Moving back to Grid
    if (targetPosition === -1) {
        if (!fromQuickAccess) return layout; // Already in grid

        // Remove from dock
        const updatedQA = [...newLayout.quickAccess];
        updatedQA.splice(fromPos, 1);
        newLayout.quickAccess = updatedQA.map((i, idx) => ({ ...i, position: idx }));

        // Add back to grid
        page.items.push({ ...item, position: page.items.length });
        newLayout.lastModified = Date.now();
        return newLayout;
    }

    // 3. Case: Moving to Dock
    if (!fromQuickAccess) {
        // If dock is full (3 items) and target is not one of them, we can't add more
        // Use position to check if slot is taken
        const existingAtTarget = newLayout.quickAccess.find(i => i.position === targetPosition);

        if (newLayout.quickAccess.length >= 3 && !existingAtTarget) {
            return layout;
        }

        // Remove from grid
        page.items = page.items.filter(i => i.id !== itemId);

        if (existingAtTarget) {
            // Move existing back to grid (swap)
            page.items.push({ ...existingAtTarget, position: page.items.length });
            newLayout.quickAccess = newLayout.quickAccess.filter(i => i.id !== existingAtTarget.id);
        }

        // Place new item
        newLayout.quickAccess.push({ ...item, position: targetPosition });
        newLayout.quickAccess.sort((a, b) => a.position - b.position);
    } else {
        // Rearranging within dock
        const targetItem = newLayout.quickAccess.find(i => i.position === targetPosition);
        const movingItem = { ...item, position: targetPosition };

        if (targetItem) {
            // Swap positions
            const newQA = newLayout.quickAccess.map(i => {
                if (i.id === item!.id) return { ...targetItem, position: fromPos };
                if (i.id === targetItem.id) return movingItem;
                return i;
            });
            newLayout.quickAccess = newQA.sort((a, b) => a.position - b.position);
        } else {
            // Move to empty slot
            const newQA = newLayout.quickAccess.map(i => i.id === item!.id ? movingItem : i);
            newLayout.quickAccess = newQA.sort((a, b) => a.position - b.position);
        }
    }

    newLayout.lastModified = Date.now();
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
// Helper: Delete item from grid
export const deleteGridItem = (
    layout: PortalLayout,
    pageIndex: number,
    itemId: string
): PortalLayout => {
    const newLayout = { ...layout };
    const page = newLayout.pages[pageIndex];
    page.items = page.items.filter(i => i.id !== itemId);
    return newLayout;
};

// Helper: Reorder widgets
export const reorderWidgets = (
    layout: PortalLayout,
    pageIndex: number,
    fromIndex: number,
    toIndex: number
): PortalLayout => {
    const newLayout = { ...layout };
    const widgets = [...newLayout.pages[pageIndex].widgets];
    const [moved] = widgets.splice(fromIndex, 1);
    widgets.splice(toIndex, 0, moved);

    // Update positions
    widgets.forEach((widget, index) => {
        widget.position = index;
    });

    newLayout.pages[pageIndex].widgets = widgets;
    return newLayout;
};
