import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Alert,
    TouchableOpacity,
    TextInput,
    Pressable,
    Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useNavigation } from '@react-navigation/native';
import Animated, {
    runOnJS,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Plus, FolderPlus, LayoutGrid } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { usePortalLayout } from '../../context/PortalLayoutContext';
import { DEFAULT_SERVICES, PortalItem, PortalFolder as PortalFolderType, FOLDER_COLORS } from '../../types/portal';
import { PortalIcon } from './PortalIcon';
import { PortalFolderComponent } from './PortalFolder';
import { FolderModal } from './FolderModal';
import { ClockWidget } from './ClockWidget';
import { CalendarWidget } from './CalendarWidget';
import { CirclesQuickWidget } from './CirclesQuickWidget';
import { CirclesPanelWidget } from './CirclesPanelWidget';
import { PortalWidgetWrapper } from './PortalWidgetWrapper';
import { DraggablePortalItem } from './DraggablePortalItem';
import { SkeletonIcon } from './SkeletonIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 4;
const GRID_PADDING = 4;
const CELL_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2) / GRID_COLUMNS;

interface PortalGridProps {
    onServicePress: (serviceId: string) => void;
    onCloseDrawer?: () => void; // Optional callback to close drawer when navigating
    roleHighlights?: string[];
    godModeEnabled?: boolean;
    activeMathLabel?: string;
}

