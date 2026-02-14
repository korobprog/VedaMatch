// Portal Layout Context - manages folder layout state
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    PortalLayout,
    PortalFolder,
    PortalItem,
    PortalPage,
    PortalWidget,
    createDefaultLayout,
    DEFAULT_SERVICES,
    FOLDER_COLORS,
} from '../types/portal';
import {
    loadLocalLayout,
    saveLocalLayout,
    initializeLayout,
    fetchPortalBlueprint,
    fetchGodModeMathFilters,
    addItemToFolder,
    removeItemFromFolder,
    reorderItems,
    deleteGridItem,
    createPage,
    createFolder,
    moveItemToQuickAccess,
    reorderWidgets,
} from '../services/portalLayoutService';
import { useUser } from './UserContext';

const SEEKER_ALLOWED_WITHOUT_PROFILE = new Set(['path_tracker', 'contacts', 'chat', 'calls', 'cafe', 'shops', 'services', 'map', 'news', 'library', 'education', 'multimedia', 'video_circles']);
const SEEKER_LOCKED_FOLDER_NAME = 'Откроется после профиля';
const SEEKER_LOCKED_FOLDER_ID = 'folder-seeker-locked';
const VALID_SERVICE_IDS = new Set(DEFAULT_SERVICES.map((s) => s.id));
const SEEKER_ALWAYS_ACCESSIBLE = new Set([...SEEKER_ALLOWED_WITHOUT_PROFILE, 'settings', 'history', 'seva']);

