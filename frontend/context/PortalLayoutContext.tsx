// Portal Layout Context - manages folder layout state
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    PortalLayout,
    PortalFolder,
    PortalItem,
    PortalPage,
    PortalWidget,
    createDefaultLayout,
    FOLDER_COLORS,
} from '../types/portal';
import {
    loadLocalLayout,
    saveLocalLayout,
    initializeLayout,
    addItemToFolder,
    removeItemFromFolder,
    reorderItems,
    createPage,
    createFolder,
} from '../services/portalLayoutService';

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
    removeItemFromFolder: (folderId: string, itemId: string) => void;
    reorderGridItems: (fromIndex: number, toIndex: number) => void;

    // Page operations
    addNewPage: () => void;
    deletePage: (pageIndex: number) => void;

    // Widget operations
    addWidget: (widget: Omit<PortalWidget, 'id' | 'position'>) => void;
    removeWidget: (widgetId: string) => void;

    // Settings
    setGridColumns: (columns: number) => void;
    setIconSize: (size: 'small' | 'medium' | 'large') => void;

    // Force refresh
    refreshLayout: () => Promise<void>;
}

const PortalLayoutContext = createContext<PortalLayoutContextType | undefined>(undefined);

export const PortalLayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [layout, setLayout] = useState<PortalLayout>(createDefaultLayout());
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);

    // Initialize layout on mount
    useEffect(() => {
        const init = async () => {
            try {
                const savedLayout = await initializeLayout();
                setLayout(savedLayout);
            } catch (error) {
                console.warn('Failed to initialize portal layout:', error);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

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

    const removeItemFromFolderAction = useCallback((folderId: string, itemId: string) => {
        const newLayout = removeItemFromFolder(layout, currentPage, folderId, itemId);
        updateLayout(newLayout);
    }, [layout, currentPage, updateLayout]);

    const reorderGridItems = useCallback((fromIndex: number, toIndex: number) => {
        const newLayout = reorderItems(layout, currentPage, fromIndex, toIndex);
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
            const savedLayout = await initializeLayout();
            setLayout(savedLayout);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
                removeItemFromFolder: removeItemFromFolderAction,
                reorderGridItems,
                addNewPage,
                deletePage,
                addWidget: addWidgetAction,
                removeWidget: removeWidgetAction,
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