export const PortalGrid: React.FC<PortalGridProps> = ({
    onServicePress,
    onCloseDrawer,
    roleHighlights = [],
    godModeEnabled = false,
    activeMathLabel,
}) => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode, portalBackgroundType } = useSettings();
    const {
        layout,
        isEditMode,
        setEditMode,
        currentPage,
        setCurrentPage,
        createNewFolder,
        renameFolder,
        changeFolderColor,
        deleteFolder,
        removeItemFromFolder,
        removeWidget,
        addNewPage,
        moveItemToFolder,
        moveItemToQuickAccess,
        reorderGridItems,
        reorderWidgets,
        deleteGridItem,
    } = usePortalLayout();

    const [isReady, setIsReady] = useState(false); // Delay rendering to prevent layout jumps

    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<PortalFolderType | null>(null);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [isDraggingItem, setIsDraggingItem] = useState(false);
    const itemLayouts = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});
    const itemRefs = useRef<Record<string, View | null>>({});
    const widgetRefs = useRef<Record<string, View | null>>({});
    const gridRef = useRef<View>(null);

    // Dock references
    const dockRef = useRef<View>(null);
    const dockOffset = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });

    // Clear layouts on page change to avoid stale data
    useEffect(() => {
        itemLayouts.current = {};
    }, [currentPage]);

    // Delay rendering to allow layout to settle
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 1200); // Extended time to ensure smooth transition
        return () => clearTimeout(timer);
    }, []);

    const page = layout.pages[currentPage];
    const items = useMemo(() => page?.items ?? [], [page]);
    const widgets = useMemo(() => page?.widgets ?? [], [page]);
    const quickAccess = useMemo(() => layout.quickAccess ?? [], [layout.quickAccess]);
    const highlightedServices = useMemo(() => new Set(roleHighlights), [roleHighlights]);

    // Handle long press on background to enter edit mode
    const handleLongPress = useCallback(() => {
        if (!isDraggingItem) {
            setEditMode(true);
        }
    }, [setEditMode, isDraggingItem]);

    // Handle drag start - don't enter edit mode, just start dragging
    const handleDragStart = useCallback(() => {
        setIsDraggingItem(true);
    }, []);

    // Handle tap outside to exit edit mode
    const handleBackgroundTap = useCallback(() => {
        if (isEditMode) {
            setEditMode(false);
        }
    }, [isEditMode, setEditMode]);

    // Handle folder press
    const handleFolderPress = useCallback((folder: PortalFolderType, force: boolean = false) => {
        if (isEditMode && !force) {
            return;
        }
        setSelectedFolder(folder);
        setShowFolderModal(true);
    }, [isEditMode]);

    // Handle item press inside folder
    const handleFolderItemPress = useCallback((item: PortalItem) => {
        setShowFolderModal(false);
        onServicePress(item.serviceId);
    }, [onServicePress]);

    // Handle service icon press
    const handleServicePress = useCallback((serviceId: string) => {
        if (isEditMode) return;
        onServicePress(serviceId);
    }, [isEditMode, onServicePress]);

    // Create new folder
    const handleCreateFolder = useCallback(() => {
        if (newFolderName.trim()) {
            createNewFolder(newFolderName.trim(), FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)]);
            setNewFolderName('');
            setShowNewFolderInput(false);
        }
    }, [newFolderName, createNewFolder]);

    const handleItemLayout = (id: string, event: any) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        itemLayouts.current[id] = { x, y, width, height };
    };

    const handleGridLayout = useCallback(() => {
        if (gridRef.current) {
            (gridRef.current as any).measureInWindow((x: number, y: number, _w: number, _h: number) => {
                if (x !== undefined && y !== undefined) {
                    // gridOffset.current = { x, y };
                }
            });
        }
    }, []);

    const handleDockLayout = useCallback(() => {
        if (dockRef.current) {
            (dockRef.current as any).measureInWindow((x: number, y: number, width: number, height: number) => {
                if (x !== undefined && y !== undefined) {
                    dockOffset.current = { x, y, width, height };
                }
            });
        }
    }, []);

    const handleDragEnd = useCallback((itemId: string, absX: number, absY: number) => {
        setIsDraggingItem(false);

        if (!page) return;

        // 1. Check Quick Access Dock collision (only for items, not widgets)
        const isItem = items.some(i => i.id === itemId);
        const margin = 30;
        const d = dockOffset.current;
        const isInsideDock = (
            absX >= d.x - margin &&
            absX <= d.x + d.width + margin &&
            absY >= d.y - margin &&
            absY <= d.y + d.height + margin
        );

        if (isItem && isInsideDock) {
            const slotWidth = d.width / 3;
            const slotIndex = Math.min(2, Math.floor((absX - d.x) / slotWidth));
            runOnJS(moveItemToQuickAccess)(itemId, slotIndex);
            return;
        }

        // 2. Check if item was in Dock and dropped outside -> Move back to Grid
        const isInDock = quickAccess.some(i => i.id === itemId);
        if (isInDock && !isInsideDock) {
            runOnJS(moveItemToQuickAccess)(itemId, -1);
            return;
        }

        // 3. Collision Logic
        const allItems = page.items;
        const allWidgets = page.widgets;
        let targetId: string | null = null;

        if (isItem) {
            let measureCount = 0;
            const checkComplete = () => {
                measureCount++;
                if (measureCount >= allItems.length) {
                    if (targetId && targetId !== itemId) {
                        const fromIndex = allItems.findIndex(i => i.id === itemId);
                        const toIndex = allItems.findIndex(i => i.id === targetId);
                        const targetItem = allItems[toIndex];
                        const movingItem = allItems[fromIndex];
                        if (movingItem?.type === 'service' && targetItem?.type === 'folder') {
                            runOnJS(moveItemToFolder)(itemId, targetItem.id);
                        } else if (fromIndex !== -1 && toIndex !== -1) {
                            runOnJS(reorderGridItems)(fromIndex, toIndex);
                        }
                    }
                }
            };
            allItems.forEach(item => {
                const ref = itemRefs.current[item.id];
                if (ref) {
                    (ref as any).measureInWindow((x: number, y: number, width: number, height: number) => {
                        if (x !== undefined && y !== undefined && width > 0 && height > 0) {
                            const hitSlop = 20;
                            if (absX >= x - hitSlop && absX <= x + width + hitSlop && absY >= y - hitSlop && absY <= y + height + hitSlop) {
                                if (!targetId && item.id !== itemId) targetId = item.id;
                            }
                        }
                        checkComplete();
                    });
                } else checkComplete();
            });
        } else {
            // Widget Drop
            const isWidget = widgets.some(w => w.id === itemId);
            if (isWidget) {
                let measureCount = 0;
                const checkComplete = () => {
                    measureCount++;
                    if (measureCount >= allWidgets.length) {
                        if (targetId && targetId !== itemId) {
                            const fromIndex = allWidgets.findIndex(w => w.id === itemId);
                            const toIndex = allWidgets.findIndex(w => w.id === targetId);
                            if (fromIndex !== -1 && toIndex !== -1) {
                                runOnJS(reorderWidgets)(fromIndex, toIndex);
                            }
                        }
                    }
                };
                allWidgets.forEach(widget => {
                    const ref = widgetRefs.current[widget.id];
                    if (ref) {
                        (ref as any).measureInWindow((x: number, y: number, width: number, height: number) => {
                            if (x !== undefined && y !== undefined && width > 0 && height > 0) {
                                const hitSlop = 10;
                                if (absX >= x - hitSlop && absX <= x + width + hitSlop && absY >= y - hitSlop && absY <= y + height + hitSlop) {
                                    if (!targetId && widget.id !== itemId) targetId = widget.id;
                                }
                            }
                            checkComplete();
                        });
                    } else checkComplete();
                });
            }
        }
    }, [page, quickAccess, moveItemToFolder, moveItemToQuickAccess, reorderGridItems, reorderWidgets, items, widgets]);



    // Render individual grid item
    const renderItem = useCallback((item: PortalItem | PortalFolderType) => {
        if (!isReady) {
            return (
                <Animated.View
                    key={`skeleton - ${item.id} `}
                    style={{ pointerEvents: 'none', width: CELL_WIDTH, alignItems: 'center' }}
                    exiting={FadeOut.duration(300)}
                >
                    <SkeletonIcon />
                </Animated.View>
            );
        }

        let component = null;
        let pressHandler: () => void;

        if (item.type === 'folder') {
            pressHandler = () => handleFolderPress(item);
            component = (
                <View
                    pointerEvents="box-none"
                    ref={(ref) => { itemRefs.current[item.id] = ref; }}
                >
                    <PortalFolderComponent
                        folder={item}
                        isEditMode={isEditMode}
                        onPress={() => { }}
                        onLongPress={() => { }}
                        size={layout.iconSize}
                        onRemove={() => deleteFolder(item.id)}
                    />
                </View>
            );
        } else {
            const service = DEFAULT_SERVICES.find(s => s.id === item.serviceId);
            if (!service) return null;
            pressHandler = () => handleServicePress(item.serviceId);
            component = (
                <View
                    pointerEvents="box-none"
                    ref={(ref) => { itemRefs.current[item.id] = ref; }}
                >
                    <PortalIcon
                        service={service}
                        isEditMode={isEditMode}
                        onPress={() => { }}
                        onLongPress={() => { }}
                        size={layout.iconSize}
                        roleHighlight={highlightedServices.has(service.id)}
                        mathBadge={godModeEnabled && activeMathLabel ? `Math: ${activeMathLabel} ` : undefined}
                        onRemove={() => deleteGridItem(item.id)}
                    />
                </View>
            );
        }

        return (
            <Animated.View key={item.id} entering={FadeIn.duration(500)} style={{ width: CELL_WIDTH, alignItems: 'center' }}>
                <DraggablePortalItem
                    id={item.id}
                    isEditMode={isEditMode}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onLayout={(e) => handleItemLayout(item.id, e)}
                    onPress={pressHandler}
                    onSecondaryLongPress={item.type === 'folder'
                        ? () => handleFolderPress(item as PortalFolderType, true)
                        : () => setEditMode(true)
                    }
                >
                    {component}
                </DraggablePortalItem>
            </Animated.View>
        );
    }, [
        isReady,
        isEditMode,
        layout.iconSize,
        handleDragStart,
        handleFolderPress,
        handleServicePress,
        handleDragEnd,
        setEditMode,
        highlightedServices,
        godModeEnabled,
        activeMathLabel,
        deleteFolder,
        deleteGridItem,
    ]);

    // Render dock item
    const renderDockItem = useCallback((item: PortalItem) => {
        const service = DEFAULT_SERVICES.find(s => s.id === item.serviceId);
        if (!service) return null;

        return (
            <DraggablePortalItem
                key={item.id}
                id={item.id}
                isEditMode={isEditMode}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onPress={() => onServicePress(item.serviceId)}
                onSecondaryLongPress={() => setEditMode(true)}
            >
                <View
                    style={styles.dockItemWrapper}
                >
                    <PortalIcon
                        service={service}
                        isEditMode={isEditMode}
                        onPress={() => { }}
                        onLongPress={() => { }}
                        size={layout.iconSize}
                        showLabel={false}
                        roleHighlight={highlightedServices.has(service.id)}
                        mathBadge={godModeEnabled && activeMathLabel ? `Math: ${activeMathLabel} ` : undefined}
                    />
                </View>
            </DraggablePortalItem>
        );
    }, [isEditMode, layout.iconSize, handleDragStart, handleDragEnd, onServicePress, setEditMode, highlightedServices, godModeEnabled, activeMathLabel]);

    // Render widget
    const renderWidget = useCallback((widget: { id: string; type: 'clock' | 'calendar' | 'circles_quick' | 'circles_panel'; size: string }) => {
        let widgetComponent = null;
        switch (widget.type) {
            case 'clock':
                widgetComponent = <ClockWidget size={widget.size as any} />;
                break;
            case 'calendar':
                widgetComponent = <CalendarWidget />;
                break;
            case 'circles_quick':
                widgetComponent = <CirclesQuickWidget />;
                break;
            case 'circles_panel':
                widgetComponent = <CirclesPanelWidget />;
                break;
        }

        if (!widgetComponent) return null;

        return (
            <DraggablePortalItem
                key={widget.id}
                id={widget.id}
                isEditMode={isEditMode}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onSecondaryLongPress={() => setEditMode(true)}
            >
                <View
                    pointerEvents="box-none"
                    ref={(ref) => { widgetRefs.current[widget.id] = ref; }}
                >
                    <PortalWidgetWrapper
                        isEditMode={isEditMode}
                        onRemove={() => removeWidget(widget.id)}
                    >
                        {widgetComponent}
                    </PortalWidgetWrapper>
                </View>
            </DraggablePortalItem>
        );
    }, [isEditMode, removeWidget, handleDragStart, handleDragEnd, setEditMode]);

    // Page indicator dots
    const renderPageDots = () => (
        <View style={styles.pageDotsContainer}>
            {layout.pages.map((_, index) => (
                <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentPage(index)}
                    style={[
                        styles.pageDot,
                        {
                            backgroundColor: index === currentPage
                                ? vTheme.colors.primary
                                : portalBackgroundType === 'image' ? 'rgba(255,255,255,0.5)' : vTheme.colors.textSecondary,
                        },
                        index === currentPage && styles.activePageDot,
                    ]}
                />
            ))}
            <TouchableOpacity
                onPress={() => {
                    Alert.alert(
                        'Новая страница',
                        'Создать новую страницу портала?',
                        [
                            { text: 'Отмена', style: 'cancel' },
                            {
                                text: 'Создать',
                                onPress: () => {
                                    addNewPage();
                                }
                            },
                        ]
                    );
                }}
                style={[styles.addPageButton, { borderColor: portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.textSecondary }]}
            >
                <Plus size={10} color={portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );

    // Edit mode toolbar
    const renderEditToolbar = () => {
        const isPhotoBg = portalBackgroundType === 'image';

        return (
            <Animated.View
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(300)}
                style={[
                    styles.editToolbarContainer,
                    {
                        // Как в CalendarWidget: transparent на фото, полупрозрачный на обычном фоне
                        backgroundColor: isPhotoBg
                            ? 'transparent'
                            : (isDarkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.9)'),
                        borderColor: isPhotoBg
                            ? 'rgba(255,255,255,0.3)'
                            : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                    }
                ]}
            >
                {/* BlurView как в CalendarWidget - показываем на фото или в dark mode */}
                {(isPhotoBg || isDarkMode) && (
                    <BlurView
                        style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
                        blurType={isDarkMode ? "dark" : "light"}
                        blurAmount={Platform.OS === 'android' ? 20 : 10}
                        reducedTransparencyFallbackColor={isDarkMode ? "rgba(30,30,30,0.8)" : "rgba(0,0,0,0.5)"}
                        pointerEvents="none"
                    />
                )}

                <View style={styles.editToolbarContent}>
                    <TouchableOpacity
                        onPress={() => setShowNewFolderInput(true)}
                        style={styles.toolbarButton}
                    >
                        <FolderPlus size={20} color={isPhotoBg ? "#FFFFFF" : (isDarkMode ? "#FFFFFF" : "#1E1E1E")} />
                        <Text style={[styles.toolbarText, { color: isPhotoBg ? "#FFFFFF" : (isDarkMode ? "#FFFFFF" : "#1E1E1E") }]}>Папка</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            onCloseDrawer?.();
                            navigation.navigate('WidgetSelection');
                        }}
                        style={styles.toolbarButton}
                    >
                        <LayoutGrid size={20} color={isPhotoBg ? "#FFFFFF" : (isDarkMode ? "#FFFFFF" : "#1E1E1E")} />
                        <Text style={[styles.toolbarText, { color: isPhotoBg ? "#FFFFFF" : (isDarkMode ? "#FFFFFF" : "#1E1E1E") }]}>Виджет</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setEditMode(false)}
                        style={styles.doneButton}
                    >
                        <LinearGradient
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            colors={['#FFAD66', '#FF8533']}
                            style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.doneText}>Готово</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <View
                style={styles.gridContainer}
            >
                {widgets.length > 0 && (
                    <View style={styles.widgetsContainer}>
                        {widgets.map(renderWidget)}
                    </View>
                )}

                <Animated.ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Pressable
                        onLongPress={handleLongPress}
                        onPress={handleBackgroundTap}
                        style={styles.scrollPressable}
                    >
                        <View
                            ref={gridRef}
                            onLayout={handleGridLayout}
                            style={styles.grid}
                        >
                            {items.map(renderItem)}
                        </View>
                    </Pressable>
                </Animated.ScrollView>

                {showNewFolderInput && (
                    <View style={[
                        styles.newFolderContainer,
                        {
                            borderColor: 'transparent',
                        }
                    ]}>
                        <BlurView
                            style={Platform.OS === 'ios' ? { ...StyleSheet.absoluteFillObject, borderRadius: 32 } : { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, borderRadius: 32 }}
                            blurType={isDarkMode ? "dark" : "light"}
                            blurAmount={20}
                            reducedTransparencyFallbackColor={isDarkMode ? "#1E1E1E" : "#FFFFFF"}
                        />
                        <TextInput
                            style={[styles.newFolderInput, { color: vTheme.colors.text }]}
                            placeholder="Название папки..."
                            placeholderTextColor={vTheme.colors.textSecondary}
                            value={newFolderName}
                            onChangeText={setNewFolderName}
                            autoFocus
                            onSubmitEditing={handleCreateFolder}
                        />
                        <View style={styles.newFolderActions}>
                            <TouchableOpacity onPress={handleCreateFolder} style={styles.createButton}>
                                <Text style={[styles.createText, { color: vTheme.colors.primary }]}>Создать</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowNewFolderInput(false)} style={styles.cancelButton}>
                                <Text style={[styles.cancelText, { color: vTheme.colors.textSecondary }]}>Отмена</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Elegant Divider Line */}
            <LinearGradient
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                colors={isDarkMode
                    ? ['transparent', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.08)', 'transparent']
                    : ['transparent', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.02)', 'transparent']}
                style={styles.dockDivider}
            />

            {/* Floating Dock Area */}
            <View style={styles.quickAccessDock}>
                <BlurView
                    style={styles.dockBlur}
                    blurType={isDarkMode ? "dark" : "light"}
                    blurAmount={12}
                    reducedTransparencyFallbackColor="transparent"
                    pointerEvents="none"
                />
                <View
                    ref={dockRef}
                    onLayout={handleDockLayout}
                    style={styles.dockItems}
                >
                    {quickAccess.map(renderDockItem)}
                    {[...Array(Math.max(0, 3 - quickAccess.length))].map((_, i) => (
                        <View key={`empty - ${i} `} style={[
                            styles.emptyDockSlot,
                            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }
                        ]} />
                    ))}
                </View>
            </View>

            {layout.pages.length > 1 && renderPageDots()}

            {isEditMode && renderEditToolbar()}

            {selectedFolder && (
                <FolderModal
                    visible={showFolderModal}
                    folder={selectedFolder}
                    onClose={() => {
                        setShowFolderModal(false);
                        setSelectedFolder(null);
                    }}
                    onRename={(newName) => renameFolder(selectedFolder.id, newName)}
                    onChangeColor={(newColor) => changeFolderColor(selectedFolder.id, newColor)}
                    onItemPress={handleFolderItemPress}
                    onRemoveItem={(itemId) => removeItemFromFolder(selectedFolder.id, itemId)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gridContainer: {
        flex: 1,
        paddingHorizontal: GRID_PADDING,
        paddingTop: 0,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 160, // Extra space to scroll above the floating dock
    },
    scrollPressable: {
        flex: 1,
    },
    widgetsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        backgroundColor: 'transparent', // Fix shadow warning
    },
    quickAccessDock: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        right: 20,
        height: 76,
        borderRadius: 38,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'transparent',
    },
    dockBlur: {
        ...StyleSheet.absoluteFillObject,
    },
    dockDivider: {
        position: 'absolute',
        bottom: 110, // Just above the dock
        left: 40,
        right: 40,
        height: 1,
    },
    dockItems: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    dockItemWrapper: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 4 : 0, // Уменьшили для центровки
    },
    emptyDockSlot: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderStyle: 'dashed',
    },
    pageDotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },
    pageDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 4,
        opacity: 0.4,
    },
    activePageDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        opacity: 1,
    },
    addPageButton: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    editToolbarContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'android' ? 112 : 120, // Немного приподняли для Android (было 105), чтобы не было конфликтов с доком
        left: 20,
        right: 20,
        borderRadius: 32,
        // overflow: 'hidden', // Убрали, чтобы не мешало кликам на Android
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 20, // Повысили еще немного
        zIndex: 1000, // Гарантируем, что панель поверх всего
    },
    editToolbarBlur: {
        width: '100%',
    },
    editToolbarContent: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        // Убрали лишний paddingTop для идеальной центровки значка внутри бокса
    },
    toolbarButton: {
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    toolbarText: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
    },
    doneButton: {
        paddingHorizontal: 22,
        paddingVertical: 10,
        paddingTop: Platform.OS === 'android' ? 12 : 10, // Уменьшили для центровки
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    doneText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15,
    },
    newFolderContainer: {
        position: 'absolute',
        top: '35%',
        left: 40,
        right: 40,
        padding: 24,
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
        elevation: 20,
    },
    newFolderInput: {
        fontSize: 18,
        fontWeight: '500',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
        marginBottom: 20,
    },
    newFolderActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 16,
    },
    createButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    cancelButton: {
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    createText: {
        fontSize: 16,
        fontWeight: '600',
    },
    cancelText: {
        alignSelf: 'flex-end',
        fontSize: 14,
    },
});