const normalizeRu = (value: string) =>
    (value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .trim();

const sanitizeAllFolders = (inputLayout: PortalLayout): { layout: PortalLayout; changed: boolean } => {
    const layout: PortalLayout = {
        ...inputLayout,
        pages: inputLayout.pages.map((p) => ({
            ...p,
            items: p.items.map((item) => item.type === 'folder'
                ? { ...item, items: [...item.items] }
                : { ...item }),
            widgets: [...p.widgets],
        })),
        quickAccess: [...inputLayout.quickAccess],
    };

    let changed = false;

    layout.pages = layout.pages.map((page) => {
        const cleanedItems = page.items.map((item, index) => {
            if (item.type !== 'folder') {
                if (item.position !== index) {
                    changed = true;
                }
                return { ...item, position: index };
            }

            const cleanedFolderItems = item.items
                .filter((folderItem) => VALID_SERVICE_IDS.has(folderItem.serviceId))
                .reduce<PortalItem[]>((acc, folderItem) => {
                    if (!acc.some((x) => x.serviceId === folderItem.serviceId)) {
                        acc.push(folderItem);
                    } else {
                        changed = true;
                    }
                    return acc;
                }, [])
                .map((folderItem, folderIndex) => ({ ...folderItem, position: folderIndex }));

            if (cleanedFolderItems.length !== item.items.length || item.position !== index) {
                changed = true;
            }

            return {
                ...item,
                items: cleanedFolderItems,
                position: index,
            };
        });

        // Deduplicate page-level items by serviceId (folders always kept)
        const seenServiceIds = new Set<string>();
        const deduplicatedItems = cleanedItems.filter((item) => {
            if (item.type === 'folder') return true;
            if (seenServiceIds.has(item.serviceId)) {
                changed = true;
                return false;
            }
            seenServiceIds.add(item.serviceId);
            return true;
        }).map((item, index) => ({ ...item, position: index }));

        return {
            ...page,
            items: deduplicatedItems,
        };
    });

    // Deduplicate quickAccess by serviceId
    const seenQA = new Set<string>();
    const dedupedQA = layout.quickAccess.filter((item) => {
        if (seenQA.has(item.serviceId)) {
            changed = true;
            return false;
        }
        seenQA.add(item.serviceId);
        return true;
    }).map((item, index) => ({ ...item, position: index }));
    layout.quickAccess = dedupedQA;

    if (changed) {
        layout.lastModified = Date.now();
        layout.syncedWithServer = false;
    }

    return { layout, changed };
};

const groupLockedServicesForSeeker = (inputLayout: PortalLayout, role?: string, isProfileComplete?: boolean): { layout: PortalLayout; changed: boolean } => {
    const isSeeker = (role || 'user') === 'user';
    if (!isSeeker || isProfileComplete) {
        return { layout: inputLayout, changed: false };
    }

    const layout: PortalLayout = {
        ...inputLayout,
        pages: inputLayout.pages.map((p) => ({
            ...p,
            items: p.items.map((item) => item.type === 'folder'
                ? { ...item, items: [...item.items] }
                : { ...item }),
            widgets: [...p.widgets],
        })),
        quickAccess: [...inputLayout.quickAccess],
    };

    if (layout.pages.length === 0) {
        return { layout, changed: false };
    }

    let changed = false;
    const firstPage = layout.pages[0];
    const lockedCandidates = firstPage.items.filter((item) => {
        if (item.type !== 'folder') return false;
        const n = normalizeRu(item.name);
        const isById = item.id === SEEKER_LOCKED_FOLDER_ID;
        const isByName = n.includes('откро') && n.includes('проф');
        return isById || isByName;
    }) as PortalFolder[];

    let lockedFolder: PortalFolder;
    if (lockedCandidates.length > 0) {
        lockedFolder = lockedCandidates[0];
    } else {
        lockedFolder = {
            id: SEEKER_LOCKED_FOLDER_ID,
            name: SEEKER_LOCKED_FOLDER_NAME,
            type: 'folder',
            color: FOLDER_COLORS[6],
            items: [],
            position: firstPage.items.length,
        };
        firstPage.items.push(lockedFolder);
        changed = true;
    }

    if (lockedFolder.id !== SEEKER_LOCKED_FOLDER_ID || lockedFolder.name !== SEEKER_LOCKED_FOLDER_NAME) {
        lockedFolder.id = SEEKER_LOCKED_FOLDER_ID;
        lockedFolder.name = SEEKER_LOCKED_FOLDER_NAME;
        changed = true;
    }

    const lockedByServiceId = new Map<string, PortalItem>();
    const existingMainServiceIds = new Set<string>();
    layout.pages.forEach((page) => {
        page.items.forEach((item) => {
            if (item.type === 'service') {
                existingMainServiceIds.add(item.serviceId);
            }
        });
    });

    const allowedFromLocked: PortalItem[] = [];
    const mergedLockedItems = lockedCandidates.flatMap((folder) => folder.items);
    mergedLockedItems.forEach((item) => {
        if (SEEKER_ALLOWED_WITHOUT_PROFILE.has(item.serviceId)) {
            allowedFromLocked.push(item);
            changed = true;
            return;
        }
        lockedByServiceId.set(item.serviceId, item);
    });

    layout.pages.forEach((page) => {
        const keptItems: (PortalItem | PortalFolder)[] = [];
        page.items.forEach((item) => {
            if (item.type !== 'service') {
                keptItems.push(item);
                return;
            }

            if (SEEKER_ALWAYS_ACCESSIBLE.has(item.serviceId)) {
                keptItems.push(item);
                return;
            }

            if (!lockedByServiceId.has(item.serviceId)) {
                lockedByServiceId.set(item.serviceId, { ...item, position: 0 });
                changed = true;
            } else {
                changed = true;
            }
        });
        page.items = keptItems.map((item, index) => ({ ...item, position: index }));
    });

    // Rebuild locked folder from canonical blocked service list for Seeker
    const blockedServiceIds = DEFAULT_SERVICES
        .map((service) => service.id)
        .filter((serviceId) => !SEEKER_ALWAYS_ACCESSIBLE.has(serviceId));
    const canonicalLockedItems: PortalItem[] = blockedServiceIds.map((serviceId) => {
        const existing = lockedByServiceId.get(serviceId);
        if (existing) {
            return existing;
        }
        changed = true;
        return {
            id: `item-${serviceId}-locked`,
            serviceId,
            type: 'service',
            position: 0,
        };
    });
    lockedByServiceId.clear();
    canonicalLockedItems.forEach((item) => lockedByServiceId.set(item.serviceId, item));

    const filteredQuickAccess = layout.quickAccess.filter((item) => SEEKER_ALLOWED_WITHOUT_PROFILE.has(item.serviceId));
    if (filteredQuickAccess.length !== layout.quickAccess.length) {
        changed = true;
    }
    layout.quickAccess = filteredQuickAccess.map((item, index) => ({ ...item, position: index }));

    if (allowedFromLocked.length > 0) {
        allowedFromLocked.forEach((item) => {
            if (existingMainServiceIds.has(item.serviceId)) {
                return;
            }
            firstPage.items.push({
                id: item.id,
                serviceId: item.serviceId,
                type: 'service',
                position: firstPage.items.length,
            });
            existingMainServiceIds.add(item.serviceId);
            changed = true;
        });
    }

    const sanitizedLockedItems = Array.from(lockedByServiceId.values())
        .filter((item) => VALID_SERVICE_IDS.has(item.serviceId))
        .reduce<PortalItem[]>((acc, item) => {
            if (!acc.some((x) => x.serviceId === item.serviceId)) {
                acc.push(item);
            }
            return acc;
        }, [])
        .map((item, index) => ({ ...item, position: index }));
    if (sanitizedLockedItems.length !== lockedFolder.items.length) {
        changed = true;
    }
    lockedFolder.items = sanitizedLockedItems;
    firstPage.items = firstPage.items.filter((item) => {
        if (item.type !== 'folder') return true;
        if (item.id === lockedFolder.id) return true;
        const n = normalizeRu(item.name);
        const isLegacyLocked = n.includes('откро') && n.includes('проф');
        if (isLegacyLocked) {
            changed = true;
            return false;
        }
        return true;
    });

    const folderIndex = firstPage.items.findIndex((item) => item.type === 'folder' && item.id === lockedFolder.id);
    if (folderIndex >= 0) {
        firstPage.items[folderIndex] = { ...lockedFolder, position: folderIndex };
    } else {
        firstPage.items.push({ ...lockedFolder, position: firstPage.items.length });
        changed = true;
    }

    firstPage.items = firstPage.items.map((item, index) => ({ ...item, position: index }));

    if (changed) {
        layout.lastModified = Date.now();
        layout.syncedWithServer = false;
    }

    return { layout, changed };
};

const ensureVideoCirclesShortcut = (inputLayout: PortalLayout): { layout: PortalLayout; changed: boolean } => {
    const hasShortcutInQuickAccess = inputLayout.quickAccess.some((item) => item.serviceId === 'video_circles');
    const hasShortcutInPages = inputLayout.pages.some((page) =>
        page.items.some((item) => {
            if (item.type === 'service') return item.serviceId === 'video_circles';
            return item.items.some((folderItem) => folderItem.serviceId === 'video_circles');
        })
    );

    if (hasShortcutInQuickAccess || hasShortcutInPages) {
        return { layout: inputLayout, changed: false };
    }

    const layout: PortalLayout = {
        ...inputLayout,
        pages: inputLayout.pages.map((p) => ({
            ...p,
            items: p.items.map((item) => item.type === 'folder'
                ? { ...item, items: [...item.items] }
                : { ...item }),
            widgets: [...p.widgets],
        })),
        quickAccess: [...inputLayout.quickAccess],
    };

    if (layout.pages.length === 0) {
        layout.pages.push({
            id: 'page-1',
            items: [],
            widgets: [],
            order: 0,
        });
    }

    const firstPage = layout.pages[0];
    firstPage.items.push({
        id: 'item-video_circles',
        serviceId: 'video_circles',
        type: 'service',
        position: firstPage.items.length,
    });
    firstPage.items = firstPage.items.map((item, index) => ({ ...item, position: index }));

    layout.lastModified = Date.now();
    layout.syncedWithServer = false;
    return { layout, changed: true };
};

const ensureVideoCirclesDefaultWidget = (inputLayout: PortalLayout): { layout: PortalLayout; changed: boolean } => {
    if (inputLayout.pages.length === 0) {
        return { layout: inputLayout, changed: false };
    }

    const hasCirclesWidget = inputLayout.pages.some((page) =>
        page.widgets.some((widget) => widget.type === 'circles_quick' || widget.type === 'circles_panel')
    );
    if (hasCirclesWidget) {
        return { layout: inputLayout, changed: false };
    }

    const layout: PortalLayout = {
        ...inputLayout,
        pages: inputLayout.pages.map((p) => ({
            ...p,
            items: p.items.map((item) => item.type === 'folder'
                ? { ...item, items: [...item.items] }
                : { ...item }),
            widgets: [...p.widgets],
        })),
        quickAccess: [...inputLayout.quickAccess],
    };

    const firstPage = layout.pages[0];
    firstPage.widgets.push({
        id: `widget-circles-quick-${Date.now()}`,
        type: 'circles_quick',
        size: '1x1',
        position: firstPage.widgets.length,
    });

    layout.lastModified = Date.now();
    layout.syncedWithServer = false;
    return { layout, changed: true };
};

interface PortalLayoutContextType {
    layout: PortalLayout;
    isEditMode: boolean;
    isLoading: boolean;
    currentPage: number;

    // Actions
    setEditMode: (value: boolean) => void;
    setCurrentPage: (index: number) => void;

    // Folder operations
    createNewFolder: (name: string, color?: string) => void;
    renameFolder: (folderId: string, newName: string) => void;
    changeFolderColor: (folderId: string, newColor: string) => void;
    deleteFolder: (folderId: string) => void;

    // Item operations
    moveItemToFolder: (itemId: string, folderId: string) => void;
    moveItemToQuickAccess: (itemId: string, targetPosition: number) => void;
    removeItemFromFolder: (folderId: string, itemId: string) => void;
    reorderGridItems: (fromIndex: number, toIndex: number) => void;
    deleteGridItem: (itemId: string) => void;

    // Page operations
    addNewPage: () => void;

    deletePage: (pageIndex: number) => void;

    // Widget operations
    addWidget: (widget: Omit<PortalWidget, 'id' | 'position'>) => void;
    removeWidget: (widgetId: string) => void;
    reorderWidgets: (fromIndex: number, toIndex: number) => void;

    // Settings
    setGridColumns: (columns: number) => void;
    setIconSize: (size: 'small' | 'medium' | 'large') => void;

    // Force refresh
    refreshLayout: () => Promise<void>;
}

const PortalLayoutContext = createContext<PortalLayoutContextType | undefined>(undefined);

export const PortalLayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, setRoleDescriptor, setGodModeFilters, setActiveMath } = useUser();
    const [layout, setLayout] = useState<PortalLayout>(createDefaultLayout());
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);

    // Initialize layout on mount
    useEffect(() => {
        if (!user?.ID) {
            setRoleDescriptor(null);
            setGodModeFilters([]);
            setActiveMath(null);
            setLayout(createDefaultLayout());
            setIsLoading(false);
            return;
        }

        const init = async () => {
            try {
                const role = user?.role || 'user';
                const blueprint = await fetchPortalBlueprint(role);
                setRoleDescriptor(blueprint);

                if (user?.godModeEnabled) {
                    const filters = await fetchGodModeMathFilters();
                    setGodModeFilters(filters);
                    setActiveMath(filters[0]?.mathId || null);
                } else {
                    setGodModeFilters([]);
                    setActiveMath(null);
                }

                const savedLayout = await initializeLayout(role, blueprint);
                const { layout: sanitizedLayout, changed: sanitizedChanged } = sanitizeAllFolders(savedLayout);
                const { layout: adjustedLayout, changed } = groupLockedServicesForSeeker(sanitizedLayout, user?.role, user?.isProfileComplete);
                const { layout: layoutWithCircles, changed: circlesChanged } = ensureVideoCirclesShortcut(adjustedLayout);
                const { layout: layoutWithWidget, changed: circlesWidgetChanged } = ensureVideoCirclesDefaultWidget(layoutWithCircles);
                if (sanitizedChanged || changed || circlesChanged || circlesWidgetChanged) {
                    await saveLocalLayout(layoutWithWidget);
                }
                setLayout(layoutWithWidget);
            } catch (error) {
                console.warn('Failed to initialize portal layout:', error);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [setActiveMath, setGodModeFilters, setRoleDescriptor, user?.ID, user?.godModeEnabled, user?.role, user?.isProfileComplete]);

    // Save layout whenever it changes
    const updateLayout = useCallback((newLayout: PortalLayout) => {
        setLayout(newLayout);
        saveLocalLayout(newLayout);
    }, []);

    // === Folder Operations ===
    const createNewFolder = useCallback((name: string, color?: string) => {
        const newLayout = { ...layout };
        const page = newLayout.pages[currentPage];
        const folder = createFolder(name, color || FOLDER_COLORS[0]);
        folder.position = page.items.length;
        page.items.push(folder);
        updateLayout(newLayout);
    }, [layout, currentPage, updateLayout]);

    const renameFolder = useCallback((folderId: string, newName: string) => {
        const newLayout = { ...layout };
        const page = newLayout.pages[currentPage];
        const folder = page.items.find(i => i.id === folderId) as PortalFolder | undefined;
        if (folder && folder.type === 'folder') {
            folder.name = newName;
            updateLayout(newLayout);
        }
    }, [layout, currentPage, updateLayout]);

    const changeFolderColor = useCallback((folderId: string, newColor: string) => {
        const newLayout = { ...layout };
        const page = newLayout.pages[currentPage];
        const folder = page.items.find(i => i.id === folderId) as PortalFolder | undefined;
        if (folder && folder.type === 'folder') {
            folder.color = newColor;
            updateLayout(newLayout);
        }
    }, [layout, currentPage, updateLayout]);

    const deleteFolder = useCallback((folderId: string) => {
        const newLayout = { ...layout };
        const page = newLayout.pages[currentPage];
        const folder = page.items.find(i => i.id === folderId) as PortalFolder | undefined;

        if (folder && folder.type === 'folder') {
            // Move items back to grid
            folder.items.forEach(item => {
                page.items.push({ ...item, position: page.items.length });
            });
            // Remove folder
            page.items = page.items.filter(i => i.id !== folderId);
            updateLayout(newLayout);
        }
    }, [layout, currentPage, updateLayout]);

    // === Item Operations ===
    const moveItemToFolderAction = useCallback((itemId: string, folderId: string) => {
        console.log('[moveItemToFolder] Request: item=', itemId, 'folder=', folderId);
        const page = layout.pages[currentPage];
        console.log('[moveItemToFolder] Page items:', page.items.map(i => ({ id: i.id, type: i.type })));

        const item = page.items.find(i => i.id === itemId) as PortalItem | undefined;
        console.log('[moveItemToFolder] Found item:', item);

        if (item && item.type === 'service') {
            console.log('[moveItemToFolder] Calling addItemToFolder...');
            const newLayout = addItemToFolder(layout, currentPage, folderId, item);
            updateLayout(newLayout);
            console.log('[moveItemToFolder] Layout updated');
        } else {
            console.log('[moveItemToFolder] Item not found or not a service');
        }
    }, [layout, currentPage, updateLayout]);

    const moveItemToQuickAccessAction = useCallback((itemId: string, targetPosition: number) => {
        const newLayout = moveItemToQuickAccess(layout, currentPage, itemId, targetPosition);
        updateLayout(newLayout);
    }, [layout, currentPage, updateLayout]);

    const removeItemFromFolderAction = useCallback((folderId: string, itemId: string) => {
        const newLayout = removeItemFromFolder(layout, currentPage, folderId, itemId);
        updateLayout(newLayout);
    }, [layout, currentPage, updateLayout]);

    const reorderGridItems = useCallback((fromIndex: number, toIndex: number) => {
        const newLayout = reorderItems(layout, currentPage, fromIndex, toIndex);
        updateLayout(newLayout);
    }, [layout, currentPage, updateLayout]);

    const deleteGridItemAction = useCallback((itemId: string) => {
        const newLayout = deleteGridItem(layout, currentPage, itemId);
        updateLayout(newLayout);
    }, [layout, currentPage, updateLayout]);

    // === Page Operations ===
    const addNewPage = useCallback(() => {
        const newLayout = { ...layout };
        const newPage = createPage();
        newPage.order = newLayout.pages.length;
        newLayout.pages.push(newPage);
        updateLayout(newLayout);
        setCurrentPage(newLayout.pages.length - 1);
    }, [layout, updateLayout]);

    const deletePage = useCallback((pageIndex: number) => {
        if (layout.pages.length <= 1) return; // Keep at least one page

        const newLayout = { ...layout };
        newLayout.pages.splice(pageIndex, 1);

        // Reorder remaining pages
        newLayout.pages.forEach((page, index) => {
            page.order = index;
        });

        updateLayout(newLayout);
        if (currentPage >= newLayout.pages.length) {
            setCurrentPage(newLayout.pages.length - 1);
        }
    }, [layout, currentPage, updateLayout]);

    // === Widget Operations ===
    const addWidgetAction = useCallback((widget: Omit<PortalWidget, 'id' | 'position'>) => {
        const newLayout = { ...layout };
        const page = newLayout.pages[currentPage];
        const newWidget: PortalWidget = {
            ...widget,
            id: `widget-${Date.now()}`,
            position: page.widgets.length,
        };
        page.widgets.push(newWidget);
        updateLayout(newLayout);
    }, [layout, currentPage, updateLayout]);

    const removeWidgetAction = useCallback((widgetId: string) => {
        const newLayout = { ...layout };
        const page = newLayout.pages[currentPage];
        page.widgets = page.widgets.filter(w => w.id !== widgetId);
        updateLayout(newLayout);
    }, [layout, currentPage, updateLayout]);

    const reorderWidgetsAction = useCallback((fromIndex: number, toIndex: number) => {
        const newLayout = reorderWidgets(layout, currentPage, fromIndex, toIndex);
        updateLayout(newLayout);
    }, [layout, currentPage, updateLayout]);

    // === Settings ===
    const setGridColumns = useCallback((columns: number) => {
        const newLayout = { ...layout, gridColumns: columns };
        updateLayout(newLayout);
    }, [layout, updateLayout]);

    const setIconSize = useCallback((size: 'small' | 'medium' | 'large') => {
        const newLayout = { ...layout, iconSize: size };
        updateLayout(newLayout);
    }, [layout, updateLayout]);

    // === Refresh ===
    const refreshLayout = useCallback(async () => {
        setIsLoading(true);
        try {
            const savedLayout = await initializeLayout(user?.role || 'user');
            const { layout: sanitizedLayout, changed: sanitizedChanged } = sanitizeAllFolders(savedLayout);
            const { layout: adjustedLayout, changed } = groupLockedServicesForSeeker(sanitizedLayout, user?.role, user?.isProfileComplete);
            const { layout: layoutWithCircles, changed: circlesChanged } = ensureVideoCirclesShortcut(adjustedLayout);
            const { layout: layoutWithWidget, changed: circlesWidgetChanged } = ensureVideoCirclesDefaultWidget(layoutWithCircles);
            if (sanitizedChanged || changed || circlesChanged || circlesWidgetChanged) {
                await saveLocalLayout(layoutWithWidget);
            }
            setLayout(layoutWithWidget);
        } finally {
            setIsLoading(false);
        }
    }, [user?.isProfileComplete, user?.role]);

    return (
        <PortalLayoutContext.Provider
            value={{
                layout,
                isEditMode,
                isLoading,
                currentPage,
                setEditMode: setIsEditMode,
                setCurrentPage,
                createNewFolder,
                renameFolder,
                changeFolderColor,
                deleteFolder,
                moveItemToFolder: moveItemToFolderAction,
                moveItemToQuickAccess: moveItemToQuickAccessAction,
                removeItemFromFolder: removeItemFromFolderAction,
                reorderGridItems,
                deleteGridItem: deleteGridItemAction,
                addNewPage,
                deletePage,
                addWidget: addWidgetAction,
                removeWidget: removeWidgetAction,
                reorderWidgets: reorderWidgetsAction,
                setGridColumns,
                setIconSize,
                refreshLayout,
            }}
        >
            {children}
        </PortalLayoutContext.Provider>
    );
};

export const usePortalLayout = () => {
    const context = useContext(PortalLayoutContext);
    if (!context) {
        throw new Error('usePortalLayout must be used within a PortalLayoutProvider');
    }
    return context;
};
